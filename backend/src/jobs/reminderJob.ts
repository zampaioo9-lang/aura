import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendWhatsApp, templates } from '../services/whatsappService';

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
          profile: { include: { user: { select: { name: true } } } },
        },
      });

      console.log(`[CRON] Found ${bookings.length} bookings for tomorrow`);

      for (const booking of bookings) {
        // Check if reminder already sent
        const alreadySent = await prisma.notification.findFirst({
          where: {
            bookingId: booking.id,
            type: 'REMINDER_24H',
            status: 'SENT',
          },
        });

        if (alreadySent) continue;

        const message = templates.reminder24h({
          clientName: booking.clientName,
          professionalName: booking.profile.user.name,
          serviceName: booking.service.name,
          date: booking.date,
          startTime: booking.startTime,
        });

        const result = await sendWhatsApp(booking.clientPhone, message);

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

        console.log(`[CRON] Reminder ${result.success ? 'sent' : 'FAILED'} to ${booking.clientName}`);
      }
    } catch (err) {
      console.error('[CRON] Reminder job error:', err);
    }
  });

  console.log('[CRON] Reminder job started (runs hourly)');
}
