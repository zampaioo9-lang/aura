import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { isProUser } from '../lib/planUtils';

const router = Router();
const prisma = new PrismaClient();

// GET /api/analytics/dashboard?period=week|month|year
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { plan: true, planExpiresAt: true, isAdmin: true },
    });
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const isPro = isProUser(user);
    const rawPeriod = req.query.period as string | undefined;
    const period: 'week' | 'month' | 'year' =
      isPro && (rawPeriod === 'week' || rawPeriod === 'year') ? rawPeriod : 'month';

    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true, sessionDurationMinutes: true },
    });
    const profileIds = profiles.map(p => p.id);
    const sessionDuration = profiles[0]?.sessionDurationMinutes ?? 50;

    const now = new Date();

    let incomeStart: Date;
    if (period === 'week') {
      incomeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      incomeStart = new Date(now.getFullYear(), 0, 1);
    } else {
      incomeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const dayOfWeekNow = now.getDay();
    const daysFromMonday = dayOfWeekNow === 0 ? 6 : dayOfWeekNow - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      incomeBookings,
      weekBookings,
      cancelledBookings,
      allClients,
      activeNotes,
      allSessionNotes,
      availabilitySlots,
      bookingSettings,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: {
          profileId: { in: profileIds },
          status: 'COMPLETED',
          date: { gte: incomeStart },
        },
        select: {
          service: { select: { price: true, currency: true } },
        },
      }),
      prisma.booking.findMany({
        where: {
          profileId: { in: profileIds },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          date: { gte: weekStart, lte: weekEnd },
        },
        select: { id: true },
      }),
      prisma.booking.findMany({
        where: {
          profileId: { in: profileIds },
          OR: [
            { status: 'CANCELLED', cancelledAt: { gte: thirtyDaysAgo } },
            { status: 'NO_SHOW', date: { gte: thirtyDaysAgo } },
          ],
        },
        select: { status: true, date: true, cancelledAt: true },
      }),
      prisma.client.findMany({
        where: { userId: req.userId },
        select: { id: true, createdAt: true },
      }),
      prisma.sessionNote.findMany({
        where: {
          client: { userId: req.userId },
          sessionDate: { gte: fifteenDaysAgo },
        },
        select: { clientId: true },
        distinct: ['clientId'],
      }),
      // safety cap — suficiente para cualquier práctica individual
      prisma.sessionNote.findMany({
        where: { client: { userId: req.userId } },
        select: { clientId: true, noteType: true, nextPlan: true, sessionDate: true },
        orderBy: { sessionDate: 'asc' },
        take: 2000,
      }),
      prisma.availabilitySlot.findMany({
        where: { profileId: { in: profileIds }, isActive: true },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      }),
      prisma.bookingSettings.findFirst({
        where: { profileId: { in: profileIds } },
        select: { cancellationHours: true },
      }),
    ]);

    const totalIncome = incomeBookings.reduce(
      (sum, b) => sum + Number(b.service.price), 0
    );
    const currency = incomeBookings[0]?.service.currency ?? 'MXN';

    const activeClientIds = new Set(activeNotes.map(n => n.clientId));
    const activeClients = allClients.filter(c => activeClientIds.has(c.id)).length;
    const newThisMonth = allClients.filter(c => new Date(c.createdAt) >= firstOfMonth).length;

    const noteCountByClient: Record<string, number> = {};
    for (const note of allSessionNotes) {
      noteCountByClient[note.clientId] = (noteCountByClient[note.clientId] ?? 0) + 1;
    }
    const noteCounts = Object.values(noteCountByClient);
    const avgSessionsPerClient = isPro && noteCounts.length > 0
      ? Math.round((noteCounts.reduce((s, n) => s + n, 0) / noteCounts.length) * 10) / 10
      : null;
    const retainedCount = isPro ? noteCounts.filter(n => n >= 8).length : 0;
    const retentionRate = isPro && noteCounts.length > 0
      ? Math.round((retainedCount / noteCounts.length) * 100)
      : null;

    let totalSlotMinutes = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dow = day.getDay();
      const daySlots = availabilitySlots.filter(s => s.dayOfWeek === dow);
      for (const slot of daySlots) {
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        totalSlotMinutes += (eh * 60 + em) - (sh * 60 + sm);
      }
    }
    const slotsThisWeek = totalSlotMinutes > 0
      ? Math.floor(totalSlotMinutes / sessionDuration)
      : 0;
    const sessionsThisWeek = weekBookings.length;

    let cancelledWithNotice: number | null = null;
    let cancelledWithoutNotice: number | null = null;
    if (isPro) {
      const cancellationHours = bookingSettings?.cancellationHours ?? 24;
      cancelledWithNotice = 0;
      cancelledWithoutNotice = 0;
      for (const b of cancelledBookings) {
        if (b.status === 'NO_SHOW' || !b.cancelledAt) {
          cancelledWithoutNotice++;
        } else {
          const hoursBeforeSession =
            (new Date(b.date).getTime() - new Date(b.cancelledAt).getTime()) / (1000 * 60 * 60);
          if (hoursBeforeSession >= cancellationHours) {
            cancelledWithNotice++;
          } else {
            cancelledWithoutNotice++;
          }
        }
      }
    }

    let clinical: { improvedScalePercent: number | null; clientsWithScale: number } | null = null;
    if (isPro) {
      const scaleNotes = allSessionNotes.filter(
        n => (n.noteType === 'DIAMANTE' || n.noteType === 'NECS') && n.nextPlan
      );

      const byClient: Record<string, { first: number; last: number; count: number }> = {};
      for (const note of scaleNotes) {
        try {
          const parsed = JSON.parse(note.nextPlan!);
          if (typeof parsed.scale !== 'number') continue;
          if (!byClient[note.clientId]) {
            byClient[note.clientId] = { first: parsed.scale, last: parsed.scale, count: 1 };
          } else {
            byClient[note.clientId].last = parsed.scale;
            byClient[note.clientId].count++;
          }
        } catch { /* nextPlan no es JSON válido */ }
      }

      const clientsWithMultipleNotes = Object.values(byClient).filter(c => c.count >= 2);
      const improved = clientsWithMultipleNotes.filter(c => c.last - c.first >= 1).length;
      const clientsWithScale = clientsWithMultipleNotes.length;

      clinical = {
        improvedScalePercent: clientsWithScale > 0
          ? Math.round((improved / clientsWithScale) * 100)
          : null,
        clientsWithScale,
      };
    }

    res.json({
      isPro,
      period,
      income: {
        total: Math.round(totalIncome * 100) / 100,
        currency,
        completedSessions: incomeBookings.length,
      },
      clients: {
        active: activeClients,
        newThisMonth,
        avgSessionsPerClient,
        retentionRate,
      },
      agenda: {
        sessionsThisWeek,
        slotsThisWeek,
        cancelledWithNotice,
        cancelledWithoutNotice,
      },
      clinical,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
