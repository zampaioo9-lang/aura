import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Preferencias de notificaciones de un perfil (BookingSettings.notificationPrefs). Cada una decide
 * si el sistema envia ese mensaje. Si no hay nada guardado, se usan los valores por defecto, que
 * reproducen el comportamiento que ya tenia Aliax (todo se enviaba) salvo el recordatorio de 1 hora,
 * que es nuevo y por eso viene apagado.
 */
export interface NotificationPrefs {
  clientConfirmation: boolean;   // Al paciente: confirmacion / solicitud recibida
  clientReminder24h: boolean;    // Al paciente: recordatorio 24 h antes
  clientReminder1h: boolean;     // Al paciente: recordatorio aprox. 1 h antes (correo)
  clientCancellation: boolean;   // Al paciente: aviso de cancelacion
  clientFeedback: boolean;       // Al paciente: solicitud de resena al completar la cita (plan Pro)
  profNewBooking: boolean;       // Al profesional: nueva reserva
  profCancellation: boolean;     // Al profesional: cancelacion de reserva
  profReschedule: boolean;       // Al profesional: un paciente cambio su cita a otro horario
  profWaitlist: boolean;         // Al profesional: alguien se apunto a la lista de espera
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  clientConfirmation: true,
  clientReminder24h: true,
  clientReminder1h: false,
  clientCancellation: true,
  clientFeedback: true,
  profNewBooking: true,
  profCancellation: true,
  profReschedule: true,
  profWaitlist: true,
};

export const NOTIFICATION_PREF_KEYS = Object.keys(DEFAULT_NOTIFICATION_PREFS) as (keyof NotificationPrefs)[];

/** Mezcla lo guardado con los valores por defecto. Ignora claves desconocidas y valores que no sean booleanos. */
export function resolveNotificationPrefs(raw: unknown): NotificationPrefs {
  const out: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (raw && typeof raw === 'object') {
    for (const key of NOTIFICATION_PREF_KEYS) {
      const value = (raw as Record<string, unknown>)[key];
      if (typeof value === 'boolean') out[key] = value;
    }
  }
  return out;
}

/** Preferencias + estado del canal de correo (interruptor "Email" de Notificaciones). */
export type ResolvedNotificationSettings = NotificationPrefs & { emailEnabled: boolean };

/** Lee las preferencias del perfil. Nunca lanza: si falla la lectura devuelve los valores por defecto. */
export async function getNotificationPrefs(profileId: string): Promise<ResolvedNotificationSettings> {
  try {
    const settings = await prisma.bookingSettings.findUnique({ where: { profileId }, select: { notificationPrefs: true, emailEnabled: true } });
    return { ...resolveNotificationPrefs(settings?.notificationPrefs), emailEnabled: settings?.emailEnabled ?? true };
  } catch (err) {
    console.error('[notificationPrefs] No se pudieron leer las preferencias (se usan las predeterminadas):', err instanceof Error ? err.message : err);
    return { ...DEFAULT_NOTIFICATION_PREFS, emailEnabled: true };
  }
}
