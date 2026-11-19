import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendWhatsApp, sendWhatsAppTemplate, templates, templateComponents } from '../services/whatsappService';
import { sendEmail, emailTemplates } from '../services/emailService';
import { tryReminderWindow, endingReminderWindow } from '../lib/trialReminders';
import { getClientBookingNotice } from '../lib/clientBookingNotice';
import { getNotificationPrefs, resolveNotificationPrefs } from '../lib/notificationPrefs';
import { bookingStartInstant } from '../lib/bookingRules';
import { isValidTimeZone, DEFAULT_PROFESSIONAL_TIMEZONE } from '../lib/clientTimezone';

const router = Router();
const prisma = new PrismaClient();

// POST /api/cron/reminders — called hourly by an external cron service (cron-job.org),
// NOT by an in-process timer. Vercel serverless functions have no persistent process for
// node-cron to run in, so a setInterval/node-cron scheduler started inside the function
// never fires in production — confirmed 2026-11-03 after finding this never ran live. The
// correct pattern on serverless is an external trigger hitting a real HTTP endpoint, same
// approach already used in production for PsiqueCreativa's booking reminders
// (psiquecreativa/backend/src/routes/cron.ts).
// Requires header: x-cron-secret = CRON_SECRET (variable de entorno)
router.post('/reminders', async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: {
          gte: tomorrow,
          lte: endOfTomorrow,
        },
      },
      include: {
        service: true,
        profile: { include: { user: { select: { name: true, email: true, phone: true, socialLinks: true } } } },
      },
    });

    let sent = 0;

    for (const booking of bookings) {
      const notifSettings = await prisma.bookingSettings.findUnique({ where: { profileId: booking.profileId } });
      const emailEnabled = notifSettings?.emailEnabled ?? true;
      const prefs = await getNotificationPrefs(booking.profileId);

      // El cliente recibe la hora en su horario local (si su zona horaria es distinta a la del profesional).
      const clientLocal = await getClientBookingNotice(booking, {
        professionalName: booking.profile.user.name,
        professionalPhone: (booking.profile.user.socialLinks as Record<string, string> | null)?.whatsapp || booking.profile.phone || booking.profile.user.phone,
        serviceModality: booking.service.sessionModality,
      });

      // ── Recordatorio al cliente ──────────────────────────────────
      const alreadySentClient = await prisma.notification.findFirst({
        where: {
          bookingId: booking.id,
          type: 'REMINDER_24H',
          recipient: booking.clientPhone,
          status: 'SENT',
        },
      });

      if (prefs.clientReminder24h && !alreadySentClient) {
        const components = templateComponents.reminder24h({
          clientName: booking.clientName,
          professionalName: booking.profile.user.name,
          serviceName: booking.service.name,
          date: clientLocal.date,
          startTime: clientLocal.startTime,
        });

        let result = await sendWhatsAppTemplate(booking.clientPhone, 'recordatorio_cita', 'es_MX', components);
        let message = `[template:recordatorio_cita]`;

        if (!result.success) {
          message = templates.reminder24h({
            clientName: booking.clientName,
            professionalName: booking.profile.user.name,
            serviceName: booking.service.name,
            date: clientLocal.date,
            startTime: clientLocal.startTime,
          });
          result = await sendWhatsApp(booking.clientPhone, message);
        }

        await prisma.notification.create({
          data: {
            bookingId: booking.id,
            type: 'REMINDER_24H',
            recipient: booking.clientPhone,
            message,
            status: result.success ? 'SENT' : 'FAILED',
            sentAt: result.success ? new Date() : null,
            messageId: result.sid || null,
            error: result.error || null,
          },
        });

        if (result.success) sent++;

        // Email recordatorio al cliente
        if (booking.clientEmail && emailEnabled) {
          const alreadySentClientEmail = await prisma.notification.findFirst({
            where: {
              bookingId: booking.id,
              type: 'REMINDER_24H',
              recipient: booking.clientEmail,
              status: 'SENT',
            },
          });

          if (!alreadySentClientEmail) {
            const tpl = emailTemplates.reminder24h({
              clientName: booking.clientName,
              clientEmail: booking.clientEmail,
              professionalName: booking.profile.user.name,
              serviceName: booking.service.name,
              date: clientLocal.date,
              startTime: clientLocal.startTime,
              details: clientLocal,
            });
            const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
            await prisma.notification.create({
              data: {
                bookingId: booking.id,
                type: 'REMINDER_24H',
                recipient: booking.clientEmail,
                message: tpl.subject,
                status: emailResult.success ? 'SENT' : 'FAILED',
                sentAt: emailResult.success ? new Date() : null,
                messageId: emailResult.id || null,
                error: emailResult.error || null,
              },
            });
            if (emailResult.success) sent++;
          }
        }
      }

      // ── Recordatorio al profesional ──────────────────────────────
      const userSocialLinks = booking.profile.user.socialLinks as Record<string, string> | null;
      const professionalPhone = userSocialLinks?.whatsapp || booking.profile.phone || booking.profile.user.phone;

      if (professionalPhone) {
        const alreadySentPro = await prisma.notification.findFirst({
          where: {
            bookingId: booking.id,
            type: 'REMINDER_24H',
            recipient: professionalPhone,
            status: 'SENT',
          },
        });

        if (!alreadySentPro) {
          const proComponents = templateComponents.reminderProfessional({
            professionalName: booking.profile.user.name,
            clientName: booking.clientName,
            serviceName: booking.service.name,
            date: booking.date,
            startTime: booking.startTime,
          });

          let proResult = await sendWhatsAppTemplate(professionalPhone, 'recordatorio_profesional', 'es_MX', proComponents);
          let proMessage = `[template:recordatorio_profesional]`;

          if (!proResult.success) {
            proMessage = templates.reminderProfessional({
              professionalName: booking.profile.user.name,
              clientName: booking.clientName,
              serviceName: booking.service.name,
              date: booking.date,
              startTime: booking.startTime,
            });
            proResult = await sendWhatsApp(professionalPhone, proMessage);
          }

          await prisma.notification.create({
            data: {
              bookingId: booking.id,
              type: 'REMINDER_24H',
              recipient: professionalPhone,
              message: proMessage,
              status: proResult.success ? 'SENT' : 'FAILED',
              sentAt: proResult.success ? new Date() : null,
              messageId: proResult.sid || null,
              error: proResult.error || null,
            },
          });

          if (proResult.success) sent++;

          // Email recordatorio al profesional
          const professionalEmail = booking.profile.user.email;
          if (professionalEmail && emailEnabled) {
            const alreadySentProEmail = await prisma.notification.findFirst({
              where: {
                bookingId: booking.id,
                type: 'REMINDER_24H',
                recipient: professionalEmail,
                status: 'SENT',
              },
            });

            if (!alreadySentProEmail) {
              const tpl = emailTemplates.reminderProfessional({
                professionalName: booking.profile.user.name,
                professionalEmail,
                clientName: booking.clientName,
                serviceName: booking.service.name,
                date: booking.date,
                startTime: booking.startTime,
              });
              const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
              await prisma.notification.create({
                data: {
                  bookingId: booking.id,
                  type: 'REMINDER_24H',
                  recipient: professionalEmail,
                  message: tpl.subject,
                  status: emailResult.success ? 'SENT' : 'FAILED',
                  sentAt: emailResult.success ? new Date() : null,
                  messageId: emailResult.id || null,
                  error: emailResult.error || null,
                },
              });
              if (emailResult.success) sent++;
            }
          }
        }
      }
    }

    // ── Recordatorio de ~1 hora antes (solo al paciente, por correo) ─────────────
    // El cron corre cada hora: se avisa a las citas que empiezan entre 30 y 90 minutos despues de
    // esta ejecucion, asi cada cita cae en una sola ventana y el aviso llega aproximadamente 1 h antes.
    let sent1h = 0;
    const soon = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        date: { gte: new Date(Date.now() - 24 * 3_600_000), lte: new Date(Date.now() + 48 * 3_600_000) },
      },
      include: {
        service: true,
        profile: { include: { user: { select: { name: true, email: true, phone: true, socialLinks: true } } } },
      },
    });
    for (const b of soon) {
      try {
        if (!b.clientEmail) continue;
        const cfg = await prisma.bookingSettings.findUnique({
          where: { profileId: b.profileId },
          select: { timezone: true, emailEnabled: true, notificationPrefs: true },
        });
        if (!resolveNotificationPrefs(cfg?.notificationPrefs).clientReminder1h || cfg?.emailEnabled === false) continue;
        const tz = isValidTimeZone(cfg?.timezone) ? cfg!.timezone : DEFAULT_PROFESSIONAL_TIMEZONE;
        const minutesLeft = (bookingStartInstant(b.date, b.startTime, tz).getTime() - Date.now()) / 60_000;
        if (minutesLeft < 30 || minutesLeft >= 90) continue;

        const already = await prisma.notification.findFirst({
          where: { bookingId: b.id, type: 'REMINDER_1H', recipient: b.clientEmail, status: 'SENT' },
        });
        if (already) continue;

        const notice = await getClientBookingNotice(b, {
          professionalName: b.profile.user.name,
          professionalPhone: (b.profile.user.socialLinks as Record<string, string> | null)?.whatsapp || b.profile.phone || b.profile.user.phone,
          serviceModality: b.service.sessionModality,
        });
        const tpl = emailTemplates.reminder1h({
          clientName: b.clientName,
          clientEmail: b.clientEmail,
          professionalName: b.profile.user.name,
          serviceName: b.service.name,
          date: notice.date,
          startTime: notice.startTime,
          details: notice,
        });
        const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
        await prisma.notification.create({
          data: {
            bookingId: b.id,
            type: 'REMINDER_1H',
            recipient: b.clientEmail,
            message: tpl.subject,
            status: emailResult.success ? 'SENT' : 'FAILED',
            sentAt: emailResult.success ? new Date() : null,
            messageId: emailResult.id || null,
            error: emailResult.error || null,
          },
        });
        if (emailResult.success) sent1h++;
      } catch (e) {
        console.error('Error en recordatorio de 1 h para la reserva', b.id, e);
      }
    }

    res.json({ ok: true, bookingsChecked: bookings.length, sent, sent1h, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('Error en cron de recordatorios:', err);
    res.status(500).json({ error: 'Error interno', message: err.message });
  }
});

