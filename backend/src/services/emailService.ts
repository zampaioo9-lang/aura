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

// Fuente de los articulos de la Revista (DM Sans) con respaldo: Apple Mail y el Mail del iPhone
// la cargan; Gmail y Outlook de escritorio usan la de respaldo, que se parece (sans-serif limpia).
const EMAIL_FONT = "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const EMAIL_LOGO_URL = 'https://www.aliax.io/email/logo-aliax-blanco.png';

export function baseTemplate(title: string, content: string, headerLabel: string = 'Aliax'): string {
  // Si el correo trae una etiqueta propia (ej. "Revista Aliax"), se muestra a la derecha del logo.
  const labelCell = headerLabel && headerLabel !== 'Aliax'
    ? `<td align="right" style="padding-left:12px;font-family:${EMAIL_FONT};color:#ffffff;font-size:13px;font-weight:500;letter-spacing:0.02em;">${headerLabel}</td>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>body,table,td,p,a,h1,h2,h3,span{font-family:${EMAIL_FONT};}</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${EMAIL_FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;font-family:${EMAIL_FONT};">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);font-family:${EMAIL_FONT};">

          <!-- Header -->
          <tr>
            <td style="background:#4c1d95;background:linear-gradient(135deg,#4c1d95 0%,#0d9488 100%);padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <a href="https://www.aliax.io" style="text-decoration:none;"><img src="${EMAIL_LOGO_URL}" alt="Aliax" width="150" height="38" style="display:block;border:0;color:#ffffff;font-family:${EMAIL_FONT};font-size:22px;font-weight:700;"></a>
                  </td>
                  ${labelCell}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 24px;font-family:${EMAIL_FONT};">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0;font-family:${EMAIL_FONT};">
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

// Bloques opcionales para el PACIENTE en la confirmacion y el recordatorio: tipo de cita, enlace de
// la videollamada y botones de WhatsApp para cancelar o reagendar con el profesional.
export interface ClientBookingExtras {
  modalityLabel?: string | null;
  meetingLink?: string | null;
  cancelUrl?: string | null;
  rescheduleUrl?: string | null;
}

function clientBookingExtraRows(x?: ClientBookingExtras): string {
  if (!x) return '';
  return (
    (x.modalityLabel ? detailRow('Tipo de cita', escapeHtml(x.modalityLabel)) : '') +
    (x.meetingLink
      ? detailRow('Enlace de la videollamada', `<a href="${escapeHtml(x.meetingLink)}" style="color:#7c3aed;word-break:break-all;">${escapeHtml(x.meetingLink)}</a>`)
      : '')
  );
}

function clientBookingActions(x?: ClientBookingExtras): string {
  if (!x) return '';
  const join = x.meetingLink ? ctaButton('Unirme a la videollamada', escapeHtml(x.meetingLink)) : '';
  const outline = (text: string, url: string) =>
    `<a href="${escapeHtml(url)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border:1px solid #d4d4d8;color:#3f3f46;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">${text}</a>`;
  const links = [
    x.cancelUrl ? outline('Quiero cancelar mi cita', x.cancelUrl) : '',
    x.rescheduleUrl ? outline('Quiero reagendar mi cita', x.rescheduleUrl) : '',
  ].join('');
  return (
    join +
    (links
      ? `<div style="margin-top:20px;">${links}<p style="margin:4px 0 0;color:#a1a1aa;font-size:12px;">Se abrirá un chat de WhatsApp con tu profesional.</p></div>`
      : '')
  );
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    autoConfirmed?: boolean;
  }) => ({
    to: data.professionalEmail,
    subject: `Nueva reserva de ${data.clientName} — Aliax`,
    html: baseTemplate('Nueva reserva', `
      ${badge('Nueva reserva', '#9333ea')}
      ${heading(`Hola ${data.professionalName}`)}
      ${subtext(data.autoConfirmed ? 'Tienes una nueva cita. Se confirmó automáticamente, según tu configuración.' : 'Tienes una nueva solicitud de cita que requiere tu confirmación.')}
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
    details?: ClientBookingExtras;
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
        detailRow('Hora', data.startTime) +
        clientBookingExtraRows(data.details)
      )}
      ${clientBookingActions(data.details)}
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
    details?: ClientBookingExtras;
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
        detailRow('Hora', data.startTime) +
        clientBookingExtraRows(data.details)
      )}
      ${clientBookingActions(data.details)}
    `),
  }),

  // Al cliente: recordatorio ~1 h antes
  reminder1h: (data: {
    clientName: string;
    clientEmail: string;
    professionalName: string;
    serviceName: string;
    date: Date | string;
    startTime: string;
    details?: ClientBookingExtras;
  }) => ({
    to: data.clientEmail,
    subject: `Tu cita con ${data.professionalName} es en aproximadamente 1 hora — Aliax`,
    html: baseTemplate('Tu cita es en 1 hora', `
      ${badge('En 1 hora', '#d97706')}
      ${heading(`Hola ${data.clientName}`)}
      ${subtext('Te recordamos que tu cita empieza en aproximadamente una hora.')}
      ${detailTable(
        detailRow('Con', data.professionalName) +
        detailRow('Servicio', data.serviceName) +
        detailRow('Fecha', formatDateES(data.date)) +
        detailRow('Hora', data.startTime) +
        clientBookingExtraRows(data.details)
      )}
      ${clientBookingActions(data.details)}
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
      ${subtext('Nos da mucho gusto que formes parte de Aliax. Tu cuenta ya está activa.')}

      <div style="margin-top:20px;padding:16px;background:#f5f3ff;border-radius:8px;border:1px solid #ddd6fe;">
        <p style="margin:0 0 6px;color:#6d28d9;font-size:13px;font-weight:600;">De regalo: plan Pro IA completo durante 5 días</p>
        <p style="margin:0;color:#18181b;font-size:15px;">Incluye el módulo de notas con IA: sube hasta 120 minutos de audio de sesión en total, o escribe hasta 10 notas sin audio, y la IA las transcribe y organiza en una nota clínica lista para revisar.</p>
      </div>

      <div style="margin-top:12px;padding:16px;background:#f0fdf4;border-radius:8px;">
        <p style="margin:0;color:#18181b;font-size:14px;">Al terminar los 5 días tu cuenta pasa automáticamente al <strong>plan gratuito</strong>, sin límite de tiempo, y sigues con tu perfil en el directorio, tu agenda y tus notas manuales, todo sin costo. Puedes actualizar a Pro o Pro IA cuando quieras.</p>
      </div>

      <div style="margin-top:24px;">
        <p style="margin:0 0 12px;color:#18181b;font-size:15px;font-weight:600;">¿Qué puedes hacer en Aliax?</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Notas de sesión con IA:</strong> sube el audio o escribe una breve descripción y obtén tu nota clínica lista en minutos</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Tu perfil público en el directorio:</strong> nuevos pacientes te encuentran por enfoque terapéutico</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Agenda inteligente:</strong> tus clientes reservan citas solos, 24/7, sin que tú intervengas</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Historia clínica digital</strong> por paciente, organizada, accesible y siempre contigo</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Notas de evolución del paciente</strong>, basadas en el esquema oficial SOAP y esquema Diamante para TBCS</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Tu enlace personalizado:</strong> compártelo con tus clientes y recibe reservas al instante</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Servicios, precios y modalidades:</strong> presencial, online o ambas</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Notificaciones automáticas</strong> de citas a ti y a tus pacientes</td></tr>
        </table>
      </div>

      ${ctaButton('Ir a mi dashboard', 'https://www.aliax.io/dashboard')}

      <p style="margin-top:24px;color:#a1a1aa;font-size:13px;">Si tienes dudas, responde a este correo o escríbenos. ¡Estamos para ayudarte!</p>
    `),
  }),

  // Recordatorio durante la prueba de Pro IA (48 a 72 horas despues del registro)
  trialTryReminder: (data: {
    userName: string;
    userEmail: string;
  }) => ({
    to: data.userEmail,
    subject: '¿Ya probaste las notas con IA en Aliax?',
    html: baseTemplate('Tu prueba de Pro IA', `
      ${heading(`Hola ${data.userName}`)}
      ${subtext('Llevas un par de días en tu prueba de Pro IA y todavía te quedan unos 3. Aquí tienes tres cosas que puedes probar hoy:')}

      <div style="margin-top:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Sube el audio de una sesión</strong> y recibe la nota lista para revisar (hasta 120 minutos de audio durante la prueba)</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Crea a un paciente</strong> y llena su historia clínica</td></tr>
          <tr><td style="padding:7px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ <strong>Activa tu agenda</strong> para que tus pacientes reserven en línea</td></tr>
        </table>
      </div>

      ${ctaButton('Ir a mi dashboard', 'https://www.aliax.io/dashboard')}

      <p style="margin-top:24px;color:#a1a1aa;font-size:13px;">Si tienes dudas, responde a este correo y con gusto te ayudamos.</p>
    `),
  }),

  // Aviso de que la prueba de Pro IA termina en menos de 24 horas
  trialEndingReminder: (data: {
    userName: string;
    userEmail: string;
  }) => ({
    to: data.userEmail,
    subject: 'Tu prueba de Pro IA vence mañana',
    html: baseTemplate('Tu prueba de Pro IA vence mañana', `
      ${heading(`Hola ${data.userName}`)}
      ${subtext('Tu prueba de Pro IA termina en menos de 24 horas.')}

      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;">
        <p style="margin:0;color:#18181b;font-size:14px;">Tranquilo, al terminar tu cuenta pasa sola al plan Free. No pierdes tu perfil, tu agenda ni tus pacientes.</p>
      </div>

      <div style="margin-top:20px;">
        <p style="margin:0 0 8px;color:#18181b;font-size:15px;font-weight:600;">Lo que dejarías de tener:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:5px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ Notas con IA</td></tr>
          <tr><td style="padding:5px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ Transcripción de audio</td></tr>
          <tr><td style="padding:5px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ Historia clínica</td></tr>
          <tr><td style="padding:5px 0;color:#52525b;font-size:14px;line-height:1.4;">✦ Analytics</td></tr>
        </table>
      </div>

      ${subtext('Si quieres conservarlos, puedes elegir un plan en cualquier momento.')}

      ${ctaButton('Ver planes', 'https://www.aliax.io/pricing')}
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
  }) => {
    // El boton "Ir a mi dashboard" va al final del cuerpo por default. Si el
    // texto del anuncio incluye el marcador [[BOTON_DASHBOARD]], el boton se
    // coloca ahi en su lugar (para ponerlo entre parrafos en vez de al final).
    const dashboardButton = ctaButton('Ir a mi dashboard', 'https://www.aliax.io/dashboard');
    const bodyHtml = data.body.replace(/\n/g, '<br>');
    const hasInlineButton = bodyHtml.includes('[[BOTON_DASHBOARD]]');
    return {
      to: data.userEmail,
      subject: data.subject,
      html: baseTemplate(data.subject, `
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0d9488;background:linear-gradient(135deg,#7c3aed,#0d9488);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Hola ${data.userName} 👋</h1>
        <div style="margin-top:16px;color:#52525b;font-size:15px;line-height:1.7;">
          ${hasInlineButton ? bodyHtml.replace('[[BOTON_DASHBOARD]]', dashboardButton) : bodyHtml}
        </div>
        ${hasInlineButton ? '' : dashboardButton}
        <p style="margin-top:24px;color:#a1a1aa;font-size:12px;">Recibes este correo porque tienes una cuenta registrada en Aliax.io.</p>
      `),
    };
  },

  // Admin: un terapeuta envio un articulo a revision
  articleSubmittedAdmin: (data: { authorName: string; title: string }) => ({
    to: env.ADMIN_EMAIL,
    subject: `Nuevo artículo por revisar: ${data.title}`,
    html: baseTemplate('Nuevo artículo por revisar', `
      ${heading(`${escapeHtml(data.authorName)} envió un artículo a revisión`)}
      ${subtext('Hay un artículo nuevo esperando tu revisión en la Revista.')}
      <div style="margin-top:20px;padding:16px;background:#f5f3ff;border-radius:8px;">
        <p style="margin:0;color:#18181b;font-size:15px;font-weight:600;">${escapeHtml(data.title)}</p>
      </div>
      ${ctaButton('Revisar artículo', 'https://www.aliax.io/admin')}
    `),
  }),

  // Terapeuta: su articulo fue aprobado y publicado
  articleApproved: (data: { userName: string; userEmail: string; title: string; slug: string }) => ({
    to: data.userEmail,
    subject: 'Tu artículo fue aprobado',
    html: baseTemplate('Tu artículo fue aprobado', `
      ${heading(`¡Felicidades, ${escapeHtml(data.userName)}!`)}
      ${subtext('Tu artículo ya está aprobado y aparecerá en la Revista en unos minutos.')}
      <div style="margin-top:20px;padding:16px;background:#f0fdf4;border-radius:8px;">
        <p style="margin:0;color:#18181b;font-size:15px;font-weight:600;">${escapeHtml(data.title)}</p>
      </div>
      ${ctaButton('Ver en la Revista', `https://www.aliax.io/revista/${encodeURIComponent(data.slug)}`)}
    `),
  }),

  // Terapeuta: el admin pidio cambios en su articulo
  articleChangesRequested: (data: { userName: string; userEmail: string; title: string; note: string }) => ({
    to: data.userEmail,
    subject: 'Hay cambios por hacer en tu artículo',
    html: baseTemplate('Cambios por hacer en tu artículo', `
      ${heading(`Hola ${escapeHtml(data.userName)}`)}
      ${subtext(`Revisamos tu artículo "${escapeHtml(data.title)}" y hay algunos cambios por hacer antes de publicarlo:`)}
      <div style="margin-top:20px;padding:16px;background:#f5f3ff;border-radius:8px;">
        <p style="margin:0;color:#18181b;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.note)}</p>
      </div>
      ${subtext('Puedes editar tu artículo y volver a enviarlo cuando esté listo.')}
      ${ctaButton('Editar mi artículo', 'https://www.aliax.io/dashboard')}
    `),
  }),

  // Admin: nuevo usuario registrado
  adminNewUser: (data: {
    userName: string;
    userEmail: string;
  }) => ({
    to: env.ADMIN_EMAIL,
    subject: `Nuevo registro en Aliax: ${data.userName}`,
    html: baseTemplate('Nuevo usuario registrado', `
      ${heading('Nuevo usuario registrado')}
      ${subtext('Alguien acaba de crear una cuenta en Aliax.')}
      ${detailTable(detailRow('Nombre', data.userName) + detailRow('Correo', data.userEmail))}
      ${ctaButton('Ver en el Admin', 'https://www.aliax.io/admin')}
    `),
  }),

  // Admin: pago confirmado (Stripe o PayPal)
  adminNewPayment: (data: {
    userName: string;
    userEmail: string;
    provider: 'Stripe' | 'PayPal';
    tier: string;
    interval: string;
  }) => ({
    to: env.ADMIN_EMAIL,
    subject: `💰 Pago confirmado (${data.provider}): ${data.userName}`,
    html: baseTemplate('Pago confirmado', `
      ${badge(`${data.provider} · ${data.tier} · ${data.interval}`, '#16a34a')}
      ${heading('Se confirmó un pago')}
      ${subtext('El plan del usuario ya se actualizó automáticamente en la base de datos.')}
      ${detailTable(
        detailRow('Nombre', data.userName) +
        detailRow('Correo', data.userEmail) +
        detailRow('Plan', `${data.tier} (${data.interval})`) +
        detailRow('Método de pago', data.provider)
      )}
      ${ctaButton('Ver en el Admin', 'https://www.aliax.io/admin')}
    `),
  }),

  // Comprador: confirmacion de compra de un Offering (taller/curso), con el link de acceso
  offeringPurchaseConfirmation: (data: {
    buyerName: string;
    buyerEmail: string;
    offeringTitle: string;
    accessUrl: string;
  }) => ({
    to: data.buyerEmail,
    subject: `Tu compra de "${data.offeringTitle}" está confirmada`,
    html: baseTemplate('Compra confirmada', `
      ${badge('Pago confirmado', '#16a34a')}
      ${heading(`Gracias, ${data.buyerName}`)}
      ${subtext(`Tu compra de "${data.offeringTitle}" quedó registrada. Guarda este correo: el siguiente enlace es tu única forma de acceder al contenido.`)}
      ${ctaButton('Ver mi compra', data.accessUrl)}
    `),
  }),

  // Admin: aviso de una venta nueva de Offering (taller/curso/webinar)
  adminNewOfferingSale: (data: {
    buyerName: string;
    buyerEmail: string;
    offeringTitle: string;
    provider: 'Stripe' | 'PayPal';
    amountPaid: number;
    currency: string;
  }) => ({
    to: env.ADMIN_EMAIL,
    subject: `💰 Venta de taller/curso (${data.provider}): ${data.offeringTitle}`,
    html: baseTemplate('Venta confirmada', `
      ${badge(`${data.provider} · ${data.currency} ${data.amountPaid.toFixed(2)}`, '#16a34a')}
      ${heading('Se vendió un taller/curso')}
      ${detailTable(
        detailRow('Oferta', data.offeringTitle) +
        detailRow('Comprador', data.buyerName) +
        detailRow('Correo', data.buyerEmail) +
        detailRow('Monto', `${data.currency} ${data.amountPaid.toFixed(2)}`) +
        detailRow('Método de pago', data.provider)
      )}
      ${ctaButton('Ver en el Admin', 'https://www.aliax.io/admin')}
    `),
  }),

  // Admin: fallo inesperado al iniciar una transcripción de audio (clave inválida, AssemblyAI caído, cuota agotada, etc.)
  adminTranscriptionError: (data: {
    userName: string;
    userEmail: string;
    errorDetail: string;
  }) => ({
    to: env.ADMIN_EMAIL,
    subject: `⚠️ Falló la transcripción de audio (${data.userName})`,
    html: baseTemplate('Falló la transcripción de audio', `
      ${badge('Error de transcripción', '#dc2626')}
      ${heading('No se pudo iniciar una transcripción')}
      ${subtext('El usuario solo vio el mensaje genérico "No se pudo iniciar la transcripción, intenta de nuevo". Este es el error real capturado en el servidor.')}
      ${detailTable(
        detailRow('Usuario', data.userName) +
        detailRow('Correo', data.userEmail) +
        detailRow('Error real', data.errorDetail)
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

  // Al terapeuta: caso de riesgo alto en ia-terapia, requiere contacto directo
  crisisReferral: (data: {
    professionalName: string;
    professionalEmail: string;
    summary: string;
  }) => ({
    to: data.professionalEmail,
    subject: `Caso urgente: se necesita contacto directo — Aliax`,
    html: baseTemplate('Caso urgente', `
      ${badge('Riesgo alto', '#dc2626')}
      ${heading(`Hola ${data.professionalName}`)}
      ${subtext('Una persona en un programa de acompañamiento guiado por IA (ia-terapia, un proyecto afiliado a Aliax) mostró señales de riesgo alto. Te pedimos que la contactes directamente lo antes posible.')}
      ${detailTable(detailRow('Resumen del caso', data.summary))}
      <p style="margin-top:20px;color:#a1a1aa;font-size:12px;line-height:1.5;">Este correo no incluye datos clínicos completos, solo lo necesario para el primer contacto. Actúa con tu criterio profesional habitual.</p>
    `),
  }),

  // Confirmación de suscripción al newsletter de Revista (double opt-in)
  newsletterConfirm: (data: { email: string; confirmUrl: string; audience: 'PACIENTES' | 'TERAPEUTAS' }) => ({
    to: data.email,
    subject: 'Confirma tu suscripción a Revista Aliax',
    html: baseTemplate('Confirma tu suscripción', `
      ${heading('Un último paso')}
      ${subtext(
        data.audience === 'TERAPEUTAS'
          ? 'Confirma tu correo para empezar a recibir los artículos nuevos de Revista Aliax para terapeutas.'
          : 'Confirma tu correo para empezar a recibir los artículos nuevos de Revista Aliax sobre salud mental.'
      )}
      ${ctaButton('Confirmar suscripción', data.confirmUrl)}
      ${subtext('Si tú no pediste esto, puedes ignorar este correo: no se te suscribirá a nada.')}
    `),
  }),

  // HTML pre-llenado para "Enviar como newsletter" desde el CMS de Revista.
  // Sin `to`: no se envia directo, solo se devuelve subject+html para pre-llenar el formulario admin.
  articleNewsletter: (data: { title: string; excerpt: string; coverImage: string | null; articleUrl: string }) => ({
    subject: data.title,
    html: baseTemplate(data.title, `
      ${data.coverImage ? `<img src="${data.coverImage}" alt="" width="560" style="width:100%;max-width:560px;border-radius:12px;margin-bottom:20px;display:block;">` : ''}
      ${heading(data.title)}
      ${subtext(data.excerpt)}
      ${ctaButton('Leer artículo completo', data.articleUrl)}
    `, 'Revista Aliax'),
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
