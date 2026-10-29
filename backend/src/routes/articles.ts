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

export default router;
