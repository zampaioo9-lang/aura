import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { sendWhatsApp, sendWhatsAppTemplate, templates, templateComponents } from './whatsappService';
import { sendEmail, emailTemplates } from './emailService';
import { env } from '../config/env';
import { isProUser } from '../lib/planUtils';
import { getBookingLocalTime, zonedWallTimeToInstant, isValidTimeZone, DEFAULT_PROFESSIONAL_TIMEZONE } from '../lib/clientTimezone';
import { getNotificationPrefs, resolveNotificationPrefs } from '../lib/notificationPrefs';
import { checkClientBookingLimits, checkClientCancellation, bookingStartInstant } from '../lib/bookingRules';
import { generateManageToken } from '../lib/manageToken';
import { getClientBookingNotice } from '../lib/clientBookingNotice';

const prisma = new PrismaClient();

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

// ── Helper: save notification ──────────────────────────────────────
async function saveNotification(
  bookingId: string,
  type: 'NEW_BOOKING' | 'CONFIRMATION' | 'REMINDER_24H' | 'REMINDER_1H' | 'CANCELLATION' | 'RESCHEDULED',
  recipient: string,
  message: string,
  result: { success: boolean; sid?: string; error?: string }
) {
  await prisma.notification.create({
    data: {
      bookingId,
      type,
      recipient,
      message,
      status: result.success ? 'SENT' : 'FAILED',
      sentAt: result.success ? new Date() : null,
      messageId: result.sid || null,
      error: result.error || null,
    },
  });
}

// ── Helper: detectar si un error al crear la reserva fue causado específicamente
// por el matchLeadId (FK inexistente → P2003, o ya vinculado a otra reserva → P2002,
// por el @unique de Booking.matchLeadId). Cualquier otro error (p.ej. un conflicto
// de disponibilidad real) debe propagarse normalmente. ──────────────────────────
function isMatchLeadIdConstraintError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;

  if (err.code === 'P2002') {
    const target = err.meta?.target;
    if (Array.isArray(target)) return target.includes('matchLeadId');
    if (typeof target === 'string') return target.includes('matchLeadId');
    return false;
  }

  if (err.code === 'P2003') {
    const fieldName = err.meta?.field_name;
    return typeof fieldName === 'string' && fieldName.includes('matchLeadId');
  }

  return false;
}

