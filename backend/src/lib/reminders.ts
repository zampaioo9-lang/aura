import { PrismaClient } from '@prisma/client';
import { bookingStartInstant, isWithinReminder24hWindow } from './bookingRules';
import { DEFAULT_PROFESSIONAL_TIMEZONE, isValidTimeZone } from './clientTimezone';

const prisma = new PrismaClient();

/**
 * Citas confirmadas a las que les toca el recordatorio de 24 h en esta ejecucion del cron (que corre cada hora).
 *
 * "24 h antes" se calcula con la hora REAL de inicio de la cita: la hora guardada esta en la zona horaria del
 * profesional (BookingSettings.timezone) y se convierte a un instante. Asi el recordatorio sale ~24 h antes sin
 * importar en que zona esten el profesional o el paciente (cada quien ve la hora en su zona dentro del correo).
 * Antes se decidia por la fecha en UTC y llegaba ~38 h antes (o de madrugada para un paciente en Europa).
 *
 * `profileId` es opcional: las pruebas lo usan para revisar solo datos de prueba.
 */
export async function findBookingsDueFor24hReminder(now: Date = new Date(), profileId?: string) {
  const candidates = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      ...(profileId ? { profileId } : {}),
      // Margen amplio sobre la fecha guardada (medianoche UTC); el filtro fino se hace con la hora real.
      date: { gte: new Date(now.getTime() - 86_400_000), lte: new Date(now.getTime() + 3 * 86_400_000) },
    },
    include: {
      service: true,
      profile: { include: { user: { select: { name: true, email: true, phone: true, socialLinks: true } } } },
    },
  });

  const tzByProfile = new Map<string, string>();
  const due: typeof candidates = [];
  for (const b of candidates) {
    let tz = tzByProfile.get(b.profileId);
    if (!tz) {
      const cfg = await prisma.bookingSettings.findUnique({ where: { profileId: b.profileId }, select: { timezone: true } });
      tz = cfg && isValidTimeZone(cfg.timezone) ? cfg.timezone : DEFAULT_PROFESSIONAL_TIMEZONE;
      tzByProfile.set(b.profileId, tz);
    }
    const minutesLeft = (bookingStartInstant(b.date, b.startTime, tz).getTime() - now.getTime()) / 60_000;
    if (isWithinReminder24hWindow(minutesLeft)) due.push(b);
  }
  return due;
}
