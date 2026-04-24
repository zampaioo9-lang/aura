import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { profileSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { isProUser } from '../lib/planUtils';

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

    // Guard: ELEGANT y CREATIVE solo para Pro
    if (data.template && ['ELEGANT', 'CREATIVE'].includes(data.template)) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { isAdmin: true, plan: true, planExpiresAt: true },
      });
      if (user && !isProUser(user)) {
        throw new AppError(403, 'Los templates Elegant y Creative requieren el plan Pro.', 'PRO_REQUIRED');
      }
    }

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

// GET /api/profiles/directory — Public directory with filters
router.get('/directory', async (req, res, next) => {
  try {
    const { profession, city, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const baseWhere: Prisma.ProfileWhereInput = { published: true };
    if (profession) baseWhere.profession = { contains: profession, mode: 'insensitive' };
    if (city) (baseWhere as any).country = { contains: city, mode: 'insensitive' };

    const now = new Date();

    const proWhere: Prisma.ProfileWhereInput = {
      ...baseWhere,
      user: {
        OR: [
          { plan: 'LIFETIME' },
          {
            plan: 'PRO',
            OR: [
              { planExpiresAt: null },
              { planExpiresAt: { gt: now } },
            ],
          },
        ],
      },
    };

    const freeWhere: Prisma.ProfileWhereInput = {
      ...baseWhere,
      NOT: {
        user: {
          OR: [
            { plan: 'LIFETIME' },
            {
              plan: 'PRO',
              OR: [
                { planExpiresAt: null },
                { planExpiresAt: { gt: now } },
              ],
            },
          ],
        },
      },
    };

    const selectFields = {
      id: true,
      slug: true,
      title: true,
      profession: true,
      bio: true,
      avatar: true,
      country: true,
      specialty: true,
      user: {
        select: { plan: true, planExpiresAt: true },
      },
      services: {
        where: { isActive: true },
        select: { id: true, name: true, price: true, currency: true },
        take: 3,
      },
    } as const;

    const [proProfiles, freeProfiles, total] = await Promise.all([
      prisma.profile.findMany({
        where: proWhere,
        select: selectFields,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.profile.findMany({
        where: freeWhere,
        select: selectFields,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.profile.count({ where: baseWhere }),
    ]);

    // Combine: Pro first, then Free, up to limitNum
    const combined = [...proProfiles, ...freeProfiles].slice(0, limitNum);

    const formatted = combined.map(({ user, ...rest }) => ({
      ...rest,
      isPro: user.plan === 'LIFETIME' ||
        (user.plan === 'PRO' && (!user.planExpiresAt || new Date(user.planExpiresAt) > now)),
    }));

    res.json({
      profiles: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/profiles - create profile (protected)
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, plan: true, planExpiresAt: true },
    });
    const maxProfiles = isProUser(user!) ? 3 : 1;
    const existing = await prisma.profile.count({ where: { userId: req.userId } });
    if (existing >= maxProfiles) {
      const msg = maxProfiles === 1
        ? 'El plan gratuito permite 1 perfil. Activa Pro para tener hasta 3.'
        : 'Has alcanzado el límite de 3 perfiles del plan Pro.';
      throw new AppError(403, msg, 'PRO_REQUIRED');
    }

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
