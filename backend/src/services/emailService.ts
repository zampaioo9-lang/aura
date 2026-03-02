import { Resend } from 'resend';
import { env } from '../config/env';

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// ── Helpers ────────────────────────────────────────────────────────

function formatDateES(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ── Base HTML layout ───────────────────────────────────────────────

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0e0920;padding:24px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Aliax</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;">
                Este correo fue enviado automáticamente por Aliax. Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Fila de detalle reutilizable
function detailRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
      <span style="color:#71717a;font-size:13px;">${label}</span><br>
      <span style="color:#18181b;font-size:15px;font-weight:500;">${value}</span>
    </td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">${rows}</table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;color:#18181b;font-size:20px;font-weight:700;">${text}</h1>`;
}

function subtext(text: string): string {
  return `<p style="margin:0;color:#52525b;font-size:14px;line-height:1.6;">${text}</p>`;
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${color};color:#fff;font-size:12px;font-weight:600;margin-bottom:16px;">${text}</span>`;
}

function ctaButton(text: string, url: string): string {
  return `
  <div style="margin-top:24px;">
    <a href="${url}" style="display:inline-block;padding:12px 24px;background:#9333ea;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${text}</a>
  </div>`;
}

// ── Send ───────────────────────────────────────────────────────────

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  if (!resend) {
    console.log(`[Email] Resend no configurado. To: ${to} | Subject: ${subject}`);
    return { success: true, id: 'dev-no-email' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`[Email] Failed to ${to}:`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent to ${to}: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    const msg = err.message || 'Unknown error';
    console.error(`[Email] Failed to ${to}:`, msg);
    return { success: false, error: msg };
  }
}

// ── Templates ──────────────────────────────────────────────────────

export const emailTemplates = {

  // Al cliente: solicitud recibida, pendiente de confirmación
  bookingReceived: (data: {
    clientName: string;
    clientEmail: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) => ({
    to: data.clientEmail,
    subject: `Solicitud recibida con ${data.professionalName} — Aliax`,
    html: baseTemplate('Solicitud recibida', `
      ${badge('Pendiente de confirmación', '#d97706')}
      ${heading(`Hola ${data.clientName}`)}
      ${subtext('Recibimos tu solicitud de cita. El profesional la revisará y te confirmará pronto.')}
      ${detailTable(
        detailRow('Profesional', data.professionalName) +
        detailRow('Servicio', data.serviceName) +
        detailRow('Fecha', formatDateES(data.date)) +
        detailRow('Hora', data.startTime)
      )}
    `),
  }),

  // Al profesional: nueva reserva pendiente de confirmar
  newBooking: (data: {
    professionalName: string;
    professionalEmail: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientNotes?: string | null;
    serviceName: string;
    date: Date | string;
    startTime: string;
    dashboardUrl: string;
  }) => ({
    to: data.professionalEmail,
    subject: `Nueva reserva de ${data.clientName} — Aliax`,
    html: baseTemplate('Nueva reserva', `
      ${badge('Nueva reserva', '#9333ea')}
      ${heading(`Hola ${data.professionalName}`)}
      ${subtext('Tienes una nueva solicitud de cita que requiere tu confirmación.')}
      ${detailTable(
        detailRow('Cliente', data.clientName) +
        detailRow('Email del cliente', data.clientEmail) +
        detailRow('Teléfono del cliente', data.clientPhone) +
        detailRow('Servicio', data.serviceName) +
        detailRow('Fecha', formatDateES(data.date)) +
        detailRow('Hora', data.startTime) +
        (data.clientNotes ? detailRow('Notas del cliente', data.clientNotes) : '')
      )}
      ${ctaButton('Ver reserva en el dashboard', data.dashboardUrl)}
    `),
  }),

  // Al cliente: reserva confirmada
  confirmation: (data: {
    clientName: string;
    clientEmail: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) => ({
    to: data.clientEmail,
    subject: `Cita confirmada con ${data.professionalName} — Aliax`,
    html: baseTemplate('Cita confirmada', `
      ${badge('Confirmada ✓', '#16a34a')}
      ${heading(`Hola ${data.clientName}`)}
      ${subtext('Tu cita ha sido confirmada. Te esperamos.')}
      ${detailTable(
        detailRow('Profesional', data.professionalName) +
        detailRow('Servicio', data.serviceName) +
        detailRow('Fecha', formatDateES(data.date)) +
        detailRow('Hora', data.startTime)
      )}
    `),
  }),

  // Al cliente: recordatorio 24h
  reminder24h: (data: {
    clientName: string;
    clientEmail: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) => ({
    to: data.clientEmail,
    subject: `Recordatorio: mañana tienes cita con ${data.professionalName} — Aliax`,
    html: baseTemplate('Recordatorio de cita', `
      ${badge('Recordatorio', '#d97706')}
      ${heading(`Hola ${data.clientName}`)}
      ${subtext('Te recordamos que mañana tienes una cita programada.')}
      ${detailTable(
        detailRow('Con', data.professionalName) +
        detailRow('Servicio', data.serviceName) +
        detailRow('Fecha', formatDateES(data.date)) +
        detailRow('Hora', data.startTime)
      )}
    `),
  }),

  // Al profesional: recordatorio 24h de cita con cliente
  reminderProfessional: (data: {
    professionalName: string;
    professionalEmail: string;
    clientName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
  }) => ({
    to: data.professionalEmail,
    subject: `Recordatorio: mañana tienes cita con ${data.clientName} — Aliax`,
    html: baseTemplate('Recordatorio de cita', `
      ${badge('Recordatorio', '#d97706')}
      ${heading(`Hola ${data.professionalName}`)}
      ${subtext('Te recordamos que mañana tienes una cita programada.')}
      ${detailTable(
        detailRow('Cliente', data.clientName) +
        detailRow('Servicio', data.serviceName) +
        detailRow('Fecha', formatDateES(data.date)) +
        detailRow('Hora', data.startTime)
      )}
    `),
  }),

  // Al cliente: cita cancelada
  cancellationClient: (data: {
    clientName: string;
    clientEmail: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
    reason?: string | null;
  }) => ({
    to: data.clientEmail,
    subject: `Cita cancelada — Aliax`,
    html: baseTemplate('Cita cancelada', `
      ${badge('Cancelada', '#dc2626')}
      ${heading(`Hola ${data.clientName}`)}
      ${subtext('Lamentamos informarte que tu cita ha sido cancelada.')}
      ${detailTable(
        detailRow('Profesional', data.professionalName) +
        detailRow('Servicio', data.serviceName) +
        detailRow('Fecha', formatDateES(data.date)) +
        detailRow('Hora', data.startTime) +
        (data.reason ? detailRow('Motivo', data.reason) : '')
      )}
    `),
  }),

  // Al profesional: cita cancelada por el cliente
  cancellationProfessional: (data: {
    professionalName: string;
    professionalEmail: string;
    clientName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
    reason?: string | null;
  }) => ({
    to: data.professionalEmail,
    subject: `Cita cancelada por ${data.clientName} — Aliax`,
    html: baseTemplate('Cita cancelada', `
      ${badge('Cancelada', '#dc2626')}
      ${heading(`Hola ${data.professionalName}`)}
      ${subtext(`${data.clientName} ha cancelado su cita.`)}
      ${detailTable(
        detailRow('Cliente', data.clientName) +
        detailRow('Servicio', data.serviceName) +
        detailRow('Fecha', formatDateES(data.date)) +
        detailRow('Hora', data.startTime) +
        (data.reason ? detailRow('Motivo', data.reason) : '')
      )}
    `),
  }),
};
