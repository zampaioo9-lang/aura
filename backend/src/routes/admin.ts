import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/adminAuth';
import { sendEmail, emailTemplates } from '../services/emailService';
import { sendBroadcast, getBroadcasts, addContact } from '../services/audienceService';
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
      hasProfile: user._count.profiles > 0,
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

// POST /api/admin/send-announcement  (quick plain-text, one-by-one — kept for backwards compat)
router.post('/send-announcement', async (req, res, next) => {
  try {
    const { subject, body, audience = 'all' } = req.body as {
      subject: string;
      body: string;
      audience?: 'all' | 'pro' | 'trial';
    };

    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'Asunto y cuerpo son requeridos' });
    }

    const where =
      audience === 'pro'   ? { plan: 'PRO' } :
      audience === 'trial' ? { trialEndsAt: { not: null as any }, plan: null } :
      {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
    });

    let sent = 0;
    let failed = 0;
    for (const user of users) {
      const tpl = emailTemplates.announcement({
        userName: user.name,
        userEmail: user.email,
        subject,
        body,
      });
      const result = await sendEmail(tpl.to, tpl.subject, tpl.html);
      if (result.success) sent++;
      else failed++;
    }

    res.json({ ok: true, sent, failed, total: users.length });
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
