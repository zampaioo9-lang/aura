import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { bookingSchema, cancelBookingSchema } from '../utils/validation';
import {
  createBooking,
  confirmBooking,
  cancelBooking,
  completeBooking,
  markNoShow,
  getAvailableSlots,
} from '../services/bookingService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// ── GET /api/bookings/available-slots (PUBLIC) ─────────────────────
// Query: serviceId, date (YYYY-MM-DD), profileId
router.get('/available-slots', async (req, res, next) => {
  try {
    const { serviceId, date, profileId } = req.query;
    if (!serviceId || !date || !profileId) {
      throw new AppError(400, 'Se requieren serviceId, profileId y date');
    }

    const dateStr = String(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new AppError(400, 'Formato de fecha invalido (YYYY-MM-DD)');
    }

    const slots = await getAvailableSlots(String(profileId), String(serviceId), dateStr);
    res.json({ date: dateStr, serviceId, profileId, slots });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/bookings (PUBLIC - client books) ─────────────────────
router.post('/', async (req, res, next) => {
  try {
    const data = bookingSchema.parse(req.body);
    const booking = await createBooking(data);
    // WhatsApp notifications will be added in Phase 2
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/bookings/professional (AUTH - professional views) ─────
router.get('/professional', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const profileIds = profiles.map(p => p.id);

    const { status, from, to } = req.query;

    const where: any = { profileId: { in: profileIds } };
    if (status) where.status = String(status);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) where.date.lte = new Date(String(to));
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
        profile: { select: { title: true, slug: true } },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/bookings/client/:email (PUBLIC) ───────────────────────
router.get('/client/:email', async (req, res, next) => {
  try {
    const email = req.params.email;
    const bookings = await prisma.booking.findMany({
      where: { clientEmail: email },
      include: {
        service: { select: { name: true, price: true, currency: true, durationMinutes: true } },
        profile: { select: { title: true, slug: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/bookings/:id (PUBLIC) ─────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        service: true,
        profile: { select: { title: true, slug: true, phone: true } },
      },
    });
    if (!booking) throw new AppError(404, 'Reserva no encontrada');
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/bookings/:id/confirm (AUTH) ───────────────────────────
router.put('/:id/confirm', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const booking = await confirmBooking(req.params.id, req.userId!);
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/bookings/:id/cancel (AUTH or client email) ────────────
router.put('/:id/cancel', async (req, res, next) => {
  try {
    const { reason, clientEmail } = cancelBookingSchema.parse(req.body);

    // Check if authenticated professional
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      const { verifyToken } = require('../services/authService');
      const payload = verifyToken(authHeader.slice(7));
      if (payload) userId = payload.userId;
    }

    if (userId) {
      // Professional cancelling
      const booking = await cancelBooking(req.params.id, 'professional', reason, userId);
      return res.json(booking);
    }

    if (clientEmail) {
      // Client cancelling - verify email matches
      const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError(404, 'Reserva no encontrada');
      if (existing.clientEmail !== clientEmail) throw new AppError(403, 'Email no coincide');

      const booking = await cancelBooking(req.params.id, 'client', reason);
      return res.json(booking);
    }

    throw new AppError(401, 'Se requiere autenticacion o email del cliente');
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/bookings/:id/complete (AUTH) ──────────────────────────
router.put('/:id/complete', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const booking = await completeBooking(req.params.id, req.userId!);
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/bookings/:id/no-show (AUTH) ───────────────────────────
router.put('/:id/no-show', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const booking = await markNoShow(req.params.id, req.userId!);
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

// ── BACKWARD COMPAT: GET /api/bookings (AUTH) ──────────────────────
// Used by existing Dashboard.tsx frontend
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const profileIds = profiles.map(p => p.id);

    const bookings = await prisma.booking.findMany({
      where: { profileId: { in: profileIds } },
      include: {
        service: true,
        profile: { select: { title: true, slug: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// ── BACKWARD COMPAT: PATCH /api/bookings/:id/status (AUTH) ─────────
// Used by existing Dashboard.tsx frontend
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;

    if (status === 'CONFIRMED') {
      const booking = await confirmBooking(req.params.id, req.userId!);
      return res.json(booking);
    }
    if (status === 'CANCELLED') {
      const booking = await cancelBooking(req.params.id, 'professional', undefined, req.userId!);
      return res.json(booking);
    }
    if (status === 'COMPLETED') {
      const booking = await completeBooking(req.params.id, req.userId!);
      return res.json(booking);
    }
    if (status === 'NO_SHOW') {
      const booking = await markNoShow(req.params.id, req.userId!);
      return res.json(booking);
    }

    throw new AppError(400, 'Estado invalido');
  } catch (err) {
    next(err);
  }
});

export default router;
