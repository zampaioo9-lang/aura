import { waitUntil } from '@vercel/functions';
import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { isProUser } from '../lib/planUtils';
import { slugify } from '../utils/slugify';
import { emailTemplates, sendEmail } from '../services/emailService';
import {
  createMyArticleSchema, updateMyArticleSchema,
  createArticleBlockSchema, updateMyArticleBlockSchema,
} from '../utils/validation';
import { canAuthorEdit, canAuthorSubmit, canAuthorWithdraw, canAuthorDelete, validateForSubmit, longestRealText } from '../lib/articleWorkflow';

const router = Router();
const prisma = new PrismaClient();

interface AuthorRequest extends AuthRequest { author?: { id: string; name: string } }

// Solo planes Pro y Pro IA (el admin tambien pasa). Todas las rutas cuelgan de esto.
async function requireAuthorAccess(req: AuthorRequest, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, plan: true, planExpiresAt: true, isAdmin: true, blocked: true },
    });
    if (!user || user.blocked) throw new AppError(403, 'No autorizado');
    if (!isProUser(user)) throw new AppError(403, 'Escribir articulos es un beneficio de los planes Pro y Pro IA');
    req.author = { id: user.id, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}

router.use(authMiddleware, requireAuthorAccess);

// 404 (no 403) cuando el articulo no es del usuario, para no revelar que existe.
async function loadOwnArticle(id: string, userId: string) {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || article.authorUserId !== userId) throw new AppError(404, 'Articulo no encontrado');
  return article;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'articulo';
  let slug = base;
  let n = 2;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// GET /api/my-articles
router.get('/', async (req: AuthorRequest, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      where: { authorUserId: req.author!.id },
      select: {
        id: true, slug: true, title: true, excerpt: true, status: true, reviewNote: true,
        submittedAt: true, publishedAt: true, updatedAt: true, coverImage: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(articles);
  } catch (err) { next(err); }
});

// POST /api/my-articles
router.post('/', async (req: AuthorRequest, res, next) => {
  try {
    const data = createMyArticleSchema.parse(req.body);
    let article;
    for (let attempt = 1; ; attempt++) {
      try {
        article = await prisma.article.create({
          data: {
            title: data.title,
            excerpt: data.excerpt || '',
            metaDescription: data.metaDescription || undefined,
            coverImage: data.coverImage || undefined,
            slug: await uniqueSlug(data.title),
            author: req.author!.name,
            authorUserId: req.author!.id,
            status: 'DRAFT',
          },
        });
        break;
      } catch (e) {
        // Carrera de slug: otro articulo tomo el mismo slug entre la consulta y el insert.
        if ((e as { code?: string })?.code === 'P2002' && attempt < 3) continue;
        throw e;
      }
    }
    res.status(201).json(article);
  } catch (err) { next(err); }
});

// GET /api/my-articles/:id
router.get('/:id', async (req: AuthorRequest, res, next) => {
  try {
    await loadOwnArticle(req.params.id, req.author!.id);
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { blocks: { orderBy: { order: 'asc' } } },
    });
    res.json(article);
  } catch (err) { next(err); }
});

