import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { uploadAudio } from '../middleware/upload';
import { AppError } from '../middleware/errorHandler';
import { isClinicoUser } from '../lib/planUtils';
import { uploadAndStartTranscription, getTranscriptionResult } from '../services/assemblyAiService';

const router = Router();
const prisma = new PrismaClient();

async function verifyClientOwnership(clientId: string, userId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, 'Paciente no encontrado');
  if (client.userId !== userId) throw new AppError(403, 'No autorizado');
}

async function verifyAudioNotesAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, isAdmin: true, featureOverrides: true },
  });
  if (!user) throw new AppError(401, 'No autorizado');
  const overrides = (user.featureOverrides as Record<string, boolean>) ?? {};
  const hasAccess = isClinicoUser(user) || overrides.audio_notes === true;
  if (!hasAccess) throw new AppError(403, 'Esta función requiere el módulo de transcripción de audio');
}

// POST /api/audio-notes/transcribe/:clientId
router.post('/transcribe/:clientId', authMiddleware, (req, res, next) => {
  uploadAudio(req, res, (err) => {
    if (err) return next(err instanceof Error ? err : new AppError(400, 'Error al subir audio'));
    next();
  });
}, async (req: AuthRequest, res, next) => {
  try {
    await verifyAudioNotesAccess(req.userId!);
    await verifyClientOwnership(req.params.clientId, req.userId!);

    if (!req.file) throw new AppError(400, 'No se envió ningún audio');
    if (req.body.consentConfirmed !== 'true') {
      throw new AppError(400, 'Debes confirmar el consentimiento del paciente antes de subir el audio');
    }

    const assemblyAiId = await uploadAndStartTranscription(req.file.buffer);

    const job = await prisma.audioTranscriptionJob.create({
      data: {
        clientId: req.params.clientId,
        userId: req.userId!,
        assemblyAiId,
        status: 'processing',
        consentConfirmedAt: new Date(),
      },
    });

    res.status(201).json({ jobId: job.id });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(502, 'No se pudo iniciar la transcripción, intenta de nuevo'));
  }
});

// GET /api/audio-notes/transcribe/:jobId
router.get('/transcribe/:jobId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const job = await prisma.audioTranscriptionJob.findUnique({ where: { id: req.params.jobId } });
    if (!job) throw new AppError(404, 'Transcripción no encontrada');
    if (job.userId !== req.userId) throw new AppError(403, 'No autorizado');

    if (job.status !== 'processing') {
      return res.json({ status: job.status, errorMessage: job.errorMessage ?? undefined });
    }

    const result = await getTranscriptionResult(job.assemblyAiId);

    if (result.status === 'processing') {
      return res.json({ status: 'processing' });
    }

    if (result.status === 'completed') {
      await prisma.audioTranscriptionJob.update({ where: { id: job.id }, data: { status: 'completed' } });
      return res.json({ status: 'completed', transcript: result.transcript });
    }

    await prisma.audioTranscriptionJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorMessage: result.errorMessage },
    });
    return res.json({ status: 'failed', errorMessage: result.errorMessage });
  } catch (err) {
    next(err);
  }
});

export default router;
