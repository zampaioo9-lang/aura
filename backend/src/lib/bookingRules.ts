import { zonedWallTimeToInstant } from './clientTimezone';

/** Instante real en que empieza una cita, a partir de su fecha, su hora y la zona horaria del profesional. */
export function bookingStartInstant(date: Date | string, startTime: string, professionalTz: string): Date {
  const dateISO = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  return zonedWallTimeToInstant(dateISO, startTime, professionalTz);
}

export type RuleVerdict = { ok: true } | { ok: false; reason: string };

/**
 * Cancelacion hecha por el paciente: depende de "Permitir cancelaciones" (allowClientCancel) y de
 * "Cancelación permitida hasta" (cancellationHours; 0 = sin limite). El profesional siempre puede cancelar.
 */
export function checkClientCancellation(opts: {
  allowClientCancel: boolean;
  cancellationHours: number;
  start: Date;
  now?: Date;
  /** Para redactar el mensaje: 'cancelar' (por defecto) o 'reagendar'. Las dos acciones comparten la regla y el plazo. */
  action?: 'cancelar' | 'reagendar';
}): RuleVerdict {
  const verb = opts.action === 'reagendar' ? 'cambiar tu cita' : 'cancelar';
  if (!opts.allowClientCancel) {
    return { ok: false, reason: 'Este profesional no permite cancelar ni reagendar desde aquí. Contáctalo directamente para cambiar tu cita.' };
  }
  if (opts.cancellationHours > 0) {
    const now = opts.now ?? new Date();
    const hoursLeft = (opts.start.getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft < opts.cancellationHours) {
      return {
        ok: false,
        reason: `Solo puedes ${verb} hasta ${opts.cancellationHours} ${opts.cancellationHours === 1 ? 'hora' : 'horas'} antes de la cita. Contacta al profesional si necesitas cambiarla.`,
      };
    }
  }
  return { ok: true };
}

/**
 * Limites por paciente al reservar: maximo de reservas activas (maxActive; 0 = sin limite) e intervalo
 * minimo en dias entre reservas (minDays; 0 = sin restriccion). `activeDates` son las fechas
 * (YYYY-MM-DD) de las reservas pendientes o confirmadas que el paciente ya tiene a futuro.
 */
export function checkClientBookingLimits(opts: {
  maxActive: number;
  minDays: number;
  requestedDate: string;
  activeDates: string[];
}): RuleVerdict {
  if (opts.maxActive > 0 && opts.activeDates.length >= opts.maxActive) {
    return {
      ok: false,
      reason: `Ya tienes ${opts.activeDates.length} ${opts.activeDates.length === 1 ? 'reserva activa' : 'reservas activas'} con este profesional (el máximo permitido es ${opts.maxActive}).`,
    };
  }
  if (opts.minDays > 0) {
    const requested = Date.parse(`${opts.requestedDate.slice(0, 10)}T00:00:00Z`);
    for (const d of opts.activeDates) {
      const other = Date.parse(`${d.slice(0, 10)}T00:00:00Z`);
      const diffDays = Math.abs(requested - other) / 86_400_000;
      if (diffDays < opts.minDays) {
        return {
          ok: false,
          reason: `Debe haber al menos ${opts.minDays} ${opts.minDays === 1 ? 'día' : 'días'} entre tus reservas con este profesional.`,
        };
      }
    }
  }
  return { ok: true };
}