// POST /api/cron/trial-expiry — called once a day by the external cron (cron-job.org),
// matching the original daily-at-9am design: unlike /reminders (hourly, needs Notification-
// table dedup because the same window could be checked more than once), this job has no
// dedup of its own, so it must be scheduled externally to fire once per day, not hourly.
// Requires header: x-cron-secret = CRON_SECRET (variable de entorno)
router.post('/trial-expiry', async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const users = await prisma.user.findMany({
      where: {
        trialEndsAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        socialLinks: true,
        phone: true,
      },
    });

    let sent = 0;

    for (const user of users) {
      const socialLinks = (user.socialLinks as Record<string, string>) || {};
      const whatsappPhone = socialLinks.whatsapp || user.phone;

      if (!whatsappPhone) continue;

      const message =
        `Hola ${user.name} 👋\n\n` +
        `Tu período de prueba gratuita de *Aliax.io* ha finalizado hoy.\n\n` +
        `Para seguir recibiendo reservas y mantener tu perfil activo, activá tu plan profesional.\n\n` +
        `👉 https://www.aliax.io/dashboard`;

      const result = await sendWhatsApp(whatsappPhone, message);
      if (result.success) sent++;
    }

    res.json({ ok: true, usersChecked: users.length, sent, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('Error en cron de vencimiento de trial:', err);
    res.status(500).json({ error: 'Error interno', message: err.message });
  }
});

