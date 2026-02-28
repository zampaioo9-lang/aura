import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { profileSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// GET /api/profiles - list my profiles (protected)
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      include: { services: true, _count: { select: { bookings: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/me - my first profile (protected)
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profile = await prisma.profile.findFirst({
      where: { userId: req.userId },
      include: { services: true, user: { select: { name: true, email: true } } },
    });
    if (!profile) throw new AppError(404, 'No tienes perfil aun');
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profiles/me - update my first profile (protected)
router.put('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.profile.findFirst({ where: { userId: req.userId } });
    if (!existing) throw new AppError(404, 'No tienes perfil aun');

    const data = profileSchema.partial().parse(req.body);

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.profile.findUnique({ where: { slug: data.slug } });
      if (slugExists) throw new AppError(409, 'Ese username ya esta en uso');
    }

    const profile = await prisma.profile.update({
      where: { id: existing.id },
      data,
      include: { services: true },
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/profiles/me - delete my profile (protected)
router.delete('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.profile.findFirst({ where: { userId: req.userId } });
    if (!existing) throw new AppError(404, 'No tienes perfil aun');

    await prisma.profile.delete({ where: { id: existing.id } });
    res.json({ message: 'Perfil eliminado' });
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/check-username/:username - check availability (public)
router.get('/check-username/:username', async (req, res, next) => {
  try {
    const username = req.params.username.toLowerCase();
    const existing = await prisma.profile.findUnique({ where: { slug: username } });
    res.json({ available: !existing, username });
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/directory - list all published profiles (public)
router.get('/directory', async (_req, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { published: true },
      include: {
        services: { where: { isActive: true } },
        user: { select: { name: true, socialLinks: true } },
        availabilitySlots: { where: { isActive: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

// POST /api/profiles - create profile (protected)
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const count = await prisma.profile.count({ where: { userId: req.userId! } });
    if (count >= 1) throw new AppError(400, 'Solo puedes tener 1 perfil por cuenta');

    const data = profileSchema.parse(req.body);

    const slugExists = await prisma.profile.findUnique({ where: { slug: data.slug } });
    if (slugExists) throw new AppError(409, 'Ese username ya esta en uso');

    const profile = await prisma.profile.create({
      data: {
        ...data,
        userId: req.userId!,
        socialLinks: data.socialLinks || {},
        availability: data.availability || {},
      },
    });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/:slug (public, owner can view unpublished)
router.get('/:slug', async (req: AuthRequest, res, next) => {
  try {
    // Optional auth: try to identify the user but don't require it
    let userId: string | undefined;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const { verifyToken } = require('../services/authService');
      const payload = verifyToken(header.slice(7));
      if (payload) userId = payload.userId;
    }

    const profile = await prisma.profile.findUnique({
      where: { slug: req.params.slug },
      include: {
        services: { where: { isActive: true } },
        user: { select: { name: true } },
        availabilitySlots: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    const isOwner = profile && userId && profile.userId === userId;
    if (!profile || (!profile.published && !isOwner)) throw new AppError(404, 'Profile not found');
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profiles/:id (protected)
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.userId) throw new AppError(404, 'Profile not found');

    const data = profileSchema.partial().parse(req.body);

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.profile.findUnique({ where: { slug: data.slug } });
      if (slugExists) throw new AppError(409, 'Ese username ya esta en uso');
    }

    const profile = await prisma.profile.update({
      where: { id: req.params.id },
      data,
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/profiles/:id (protected)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.userId) throw new AppError(404, 'Profile not found');

    await prisma.profile.delete({ where: { id: req.params.id } });
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
