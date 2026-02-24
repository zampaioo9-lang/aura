import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createServiceAvailabilitySchema, bulkServiceAvailabilitySchema } from '../utils/validation';

const router = Router();
const prisma = new PrismaClient();

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function verifyServiceOwnership(serviceId: string, userId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { profile: { select: { userId: true } } },
  });
  if (!service || service.profile.userId !== userId) throw new AppError(404, 'Servicio no encontrado');
  return service;
}

async function verifySlotOwnership(slotId: string, userId: string) {
  const slot = await prisma.serviceAvailability.findUnique({
    where: { id: slotId },
    include: { service: { include: { profile: { select: { userId: true } } } } },
  });
  if (!slot || slot.service.profile.userId !== userId) throw new AppError(404, 'Slot no encontrado');
  return slot;
}

async function checkOverlap(serviceId: string, dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) {
  const existing = await prisma.serviceAvailability.findMany({
    where: { serviceId, dayOfWeek, isActive: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  const ns = timeToMinutes(startTime);
  const ne = timeToMinutes(endTime);
  return existing.some(s => ns < timeToMinutes(s.endTime) && ne > timeToMinutes(s.startTime));
}

// GET /api/service-availability/:serviceId
router.get('/:serviceId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyServiceOwnership(req.params.serviceId, req.userId!);
    const slots = await prisma.serviceAvailability.findMany({
      where: { serviceId: req.params.serviceId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json(slots);
  } catch (err) { next(err); }
});

// GET /api/service-availability/public/:serviceId  (público — para el motor de reservas)
router.get('/public/:serviceId', async (req, res, next) => {
  try {
    const slots = await prisma.serviceAvailability.findMany({
      where: { serviceId: req.params.serviceId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
    });
    res.json(slots);
  } catch (err) { next(err); }
});

// POST /api/service-availability
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createServiceAvailabilitySchema.parse(req.body);
    await verifyServiceOwnership(data.serviceId, req.userId!);

    if (await checkOverlap(data.serviceId, data.dayOfWeek, data.startTime, data.endTime)) {
      throw new AppError(409, 'El horario se solapa con uno existente');
    }

    const slot = await prisma.serviceAvailability.create({ data });
    res.status(201).json(slot);
  } catch (err) { next(err); }
});

// POST /api/service-availability/bulk
router.post('/bulk', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { serviceId, slots } = bulkServiceAvailabilitySchema.parse(req.body);
    await verifyServiceOwnership(serviceId, req.userId!);

    // Reemplaza todos los slots del servicio
    await prisma.serviceAvailability.deleteMany({ where: { serviceId } });

    if (slots.length > 0) {
      await prisma.serviceAvailability.createMany({
        data: slots.map(s => ({ ...s, serviceId })),
      });
    }

    const all = await prisma.serviceAvailability.findMany({
      where: { serviceId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.status(201).json(all);
  } catch (err) { next(err); }
});

// PUT /api/service-availability/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await verifySlotOwnership(req.params.id, req.userId!);
    const { startTime, endTime, isActive } = req.body;

    const ns = startTime ?? existing.startTime;
    const ne = endTime   ?? existing.endTime;

    if (timeToMinutes(ns) >= timeToMinutes(ne)) {
      throw new AppError(400, 'La hora de inicio debe ser anterior a la de fin');
    }

    if (startTime || endTime) {
      if (await checkOverlap(existing.serviceId, existing.dayOfWeek, ns, ne, req.params.id)) {
        throw new AppError(409, 'El horario se solapa con uno existente');
      }
    }

    const updated = await prisma.serviceAvailability.update({
      where: { id: req.params.id },
      data: { ...(startTime ? { startTime } : {}), ...(endTime ? { endTime } : {}), ...(isActive !== undefined ? { isActive } : {}) },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/service-availability/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifySlotOwnership(req.params.id, req.userId!);
    await prisma.serviceAvailability.delete({ where: { id: req.params.id } });
    res.json({ message: 'Slot eliminado' });
  } catch (err) { next(err); }
});

// PATCH /api/service-availability/:id/toggle
router.patch('/:id/toggle', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await verifySlotOwnership(req.params.id, req.userId!);
    const updated = await prisma.serviceAvailability.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
