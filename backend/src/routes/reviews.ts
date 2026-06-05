import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { isProUser } from '../lib/planUtils';

const router = Router();
const prisma = new PrismaClient();

// GET /api/reviews/token/:token — valida token, retorna info del profesional
router.get('/token/:token', async (req, res, next) => {
  try {
    const reviewToken = await prisma.reviewToken.findUnique({
      where: { token: req.params.token },
      include: {
        booking: {
          include: {
            profile: {
              select: { id: true, title: true, slug: true, avatar: true },
            },
          },
        },
      },
    });

    if (!reviewToken) {
      return res.status(404).json({ valid: false, reason: 'not_found' });
    }
    if (reviewToken.usedAt) {
      return res.json({ valid: false, reason: 'already_used' });
    }
    if (reviewToken.expiresAt < new Date()) {
      return res.json({ valid: false, reason: 'expired' });
    }

    res.json({
      valid: true,
      clientName: reviewToken.booking.clientName,
      professionalName: reviewToken.booking.profile.title,
      professionalAvatar: reviewToken.booking.profile.avatar,
      profileSlug: reviewToken.booking.profile.slug,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews/submit/:token — crea Review y marca token como usado
router.post('/submit/:token', async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new AppError(400, 'Rating debe ser un número entre 1 y 5');
    }

    const reviewToken = await prisma.reviewToken.findUnique({
      where: { token: req.params.token },
      include: {
        booking: {
          select: { id: true, profileId: true, clientName: true },
        },
      },
    });

    if (!reviewToken) throw new AppError(404, 'Token no encontrado');
    if (reviewToken.usedAt) throw new AppError(409, 'Este enlace ya fue utilizado');
    if (reviewToken.expiresAt < new Date()) throw new AppError(410, 'Este enlace ha expirado');

    const [review] = await prisma.$transaction([
      prisma.review.create({
        data: {
          bookingId: reviewToken.booking.id,
          profileId: reviewToken.booking.profileId,
          rating: Math.round(rating),
          comment: comment?.trim() || null,
          clientName: reviewToken.booking.clientName,
        },
      }),
      prisma.reviewToken.update({
        where: { id: reviewToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.status(201).json({ success: true, reviewId: review.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/profile/:profileId — reseñas públicas de un perfil (solo si Pro)
router.get('/profile/:profileId', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.params.profileId },
      select: { user: { select: { plan: true, planExpiresAt: true, isAdmin: true } } },
    });

    if (!profile) throw new AppError(404, 'Perfil no encontrado');

    if (!isProUser(profile.user)) {
      return res.json({ reviews: [], averageRating: null, reviewCount: 0, isPro: false });
    }

    const reviews = await prisma.review.findMany({
      where: { profileId: req.params.profileId, isVisible: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, rating: true, comment: true, clientName: true, createdAt: true },
    });

    const averageRating = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

    const publicReviews = reviews.map(r => ({
      ...r,
      clientName: abbreviateName(r.clientName),
    }));

    res.json({ reviews: publicReviews, averageRating, reviewCount: reviews.length, isPro: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/mine — reseñas del profesional autenticado (Pro)
router.get('/mine', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { plan: true, planExpiresAt: true, isAdmin: true, profiles: { select: { id: true } } },
    });
    if (!user) throw new AppError(401, 'No autorizado');
    if (!isProUser(user)) throw new AppError(403, 'Se requiere plan Pro', 'PRO_REQUIRED');

    const profileIds = user.profiles.map(p => p.id);

    const reviews = await prisma.review.findMany({
      where: { profileId: { in: profileIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, rating: true, comment: true, clientName: true,
        isVisible: true, createdAt: true, profileId: true,
      },
    });

    const visibleReviews = reviews.filter(r => r.isVisible);
    const averageRating = visibleReviews.length
      ? Math.round((visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length) * 10) / 10
      : null;

    res.json({ reviews, averageRating, reviewCount: reviews.length });
  } catch (err) {
    next(err);
  }
});

// PUT /api/reviews/:id/visibility — toggle isVisible (Pro)
router.put('/:id/visibility', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { plan: true, planExpiresAt: true, isAdmin: true, profiles: { select: { id: true } } },
    });
    if (!user) throw new AppError(401, 'No autorizado');
    if (!isProUser(user)) throw new AppError(403, 'Se requiere plan Pro', 'PRO_REQUIRED');

    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) throw new AppError(404, 'Reseña no encontrada');

    const profileIds = user.profiles.map(p => p.id);
    if (!profileIds.includes(review.profileId)) throw new AppError(403, 'No autorizado');

    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: { isVisible: !review.isVisible },
    });

    res.json({ id: updated.id, isVisible: updated.isVisible });
  } catch (err) {
    next(err);
  }
});

// ── Helper ──────────────────────────────────────────────────────────
function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export default router;
