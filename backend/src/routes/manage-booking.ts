import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { cancelBooking, getAvailableSlots, rescheduleBookingByClient } from '../services/bookingService';
import { checkClientCancellation, bookingStartInstant } from '../lib/bookingRules';
import { DEFAULT_PROFESSIONAL_TIMEZONE, isValidTimeZone, localizeBookingTime } from '../lib/clientTimezone';
import { getClientBookingNotice, resolveBookingZones, whatsappChatUrl } from '../lib/clientBookingNotice';

/**
 * Pagina publica para que el paciente gestione su cita desde el enlace de su correo, sin cuenta.
 * El unico "permiso" es el codigo secreto de la cita (Booking.manageToken, 192 bits aleatorios).
 *   GET  /api/manage-booking/:token                 datos de la cita en su hora local y que puede hacer
 *   GET  /api/manage-booking/:token/slots?date=     horarios libres para reagendar (en su hora local)
 *   POST /api/manage-booking/:token/cancel          cancelar
 *   POST /api/manage-booking/:token/reschedule      cambiar a otro horario
 */
const router = Router();
const prisma = new PrismaClient();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida');
const rescheduleSchema = z.object({
  date: dateSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora no válida'),
});
const cancelSchema = z.object({ reason: z.string().trim().max(500).optional() });

async function loadByToken(token: string) {
  if (!token || token.length < 20 || token.length > 128) throw new AppError(404, 'Este enlace no es válido');
  const booking = await prisma.booking.findUnique({
    where: { manageToken: token },
    include: {
      service: true,
      profile: { include: { user: { select: { name: true, email: true, phone: true, socialLinks: true } } } },
    },
  });
  if (!booking) throw new AppError(404, 'Este enlace no es válido');
  return booking;
}

type LoadedBooking = Awaited<ReturnType<typeof loadByToken>>;

function professionalPhoneOf(b: LoadedBooking): string | null {
  const links = b.profile.user.socialLinks as Record<string, string> | null;
  return links?.whatsapp || b.profile.phone || b.profile.user.phone || null;
}

/** Si el paciente puede cambiar o cancelar esta cita ahora mismo, y si no, por que. */
async function changeVerdict(b: LoadedBooking, action: 'cancelar' | 'reagendar'): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (b.status === 'CANCELLED') return { ok: false, reason: 'Esta cita ya fue cancelada.' };
  if (b.status !== 'PENDING' && b.status !== 'CONFIRMED') return { ok: false, reason: 'Esta cita ya no se puede cambiar.' };

  const cfg = await prisma.bookingSettings.findUnique({
    where: { profileId: b.profileId },
    select: { allowClientCancel: true, cancellationHours: true, timezone: true },
  });
  const tz = cfg && isValidTimeZone(cfg.timezone) ? cfg.timezone : DEFAULT_PROFESSIONAL_TIMEZONE;
  const start = bookingStartInstant(b.date, b.startTime, tz);
  if (start.getTime() <= Date.now()) return { ok: false, reason: 'Esta cita ya pasó.' };
  if (cfg) {
    const v = checkClientCancellation({ allowClientCancel: cfg.allowClientCancel, cancellationHours: cfg.cancellationHours, start, action });
    if (!v.ok) return { ok: false, reason: v.reason };
  }
  return { ok: true };
}

// GET /api/manage-booking/:token
router.get('/:token', async (req, res, next) => {
  try {
    const b = await loadByToken(req.params.token);
    const notice = await getClientBookingNotice(b, {
      professionalName: b.profile.user.name,
      professionalPhone: professionalPhoneOf(b),
      serviceModality: b.service.sessionModality,
    });
    const verdict = await changeVerdict(b, 'reagendar');
    const contactUrl = whatsappChatUrl(professionalPhoneOf(b), `Hola ${b.profile.user.name}, quiero hablar sobre mi cita.`);

    res.json({
      status: b.status,
      clientName: b.clientName,
      professionalName: b.profile.user.name,
      serviceName: b.service.name,
      durationMinutes: b.service.durationMinutes,
      modalityLabel: notice.modalityLabel,
      // Fecha y hora en el horario local del paciente (si tiene otra zona horaria, con la ciudad indicada)
      dateLabel: notice.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
      startTime: notice.startTime,
      meetingLink: b.status === 'PENDING' || b.status === 'CONFIRMED' ? notice.meetingLink : null,
      canChange: verdict.ok,
      blockedReason: verdict.ok ? null : verdict.reason,
      contactUrl,
    });
  } catch (err) { next(err); }
});

// GET /api/manage-booking/:token/slots?date=YYYY-MM-DD
router.get('/:token/slots', async (req, res, next) => {
  try {
    const b = await loadByToken(req.params.token);
    const date = dateSchema.parse(String(req.query.date ?? ''));
    const verdict = await changeVerdict(b, 'reagendar');
    if (!verdict.ok) throw new AppError(403, verdict.reason);

    const slots = await getAvailableSlots(b.profileId, b.serviceId, date, b.id);
    const { professionalTz, clientTz } = await resolveBookingZones(b);
    res.json({
      date,
      slots: slots.map(time => {
        const local = localizeBookingTime(date, time, professionalTz, clientTz);
        return {
          time, // se envia tal cual al reagendar (hora de la agenda del profesional)
          label: local.startTime, // lo que ve el paciente, en su hora local
          localDateLabel: local.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
        };
      }),
    });
  } catch (err) { next(err); }
});

// POST /api/manage-booking/:token/cancel
router.post('/:token/cancel', async (req, res, next) => {
  try {
    const b = await loadByToken(req.params.token);
    const { reason } = cancelSchema.parse(req.body ?? {});
    const verdict = await changeVerdict(b, 'cancelar');
    if (!verdict.ok) throw new AppError(403, verdict.reason);
    await cancelBooking(b.id, 'client', reason);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/manage-booking/:token/reschedule
router.post('/:token/reschedule', async (req, res, next) => {
  try {
    const b = await loadByToken(req.params.token);
    const input = rescheduleSchema.parse(req.body ?? {});
    await rescheduleBookingByClient(b.id, input);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
