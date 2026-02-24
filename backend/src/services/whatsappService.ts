import { env } from '../config/env';

export interface WhatsAppResult {
  success: boolean;
  sid?: string;
  error?: string;
}

// ── Send free-form text (works within 24h session window) ──────────
export async function sendWhatsApp(to: string, message: string): Promise<WhatsAppResult> {
  if (!env.META_WA_TOKEN || !env.META_WA_PHONE_NUMBER_ID) {
    console.log(`[WhatsApp] Meta no configurado. To: ${to}\nMessage: ${message}`);
    return { success: true, sid: 'dev-no-whatsapp' };
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${env.META_WA_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.META_WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error(`[WhatsApp] Failed to ${to}:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    const msgId = data?.messages?.[0]?.id || 'unknown';
    console.log(`[WhatsApp] Sent to ${to}: ${msgId}`);
    return { success: true, sid: msgId };
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown error';
    console.error(`[WhatsApp] Failed to ${to}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ── Send template message (for outbound notifications) ─────────────
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components: any[]
): Promise<WhatsAppResult> {
  if (!env.META_WA_TOKEN || !env.META_WA_PHONE_NUMBER_ID) {
    console.log(`[WhatsApp] Meta no configurado. Template: ${templateName} To: ${to}`);
    return { success: true, sid: 'dev-no-whatsapp' };
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${env.META_WA_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.META_WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error(`[WhatsApp] Template failed to ${to}:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    const msgId = data?.messages?.[0]?.id || 'unknown';
    console.log(`[WhatsApp] Template "${templateName}" sent to ${to}: ${msgId}`);
    return { success: true, sid: msgId };
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown error';
    console.error(`[WhatsApp] Template failed to ${to}:`, errorMsg);
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

// Template components para Meta (una vez aprobadas las plantillas)
export const templateComponents = {
  newBooking: (data: {
    professionalName: string;
    clientName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: data.professionalName },
        { type: 'text', text: data.clientName },
        { type: 'text', text: data.serviceName },
        { type: 'text', text: formatDateES(data.date) },
        { type: 'text', text: data.startTime },
      ],
    },
  ]),

  confirmation: (data: {
    clientName: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: data.clientName },
        { type: 'text', text: data.professionalName },
        { type: 'text', text: data.serviceName },
        { type: 'text', text: formatDateES(data.date) },
        { type: 'text', text: data.startTime },
      ],
    },
  ]),

  reminder24h: (data: {
    clientName: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: data.clientName },
        { type: 'text', text: data.professionalName },
        { type: 'text', text: data.serviceName },
        { type: 'text', text: formatDateES(data.date) },
        { type: 'text', text: data.startTime },
      ],
    },
  ]),

  cancellation: (data: {
    recipientName: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: data.recipientName },
        { type: 'text', text: data.professionalName },
        { type: 'text', text: data.serviceName },
        { type: 'text', text: formatDateES(data.date) },
        { type: 'text', text: data.startTime },
      ],
    },
  ]),
};

// Mensajes de texto libre (para cuando el cliente inicia conversación)
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
      `Nueva reserva en Aliax!`,
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
