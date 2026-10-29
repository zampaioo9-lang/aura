import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminMiddleware } from '../middleware/adminAuth';
import {
  createCategorySchema, updateCategorySchema,
  createArticleSchema, updateArticleSchema,
  createArticleBlockSchema, updateArticleBlockSchema,
} from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { slugify } from '../utils/slugify';

const router = Router();
const prisma = new PrismaClient();

// Publishing/unpublishing/deleting a published article must regenerate the static
// /revista HTML (see a later task). We trigger that by calling a Vercel Deploy Hook.
// A failure here must NEVER fail the request — the DB write already succeeded, and
// the only consequence of a missed deploy is a stale public page, corrected by the
// next publish action or a manual deploy. Retry once, then just log.
async function triggerBlogRebuild(): Promise<void> {
  const hookUrl = process.env.BLOG_DEPLOY_HOOK_URL;
  if (!hookUrl) return;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(hookUrl, { method: 'POST' });
      if (res.ok) return;
    } catch {
      // fall through to retry/log below
    }
  }
  console.warn('[Revista] No se pudo disparar el deploy hook tras 2 intentos');
}

// All routes in this file except GET /public require auth + admin, mirroring
// how offerings.ts gates owner-only routes but with isAdmin instead of ownership
// (there is only one author in this phase: the Aliax admin).

// POST /api/articles/categories — Create category (auth, admin)
router.post('/categories', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const slug = slugify(data.name);
    const slugExists = await prisma.category.findUnique({ where: { slug } });
    if (slugExists) throw new AppError(409, 'Ya existe una categoria con un nombre muy similar');
    const category = await prisma.category.create({ data: { ...data, slug } });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/categories — List all categories (auth, admin — includes inactive)
router.get('/categories', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: [{ audience: 'asc' }, { order: 'asc' }] });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/categories/:id — Update category (auth, admin)
router.put('/categories/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Categoria no encontrada');
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// POST /api/articles — Create article (auth, admin). Starts as DRAFT.
router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createArticleSchema.parse(req.body);
    const slug = slugify(data.title);
    const slugExists = await prisma.article.findUnique({ where: { slug } });
    if (slugExists) throw new AppError(409, 'Ya existe un articulo con un titulo muy similar');
    const article = await prisma.article.create({
      data: { ...data, slug, coverImage: data.coverImage || undefined, metaDescription: data.metaDescription || undefined },
    });
    res.status(201).json(article);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles — List all articles, draft + published (auth, admin)
router.get('/', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/public — Published articles only, with category + ordered blocks.
// This is the endpoint the build-time static-generation script calls. No auth.
router.get('/public', async (_req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true, blocks: { orderBy: { order: 'asc' } } },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/:id — Get one article with blocks (auth, admin — for the editor)
router.get('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { category: true, blocks: { orderBy: { order: 'asc' } } },
    });
    if (!article) throw new AppError(404, 'Articulo no encontrado');
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/:id — Update article metadata (auth, admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = updateArticleSchema.parse(req.body);
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Articulo no encontrado');
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { ...data, coverImage: data.coverImage || undefined, metaDescription: data.metaDescription || undefined },
    });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/publish — Publish (auth, admin)
router.patch('/:id/publish', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Articulo no encontrado');
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await triggerBlogRebuild();
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/unpublish — Unpublish (auth, admin)
router.patch('/:id/unpublish', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Articulo no encontrado');
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT' },
    });
    await triggerBlogRebuild();
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id — Delete (auth, admin). Cascades blocks.
router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Articulo no encontrado');
    await prisma.article.delete({ where: { id: req.params.id } });
    if (existing.status === 'PUBLISHED') await triggerBlogRebuild();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/articles/:id/blocks — Add block (auth, admin)
router.post('/:id/blocks', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) throw new AppError(404, 'Articulo no encontrado');
    const data = createArticleBlockSchema.parse(req.body);
    const currentCount = await prisma.articleBlock.count({ where: { articleId: req.params.id } });
    const block = await prisma.articleBlock.create({
      data: { ...data, articleId: req.params.id, order: currentCount + 1 },
    });
    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/:id/blocks/:blockId — Update block, including reorder (auth, admin)
router.put('/:id/blocks/:blockId', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.articleBlock.findUnique({ where: { id: req.params.blockId } });
    if (!existing) throw new AppError(404, 'Bloque no encontrado');
    const data = updateArticleBlockSchema.parse(req.body);
    const block = await prisma.articleBlock.update({ where: { id: req.params.blockId }, data });
    res.json(block);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id/blocks/:blockId — Delete block (auth, admin)
router.delete('/:id/blocks/:blockId', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.articleBlock.findUnique({ where: { id: req.params.blockId } });
    if (!existing) throw new AppError(404, 'Bloque no encontrado');
    await prisma.articleBlock.delete({ where: { id: req.params.blockId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
