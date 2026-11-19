import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_PROFESSIONAL_TIMEZONE,
  isValidTimeZone,
  localizeBookingTime,
} from './clientTimezone';
import { manageBookingUrl } from './manageToken';

const prisma = new PrismaClient();

/**
 * Datos que acompanan a los mensajes de cita que recibe el PACIENTE (confirmacion y recordatorio):
 * hora en su horario local, tipo de cita, enlace de la videollamada y botones de WhatsApp para
 * cancelar o reagendar con el profesional.
 */
export interface ClientBookingNotice {
  date: Date;
  startTime: string;
  modalityLabel: string | null;
  meetingLink: string | null;
  cancelUrl: string | null;
  rescheduleUrl: string | null;
}

/** Valores de Service.sessionModality: 'presencial' | 'online' | 'hibrida' (y las variantes en ingles que aun existen). */
function normalizeModality(m: string | null | undefined): 'presencial' | 'online' | 'hibrida' | null {
  const v = (m ?? '').toLowerCase();
  if (v === 'presencial' || v === 'in_person' || v === 'in-person') return 'presencial';
  if (v === 'online' || v === 'en_linea' || v === 'en línea') return 'online';
  if (v === 'hibrida' || v === 'híbrida' || v === 'hybrid') return 'hibrida';
  return null;
}

export function modalityLabel(m: string | null | undefined): string | null {
  switch (normalizeModality(m)) {
    case 'presencial': return 'Presencial';
    case 'online': return 'En línea (videollamada)';
    case 'hibrida': return 'Presencial o en línea';
    default: return null;
  }
}

/** Enlace de chat de WhatsApp con un mensaje ya escrito. Devuelve null si no hay un numero usable. */
export function whatsappChatUrl(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function longDate(date: Date): string {
  // La fecha viene a mediodia o medianoche UTC; se formatea en UTC para que no dependa de la zona del servidor.
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** Zonas horarias (profesional y paciente) y enlace de videollamada de una cita. Nunca lanza. */
export async function resolveBookingZones(booking: {
  profileId: string;
  professionalId: string;
  clientEmail: string | null;
}): Promise<{ professionalTz: string; clientTz: string | null; meetingLink: string | null }> {
  let professionalTz = DEFAULT_PROFESSIONAL_TIMEZONE;
  let clientTz: string | null = null;
  let meetingLink: string | null = null;
  try {
    const [settings, client] = await Promise.all([
      prisma.bookingSettings.findUnique({ where: { profileId: booking.profileId }, select: { timezone: true, meetingLink: true } }),
      booking.clientEmail?.trim()
        ? prisma.client.findFirst({
            where: { userId: booking.professionalId, email: { equals: booking.clientEmail.trim(), mode: 'insensitive' } },
            select: { timezone: true },
          })
        : Promise.resolve(null),
    ]);
    if (isValidTimeZone(settings?.timezone)) professionalTz = settings!.timezone;
    if (isValidTimeZone(client?.timezone)) clientTz = client!.timezone;
    meetingLink = settings?.meetingLink?.trim() || null;
  } catch (err) {
    console.error('[clientBookingNotice] No se pudieron leer los datos del paciente/agenda (se usan valores por defecto):', err instanceof Error ? err.message : err);
  }
  return { professionalTz, clientTz, meetingLink };
}

export async function getClientBookingNotice(
  booking: {
    profileId: string;
    professionalId: string;
    clientEmail: string | null;
    date: Date | string;
    startTime: string;
    manageToken?: string | null;
  },
  ctx: {
    professionalName: string;
    professionalPhone?: string | null;
    serviceModality?: string | null;
  },
): Promise<ClientBookingNotice> {
  const { professionalTz, clientTz, meetingLink: configuredLink } = await resolveBookingZones(booking);

  const local = localizeBookingTime(booking.date, booking.startTime, professionalTz, clientTz);

  const modality = normalizeModality(ctx.serviceModality);
  // El enlace se muestra en toda cita que no sea solo presencial.
  const meetingLink = modality === 'presencial' ? null : configuredLink;

  const when = `${longDate(local.date)} a las ${local.startTime}`;
  return {
    date: local.date,
    startTime: local.startTime,
    modalityLabel: modalityLabel(ctx.serviceModality),
    meetingLink,
    // Con codigo de la cita, los botones llevan a la pagina donde el paciente cancela o elige otro horario.
    // Sin codigo (citas muy antiguas) se usa el chat de WhatsApp con el profesional como respaldo.
    cancelUrl: booking.manageToken
      ? manageBookingUrl(booking.manageToken, 'cancelar')
      : whatsappChatUrl(ctx.professionalPhone, `Hola ${ctx.professionalName}, quiero cancelar mi cita del ${when}.`),
    rescheduleUrl: booking.manageToken
      ? manageBookingUrl(booking.manageToken, 'reagendar')
      : whatsappChatUrl(ctx.professionalPhone, `Hola ${ctx.professionalName}, quiero reagendar mi cita del ${when}.`),
  };
}

/** Enlace de videollamada de una cita para los correos al PROFESIONAL (null si el servicio es solo presencial o no hay enlace). */
export async function getMeetingLinkForBooking(
  booking: { profileId: string; professionalId: string; clientEmail: string | null },
  serviceModality?: string | null,
): Promise<string | null> {
  if (normalizeModality(serviceModality) === 'presencial') return null;
  const { meetingLink } = await resolveBookingZones(booking);
  return meetingLink;
}