// ── checkAvailability ──────────────────────────────────────────────
export async function checkAvailability(
  profileId: string,
  serviceId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  ignoreBookingId?: string
): Promise<{ available: boolean; reason?: string }> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return { available: false, reason: 'Perfil no encontrado' };

  const bookingDate = new Date(date);
  const dayOfWeek = bookingDate.getDay();

  // ── Verificar anticipación mínima ──────────────────────────────
  const settings = await prisma.bookingSettings.findUnique({ where: { profileId } });
  if (settings) {
    // La hora de la cita esta en la zona horaria del profesional, no en la del servidor.
    const proTz = isValidTimeZone(settings.timezone) ? settings.timezone : DEFAULT_PROFESSIONAL_TIMEZONE;
    const bookingDateTime = zonedWallTimeToInstant(date, startTime, proTz);
    const hoursAhead = (bookingDateTime.getTime() - Date.now()) / 3_600_000;
    if (hoursAhead < settings.minAdvanceHours) {
      return { available: false, reason: `Se requiere al menos ${settings.minAdvanceHours}h de anticipación` };
    }
    const daysAhead = (bookingDateTime.getTime() - Date.now()) / 86_400_000;
    if (daysAhead > settings.advanceBookingDays) {
      return { available: false, reason: `Solo se puede reservar hasta ${settings.advanceBookingDays} días en el futuro` };
    }
  }

  // ── Verificar bloqueos de fechas ───────────────────────────────
  const startMins = timeToMinutes(startTime);
  const endMins   = startMins + durationMinutes;

  const blocks = await prisma.scheduleBlock.findMany({
    where: {
      profileId,
      startDate: { lte: bookingDate },
      endDate:   { gte: bookingDate },
    },
  });

  for (const block of blocks) {
    if (block.isAllDay) {
      return { available: false, reason: block.reason || 'El profesional no está disponible ese día' };
    }
    if (block.startTime && block.endTime) {
      const bs = timeToMinutes(block.startTime);
      const be = timeToMinutes(block.endTime);
      if (startMins < be && endMins > bs) {
        return { available: false, reason: block.reason || 'Horario bloqueado' };
      }
    }
  }

  // ── Verificar bloqueos semanales fijos (recurrentes) ────────────
  const recurringBlocks = await prisma.recurringScheduleBlock.findMany({
    where: { profileId, dayOfWeek },
  });
  for (const block of recurringBlocks) {
    const bs = timeToMinutes(block.startTime);
    const be = timeToMinutes(block.endTime);
    if (startMins < be && endMins > bs) {
      return { available: false, reason: block.reason || 'Horario bloqueado recurrentemente' };
    }
  }

  // ── Verificar disponibilidad semanal (horario propio del servicio, con fallback al general) ─
  const serviceSlots = await prisma.serviceAvailability.findMany({
    where: { serviceId, dayOfWeek, isActive: true },
    orderBy: { startTime: 'asc' },
  });

  const daySlots = serviceSlots.length > 0
    ? serviceSlots
    : await prisma.availabilitySlot.findMany({
        where: { profileId, dayOfWeek, isActive: true },
        orderBy: { startTime: 'asc' },
      });

  if (daySlots.length === 0) {
    return { available: false, reason: 'El profesional no atiende este dia' };
  }

  const fitsInSlot = daySlots.some(slot => {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd   = timeToMinutes(slot.endTime);
    return startMins >= slotStart && endMins <= slotEnd;
  });

  if (!fitsInSlot) {
    return { available: false, reason: 'El horario no esta dentro de las horas disponibles' };
  }

  // ── Verificar conflictos con otras reservas (incluyendo buffer) ─
  const bufferMins = settings?.bufferMinutes ?? 0;

  const existingBookings = await prisma.booking.findMany({
    where: {
      profileId,
      date: bookingDate,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
    },
  });

  const hasConflict = existingBookings.some(b => {
    const bStart = timeToMinutes(b.startTime) - bufferMins;
    const bEnd   = timeToMinutes(b.endTime)   + bufferMins;
    return startMins < bEnd && endMins > bStart;
  });

  // Con "Múltiples reservas por horario" activado, otra reserva en el mismo horario no es un conflicto.
  if (hasConflict && !settings?.multiplePerSlot) {
    return { available: false, reason: bufferMins > 0 ? `Se requieren ${bufferMins} min entre reservas` : 'El horario ya esta reservado' };
  }

  return { available: true };
}

