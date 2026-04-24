import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendWhatsApp } from '../services/whatsappService';

const prisma = new PrismaClient();

export function startTrialExpiryJob() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running trial expiry job...');

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Find users whose trial expires today
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

      console.log(`[CRON] Found ${users.length} users with trial expiring today`);

      // Freemium: profiles remain published when trial ends
      if (users.length > 0) {
        console.log(`[CRON] ${users.length} trials ended today — profiles stay published (freemium)`);
      }

      for (const user of users) {
        const socialLinks = (user.socialLinks as Record<string, string>) || {};
        const whatsappPhone = socialLinks.whatsapp || user.phone;

        if (!whatsappPhone) {
          console.log(`[CRON] No WhatsApp for user ${user.email}, skipping`);
          continue;
        }

        const message =
          `Hola ${user.name} 👋\n\n` +
          `Tu período de prueba gratuita de *Aliax.io* ha finalizado hoy.\n\n` +
          `Para seguir recibiendo reservas y mantener tu perfil activo, activá tu plan profesional.\n\n` +
          `👉 https://www.aliax.io/dashboard`;

        const result = await sendWhatsApp(whatsappPhone, message);
        console.log(
          `[CRON] Trial expiry notification ${result.success ? 'sent' : 'FAILED'} to ${user.email}`
        );
      }
    } catch (err) {
      console.error('[CRON] Trial expiry job error:', err);
    }
  });

  console.log('[CRON] Trial expiry job started (runs daily at 9:00 AM)');
}
