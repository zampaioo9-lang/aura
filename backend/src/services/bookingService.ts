import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { sendWhatsApp, templates } from './whatsappService';
import { env } from '../config/env';

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
  type: 'NEW_BOOKING' | 'CONFIRMATION' | 'REMINDER_24H' | 'CANCELLATION',
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

// ── checkAvailability ──────────────────────────────────────────────
export async function checkAvailability(
  profileId: string,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<{ available: boolean; reason?: string }> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return { available: false, reason: 'Perfil no encontrado' };

  const bookingDate = new Date(date);
  const dayOfWeek = bookingDate.getDay();

  // ── Verificar anticipación mínima ──────────────────────────────
  const settings = await prisma.bookingSettings.findUnique({ where: { profileId } });
  if (settings) {
    const bookingDateTime = new Date(`${date}T${startTime}:00`);
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

  // ── Verificar disponibilidad semanal ───────────────────────────
  const daySlots = await prisma.availabilitySlot.findMany({
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
    },
  });

  const hasConflict = existingBookings.some(b => {
    const bStart = timeToMinutes(b.startTime) - bufferMins;
    const bEnd   = timeToMinutes(b.endTime)   + bufferMins;
    return startMins < bEnd && endMins > bStart;
  });

  if (hasConflict) {
    return { available: false, reason: bufferMins > 0 ? `Se requieren ${bufferMins} min entre reservas` : 'El horario ya esta reservado' };
  }

  return { available: true };
}

// ── getAvailableSlots ──────────────────────────────────────────────
export async function getAvailableSlots(
  profileId: string,
  serviceId: string,
  date: string
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
    where: { profileId, date: bookingDate, status: { in: ['PENDING', 'CONFIRMED'] } },
  });

  const now = Date.now();
  const minAdvanceMs = (settings?.minAdvanceHours ?? 1) * 3_600_000;

  const available: string[] = [];

  for (const window of windows) {
    const windowStart = timeToMinutes(window.startTime);
    const windowEnd   = timeToMinutes(window.endTime);

    for (let start = windowStart; start + duration <= windowEnd; start += 15) {
      const end = start + duration;

      // Verificar anticipación mínima
      const slotDateTime = new Date(`${date}T${minutesToTime(start)}:00`).getTime();
      if (slotDateTime - now < minAdvanceMs) continue;

      // Verificar bloqueos parciales del día
      const blockedByPartial = blocks.some(b => {
        if (b.isAllDay || !b.startTime || !b.endTime) return false;
        const bs = timeToMinutes(b.startTime);
        const be = timeToMinutes(b.endTime);
        return start < be && end > bs;
      });
      if (blockedByPartial) continue;

      // Verificar conflictos con reservas existentes (con buffer)
      const hasConflict = existingBookings.some(b => {
        const bStart = timeToMinutes(b.startTime) - bufferMins;
        const bEnd   = timeToMinutes(b.endTime)   + bufferMins;
        return start < bEnd && end > bStart;
      });

      if (!hasConflict) {
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
  clientPhone: string;
  clientNotes?: string;
  date: string;
  startTime: string;
}) {
  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.isActive) throw new AppError(404, 'Servicio no encontrado');
  if (service.profileId !== data.profileId) throw new AppError(400, 'El servicio no pertenece a este perfil');

  const profile = await prisma.profile.findUnique({
    where: { id: data.profileId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!profile) throw new AppError(404, 'Perfil no encontrado');

  const endMins = timeToMinutes(data.startTime) + service.durationMinutes;
  const endTime = minutesToTime(endMins);

  const { available, reason } = await checkAvailability(
    data.profileId,
    data.date,
    data.startTime,
    service.durationMinutes
  );
  if (!available) throw new AppError(409, reason || 'Horario no disponible');

  const booking = await prisma.booking.create({
    data: {
      profileId: data.profileId,
      serviceId: data.serviceId,
      professionalId: profile.userId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientNotes: data.clientNotes || null,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime,
      status: 'PENDING',
    },
    include: {
      service: true,
      profile: { include: { user: { select: { name: true, email: true, phone: true } } } },
    },
  });

  // Send WhatsApp to professional (non-blocking)
  const professionalPhone = profile.user.phone || profile.phone;
  console.log(`[Booking] Created ${booking.id} | professionalPhone: ${professionalPhone || 'NONE'} | user.phone: ${profile.user.phone || 'null'} | profile.phone: ${profile.phone || 'null'}`);
  if (professionalPhone) {
    const message = templates.newBooking({
      professionalName: profile.user.name,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientNotes: data.clientNotes,
      serviceName: service.name,
      date: data.date,
      startTime: data.startTime,
      dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
    });

    const result = await sendWhatsApp(professionalPhone, message);
    await saveNotification(booking.id, 'NEW_BOOKING', professionalPhone, message, result);

    if (result.success) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { whatsappNotified: true },
      });
    }
  }

  return booking;
}

// ── confirmBooking ─────────────────────────────────────────────────
export async function confirmBooking(bookingId: string, professionalId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      profile: { include: { user: { select: { name: true } } } },
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

  // Send WhatsApp confirmation to client
  if (booking.clientPhone) {
    const message = templates.confirmation({
      clientName: booking.clientName,
      professionalName: booking.profile.user.name,
      serviceName: booking.service.name,
      date: booking.date,
      startTime: booking.startTime,
    });

    const result = await sendWhatsApp(booking.clientPhone, message);
    await saveNotification(bookingId, 'CONFIRMATION', booking.clientPhone, message, result);
  }

  return updated;
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
      profile: { include: { user: { select: { name: true, phone: true } } } },
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

  // Notify client
  if (booking.clientPhone) {
    const clientMsg = templates.cancellation({
      recipientName: booking.clientName,
      ...cancelData,
    });
    const clientResult = await sendWhatsApp(booking.clientPhone, clientMsg);
    await saveNotification(bookingId, 'CANCELLATION', booking.clientPhone, clientMsg, clientResult);
  }

  // Notify professional
  const professionalPhone = booking.profile.user.phone || booking.profile.phone;
  if (professionalPhone) {
    const profMsg = templates.cancellation({
      recipientName: booking.profile.user.name,
      ...cancelData,
    });
    const profResult = await sendWhatsApp(professionalPhone, profMsg);
    await saveNotification(bookingId, 'CANCELLATION', professionalPhone, profMsg, profResult);
  }

  return updated;
}

// ── completeBooking ────────────────────────────────────────────────
export async function completeBooking(bookingId: string, professionalId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { profile: true },
  });
  if (!booking) throw new AppError(404, 'Reserva no encontrada');
  if (booking.profile.userId !== professionalId) throw new AppError(403, 'No autorizado');
  if (booking.status !== 'CONFIRMED') throw new AppError(400, `No se puede completar una reserva en estado ${booking.status}`);

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'COMPLETED' },
    include: { service: true, profile: { select: { title: true, slug: true } } },
  });

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