// ── getAvailableSlots ──────────────────────────────────────────────
export async function getAvailableSlots(
  profileId: string,
  serviceId: string,
  date: string,
  ignoreBookingId?: string
): Promise<string[]> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) throw new AppError(404, 'Servicio no encontrado');
  if (service.profileId !== profileId) throw new AppError(400, 'El servicio no pertenece a este perfil');

  const duration    = service.durationMinutes;
  const bookingDate = new Date(date);
  const dayOfWeek   = bookingDate.getDay();

  // Settings del perfil (buffer, anticipación)
  const settings = await prisma.bookingSettings.findUnique({ where: { profileId } });
  const bufferMins = settings?.bufferMinutes ?? 0;

  // Verificar si el día está bloqueado
  const blocks = await prisma.scheduleBlock.findMany({
    where: { profileId, startDate: { lte: bookingDate }, endDate: { gte: bookingDate } },
  });
  const fullDayBlock = blocks.find(b => b.isAllDay);
  if (fullDayBlock) return [];

  const recurringBlocks = await prisma.recurringScheduleBlock.findMany({
    where: { profileId, dayOfWeek },
  });

  // Slots de disponibilidad: primero buscar slots específicos del servicio
  const serviceSlots = await prisma.serviceAvailability.findMany({
    where: { serviceId, dayOfWeek, isActive: true },
    orderBy: { startTime: 'asc' },
  });

  // Si el servicio tiene slots propios, usarlos; si no, usar los del perfil
  let windows: { startTime: string; endTime: string }[];
  if (serviceSlots.length > 0) {
    windows = serviceSlots;
  } else {
    const profileSlots = await prisma.availabilitySlot.findMany({
      where: { profileId, dayOfWeek, isActive: true },
      orderBy: { startTime: 'asc' },
    });
    windows = profileSlots;
  }

  if (windows.length === 0) return [];

  const existingBookings = await prisma.booking.findMany({
    where: { profileId, date: bookingDate, status: { in: ['PENDING', 'CONFIRMED'] }, ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}) },
  });

  const now = Date.now();
  const minAdvanceMs = (settings?.minAdvanceHours ?? 1) * 3_600_000;
  const maxAdvanceMs = (settings?.advanceBookingDays ?? 60) * 86_400_000;
  const proTz = settings && isValidTimeZone(settings.timezone) ? settings.timezone : DEFAULT_PROFESSIONAL_TIMEZONE;

  const available: string[] = [];

  for (const window of windows) {
    const windowStart = timeToMinutes(window.startTime);
    const windowEnd   = timeToMinutes(window.endTime);

    for (let start = windowStart; start + duration <= windowEnd; start += 15) {
      const end = start + duration;

      // Verificar anticipación mínima
      const slotDateTime = zonedWallTimeToInstant(date, minutesToTime(start), proTz).getTime();
      if (slotDateTime - now < minAdvanceMs) continue;
      if (slotDateTime - now > maxAdvanceMs) continue;

      // Verificar bloqueos parciales del día
      const blockedByPartial = blocks.some(b => {
        if (b.isAllDay || !b.startTime || !b.endTime) return false;
        const bs = timeToMinutes(b.startTime);
        const be = timeToMinutes(b.endTime);
        return start < be && end > bs;
      });
      if (blockedByPartial) continue;

      const blockedByRecurring = recurringBlocks.some(b => {
        const bs = timeToMinutes(b.startTime);
        const be = timeToMinutes(b.endTime);
        return start < be && end > bs;
      });
      if (blockedByRecurring) continue;

      // Verificar conflictos con reservas existentes (con buffer)
      const hasConflict = existingBookings.some(b => {
        const bStart = timeToMinutes(b.startTime) - bufferMins;
        const bEnd   = timeToMinutes(b.endTime)   + bufferMins;
        return start < bEnd && end > bStart;
      });

      if (!hasConflict || settings?.multiplePerSlot) {
        available.push(minutesToTime(start));
      }
    }
  }

  return available;
}

