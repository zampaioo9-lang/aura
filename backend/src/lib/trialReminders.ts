const HOUR = 60 * 60 * 1000;

export interface Window { from: Date; to: Date }

// Usuarios que se registraron hace entre 48 y 72 horas.
export function tryReminderWindow(now: Date = new Date()): Window {
  return { from: new Date(now.getTime() - 72 * HOUR), to: new Date(now.getTime() - 48 * HOUR) };
}

// Usuarios cuya prueba termina en las próximas 24 horas.
export function endingReminderWindow(now: Date = new Date()): Window {
  return { from: now, to: new Date(now.getTime() + 24 * HOUR) };
}
