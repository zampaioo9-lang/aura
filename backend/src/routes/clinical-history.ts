import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requirePro } from '../middleware/requirePro';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

async function verifyClientOwnership(clientId: string, userId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, 'Paciente no encontrado');
  if (client.userId !== userId) throw new AppError(403, 'No autorizado');
  return client;
}

// GET /api/clinical-history/:clientId
router.get('/:clientId', authMiddleware, requirePro, async (req: AuthRequest, res, next) => {
  try {
    await verifyClientOwnership(req.params.clientId, req.userId!);
    const history = await prisma.clinicalHistory.findUnique({
      where: { clientId: req.params.clientId },
    });
    res.json(history ?? null);
  } catch (err) { next(err); }
});

// PUT /api/clinical-history/:clientId — upsert (guarda sección por sección)
router.put('/:clientId', authMiddleware, requirePro, async (req: AuthRequest, res, next) => {
  try {
    await verifyClientOwnership(req.params.clientId, req.userId!);
    const { completedSteps, ...fields } = req.body;

    const history = await prisma.clinicalHistory.upsert({
      where:  { clientId: req.params.clientId },
      create: { clientId: req.params.clientId, ...fields, completedSteps: completedSteps ?? [] },
      update: { ...fields, ...(completedSteps !== undefined ? { completedSteps } : {}) },
    });
    res.json(history);
  } catch (err) { next(err); }
});

export default router;
