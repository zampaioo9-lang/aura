import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendWhatsApp, sendWhatsAppTemplate, templates, templateComponents } from '../services/whatsappService';
import { sendEmail, emailTemplates } from '../services/emailService';

const prisma = new PrismaClient();

export function startReminderJob() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running reminder job...');

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

      console.log(`[CRON] Found ${bookings.length} bookings for tomorrow`);

      for (const booking of bookings) {
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

          console.log(`[CRON] Reminder cliente ${result.success ? 'sent' : 'FAILED'} → ${booking.clientName}`);

          // Email recordatorio al cliente
          if (booking.clientEmail) {
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
              console.log(`[CRON] Email reminder cliente ${emailResult.success ? 'sent' : 'FAILED'} → ${booking.clientEmail}`);
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

            console.log(`[CRON] Reminder profesional ${proResult.success ? 'sent' : 'FAILED'} → ${booking.profile.user.name}`);

            // Email recordatorio al profesional
            const professionalEmail = booking.profile.user.email;
            if (professionalEmail) {
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
                console.log(`[CRON] Email reminder profesional ${emailResult.success ? 'sent' : 'FAILED'} → ${professionalEmail}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[CRON] Reminder job error:', err);
    }
  });

  console.log('[CRON] Reminder job started (runs hourly)');
}
