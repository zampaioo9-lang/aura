import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Zona horaria con la que el profesional agenda (BookingSettings.timezone). Las horas guardadas
 * en Booking.startTime estan en esta zona. Si el paciente tiene otra zona (Client.timezone), los
 * mensajes que le llegan a EL (recordatorios, confirmacion, cancelacion, solicitud recibida) se
 * muestran convertidos a su hora local, con una etiqueta explicita ("hora de Paris").
 */
export const DEFAULT_PROFESSIONAL_TIMEZONE = 'America/Mexico_City';

const TZ_LABELS: Record<string, string> = {
  'Europe/Paris': 'París',
  'Europe/Madrid': 'Madrid',
  'Europe/London': 'Londres',
  'Europe/Berlin': 'Berlín',
  'Europe/Rome': 'Roma',
  'Europe/Lisbon': 'Lisboa',
  'Europe/Brussels': 'Bruselas',
  'Europe/Amsterdam': 'Ámsterdam',
  'Europe/Zurich': 'Zúrich',
  'America/New_York': 'Nueva York',
  'America/Chicago': 'Chicago',
  'America/Denver': 'Denver',
  'America/Los_Angeles': 'Los Ángeles',
  'America/Mexico_City': 'Ciudad de México',
  'America/Cancun': 'Cancún',
  'America/Tijuana': 'Tijuana',
  'America/Bogota': 'Bogotá',
  'America/Lima': 'Lima',
  'America/Santiago': 'Santiago de Chile',
  'America/Argentina/Buenos_Aires': 'Buenos Aires',
  'America/Sao_Paulo': 'São Paulo',
  'America/Caracas': 'Caracas',
  'America/Montevideo': 'Montevideo',
  'America/Guatemala': 'Guatemala',
  'America/Costa_Rica': 'Costa Rica',
  'America/Panama': 'Panamá',
};

/** True si `tz` es una zona horaria IANA valida (la que entiende Intl). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat('es', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "Europe/Paris" -> "París"; las zonas que no estan en el mapa usan el nombre de la ciudad del identificador. */
export function timeZoneLabel(tz: string): string {
  if (TZ_LABELS[tz]) return TZ_LABELS[tz];
  const city = tz.split('/').pop() ?? tz;
  return city.replace(/_/g, ' ');
}

function wallClockInZone(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

/**
 * Convierte una hora de reloj en `tz` ("YYYY-MM-DD" + "HH:mm") al instante real (UTC) que le
 * corresponde. Se itera dos veces para acertar tambien en los dias de cambio de horario.
 */
export function zonedWallTimeToInstant(dateISO: string, time: string, tz: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const target = Date.UTC(y, m - 1, d, h, mi);
  let instant = target;
  for (let i = 0; i < 2; i++) {
    const w = wallClockInZone(new Date(instant), tz);
    const shown = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s);
    instant -= shown - target;
  }
  return new Date(instant);
}

function toDateISO(date: Date | string): string {
  return typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
}

export interface LocalizedBookingTime {
  date: Date;
  startTime: string;
}

/**
 * Devuelve fecha y hora listas para mostrar al cliente. Si el cliente no tiene zona propia o es
 * la misma del profesional, no cambia nada. Si es distinta, convierte (la fecha tambien puede
 * cambiar de dia) y agrega la etiqueta "(hora de <ciudad>)" a la hora.
 */
export function localizeBookingTime(
  date: Date | string,
  startTime: string,
  professionalTz: string,
  clientTz: string | null | undefined,
): LocalizedBookingTime {
  const original: LocalizedBookingTime = {
    date: typeof date === 'string' ? new Date(`${date.slice(0, 10)}T00:00:00.000Z`) : date,
    startTime,
  };
  if (!clientTz || clientTz === professionalTz) return original;

  const instant = zonedWallTimeToInstant(toDateISO(date), startTime, professionalTz);
  const w = wallClockInZone(instant, clientTz);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    // Mediodia UTC para que la fecha se vea igual en cualquier zona del servidor.
    date: new Date(Date.UTC(w.y, w.mo - 1, w.d, 12, 0, 0)),
    startTime: `${pad(w.h)}:${pad(w.mi)} (hora de ${timeZoneLabel(clientTz)})`,
  };
}

/**
 * Busca las zonas horarias (profesional y paciente) y devuelve fecha y hora para el CLIENTE.
 * Nunca lanza: si algo falla, devuelve la hora original para no bloquear el envio del mensaje.
 */
export async function getBookingLocalTime(booking: {
  profileId: string;
  professionalId: string;
  clientEmail: string | null;
  date: Date | string;
  startTime: string;
}): Promise<LocalizedBookingTime> {
  try {
    const [settings, client] = await Promise.all([
      prisma.bookingSettings.findUnique({ where: { profileId: booking.profileId }, select: { timezone: true } }),
      booking.clientEmail?.trim()
        ? prisma.client.findFirst({
            where: { userId: booking.professionalId, email: { equals: booking.clientEmail.trim(), mode: 'insensitive' } },
            select: { timezone: true },
          })
        : Promise.resolve(null),
    ]);
    const professionalTz = isValidTimeZone(settings?.timezone) ? settings!.timezone : DEFAULT_PROFESSIONAL_TIMEZONE;
    const clientTz = isValidTimeZone(client?.timezone) ? client!.timezone : null;
    return localizeBookingTime(booking.date, booking.startTime, professionalTz, clientTz);
  } catch (err) {
    console.error('[clientTimezone] No se pudo convertir la hora al horario del cliente (se usa la original):', err instanceof Error ? err.message : err);
    return localizeBookingTime(booking.date, booking.startTime, DEFAULT_PROFESSIONAL_TIMEZONE, null);
  }
}