// ── createBooking ──────────────────────────────────────────────────
export async function createBooking(data: {
  profileId: string;
  serviceId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientNotes?: string;
  date: string;
  startTime: string;
  matchLeadId?: string;
}, options: { skipClientRequestEmail?: boolean; enforceClientLimits?: boolean } = {}) {
  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.isActive) throw new AppError(404, 'Servicio no encontrado');
  if (service.profileId !== data.profileId) throw new AppError(400, 'El servicio no pertenece a este perfil');

  const profile = await prisma.profile.findUnique({
    where: { id: data.profileId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          socialLinks: true,
          plan: true,
          planExpiresAt: true,
          isAdmin: true,
        },
      },
    },
  });
  if (!profile) throw new AppError(404, 'Perfil no encontrado');

  const endMins = timeToMinutes(data.startTime) + service.durationMinutes;
  const endTime = minutesToTime(endMins);

  const { available, reason } = await checkAvailability(
    data.profileId,
    data.serviceId,
    data.date,
    data.startTime,
    service.durationMinutes
  );
  if (!available) throw new AppError(409, reason || 'Horario no disponible');

  // Limites por paciente (maximo de reservas activas e intervalo minimo entre reservas). Aplican a las
  // reservas que hace el propio paciente; las que crea el profesional desde su panel no se limitan.
  if (options.enforceClientLimits !== false) {
    const rules = await prisma.bookingSettings.findUnique({
      where: { profileId: data.profileId },
      select: { maxActiveBookingsPerClient: true, minDaysBetweenBookings: true },
    });
    if (rules && (rules.maxActiveBookingsPerClient > 0 || rules.minDaysBetweenBookings > 0)) {
      const todayUtc = new Date(new Date().toISOString().slice(0, 10));
      const active = await prisma.booking.findMany({
        where: {
          profileId: data.profileId,
          clientEmail: { equals: data.clientEmail.trim(), mode: 'insensitive' },
          status: { in: ['PENDING', 'CONFIRMED'] },
          date: { gte: todayUtc },
        },
        select: { date: true },
      });
      const verdict = checkClientBookingLimits({
        maxActive: rules.maxActiveBookingsPerClient,
        minDays: rules.minDaysBetweenBookings,
        requestedDate: data.date,
        activeDates: active.map(a => a.date.toISOString().slice(0, 10)),
      });
      if (!verdict.ok) throw new AppError(409, verdict.reason);
    }
  }

  // El matchLeadId viene del flujo de Matching con IA y debe corresponder al mismo
  // perfil que el lead eligió — si no, se ignora el vínculo (la reserva igual se crea).
  let verifiedMatchLeadId: string | null = null;
  if (data.matchLeadId) {
    const lead = await prisma.matchLead.findUnique({
      where: { id: data.matchLeadId },
      select: { selectedProfileId: true },
    });
    if (lead && lead.selectedProfileId === data.profileId) {
      verifiedMatchLeadId = data.matchLeadId;
    } else {
      console.warn(
        `[Booking] matchLeadId ${data.matchLeadId} no corresponde al perfil ${data.profileId} (selectedProfileId=${lead?.selectedProfileId ?? 'lead no encontrado'}); se crea la reserva sin vincular el lead.`
      );
    }
  }

  const createBookingRow = (matchLeadId: string | null) =>
    prisma.booking.create({
      data: {
        profileId: data.profileId,
        serviceId: data.serviceId,
        professionalId: profile.userId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone || '',
        clientNotes: data.clientNotes || null,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime,
        status: 'PENDING',
        manageToken: generateManageToken(),
        matchLeadId,
      },
      include: {
        service: true,
        profile: { include: { user: { select: { name: true, email: true, phone: true } } } },
      },
    });

  let booking;
  try {
    booking = await createBookingRow(verifiedMatchLeadId);
  } catch (err) {
    // El matchLeadId es un dato secundario de atribución (viene del flujo de matching IA);
    // nunca debe tumbar la reserva real de un paciente. Si justo en este instante ya no
    // existe o ya fue vinculado a otra reserva (carrera entre la verificación de arriba
    // y este create), se reintenta la misma creación sin el lead.
    if (!verifiedMatchLeadId || !isMatchLeadIdConstraintError(err)) throw err;

    console.warn(
      `[Booking] matchLeadId invalido o ya vinculado a otra reserva (${(err as Prisma.PrismaClientKnownRequestError).code}); se crea la reserva sin vincular el lead. matchLeadId=${verifiedMatchLeadId} profileId=${data.profileId} serviceId=${data.serviceId} date=${data.date} startTime=${data.startTime}`
    );

    booking = await createBookingRow(null);
  }

  // Preferencias de notificaciones y confirmacion automatica de este perfil.
  const bookingCfg = await prisma.bookingSettings.findUnique({
    where: { profileId: data.profileId },
    select: { autoConfirm: true, notificationPrefs: true, emailEnabled: true },
  });
  const prefs = resolveNotificationPrefs(bookingCfg?.notificationPrefs);
  const emailOn = bookingCfg?.emailEnabled ?? true; // interruptor "Email" de Notificaciones
  // Si la cita la crea el propio profesional desde su panel, el ya sabe de ella: no se le avisa.
  const professionalCreated = !!options.skipClientRequestEmail;
  const autoConfirm = !!bookingCfg?.autoConfirm && !professionalCreated;

  // Send WhatsApp to professional — priority: AccountSettings WhatsApp > profile.phone > user.phone
  const userSocialLinks = profile.user.socialLinks as Record<string, string> | null;
  const professionalPhone = userSocialLinks?.whatsapp || profile.phone || profile.user.phone;
  console.log(`[Booking] Created ${booking.id} | professionalPhone: ${professionalPhone || 'NONE'} | profile.phone: ${profile.phone || 'null'} | user.phone: ${profile.user.phone || 'null'}`);
  if (!professionalCreated && prefs.profNewBooking && professionalPhone && isProUser(profile.user)) {
    // Intentar con plantilla aprobada, si falla usar texto libre
    const components = templateComponents.newBooking({
      professionalName: profile.user.name,
      clientName: data.clientName,
      serviceName: service.name,
      date: data.date,
      startTime: data.startTime,
    });

    let result = await sendWhatsAppTemplate(professionalPhone, 'nueva_reserva', 'es_MX', components);

    // Fallback a texto libre si la plantilla falla
    if (!result.success) {
      console.log(`[WhatsApp] Template falló (${result.error}), usando texto libre`);
      const message = templates.newBooking({
        professionalName: profile.user.name,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone || '',
        clientNotes: data.clientNotes,
        serviceName: service.name,
        date: data.date,
        startTime: data.startTime,
        dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
      });
      result = await sendWhatsApp(professionalPhone, message);
      await saveNotification(booking.id, 'NEW_BOOKING', professionalPhone, message, result);
    } else {
      await saveNotification(booking.id, 'NEW_BOOKING', professionalPhone, `[template:nueva_reserva]`, result);
    }

    if (result.success) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { whatsappNotified: true },
      });
    }
  } else if (professionalPhone && !isProUser(profile.user)) {
    console.log(`[WhatsApp] Skipped - user is not Pro. bookingId: ${booking.id}`);
  }

  // Email al profesional
  const professionalEmail = booking.profile.user.email;
  if (!professionalCreated && prefs.profNewBooking && emailOn && professionalEmail) {
    const tpl = emailTemplates.newBooking({
      professionalName: booking.profile.user.name,
      professionalEmail,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone || '',
      clientNotes: data.clientNotes,
      serviceName: booking.service.name,
      date: data.date,
      startTime: data.startTime,
      dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
      autoConfirmed: autoConfirm,
    });
    const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
    await saveNotification(booking.id, 'NEW_BOOKING', professionalEmail, tpl.subject, emailResult);
  }

  // Email al cliente: solicitud recibida (no aplica si el profesional creo la cita desde su panel:
  // en ese caso el paciente ya la pidio y recibe directamente la cita confirmada)
  if (data.clientEmail && !options.skipClientRequestEmail && !autoConfirm && prefs.clientConfirmation && emailOn) {
    // La hora se muestra en el horario local del paciente (si tiene otra zona horaria).
    const clientLocal = await getBookingLocalTime({
      profileId: booking.profileId,
      professionalId: booking.professionalId,
      clientEmail: data.clientEmail,
      date: booking.date,
      startTime: data.startTime,
    });
    const tpl = emailTemplates.bookingReceived({
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      professionalName: booking.profile.user.name,
      serviceName: booking.service.name,
      date: clientLocal.date,
      startTime: clientLocal.startTime,
    });
    const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
    await saveNotification(booking.id, 'NEW_BOOKING', data.clientEmail, tpl.subject, emailResult);
  }

  if (autoConfirm) {
    // "Confirmación automática": la reserva se confirma sola y el paciente recibe su confirmación.
    await confirmBooking(booking.id, profile.userId);
    return { ...booking, status: 'CONFIRMED' as const };
  }

  return booking;
}

