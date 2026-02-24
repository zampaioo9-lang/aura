import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createScheduleBlockSchema, updateScheduleBlockSchema } from '../utils/validation';

const router = Router();
const prisma = new PrismaClient();

async function verifyOwnership(blockId: string, userId: string) {
  const block = await prisma.scheduleBlock.findUnique({
    where: { id: blockId },
    include: { profile: { select: { userId: true } } },
  });
  if (!block || block.profile.userId !== userId) throw new AppError(404, 'Bloqueo no encontrado');
  return block;
}

// GET /api/schedule-blocks?profileId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const allIds = profiles.map(p => p.id);
    const { profileId, from, to } = req.query;

    const ids = profileId
      ? [String(profileId)].filter(id => allIds.includes(id))
      : allIds;

    if (ids.length === 0) return res.json([]);

    const where: any = { profileId: { in: ids } };
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(String(from));
      if (to)   where.endDate = { lte: new Date(String(to)) };
    }

    const blocks = await prisma.scheduleBlock.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });

    res.json(blocks);
  } catch (err) { next(err); }
});

// GET /api/schedule-blocks/profile/:profileId  (público — para el motor de reservas)
router.get('/profile/:profileId', async (req, res, next) => {
  try {
    const now = new Date();
    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        profileId: req.params.profileId,
        endDate: { gte: now },
      },
      orderBy: { startDate: 'asc' },
      select: { id: true, startDate: true, endDate: true, startTime: true, endTime: true, isAllDay: true },
    });
    res.json(blocks);
  } catch (err) { next(err); }
});

// POST /api/schedule-blocks
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createScheduleBlockSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { id: data.profileId } });
    if (!profile || profile.userId !== req.userId) throw new AppError(404, 'Perfil no encontrado');

    const block = await prisma.scheduleBlock.create({
      data: {
        profileId: data.profileId,
        startDate: new Date(data.startDate),
        endDate:   new Date(data.endDate),
        isAllDay:  data.isAllDay,
        startTime: data.isAllDay ? null : (data.startTime ?? null),
        endTime:   data.isAllDay ? null : (data.endTime   ?? null),
        reason:    data.reason ?? null,
      },
    });

    res.status(201).json(block);
  } catch (err) { next(err); }
});

// PUT /api/schedule-blocks/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOwnership(req.params.id, req.userId!);
    const data = updateScheduleBlockSchema.parse(req.body);

    const updated = await prisma.scheduleBlock.update({
      where: { id: req.params.id },
      data: {
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate   ? { endDate:   new Date(data.endDate) }   : {}),
        ...(data.isAllDay  !== undefined ? { isAllDay: data.isAllDay } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.endTime   !== undefined ? { endTime:   data.endTime }   : {}),
        ...(data.reason    !== undefined ? { reason:    data.reason }    : {}),
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/schedule-blocks/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOwnership(req.params.id, req.userId!);
    await prisma.scheduleBlock.delete({ where: { id: req.params.id } });
    res.json({ message: 'Bloqueo eliminado' });
  } catch (err) { next(err); }
});

export default router;
