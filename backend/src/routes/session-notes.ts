import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

async function verifyClientOwnership(clientId: string, userId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, 'Paciente no encontrado');
  if (client.userId !== userId) throw new AppError(403, 'No autorizado');
}

// GET /api/session-notes/:clientId
router.get('/:clientId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyClientOwnership(req.params.clientId, req.userId!);
    const notes = await prisma.sessionNote.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { sessionDate: 'desc' },
    });
    res.json(notes);
  } catch (err) { next(err); }
});

// POST /api/session-notes/:clientId — nueva nota
router.post('/:clientId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyClientOwnership(req.params.clientId, req.userId!);
    const count = await prisma.sessionNote.count({ where: { clientId: req.params.clientId } });
    const note = await prisma.sessionNote.create({
      data: {
        clientId: req.params.clientId,
        sessionNumber: count + 1,
        sessionDate: req.body.sessionDate ? new Date(req.body.sessionDate) : new Date(),
        noteType: req.body.noteType ?? 'LIBRE',
        summary: req.body.summary,
        topics: req.body.topics,
        homework: req.body.homework,
        observations: req.body.observations,
        nextPlan: req.body.nextPlan,
      },
    });
    res.status(201).json(note);
  } catch (err) { next(err); }
});

// PATCH /api/session-notes/note/:id — editar nota
router.patch('/note/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const note = await prisma.sessionNote.findUnique({
      where: { id: req.params.id },
      include: { client: { select: { userId: true } } },
    });
    if (!note) throw new AppError(404, 'Nota no encontrada');
    if (note.client.userId !== req.userId) throw new AppError(403, 'No autorizado');
    const updated = await prisma.sessionNote.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/session-notes/note/:id
router.delete('/note/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const note = await prisma.sessionNote.findUnique({
      where: { id: req.params.id },
      include: { client: { select: { userId: true } } },
    });
    if (!note) throw new AppError(404, 'Nota no encontrada');
    if (note.client.userId !== req.userId) throw new AppError(403, 'No autorizado');
    await prisma.sessionNote.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
