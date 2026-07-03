import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// GET /api/clients — listar pacientes del usuario
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId! },
      include: {
        clinicalHistory:       { select: { completedSteps: true } },
        clinicalHistoryCouple: { select: { completedSteps: true } },
        sessionNotes:          { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (err) { next(err); }
});

// GET /api/clients/:id — obtener paciente con historia y notas
router.get('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        clinicalHistory: true,
        clinicalHistoryCouple: true,
        sessionNotes: { orderBy: { sessionDate: 'desc' } },
      },
    });
    if (!client) throw new AppError(404, 'Paciente no encontrado');
    if (client.userId !== req.userId) throw new AppError(403, 'No autorizado');
    res.json(client);
  } catch (err) { next(err); }
});

// POST /api/clients — crear paciente
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const {
      name, email, phone, notes,
      birthDate, gender, maritalStatus, education,
      occupation, city, country, emergencyContact, referralSource,
    } = req.body;

    if (!name?.trim()) throw new AppError(400, 'El nombre es requerido');

    const client = await prisma.client.create({
      data: {
        userId: req.userId!,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender:          gender          || null,
        maritalStatus:   maritalStatus   || null,
        education:       education       || null,
        occupation:      occupation      || null,
        city:            city            || null,
        country:         country         || null,
        emergencyContact: emergencyContact || null,
        referralSource:  referralSource  || null,
      },
    });
    res.status(201).json(client);
  } catch (err) { next(err); }
});

// PATCH /api/clients/:id — actualizar datos del paciente
router.patch('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Paciente no encontrado');
    if (existing.userId !== req.userId) throw new AppError(403, 'No autorizado');

    const { birthDate, consentGivenAt, ...rest } = req.body;
    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
        ...(consentGivenAt !== undefined ? { consentGivenAt: consentGivenAt ? new Date(consentGivenAt) : null } : {}),
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/clients/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Paciente no encontrado');
    if (existing.userId !== req.userId) throw new AppError(403, 'No autorizado');
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