// ── confirmBooking ─────────────────────────────────────────────────
export async function confirmBooking(bookingId: string, professionalId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      profile: { include: { user: { select: { name: true, email: true, phone: true, socialLinks: true } } } },
      service: true,
    },
  });
  if (!booking) throw new AppError(404, 'Reserva no encontrada');
  if (booking.profile.userId !== professionalId) throw new AppError(403, 'No autorizado');
  if (booking.status !== 'PENDING') throw new AppError(400, `No se puede confirmar una reserva en estado ${booking.status}`);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CONFIRMED' },
    include: { service: true, profile: { select: { title: true, slug: true } } },
  });

  // El cliente recibe la hora en su horario local (si su zona horaria es distinta a la del profesional).
  const clientLocal = await getClientBookingNotice(booking, {
    professionalName: booking.profile.user.name,
    professionalPhone: (booking.profile.user.socialLinks as Record<string, string> | null)?.whatsapp || booking.profile.phone || booking.profile.user.phone,
    serviceModality: booking.service.sessionModality,
  });
  const prefs = await getNotificationPrefs(booking.profileId);

  // Send WhatsApp confirmation to client
  if (prefs.clientConfirmation && booking.clientPhone) {
    const components = templateComponents.confirmation({
      clientName: booking.clientName,
      professionalName: booking.profile.user.name,
      serviceName: booking.service.name,
      date: clientLocal.date,
      startTime: clientLocal.startTime,
    });

    let result = await sendWhatsAppTemplate(booking.clientPhone, 'reserva_confirmada', 'es_MX', components);

    if (!result.success) {
      const message = templates.confirmation({
        clientName: booking.clientName,
        professionalName: booking.profile.user.name,
        serviceName: booking.service.name,
        date: clientLocal.date,
        startTime: clientLocal.startTime,
      });
      result = await sendWhatsApp(booking.clientPhone, message);
      await saveNotification(bookingId, 'CONFIRMATION', booking.clientPhone, message, result);
    } else {
      await saveNotification(bookingId, 'CONFIRMATION', booking.clientPhone, `[template:reserva_confirmada]`, result);
    }
  }

  // Email de confirmación al cliente
  if (prefs.clientConfirmation && prefs.emailEnabled && booking.clientEmail) {
    const tpl = emailTemplates.confirmation({
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      professionalName: booking.profile.user.name,
      serviceName: booking.service.name,
      date: clientLocal.date,
      startTime: clientLocal.startTime,
      details: clientLocal,
    });
    const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
    await saveNotification(bookingId, 'CONFIRMATION', booking.clientEmail, tpl.subject, emailResult);
  }

  return updated;
}

