import { Resend } from 'resend';
import { env } from '../config/env';
import { signResetToken } from './authService';

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
            <td style="background:#4c1d95;background:linear-gradient(135deg,#4c1d95 0%,#0d9488 100%);padding:24px 32px;">
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
    <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0d9488;background:linear-gradient(135deg,#7c3aed 0%,#0d9488 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${text}</a>
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

  // Bienvenida al nuevo usuario registrado
  welcome: (data: {
    userName: string;
    userEmail: string;
  }) => ({
    to: data.userEmail,
    subject: '¡Bienvenido a Aliax! 🎉',
    html: baseTemplate('Bienvenido a Aliax', `
      ${heading(`¡Hola ${data.userName}!`)}
      ${subtext('Nos da mucho gusto que formes parte de Aliax. Tu cuenta ha sido creada exitosamente con el <strong>plan gratuito</strong> — sin límite de tiempo.')}

      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;">
        <p style="margin:0 0 6px;color:#16a34a;font-size:13px;font-weight:600;">Plan Gratuito — siempre gratis</p>
        <p style="margin:0;color:#18181b;font-size:15px;">Gestiona tus citas, servicios y clientes sin costo. Cuando quieras más funciones, puedes actualizar a Pro.</p>
      </div>

      <div style="margin-top:24px;">
        <p style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">¿Qué puedes hacer en Aliax?</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Tu perfil público en el directorio</strong> — nuevos pacientes te encuentran por enfoque terapéutico</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Agenda inteligente:</strong> tus clientes reservan citas solos, 24/7, sin que tú intervengas</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Historia clínica digital</strong> por paciente — organizada, accesible y siempre contigo</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Notas de evolución del paciente</strong>, basadas en el esquema oficial SOAP y esquema Diamante para TBCS</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Tu enlace personalizado</strong> — compártelo con tus clientes y recibe reservas al instante</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Servicios, precios y modalidades</strong> — presencial, online o ambas</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Notificaciones automáticas</strong> de citas a ti y a tus pacientes</td></tr>
        </table>
      </div>

      ${ctaButton('Ir a mi dashboard', 'https://www.aliax.io/dashboard')}

      <p style="margin-top:24px;color:#a1a1aa;font-size:13px;">Si tienes dudas, responde a este correo o escríbenos. ¡Estamos para ayudarte!</p>
    `),
  }),

  // Solicitud de reseteo de contraseña (self-service o forzado por admin)
  passwordReset: (data: {
    userName: string;
    userEmail: string;
    resetUrl: string;
  }) => ({
    to: data.userEmail,
    subject: 'Restablece tu contraseña de Aliax',
    html: baseTemplate('Restablece tu contraseña', `
      ${heading(`Hola ${data.userName}`)}
      ${subtext('Recibimos una solicitud para restablecer la contraseña de tu cuenta en Aliax. Si fuiste tú, haz clic en el siguiente botón para elegir una nueva contraseña.')}
      ${ctaButton('Restablecer contraseña', data.resetUrl)}
      <p style="margin-top:24px;color:#a1a1aa;font-size:13px;">Este enlace expira en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual seguirá funcionando.</p>
    `),
  }),

  // Confirmación tras cambio exitoso de contraseña
  passwordChanged: (data: {
    userName: string;
    userEmail: string;
  }) => ({
    to: data.userEmail,
    subject: 'Tu contraseña de Aliax fue actualizada',
    html: baseTemplate('Contraseña actualizada', `
      ${heading(`Hola ${data.userName}`)}
      ${subtext('Tu contraseña de Aliax se actualizó correctamente. Ya puedes iniciar sesión con tu nueva contraseña.')}
      <p style="margin-top:24px;color:#a1a1aa;font-size:13px;">Si no fuiste tú quien hizo este cambio, contáctanos de inmediato respondiendo a este correo.</p>
    `),
  }),

  // Anuncio masivo a usuarios
  announcement: (data: {
    userName: string;
    userEmail: string;
    subject: string;
    body: string;
  }) => ({
    to: data.userEmail,
    subject: data.subject,
    html: baseTemplate(data.subject, `
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0d9488;background:linear-gradient(135deg,#7c3aed,#0d9488);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Hola ${data.userName} 👋</h1>
      <div style="margin-top:16px;color:#52525b;font-size:15px;line-height:1.7;">
        ${data.body.replace(/\n/g, '<br>')}
      </div>
      ${ctaButton('Ir a mi dashboard', 'https://www.aliax.io/dashboard')}
      <p style="margin-top:24px;color:#a1a1aa;font-size:12px;">Recibes este correo porque tienes una cuenta registrada en Aliax.io.</p>
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

  // Al cliente: solicitud de reseña post-cita
  reviewRequest: (data: {
    clientName: string;
    clientEmail: string;
    professionalName: string;
    reviewUrl: string;
  }) => ({
    to: data.clientEmail,
    subject: `¿Cómo fue tu sesión con ${data.professionalName}? — Aliax`,
    html: baseTemplate('Deja tu reseña', `
      ${heading(`Hola ${data.clientName}`)}
      ${subtext(`Tu opinión sobre tu sesión con <strong>${data.professionalName}</strong> ayuda a otros a encontrar el apoyo que necesitan.`)}

      <div style="margin-top:20px;padding:16px;background:#f0fdfa;border-radius:8px;border:1px solid #99f6e4;">
        <p style="margin:0 0 6px;color:#0f766e;font-size:13px;font-weight:600;">Solo toma 1 minuto</p>
        <p style="margin:0;color:#18181b;font-size:14px;line-height:1.5;">Elige una calificación de 1 a 5 estrellas y, si quieres, escribe un comentario breve sobre tu experiencia.</p>
      </div>

      ${ctaButton('Dejar mi reseña', data.reviewUrl)}

      <p style="margin-top:20px;color:#a1a1aa;font-size:12px;line-height:1.5;">Este enlace es de uso único y expira en 7 días. Si ya dejaste tu reseña o no deseas hacerlo, simplemente ignora este mensaje.</p>
    `),
  }),
};

// ── Reseteo de contraseña — helper compartido ───────────────────────
// Usado tanto por el flujo self-service (auth.ts, fire-and-forget) como
// por el reseteo forzado desde el AdminPanel (admin.ts, awaited para poder
// avisarle al admin si el envío falla) — cada caller decide si espera la
// promesa o no, esta función solo evita duplicar la construcción del token/URL/template.
export function sendPasswordResetEmail(user: { id: string; name: string; email: string; password: string }): Promise<EmailResult> {
  const token = signResetToken(user.id, user.password);
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  const tpl = emailTemplates.passwordReset({ userName: user.name, userEmail: user.email, resetUrl });
  return sendEmail(tpl.to, tpl.subject, tpl.html);
}
