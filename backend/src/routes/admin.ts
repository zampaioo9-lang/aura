import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/adminAuth';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/stats
router.get('/stats', async (_req, res, next) => {
  try {
    const [
      totalUsers,
      totalProfiles,
      totalBookings,
      bookingsByStatus,
      newUsersThisMonth,
      totalNotifications,
      uniqueClients,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.booking.count(),
      prisma.booking.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.notification.count({ where: { status: 'SENT' } }),
      prisma.booking.findMany({
        distinct: ['clientEmail'],
        select: { clientEmail: true },
      }),
    ]);

    const statusMap = Object.fromEntries(
      bookingsByStatus.map(b => [b.status, b._count.status])
    );

    res.json({
      users: { total: totalUsers, newThisMonth: newUsersThisMonth },
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

export default router;