// ── Aviso al paciente cuando el profesional crea la cita desde su panel ──
// El paciente ya la pidio por otro medio (por ejemplo WhatsApp), asi que no recibe una "solicitud
// pendiente": recibe la cita confirmada con su hora local, el tipo de cita, el enlace de la
// videollamada y botones de WhatsApp para cancelar o reagendar.
export async function sendClientConfirmationForProfessionalBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      profile: { include: { user: { select: { name: true, email: true, phone: true, socialLinks: true } } } },
    },
  });
  if (!booking || !booking.clientEmail) return;

  const settings = await prisma.bookingSettings.findUnique({ where: { profileId: booking.profileId }, select: { emailEnabled: true } });
  if (settings && settings.emailEnabled === false) return;
  if (!(await getNotificationPrefs(booking.profileId)).clientConfirmation) return;

  const notice = await getClientBookingNotice(booking, {
    professionalName: booking.profile.user.name,
    professionalPhone: (booking.profile.user.socialLinks as Record<string, string> | null)?.whatsapp || booking.profile.phone || booking.profile.user.phone,
    serviceModality: booking.service.sessionModality,
  });
  const tpl = emailTemplates.confirmation({
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    professionalName: booking.profile.user.name,
    serviceName: booking.service.name,
    date: notice.date,
    startTime: notice.startTime,
    details: notice,
  });
  const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
  await saveNotification(bookingId, 'CONFIRMATION', booking.clientEmail, tpl.subject, emailResult);
}