// POST /api/cron/trial-reminders: correos durante la prueba de Pro IA.
//  - "prueba": a quienes se registraron hace entre 48 y 72 horas.
//  - "vence": a quienes les quedan menos de 24 horas de prueba.
// Debe programarse en el cron externo (cron-job.org) UNA vez al día, no cada hora.
// No tiene deduplicación propia: las ventanas de 24 h garantizan que cada usuario
// recibe cada correo una sola vez si el cron corre una vez al día.
// Soporta ?dryRun=true (no envía nada, solo devuelve conteos).
// Requires header: x-cron-secret = CRON_SECRET (variable de entorno)
router.post('/trial-reminders', async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  try {
    const dryRun = req.query.dryRun === 'true';
    const now = new Date();
    const tryWin = tryReminderWindow(now);
    const endWin = endingReminderWindow(now);

    const common = {
      stripeSubscriptionId: null,
      paypalSubscriptionId: null,
      blocked: false,
      isAdmin: false,
    };

    const tryUsers = await prisma.user.findMany({
      where: {
        ...common,
        clinicoTrialStartedAt: { gte: tryWin.from, lt: tryWin.to },
        clinicoTrialEndsAt: { gt: now },
      },
      select: { id: true, name: true, email: true },
    });

    const endingUsers = await prisma.user.findMany({
      where: {
        ...common,
        clinicoTrialEndsAt: { gt: endWin.from, lte: endWin.to },
      },
      select: { id: true, name: true, email: true },
    });

    let tryEmailsSent = 0;
    let endingEmailsSent = 0;
    let failed = 0;

    if (!dryRun) {
      for (const user of tryUsers) {
        try {
          const tpl = emailTemplates.trialTryReminder({ userName: user.name, userEmail: user.email });
          const result = await sendEmail(tpl.to, tpl.subject, tpl.html);
          if (result.success) tryEmailsSent++;
          else failed++;
        } catch (e) {
          console.error('Error enviando recordatorio de prueba a', user.id, e);
          failed++;
        }
      }
      for (const user of endingUsers) {
        try {
          const tpl = emailTemplates.trialEndingReminder({ userName: user.name, userEmail: user.email });
          const result = await sendEmail(tpl.to, tpl.subject, tpl.html);
          if (result.success) endingEmailsSent++;
          else failed++;
        } catch (e) {
          console.error('Error enviando recordatorio de vencimiento a', user.id, e);
          failed++;
        }
      }
    }

    res.json({
      ok: true,
      dryRun,
      tryCandidates: tryUsers.length,
      tryEmailsSent,
      endingCandidates: endingUsers.length,
      endingEmailsSent,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error en cron de recordatorios de prueba:', err);
    res.status(500).json({ error: 'Error interno', message: err.message });
  }
});

export default router;
