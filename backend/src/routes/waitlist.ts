import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { notifyProfessionalOfWaitlistEntry } from '../services/waitlistService';

/**
 * Lista de espera.
 *   GET    /api/waitlist/config?profileId=   (publico)   si el profesional tiene la lista de espera activada
 *   POST   /api/waitlist                     (publico)   el paciente se apunta para un dia sin horarios
 *   GET    /api/waitlist                     (sesion)    la lista del profesional
 *   PATCH  /api/waitlist/:id                 (sesion)    marcar atendida / volver a espera
 *   DELETE /api/waitlist/:id                 (sesion)    quitar de la lista
 * Cuando se cancela una cita, se avisa a quienes esperaban ese dia (ver waitlistService).
 */
const router = Router();
const prisma = new PrismaClient();

const MAX_WAITING_PER_DAY = 50;

const joinSchema = z.object({
  profileId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  name: z.string().trim().min(2, 'Escribe tu nombre').max(100),
  email: z.string().trim().toLowerCase().email('Escribe un correo válido').max(200),
  phone: z.string().trim().max(30).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida'),
});

// GET /api/waitlist/config?profileId=...
router.get('/config', async (req, res, next) => {
  try {
    const profileId = String(req.query.profileId ?? '');
    if (!profileId) return res.json({ enabled: false });
    const s = await prisma.bookingSettings.findUnique({ where: { profileId }, select: { waitlistEnabled: true } });
    res.json({ enabled: !!s?.waitlistEnabled });
  } catch (err) { next(err); }
});

// POST /api/waitlist
router.post('/', async (req, res, next) => {
  try {
    const data = joinSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { id: data.profileId }, select: { id: true } });
    if (!profile) throw new AppError(404, 'Perfil no encontrado');

    const settings = await prisma.bookingSettings.findUnique({ where: { profileId: data.profileId }, select: { waitlistEnabled: true } });
    if (!settings?.waitlistEnabled) throw new AppError(403, 'Este profesional no tiene lista de espera.');

    if (data.serviceId) {
      const service = await prisma.service.findUnique({ where: { id: data.serviceId }, select: { profileId: true, isActive: true } });
      if (!service || !service.isActive || service.profileId !== data.profileId) throw new AppError(400, 'Servicio no válido');
    }

    const todayUtc = new Date().toISOString().slice(0, 10);
    if (data.date < todayUtc) throw new AppError(400, 'Elige una fecha de hoy en adelante.');
    const date = new Date(data.date);

    // Si ya esta apuntado para ese dia y servicio, no se duplica
    const existing = await prisma.waitlistEntry.findFirst({
      where: {
        profileId: data.profileId,
        status: 'WAITING',
        date,
        email: { equals: data.email, mode: 'insensitive' },
        serviceId: data.serviceId ?? null,
      },
      select: { id: true },
    });
    if (existing) return res.json({ ok: true, already: true });

    const waiting = await prisma.waitlistEntry.count({ where: { profileId: data.profileId, status: 'WAITING', date } });
    if (waiting >= MAX_WAITING_PER_DAY) throw new AppError(429, 'La lista de espera de ese día está llena.');

    const entry = await prisma.waitlistEntry.create({
      data: {
        profileId: data.profileId,
        serviceId: data.serviceId ?? null,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        date,
      },
    });
    await notifyProfessionalOfWaitlistEntry(entry.id);
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

async function myProfileIds(userId: string): Promise<string[]> {
  const profiles = await prisma.profile.findMany({ where: { userId }, select: { id: true } });
  return profiles.map(p => p.id);
}

// GET /api/waitlist
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const ids = await myProfileIds(req.userId!);
    const entries = await prisma.waitlistEntry.findMany({
      where: { profileId: { in: ids } },
      include: { service: { select: { name: true } }, profile: { select: { title: true } } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      take: 300,
    });
    res.json(entries.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      date: e.date.toISOString().slice(0, 10),
      status: e.status,
      serviceName: e.service?.name ?? null,
      profileTitle: e.profile.title,
      createdAt: e.createdAt,
      notifiedAt: e.notifiedAt,
    })));
  } catch (err) { next(err); }
});

async function ownedEntry(id: string, userId: string) {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id }, include: { profile: { select: { userId: true } } } });
  if (!entry) throw new AppError(404, 'No se encontró esta persona en la lista de espera');
  if (entry.profile.userId !== userId) throw new AppError(403, 'No autorizado');
  return entry;
}

// PATCH /api/waitlist/:id   { status: 'ATTENDED' | 'WAITING' }
router.patch('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['ATTENDED', 'WAITING']) }).parse(req.body);
    const entry = await ownedEntry(req.params.id, req.userId!);
    await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status, ...(status === 'WAITING' ? { notifiedAt: null } : {}) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/waitlist/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const entry = await ownedEntry(req.params.id, req.userId!);
    await prisma.waitlistEntry.delete({ where: { id: entry.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