// ── cancelBooking ──────────────────────────────────────────────────
export async function cancelBooking(
  bookingId: string,
  cancelledBy: 'client' | 'professional',
  reason?: string,
  userId?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      profile: { include: { user: { select: { name: true, email: true, phone: true, socialLinks: true } } } },
      service: true,
    },
  });
  if (!booking) throw new AppError(404, 'Reserva no encontrada');

  if (cancelledBy === 'professional' && booking.profile.userId !== userId) {
    throw new AppError(403, 'No autorizado');
  }

  if (booking.status === 'CANCELLED') throw new AppError(400, 'La reserva ya esta cancelada');
  if (booking.status === 'COMPLETED') throw new AppError(400, 'No se puede cancelar una reserva completada');

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: reason || null,
    },
    include: { service: true, profile: { select: { title: true, slug: true } } },
  });

  // Notify both parties
  const cancelData = {
    serviceName: booking.service.name,
    date: booking.date,
    startTime: booking.startTime,
    reason,
  };

  // El cliente recibe la hora en su horario local (si su zona horaria es distinta a la del profesional).
  const clientLocal = await getBookingLocalTime(booking);
  const prefs = await getNotificationPrefs(booking.profileId);

  // Notify client
  if (prefs.clientCancellation && booking.clientPhone) {
    const components = templateComponents.cancellation({
      recipientName: booking.clientName,
      professionalName: booking.profile.user.name,
      serviceName: booking.service.name,
      date: clientLocal.date,
      startTime: clientLocal.startTime,
    });
    let clientResult = await sendWhatsAppTemplate(booking.clientPhone, 'cita_cancelada', 'es_MX', components);
    if (!clientResult.success) {
      const clientMsg = templates.cancellation({ recipientName: booking.clientName, ...cancelData, date: clientLocal.date, startTime: clientLocal.startTime });
      clientResult = await sendWhatsApp(booking.clientPhone, clientMsg);
      await saveNotification(bookingId, 'CANCELLATION', booking.clientPhone, clientMsg, clientResult);
    } else {
      await saveNotification(bookingId, 'CANCELLATION', booking.clientPhone, `[template:cita_cancelada]`, clientResult);
    }
  }

  // Notify professional — priority: AccountSettings WhatsApp > profile.phone > user.phone
  const cancelSocialLinks = booking.profile.user.socialLinks as Record<string, string> | null;
  const professionalPhone = cancelSocialLinks?.whatsapp || booking.profile.phone || booking.profile.user.phone;
  if (prefs.profCancellation && professionalPhone) {
    const components = templateComponents.cancellation({
      recipientName: booking.profile.user.name,
      professionalName: booking.clientName,
      serviceName: booking.service.name,
      date: booking.date,
      startTime: booking.startTime,
    });
    let profResult = await sendWhatsAppTemplate(professionalPhone, 'cita_cancelada', 'es_MX', components);
    if (!profResult.success) {
      const profMsg = templates.cancellation({ recipientName: booking.profile.user.name, ...cancelData });
      profResult = await sendWhatsApp(professionalPhone, profMsg);
      await saveNotification(bookingId, 'CANCELLATION', professionalPhone, profMsg, profResult);
    } else {
      await saveNotification(bookingId, 'CANCELLATION', professionalPhone, `[template:cita_cancelada]`, profResult);
    }
  }

  // Emails de cancelación
  if (prefs.clientCancellation && prefs.emailEnabled && booking.clientEmail) {
    const tpl = emailTemplates.cancellationClient({
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      professionalName: booking.profile.user.name,
      serviceName: booking.service.name,
      date: clientLocal.date,
      startTime: clientLocal.startTime,
      reason,
    });
    const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
    await saveNotification(bookingId, 'CANCELLATION', booking.clientEmail, tpl.subject, emailResult);
  }

  const professionalEmail = booking.profile.user.email;
  if (prefs.profCancellation && prefs.emailEnabled && professionalEmail && cancelledBy === 'client') {
    const tpl = emailTemplates.cancellationProfessional({
      professionalName: booking.profile.user.name,
      professionalEmail,
      clientName: booking.clientName,
      serviceName: booking.service.name,
      date: booking.date,
      startTime: booking.startTime,
      reason,
    });
    const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
    await saveNotification(bookingId, 'CANCELLATION', professionalEmail, tpl.subject, emailResult);
  }

  return updated;
}

