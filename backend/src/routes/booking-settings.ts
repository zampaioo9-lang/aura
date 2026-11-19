import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription';
import { AppError } from '../middleware/errorHandler';
import { upsertBookingSettingsSchema } from '../utils/validation';
import { resolveNotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '../lib/notificationPrefs';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware, requireActiveSubscription);

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
        emailEnabled: true,
        timezone: 'America/Mexico_City',
        language: 'es',
        meetingLink: null,
        allowClientCancel: true,
        multiplePerSlot: false,
        maxActiveBookingsPerClient: 0,
        minDaysBetweenBookings: 0,
        notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
      });
    }

    // Las preferencias se devuelven completas (lo guardado mezclado con los valores por defecto)
    res.json({ ...settings, notificationPrefs: resolveNotificationPrefs(settings.notificationPrefs) });
  } catch (err) { next(err); }
});

// PUT /api/booking-settings?profileId=xxx  (upsert)
router.put('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const pid = await getProfileId(req.userId!, req.query.profileId as string | undefined);
    // Actualizacion parcial: solo se guardan los campos que llegan. Antes, un PUT con un solo campo
    // (por ejemplo { emailEnabled } desde Notificaciones) rellenaba el resto con valores por defecto
    // y los guardaba, reseteando reglas de reserva y zona horaria.
    const parsed = upsertBookingSettingsSchema.partial().parse(req.body);
    const { notificationPrefs, ...rest } = parsed;
    let data: typeof rest & { notificationPrefs?: Record<string, boolean> } = rest;
    if (notificationPrefs) {
      // Se mezcla con lo que ya estaba guardado: enviar solo una preferencia no borra las demas.
      const current = await prisma.bookingSettings.findUnique({ where: { profileId: pid }, select: { notificationPrefs: true } });
      data = { ...rest, notificationPrefs: { ...resolveNotificationPrefs(current?.notificationPrefs), ...notificationPrefs } };
    }

    const settings = await prisma.bookingSettings.upsert({
      where: { profileId: pid },
      update: data,
      create: { ...data, profileId: pid },
    });

    res.json(settings);
  } catch (err) { next(err); }
});

export default router;