// PUT /api/my-articles/:id  (solo borrador o cambios solicitados)
router.put('/:id', async (req: AuthorRequest, res, next) => {
  try {
    const existing = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(existing.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const data = updateMyArticleSchema.parse(req.body);
    const article = await prisma.article.update({
      where: { id: existing.id },
      data: {
        ...data,
        coverImage: data.coverImage || undefined,
        metaDescription: data.metaDescription || undefined,
      },
    });
    res.json(article);
  } catch (err) { next(err); }
});

// DELETE /api/my-articles/:id
router.delete('/:id', async (req: AuthorRequest, res, next) => {
  try {
    const existing = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorDelete(existing.status)) throw new AppError(409, 'Este articulo no se puede borrar');
    await prisma.article.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/my-articles/:id/blocks
router.post('/:id/blocks', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(article.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const data = createArticleBlockSchema.parse(req.body);
    const maxOrder = await prisma.articleBlock.aggregate({ where: { articleId: article.id }, _max: { order: true } });
    const block = await prisma.articleBlock.create({
      data: { ...data, articleId: article.id, order: (maxOrder._max.order ?? 0) + 1 },
    });
    res.status(201).json(block);
  } catch (err) { next(err); }
});

// PATCH /api/my-articles/:id/blocks/swap  (antes de /:blockId para que no choque)
router.patch('/:id/blocks/swap', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(article.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const { blockAId, blockBId } = req.body as { blockAId?: string; blockBId?: string };
    if (!blockAId || !blockBId) throw new AppError(400, 'Se requieren blockAId y blockBId');
    const [a, b] = await Promise.all([
      prisma.articleBlock.findUnique({ where: { id: blockAId } }),
      prisma.articleBlock.findUnique({ where: { id: blockBId } }),
    ]);
    if (!a || !b || a.articleId !== article.id || b.articleId !== article.id) {
      throw new AppError(400, 'Ambos bloques deben pertenecer a este articulo');
    }
    const [ua, ub] = await prisma.$transaction([
      prisma.articleBlock.update({ where: { id: a.id }, data: { order: b.order } }),
      prisma.articleBlock.update({ where: { id: b.id }, data: { order: a.order } }),
    ]);
    res.json([ua, ub]);
  } catch (err) { next(err); }
});

// PUT /api/my-articles/:id/blocks/:blockId
router.put('/:id/blocks/:blockId', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(article.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const block = await prisma.articleBlock.findUnique({ where: { id: req.params.blockId } });
    if (!block || block.articleId !== article.id) throw new AppError(404, 'Bloque no encontrado');
    const data = updateMyArticleBlockSchema.parse(req.body);
    res.json(await prisma.articleBlock.update({ where: { id: block.id }, data }));
  } catch (err) { next(err); }
});

// DELETE /api/my-articles/:id/blocks/:blockId
router.delete('/:id/blocks/:blockId', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(article.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const block = await prisma.articleBlock.findUnique({ where: { id: req.params.blockId } });
    if (!block || block.articleId !== article.id) throw new AppError(404, 'Bloque no encontrado');
    await prisma.articleBlock.delete({ where: { id: block.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/my-articles/:id/submit
router.post('/:id/submit', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorSubmit(article.status)) throw new AppError(409, 'Este articulo ya fue enviado');
    const blocks = await prisma.articleBlock.findMany({ where: { articleId: article.id }, select: { type: true, text: true } });
    const problem = validateForSubmit({
      title: article.title,
      excerpt: article.excerpt,
      blockCount: blocks.length,
      textBlockCount: blocks.filter(b => b.type === 'TEXT').length,
      maxTextLength: longestRealText(blocks.filter(b => b.type === 'TEXT').map(b => b.text)),
    });
    if (problem) throw new AppError(400, problem);
    const result = await prisma.article.updateMany({
      where: { id: article.id, status: { in: ['DRAFT', 'CHANGES_REQUESTED'] } },
      data: { status: 'PENDING_REVIEW', submittedAt: new Date(), reviewNote: null },
    });
    if (result.count === 0) throw new AppError(409, 'El articulo cambio de estado, recarga la pagina');
    const updated = await prisma.article.findUnique({ where: { id: article.id } });
    // El correo nunca bloquea el envio.
    if (result.count === 1) {
      try {
        const tpl = emailTemplates.articleSubmittedAdmin({ authorName: req.author!.name, title: article.title });
        waitUntil(sendEmail(tpl.to, tpl.subject, tpl.html).catch(() => {}));
      } catch { /* ignorar */ }
    }
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/my-articles/:id/withdraw
router.post('/:id/withdraw', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorWithdraw(article.status)) throw new AppError(409, 'Solo puedes retirar un articulo en revision');
    const result = await prisma.article.updateMany({ where: { id: article.id, status: 'PENDING_REVIEW' }, data: { status: 'DRAFT' } });
    if (result.count === 0) throw new AppError(409, 'El articulo cambio de estado, recarga la pagina');
    res.json(await prisma.article.findUnique({ where: { id: article.id } }));
  } catch (err) { next(err); }
});

export default router;
