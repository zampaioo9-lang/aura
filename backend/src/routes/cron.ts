import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendWhatsApp, sendWhatsAppTemplate, templates, templateComponents } from '../services/whatsappService';
import { sendEmail, emailTemplates } from '../services/emailService';

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

      // ── Recordatorio al cliente ──────────────────────────────────
      const alreadySentClient = await prisma.notification.findFirst({
        where: {
          bookingId: booking.id,
          type: 'REMINDER_24H',
          recipient: booking.clientPhone,
          status: 'SENT',
        },
      });

      if (!alreadySentClient) {
        const components = templateComponents.reminder24h({
          clientName: booking.clientName,
          professionalName: booking.profile.user.name,
          serviceName: booking.service.name,
          date: booking.date,
          startTime: booking.startTime,
        });

        let result = await sendWhatsAppTemplate(booking.clientPhone, 'recordatorio_cita', 'es_MX', components);
        let message = `[template:recordatorio_cita]`;

        if (!result.success) {
          message = templates.reminder24h({
            clientName: booking.clientName,
            professionalName: booking.profile.user.name,
            serviceName: booking.service.name,
            date: booking.date,
            startTime: booking.startTime,
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
              date: booking.date,
              startTime: booking.startTime,
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

    res.json({ ok: true, bookingsChecked: bookings.length, sent, timestamp: new Date().toISOString() });
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

export default router;
