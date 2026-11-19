import { PrismaClient } from '@prisma/client';
import { sendEmail, emailTemplates } from './emailService';
import { getNotificationPrefs } from '../lib/notificationPrefs';

const prisma = new PrismaClient();

const siteUrl = () => (process.env.FRONTEND_URL || 'https://www.aliax.io').replace(/\/$/, '');

/**
 * Al profesional: alguien se apunto a su lista de espera. Respeta el interruptor
 * "Nuevo cliente en lista de espera" (profWaitlist) y el canal Email. Nunca lanza.
 */
export async function notifyProfessionalOfWaitlistEntry(entryId: string): Promise<void> {
  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id: entryId },
      include: {
        service: { select: { name: true } },
        profile: { include: { user: { select: { name: true, email: true } } } },
      },
    });
    if (!entry) return;
    const professionalEmail = entry.profile.user.email;
    const prefs = await getNotificationPrefs(entry.profileId);
    if (!professionalEmail || !prefs.profWaitlist || !prefs.emailEnabled) return;

    const tpl = emailTemplates.waitlistJoinedProfessional({
      professionalName: entry.profile.user.name,
      professionalEmail,
      clientName: entry.name,
      clientEmail: entry.email,
      clientPhone: entry.phone,
      serviceName: entry.service?.name ?? null,
      date: entry.date,
      dashboardUrl: `${siteUrl()}/dashboard`,
    });
    await sendEmail(tpl.to, tpl.subject, tpl.html);
  } catch (err) {
    console.error('[Waitlist] No se pudo avisar al profesional:', err instanceof Error ? err.message : err);
  }
}

/**
 * Se libero un horario (una cita se cancelo): se avisa por correo, una sola vez, a quienes esperaban ese dia
 * (para ese servicio o para cualquiera). Solo si la lista de espera esta activada y el canal Email conectado.
 * Quienes reciben el aviso pasan a NOTIFIED. Nunca lanza.
 */
export async function notifyWaitlistForFreedSlot(booking: { profileId: string; serviceId: string; date: Date }): Promise<number> {
  try {
    const settings = await prisma.bookingSettings.findUnique({
      where: { profileId: booking.profileId },
      select: { waitlistEnabled: true, emailEnabled: true },
    });
    if (!settings?.waitlistEnabled || settings.emailEnabled === false) return 0;

    const entries = await prisma.waitlistEntry.findMany({
      where: {
        profileId: booking.profileId,
        status: 'WAITING',
        date: booking.date,
        OR: [{ serviceId: null }, { serviceId: booking.serviceId }],
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: { profile: { select: { slug: true, user: { select: { name: true } } } } },
    });

    let notified = 0;
    for (const e of entries) {
      const tpl = emailTemplates.waitlistSlotFreed({
        clientName: e.name,
        clientEmail: e.email,
        professionalName: e.profile.user.name,
        date: e.date,
        bookUrl: `${siteUrl()}/book/${e.profile.slug}`,
      });
      const result = await sendEmail(tpl.to, tpl.subject, tpl.html);
      if (result.success) {
        await prisma.waitlistEntry.update({ where: { id: e.id }, data: { status: 'NOTIFIED', notifiedAt: new Date() } });
        notified++;
      }
    }
    return notified;
  } catch (err) {
    console.error('[Waitlist] No se pudo avisar a la lista de espera:', err instanceof Error ? err.message : err);
    return 0;
  }
}
