import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  createAvailabilitySlotSchema,
  updateAvailabilitySlotSchema,
  bulkCreateAvailabilitySchema,
} from '../utils/validation';

const router = Router();
const prisma = new PrismaClient();

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

async function verifySlotOwnership(slotId: string, userId: string) {
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    include: { profile: { select: { userId: true } } },
  });
  if (!slot || slot.profile.userId !== userId) {
    throw new AppError(404, 'Slot no encontrado');
  }
  return slot;
}

async function checkOverlap(
  profileId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.availabilitySlot.findMany({
    where: {
      profileId,
      dayOfWeek,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  return existing.some(slot => {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);
    return newStart < slotEnd && newEnd > slotStart;
  });
}

async function verifyProfileOwnership(profileId: string, userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile || profile.userId !== userId) {
    throw new AppError(404, 'Perfil no encontrado');
  }
  return profile;
}

// POST / - Create a slot
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createAvailabilitySlotSchema.parse(req.body);
    await verifyProfileOwnership(data.profileId, req.userId!);

    const overlaps = await checkOverlap(data.profileId, data.dayOfWeek, data.startTime, data.endTime);
    if (overlaps) throw new AppError(409, 'El horario se solapa con uno existente');

    const slot = await prisma.availabilitySlot.create({ data });
    res.status(201).json(slot);
  } catch (err) {
    next(err);
  }
});

// GET /me - My slots grouped by day
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const profileIds = profiles.map(p => p.id);

    const slots = await prisma.availabilitySlot.findMany({
      where: { profileId: { in: profileIds } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json(slots);
  } catch (err) {
    next(err);
  }
});

// GET /profile/:profileId - Public slots for a profile
router.get('/profile/:profileId', async (req, res, next) => {
  try {
    const slots = await prisma.availabilitySlot.findMany({
      where: { profileId: req.params.profileId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
    });
    res.json(slots);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update a slot
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await verifySlotOwnership(req.params.id, req.userId!);
    const data = updateAvailabilitySlotSchema.parse(req.body);

    // Check overlap if time or day changed
    const newDay = data.dayOfWeek ?? existing.dayOfWeek;
    const newStart = data.startTime ?? existing.startTime;
    const newEnd = data.endTime ?? existing.endTime;

    if (timeToMinutes(newStart) >= timeToMinutes(newEnd)) {
      throw new AppError(400, 'La hora de inicio debe ser anterior a la hora de fin');
    }

    const overlaps = await checkOverlap(existing.profileId, newDay, newStart, newEnd, existing.id);
    if (overlaps) throw new AppError(409, 'El horario se solapa con uno existente');

    const slot = await prisma.availabilitySlot.update({
      where: { id: req.params.id },
      data,
    });
    res.json(slot);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete a slot
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifySlotOwnership(req.params.id, req.userId!);
    await prisma.availabilitySlot.delete({ where: { id: req.params.id } });
    res.json({ message: 'Slot eliminado' });
  } catch (err) {
    next(err);
  }
});

// POST /bulk - Bulk create slots
router.post('/bulk', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { profileId, slots: slotsData } = bulkCreateAvailabilitySchema.parse(req.body);
    await verifyProfileOwnership(profileId, req.userId!);

    // Validate no overlaps within the batch and against existing
    for (const slot of slotsData) {
      if (timeToMinutes(slot.startTime) >= timeToMinutes(slot.endTime)) {
        throw new AppError(400, `Hora invalida para dia ${slot.dayOfWeek}: ${slot.startTime}-${slot.endTime}`);
      }
      const overlaps = await checkOverlap(profileId, slot.dayOfWeek, slot.startTime, slot.endTime);
      if (overlaps) {
        throw new AppError(409, `Solapamiento en dia ${slot.dayOfWeek}: ${slot.startTime}-${slot.endTime}`);
      }
    }

    const created = await prisma.availabilitySlot.createMany({
      data: slotsData.map(s => ({ ...s, profileId })),
    });

    const allSlots = await prisma.availabilitySlot.findMany({
      where: { profileId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.status(201).json(allSlots);
  } catch (err) {
    next(err);
  }
});

// DELETE /day/:dayOfWeek - Clear all slots for a day
router.delete('/day/:dayOfWeek', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const dayOfWeek = parseInt(req.params.dayOfWeek);
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new AppError(400, 'Dia invalido (0-6)');
    }

    // Get user's profile IDs
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const profileIds = profiles.map(p => p.id);

    // Also accept profileId from query for multi-profile users
    const profileId = req.query.profileId as string | undefined;
    const targetIds = profileId ? [profileId].filter(id => profileIds.includes(id)) : profileIds;

    if (targetIds.length === 0) throw new AppError(404, 'Perfil no encontrado');

    await prisma.availabilitySlot.deleteMany({
      where: { profileId: { in: targetIds }, dayOfWeek },
    });

    res.json({ message: `Slots del dia ${dayOfWeek} eliminados` });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/toggle - Toggle isActive
router.patch('/:id/toggle', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await verifySlotOwnership(req.params.id, req.userId!);
    const slot = await prisma.availabilitySlot.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    res.json(slot);
  } catch (err) {
    next(err);
  }
});

export default router;
