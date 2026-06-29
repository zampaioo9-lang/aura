import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/adminAuth';
import { sendEmail, emailTemplates } from '../services/emailService';
import { sendBroadcast, getBroadcasts, addContact } from '../services/audienceService';
import { sendWhatsApp } from '../services/whatsappService';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/stats
router.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const [
      totalUsers,
      totalProfiles,
      totalBookings,
      bookingsByStatus,
      newUsersThisMonth,
      totalNotifications,
      uniqueClients,
      usersInTrial,
      usersPaid,
      usersWithDiscount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.booking.count(),
      prisma.booking.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
      prisma.notification.count({ where: { status: 'SENT' } }),
      prisma.booking.findMany({
        distinct: ['clientEmail'],
        select: { clientEmail: true },
      }),
      prisma.user.count({ where: { trialEndsAt: { gt: now }, plan: null } }),
      prisma.user.count({ where: { plan: 'PRO' } }),
      prisma.user.count({ where: { stripeHasDiscount: true } }),
    ]);

    const statusMap = Object.fromEntries(
      bookingsByStatus.map(b => [b.status, b._count.status])
    );

    res.json({
      users: { total: totalUsers, newThisMonth: newUsersThisMonth, inTrial: usersInTrial, paid: usersPaid, withDiscount: usersWithDiscount },
      profiles: { total: totalProfiles },
      clients: { total: uniqueClients.length },
      bookings: {
        total: totalBookings,
        pending: statusMap['PENDING'] || 0,
        confirmed: statusMap['CONFIRMED'] || 0,
        cancelled: statusMap['CANCELLED'] || 0,
        completed: statusMap['COMPLETED'] || 0,
        noShow: statusMap['NO_SHOW'] || 0,
      },
      notifications: { sent: totalNotifications },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '20'));
    const skip = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search) : undefined;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isAdmin: true,
          createdAt: true,
          trialEndsAt: true,
          plan: true,
          planInterval: true,
          planExpiresAt: true,
          stripeSubscriptionId: true,
          paypalSubscriptionId: true,
          stripeHasDiscount: true,
          welcomeEmailSentAt: true,
          blocked: true,
          featureOverrides: true,
          profiles: {
            select: {
              id: true,
              slug: true,
              title: true,
              published: true,
              _count: { select: { bookings: true, services: true } },
            },
          },
          _count: { select: { profiles: true, professionalBookings: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: any, res, next) => {
  try {
    const { id } = req.params;

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, isAdmin: true } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.isAdmin) return res.status(403).json({ error: 'No se puede eliminar a un administrador' });
    if (target.id === req.userId) return res.status(403).json({ error: 'No puedes eliminarte a ti mismo' });

    // Nullify professionalId on bookings to avoid FK constraint before cascade
    await prisma.booking.deleteMany({ where: { professionalId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/block
router.patch('/users/:id/block', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body as { blocked: boolean };

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ error: 'El campo blocked debe ser boolean' });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isAdmin: true },
    });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (target.isAdmin) return res.status(403).json({ error: 'No se puede bloquear a un administrador' });
    if (target.id === req.userId) return res.status(403).json({ error: 'No puedes bloquearte a ti mismo' });

    const updated = await prisma.user.update({
      where: { id },
      data: { blocked },
      select: { id: true, blocked: true },
    });

    res.json({ ok: true, blocked: updated.blocked });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/features
router.patch('/users/:id/features', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body as Record<string, boolean>;

    const VALID_KEYS = [
      'historia_clinica', 'terapia_pareja', 'templates_premium',
      'pacientes', 'analytics', 'agenda', 'colores_premium',
    ];

    for (const [key, val] of Object.entries(updates)) {
      if (!VALID_KEYS.includes(key)) {
        return res.status(400).json({ error: `Key inválida: ${key}` });
      }
      if (typeof val !== 'boolean') {
        return res.status(400).json({ error: `El valor de ${key} debe ser boolean` });
      }
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, featureOverrides: true },
    });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    const existing = (target.featureOverrides as Record<string, boolean>) || {};
    const merged = { ...existing, ...updates };

    const updated = await prisma.user.update({
      where: { id },
      data: { featureOverrides: merged },
      select: { id: true, featureOverrides: true },
    });

    res.json({ ok: true, featureOverrides: updated.featureOverrides });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/grant-pro
