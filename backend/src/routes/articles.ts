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
import { emailTemplates } from '../services/emailService';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

// Publishing/unpublishing/deleting a published article, or clicking "Publicar cambios
// en el sitio" in the CMS, regenerates the static /revista HTML by calling a Vercel
// Deploy Hook. A failure here must NEVER fail the request — the DB write already
// succeeded, and the only consequence of a missed deploy is a stale public page,
// corrected by the next real trigger or a manual deploy. Retry once, then just log.
//
// Deliberately NOT awaited by callers: the deploy hook round-trip can take seconds,
// and the caller's work already succeeded in the DB by the time this fires.
async function triggerBlogRebuild(): Promise<void> {
  const hookUrl = process.env.BLOG_DEPLOY_HOOK_URL;
  if (!hookUrl) return;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(hookUrl, { method: 'POST' });
      if (res.ok) {
        try {
          await prisma.blogRebuildState.upsert({
            where: { id: 'singleton' },
            create: { id: 'singleton', lastRebuiltAt: new Date() },
            update: { lastRebuiltAt: new Date() },
          });
        } catch (err) {
          console.warn('[Revista] Se disparó el deploy hook pero no se pudo registrar lastRebuiltAt', err);
        }
        return;
      }
    } catch {
      // fall through to retry/log below
    }
  }
  console.warn('[Revista] No se pudo disparar el deploy hook tras 2 intentos');
}

// Called by the 5 "small edit" routes (article metadata, block create/update/swap/
// delete) instead of triggerBlogRebuild(). Only records that something changed -- no
// network call to Vercel, so these routes keep their original near-zero latency.
// Editing a long article block-by-block used to fire one full site rebuild per block
// (no "save all" step exists for blocks -- each one autosaves individually), which on
// 2026-11-03 burned through Vercel's daily deploy cap mid-edit and silently stopped
// updating the live page. Now nothing republishes automatically: the admin decides
// when via the "Publicar cambios en el sitio" button (POST /publish-site-changes
// below), guided by the "cambios sin publicar" indicator (GET /rebuild-status below).
async function markContentEdited(): Promise<void> {
  try {
    await prisma.blogRebuildState.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', lastEditAt: new Date() },
      update: { lastEditAt: new Date() },
    });
  } catch (err) {
    console.warn('[Revista] No se pudo registrar la edición pendiente', err);
  }
}

// All routes in this file except GET /public require auth + admin, mirroring
// how offerings.ts gates owner-only routes but with isAdmin instead of ownership
// (there is only one author in this phase: the Aliax admin).

