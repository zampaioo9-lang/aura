import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription';
import { AppError } from '../middleware/errorHandler';
import { createRecurringScheduleBlockSchema } from '../utils/validation';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware, requireActiveSubscription);

async function verifyOwnership(blockId: string, userId: string) {
  const block = await prisma.recurringScheduleBlock.findUnique({
    where: { id: blockId },
    include: { profile: { select: { userId: true } } },
  });
  if (!block || block.profile.userId !== userId) throw new AppError(404, 'Bloqueo recurrente no encontrado');
  return block;
}

// GET /api/recurring-schedule-blocks?profileId=xxx
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const allIds = profiles.map(p => p.id);
    const { profileId } = req.query;

    const ids = profileId
      ? [String(profileId)].filter(id => allIds.includes(id))
      : allIds;

    if (ids.length === 0) return res.json([]);

    const blocks = await prisma.recurringScheduleBlock.findMany({
      where: { profileId: { in: ids } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json(blocks);
  } catch (err) { next(err); }
});

// POST /api/recurring-schedule-blocks
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createRecurringScheduleBlockSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { id: data.profileId } });
    if (!profile || profile.userId !== req.userId) throw new AppError(404, 'Perfil no encontrado');

    const block = await prisma.recurringScheduleBlock.create({
      data: {
        profileId: data.profileId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime:   data.endTime,
        reason:    data.reason ?? null,
      },
    });

    res.status(201).json(block);
  } catch (err) { next(err); }
});

// DELETE /api/recurring-schedule-blocks/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOwnership(req.params.id, req.userId!);
    await prisma.recurringScheduleBlock.delete({ where: { id: req.params.id } });
    res.json({ message: 'Bloqueo recurrente eliminado' });
  } catch (err) { next(err); }
});

export default router;