router.patch('/users/:id/grant-pro', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { months } = req.body as { months?: number };

    if (!months || typeof months !== 'number' || months < 1 || months > 24) {
      return res.status(400).json({ error: 'months debe ser un número entre 1 y 24' });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    const planExpiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.user.update({
      where: { id },
      data: { plan: 'PRO', planInterval: 'MONTHLY', planExpiresAt },
      select: { id: true, plan: true, planInterval: true, planExpiresAt: true },
    });

    res.json({ ok: true, planExpiresAt: updated.planExpiresAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/welcome-email
router.post('/users/:id/welcome-email', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, trialEndsAt: true, _count: { select: { profiles: true } } },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const tpl = emailTemplates.welcome({
      userName: user.name,
      userEmail: user.email,
    });

    const result = await sendEmail(tpl.to, tpl.subject, tpl.html);
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Error al enviar email' });
    }

    await prisma.user.update({
      where: { id },
      data: { welcomeEmailSentAt: new Date() },
    });

    res.json({ ok: true, sentAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/bookings
router.get('/bookings', async (req, res, next) => {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '20'));
    const skip = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status) : undefined;

    const where = status ? { status: status as any } : {};

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { name: true, price: true, currency: true } },
          profile: { select: { title: true, slug: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ bookings, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/announcement-logs
router.get('/announcement-logs', async (req, res, next) => {
  try {
    const logs = await prisma.$queryRaw<any[]>`
      SELECT id, subject, audience, "sentCount", "failCount", recipients, "sentAt"
      FROM "AnnouncementLog"
      ORDER BY "sentAt" DESC
      LIMIT 50
    `;
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/notify-expiring-pro
router.post('/notify-expiring-pro', async (req: any, res, next) => {
  try {
    const { daysAhead } = req.body as { daysAhead?: number };
    if (!daysAhead || typeof daysAhead !== 'number' || daysAhead < 1 || daysAhead > 90) {
      return res.status(400).json({ error: 'daysAhead debe ser entre 1 y 90' });
    }

    const windowStart = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setHours(23, 59, 59, 999);

    const users = await prisma.user.findMany({
      where: {
        plan: 'PRO',
        planExpiresAt: { gte: windowStart, lte: windowEnd },
      },
      select: { id: true, name: true, email: true, phone: true, socialLinks: true, planExpiresAt: true },
    });

    let sent = 0;
    let failed = 0;
    const results: { name: string; email: string; whatsapp: boolean; email_sent: boolean }[] = [];

    for (const user of users) {
      const socialLinks = (user.socialLinks as Record<string, string>) || {};
      const whatsappPhone = socialLinks.whatsapp || user.phone;
      const expiryDate = new Date(user.planExpiresAt!).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

      let waSent = false;
      let emailSent = false;

      if (whatsappPhone) {
        const msg =
          `Hola ${user.name} 👋\n\n` +
          `Te recordamos que tu plan *Aliax Pro* vence el *${expiryDate}* (en ${daysAhead} día${daysAhead !== 1 ? 's' : ''}).\n\n` +
          `Para seguir disfrutando de todas las funciones, recuerda renovar tu plan antes de que venza.\n\n` +
          `👉 https://www.aliax.io/pricing`;
        const r = await sendWhatsApp(whatsappPhone, msg);
        waSent = r.success;
      }

      const html = `
        <p>Hola <strong>${user.name}</strong>,</p>
        <p>Te recordamos que tu plan <strong>Aliax Pro</strong> vence el <strong>${expiryDate}</strong> (en ${daysAhead} día${daysAhead !== 1 ? 's' : ''}).</p>
        <p>Para continuar disfrutando de todas las funciones, recuerda renovar tu plan antes de que venza.</p>
        <p style="margin-top:24px">
          <a href="https://www.aliax.io/pricing" style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Renovar mi plan
          </a>
        </p>
      `;
      const emailResult = await sendEmail(user.email, `Tu plan Aliax Pro vence en ${daysAhead} día${daysAhead !== 1 ? 's' : ''}`, html);
      emailSent = emailResult.success;

      if (waSent || emailSent) sent++; else failed++;
      results.push({ name: user.name, email: user.email, whatsapp: waSent, email_sent: emailSent });
    }

    res.json({ ok: true, sent, failed, total: users.length, results });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/send-announcement  (quick plain-text, one-by-one — kept for backwards compat)
router.post('/send-announcement', async (req, res, next) => {
  try {
    const { subject, body, audience = 'all', userId } = req.body as {
      subject: string;
      body: string;
      audience?: 'all' | 'pro' | 'free' | 'trial';
      userId?: string;
    };

    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'Asunto y cuerpo son requeridos' });
    }

    const where = userId
      ? { id: userId }
      : audience === 'pro'   ? { plan: 'PRO' }
      : audience === 'free' || audience === 'trial' ? { plan: null as any }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
    });

    let sent = 0;
    let failed = 0;
    const recipients: { name: string; email: string; ok: boolean; emailId?: string; opened: boolean }[] = [];
    for (const user of users) {
      const tpl = emailTemplates.announcement({
        userName: user.name,
        userEmail: user.email,
        subject,
        body,
      });
      const result = await sendEmail(tpl.to, tpl.subject, tpl.html);
      if (result.success) sent++; else failed++;
      recipients.push({ name: user.name, email: user.email, ok: result.success, emailId: result.id, opened: false });
      await new Promise((resolve) => setTimeout(resolve, 400)); // respeta rate limit de Resend (2 req/s)
    }

    const audienceStr = userId ? `usuario:${userId}` : audience;
    await prisma.$executeRaw`
      INSERT INTO "AnnouncementLog" (id, subject, audience, "sentCount", "failCount", recipients, "sentAt")
      VALUES (gen_random_uuid(), ${subject}, ${audienceStr}, ${sent}, ${failed}, ${JSON.stringify(recipients)}::jsonb, NOW())
    `;

    res.json({ ok: true, sent, failed, total: users.length, recipients });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/newsletter  — send via Resend Broadcast (full audience, HTML, tracking)
router.post('/newsletter', async (req, res, next) => {
  try {
    const { subject, html, name } = req.body as {
      subject: string;
      html: string;
      name?: string;
    };

    if (!subject?.trim() || !html?.trim()) {
      return res.status(400).json({ error: 'Asunto y HTML son requeridos' });
    }

    const broadcastName = name?.trim() || `Newsletter ${new Date().toISOString().slice(0, 10)}`;
    const result = await sendBroadcast({ name: broadcastName, subject, html });

    res.json({ ok: true, broadcastId: result.id });
  } catch (err: any) {
    next(err);
  }
});

// GET /api/admin/newsletter  — list past broadcasts
router.get('/newsletter', async (_req, res, next) => {
  try {
    const broadcasts = await getBroadcasts();
    res.json(broadcasts);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/newsletter/sync  — sync all existing users to Resend audience
router.post('/newsletter/sync', async (_req, res, next) => {
  try {
    if (!env.RESEND_AUDIENCE_ID) {
      return res.status(400).json({ error: 'RESEND_AUDIENCE_ID no configurado en las variables de entorno' });
    }

    const users = await prisma.user.findMany({
      select: { email: true, name: true },
    });

    let added = 0;
    let failed = 0;
    for (const user of users) {
      try {
        await addContact(user.email, user.name);
        added++;
      } catch (err: any) {
        console.error('[Sync] failed for', user.email, err?.message);
        failed++;
      }
    }

    res.json({ ok: true, added, failed, total: users.length });
  } catch (err) {
    next(err);
  }
});

export default router;