// POST /api/articles/categories — Create category (auth, admin)
router.post('/categories', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const slug = slugify(data.name);
    const slugExists = await prisma.category.findUnique({ where: { slug_audience: { slug, audience: data.audience } } });
    if (slugExists) throw new AppError(409, 'Ya existe una categoria con un nombre muy similar para esta audiencia');
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
      data: { ...data, slug, coverImage: data.coverImage || undefined, metaDescription: data.metaDescription || undefined, author: data.author || undefined },
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

// POST /api/articles/publish-site-changes — Rebuild the live site now (auth, admin)
//
// What the "Publicar cambios en el sitio" button calls. Unlike the 5 small-edit
// routes (which only call markContentEdited()), this always triggers a real rebuild
// regardless of whether anything is pending -- the admin asked for it explicitly.
router.post('/publish-site-changes', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    await triggerBlogRebuild();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/rebuild-status — Does the live site need republishing? (auth, admin)
//
// true when content was saved (markContentEdited) more recently than the last real
// rebuild (triggerBlogRebuild), or when content was saved and no rebuild has ever
// happened. Drives the "Cambios sin publicar" indicator in the CMS.
router.get('/rebuild-status', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const state = await prisma.blogRebuildState.findUnique({ where: { id: 'singleton' } });
    const hasPendingChanges = !!state?.lastEditAt && (!state.lastRebuiltAt || state.lastEditAt > state.lastRebuiltAt);
    res.json({ hasPendingChanges });
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

// GET /api/articles/:id/newsletter-preview: Subject+HTML to pre-fill the Newsletter form (auth, admin)
router.get('/:id/newsletter-preview', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) throw new AppError(404, 'Articulo no encontrado');
    if (article.status !== 'PUBLISHED') throw new AppError(400, 'Solo se puede enviar un articulo publicado');

    const tpl = emailTemplates.articleNewsletter({
      title: article.title,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      articleUrl: `${env.FRONTEND_URL}/revista/${article.slug}`,
    });

    res.json({ subject: tpl.subject, html: tpl.html, name: `Articulo: ${article.title}` });
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
      data: { ...data, coverImage: data.coverImage || undefined, metaDescription: data.metaDescription || undefined, author: data.author || undefined },
    });
    if (existing.status === 'PUBLISHED') await markContentEdited();
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
    if (!existing.author?.trim()) throw new AppError(400, 'Agrega un autor antes de publicar');
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    triggerBlogRebuild();
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
    triggerBlogRebuild();
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
    if (existing.status === 'PUBLISHED') triggerBlogRebuild();
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
    // Using count+1 here previously caused order collisions after any block was
    // deleted (count drops but existing order values don't shift down), so a new
    // block could land on an order value an existing block already had. Basing it
    // on the current max is immune to gaps left by deletions.
    const maxOrder = await prisma.articleBlock.aggregate({
      where: { articleId: req.params.id },
      _max: { order: true },
    });
    const block = await prisma.articleBlock.create({
      data: { ...data, articleId: req.params.id, order: (maxOrder._max.order ?? 0) + 1 },
    });
    if (article.status === 'PUBLISHED') await markContentEdited();
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
    const article = await prisma.article.findUnique({ where: { id: existing.articleId } });
    if (article?.status === 'PUBLISHED') await markContentEdited();
    res.json(block);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/blocks/swap — Swap the order of two blocks (auth, admin)
//
// moveBlock previously did this as two separate PUT requests from the client (set
// block A's order to block B's, then block B's to A's old order). If the second
// request failed after the first succeeded -- a dropped connection, a transient
// error -- the article was left with two blocks sharing the same order value,
// which is exactly the kind of corruption that made the up/down arrows behave
// unpredictably afterward (Postgres doesn't guarantee a stable tie-break order for
// two equal `order` values, so which one "wins" on each reload becomes arbitrary).
// Doing both updates in one transaction makes a partial swap impossible: either
// both blocks get their new order, or neither does.
router.patch('/:id/blocks/swap', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { blockAId, blockBId } = req.body as { blockAId?: string; blockBId?: string };
    if (!blockAId || !blockBId) throw new AppError(400, 'Se requieren blockAId y blockBId');

    const [blockA, blockB] = await Promise.all([
      prisma.articleBlock.findUnique({ where: { id: blockAId } }),
      prisma.articleBlock.findUnique({ where: { id: blockBId } }),
    ]);
    if (!blockA || !blockB) throw new AppError(404, 'Bloque no encontrado');
    if (blockA.articleId !== req.params.id || blockB.articleId !== req.params.id) {
      throw new AppError(400, 'Ambos bloques deben pertenecer a este articulo');
    }

    const [updatedA, updatedB] = await prisma.$transaction([
      prisma.articleBlock.update({ where: { id: blockAId }, data: { order: blockB.order } }),
      prisma.articleBlock.update({ where: { id: blockBId }, data: { order: blockA.order } }),
    ]);

    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (article?.status === 'PUBLISHED') await markContentEdited();
    res.json([updatedA, updatedB]);
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
    const article = await prisma.article.findUnique({ where: { id: existing.articleId } });
    if (article?.status === 'PUBLISHED') await markContentEdited();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
