import twilio from 'twilio';
import { env } from '../config/env';

const client = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

export interface WhatsAppResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export async function sendWhatsApp(to: string, message: string): Promise<WhatsAppResult> {
  if (!client || !env.TWILIO_WHATSAPP_NUMBER) {
    console.log(`[WhatsApp] Twilio not configured. To: ${to}\nMessage: ${message}`);
    return { success: true, sid: 'dev-no-whatsapp' };
  }

  try {
    const from = env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
      ? env.TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`;

    const result = await client.messages.create({
      from,
      to: `whatsapp:${to}`,
      body: message,
    });

    console.log(`[WhatsApp] Sent to ${to}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown error';
    console.error(`[WhatsApp] Failed to ${to}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ── Message Templates ──────────────────────────────────────────────

function formatDateES(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const templates = {
  newBooking: (data: {
    professionalName: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientNotes?: string | null;
    serviceName: string;
    date: Date | string;
    startTime: string;
    dashboardUrl: string;
  }) =>
    [
      `Nueva reserva en Aura!`,
      ``,
      `Hola ${data.professionalName}, tienes una nueva reserva:`,
      ``,
      `Cliente: ${data.clientName}`,
      `Email: ${data.clientEmail}`,
      `Telefono: ${data.clientPhone}`,
      `Servicio: ${data.serviceName}`,
      `Fecha: ${formatDateES(data.date)}`,
      `Hora: ${data.startTime}`,
      ...(data.clientNotes ? [`Notas: ${data.clientNotes}`] : []),
      ``,
      `Confirma aqui: ${data.dashboardUrl}`,
    ].join('\n'),

  confirmation: (data: {
    clientName: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) =>
    [
      `Reserva confirmada!`,
      ``,
      `Hola ${data.clientName}, tu cita ha sido confirmada:`,
      ``,
      `Profesional: ${data.professionalName}`,
      `Servicio: ${data.serviceName}`,
      `Fecha: ${formatDateES(data.date)}`,
      `Hora: ${data.startTime}`,
      ``,
      `Nos vemos pronto!`,
    ].join('\n'),

  reminder24h: (data: {
    clientName: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) =>
    [
      `Recordatorio de cita`,
      ``,
      `Hola ${data.clientName}, te recordamos tu cita de manana:`,
      ``,
      `Con: ${data.professionalName}`,
      `Servicio: ${data.serviceName}`,
      `Fecha: ${formatDateES(data.date)}`,
      `Hora: ${data.startTime}`,
      ``,
      `No olvides asistir!`,
    ].join('\n'),

  cancellation: (data: {
    recipientName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
    reason?: string | null;
  }) =>
    [
      `Cita cancelada`,
      ``,
      `Hola ${data.recipientName},`,
      ``,
      `Tu cita ha sido cancelada:`,
      ``,
      `Servicio: ${data.serviceName}`,
      `Fecha: ${formatDateES(data.date)}`,
      `Hora: ${data.startTime}`,
      ...(data.reason ? [`Motivo: ${data.reason}`] : []),
    ].join('\n'),
};
