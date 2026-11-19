import { randomBytes } from 'crypto';

/**
 * Codigo secreto de cada cita (Booking.manageToken). Quien tiene el enlace puede ver su cita,
 * cancelarla o elegir otro horario, sin crear cuenta. Son 192 bits aleatorios: no se pueden adivinar.
 */
export function generateManageToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Enlace de la pagina publica donde el paciente gestiona su cita. */
export function manageBookingUrl(token: string, action?: 'cancelar' | 'reagendar'): string {
  const base = (process.env.FRONTEND_URL || 'https://www.aliax.io').replace(/\/$/, '');
  const url = `${base}/cita/${token}`;
  return action ? `${url}?accion=${action}` : url;
}