// ── Reagendar: el paciente cambia su cita a otro horario desde el enlace de su cita ──
// Reglas: la cita debe estar pendiente o confirmada y no haber pasado; se aplican "Permitir cancelaciones"
// y el plazo de "Cancelación permitida hasta" (mismas reglas que cancelar); el nuevo horario debe estar libre.
// Se avisa al paciente (nuevo horario en su hora local) y al profesional (si tiene activado el aviso).
export async function rescheduleBookingByClient(bookingId: string, input: { date: string; startTime: string }) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      profile: { include: { user: { select: { name: true, email: true, phone: true, socialLinks: true } } } },
    },
  });
  if (!booking) throw new AppError(404, 'Reserva no encontrada');
  if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') throw new AppError(400, 'Esta cita ya no se puede cambiar');

  const cfg = await prisma.bookingSettings.findUnique({
    where: { profileId: booking.profileId },
    select: { allowClientCancel: true, cancellationHours: true, timezone: true },
  });
  const tz = cfg && isValidTimeZone(cfg.timezone) ? cfg.timezone : DEFAULT_PROFESSIONAL_TIMEZONE;
  const currentStart = bookingStartInstant(booking.date, booking.startTime, tz);
  if (currentStart.getTime() <= Date.now()) throw new AppError(400, 'Esta cita ya pasó y no se puede cambiar');
  if (cfg) {
    const verdict = checkClientCancellation({
      allowClientCancel: cfg.allowClientCancel,
      cancellationHours: cfg.cancellationHours,
      start: currentStart,
      action: 'reagendar',
    });
    if (!verdict.ok) throw new AppError(403, verdict.reason);
  }

  if (booking.date.toISOString().slice(0, 10) === input.date && booking.startTime === input.startTime) {
    throw new AppError(400, 'Elige un horario distinto al actual');
  }

  const { available, reason } = await checkAvailability(
    booking.profileId, booking.serviceId, input.date, input.startTime, booking.service.durationMinutes, booking.id,
  );
  if (!available) throw new AppError(409, reason || 'Horario no disponible');

  const endTime = minutesToTime(timeToMinutes(input.startTime) + booking.service.durationMinutes);
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { date: new Date(input.date), startTime: input.startTime, endTime },
    include: { service: true, profile: { select: { title: true, slug: true } } },
  });

  // Los recordatorios ya enviados eran de la fecha anterior: se borran para que se vuelvan a enviar para la nueva.
  await prisma.notification.deleteMany({ where: { bookingId: booking.id, type: { in: ['REMINDER_24H', 'REMINDER_1H'] } } });

  const prefs = await getNotificationPrefs(booking.profileId);
  const links = booking.profile.user.socialLinks as Record<string, string> | null;
  const professionalPhone = links?.whatsapp || booking.profile.phone || booking.profile.user.phone;
  const professionalName = booking.profile.user.name;

  if (prefs.clientConfirmation && prefs.emailEnabled && booking.clientEmail) {
    const notice = await getClientBookingNotice(
      { ...booking, date: updated.date, startTime: updated.startTime },
      { professionalName, professionalPhone, serviceModality: booking.service.sessionModality },
    );
    const tpl = emailTemplates.rescheduledClient({
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      professionalName,
      serviceName: booking.service.name,
      date: notice.date,
      startTime: notice.startTime,
      details: notice,
    });
    const result = await sendEmail(tpl.to, tpl.subject, tpl.html);
    await saveNotification(booking.id, 'RESCHEDULED', booking.clientEmail, tpl.subject, result);
  }

  const professionalEmail = booking.profile.user.email;
  if (prefs.profReschedule && prefs.emailEnabled && professionalEmail) {
    const tpl = emailTemplates.rescheduledProfessional({
      professionalName,
      professionalEmail,
      clientName: booking.clientName,
      serviceName: booking.service.name,
      oldDate: booking.date,
      oldStartTime: booking.startTime,
      newDate: updated.date,
      newStartTime: updated.startTime,
    });
    const result = await sendEmail(tpl.to, tpl.subject, tpl.html);
    await saveNotification(booking.id, 'RESCHEDULED', professionalEmail, tpl.subject, result);
  }

  return updated;
}

// ── completeBooking ────────────────────────────────────────────────
export async function completeBooking(bookingId: string, professionalId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      profile: {
        include: { user: { select: { plan: true, planExpiresAt: true, isAdmin: true } } },
      },
    },
  });
  if (!booking) throw new AppError(404, 'Reserva no encontrada');
  if (booking.profile.userId !== professionalId) throw new AppError(403, 'No autorizado');
  if (booking.status !== 'CONFIRMED') throw new AppError(400, `No se puede completar una reserva en estado ${booking.status}`);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'COMPLETED' },
    include: { service: true, profile: { select: { title: true, slug: true } } },
  });

  // Solo enviar email de reseña si el profesional tiene plan Pro
  const feedbackPrefs = await getNotificationPrefs(booking.profileId);
  if (isProUser(booking.profile.user) && feedbackPrefs.clientFeedback && feedbackPrefs.emailEnabled) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const reviewToken = await prisma.reviewToken.create({
        data: { bookingId, expiresAt },
      });

      const reviewUrl = `${process.env.FRONTEND_URL || 'https://www.aliax.io'}/review/${reviewToken.token}`;
      const tpl = emailTemplates.reviewRequest({
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        professionalName: booking.profile.title,
        reviewUrl,
      });
      await sendEmail(tpl.to, tpl.subject, tpl.html);
    } catch (emailErr) {
      console.error('[Reviews] Error al enviar email de reseña:', emailErr);
    }
  }

  return updated;
}

// ── markNoShow ─────────────────────────────────────────────────────
export async function markNoShow(bookingId: string, professionalId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { profile: true },
  });
  if (!booking) throw new AppError(404, 'Reserva no encontrada');
  if (booking.profile.userId !== professionalId) throw new AppError(403, 'No autorizado');
  if (booking.status !== 'CONFIRMED') throw new AppError(400, `Solo se puede marcar NO_SHOW en reservas confirmadas`);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'NO_SHOW' },
    include: { service: true, profile: { select: { title: true, slug: true } } },
  });

  return updated;
}
