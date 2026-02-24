import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { upsertBookingSettingsSchema } from '../utils/validation';

const router = Router();
const prisma = new PrismaClient();

async function getProfileId(userId: string, profileId?: string): Promise<string> {
  if (profileId) {
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || profile.userId !== userId) throw new AppError(404, 'Perfil no encontrado');
    return profileId;
  }
  const profile = await prisma.profile.findFirst({ where: { userId } });
  if (!profile) throw new AppError(404, 'No tienes ningún perfil creado');
  return profile.id;
}

// GET /api/booking-settings?profileId=xxx
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const pid = await getProfileId(req.userId!, req.query.profileId as string | undefined);

    let settings = await prisma.bookingSettings.findUnique({ where: { profileId: pid } });

    // Si no existe aún, devolver defaults sin crear
    if (!settings) {
      return res.json({
        profileId: pid,
        bufferMinutes: 0,
        advanceBookingDays: 60,
        minAdvanceHours: 1,
        cancellationHours: 24,
        autoConfirm: false,
        timezone: 'America/Mexico_City',
        language: 'es',
      });
    }

    res.json(settings);
  } catch (err) { next(err); }
});

// PUT /api/booking-settings?profileId=xxx  (upsert)
router.put('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const pid = await getProfileId(req.userId!, req.query.profileId as string | undefined);
    const data = upsertBookingSettingsSchema.parse(req.body);

    const settings = await prisma.bookingSettings.upsert({
      where: { profileId: pid },
      update: data,
      create: { ...data, profileId: pid },
    });

    res.json(settings);
  } catch (err) { next(err); }
});

export default router;
