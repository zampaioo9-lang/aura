import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createServiceSchema, updateServiceSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { isProUser } from '../lib/planUtils';

const router = Router();
const prisma = new PrismaClient();
const MAX_ACTIVE_SERVICES = 20;
const MAX_IMAGES_FREE = 3;
const MAX_IMAGES_PRO = 20;

// Helper: verify user owns the profile that owns the service
async function verifyServiceOwnership(serviceId: string, userId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { profile: { select: { userId: true } } },
  });
  if (!service) throw new AppError(404, 'Servicio no encontrado');
  if (service.profile.userId !== userId) throw new AppError(403, 'No autorizado');
  return service;
}

// POST /api/services — Create service (auth)
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createServiceSchema.parse(req.body);

    // Verify profile ownership
    const profile = await prisma.profile.findUnique({ where: { id: data.profileId } });
    if (!profile || profile.userId !== req.userId) throw new AppError(403, 'No autorizado');

    // Check 20-service limit
    const activeCount = await prisma.service.count({
      where: { profileId: data.profileId, isActive: true },
    });
    if (activeCount >= MAX_ACTIVE_SERVICES) {
      throw new AppError(400, `Has alcanzado el limite de ${MAX_ACTIVE_SERVICES} servicios activos. Desactiva alguno para crear uno nuevo.`);
    }

    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

// GET /api/services/me — My services with stats (auth)
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const profileIds = profiles.map(p => p.id);

    const services = await prisma.service.findMany({
      where: { profileId: { in: profileIds } },
      include: { profile: { select: { id: true, title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const total = services.length;
    const active = services.filter(s => s.isActive).length;
    const inactive = total - active;

    res.json({ services, stats: { total, active, inactive, limit: MAX_ACTIVE_SERVICES } });
  } catch (err) {
    next(err);
  }
});

// GET /api/services/profile/:profileId — Public: active services for a profile
router.get('/profile/:profileId', async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { profileId: req.params.profileId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// GET /api/services/:id — Public: single service detail (only if active)
router.get('/:id', async (req, res, next) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: { profile: { select: { title: true, slug: true, avatar: true } } },
    });
    if (!service || !service.isActive) throw new AppError(404, 'Servicio no encontrado');
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// PUT /api/services/:id — Update service (auth)
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyServiceOwnership(req.params.id, req.userId!);
    const data = updateServiceSchema.parse(req.body);

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
    });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id — Soft delete: set isActive=false (auth)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyServiceOwnership(req.params.id, req.userId!);

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Servicio desactivado', service });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/services/:id/toggle — Toggle isActive (auth)
router.patch('/:id/toggle', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await verifyServiceOwnership(req.params.id, req.userId!);

    // If activating, check the 20-service limit
    if (!existing.isActive) {
      const activeCount = await prisma.service.count({
        where: { profileId: existing.profileId, isActive: true },
      });
      if (activeCount >= MAX_ACTIVE_SERVICES) {
        throw new AppError(400, `Limite de ${MAX_ACTIVE_SERVICES} servicios activos alcanzado.`);
      }
    }

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// POST /api/services/:id/images — Add image URL to service images[]
router.post('/:id/images', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const service = await verifyServiceOwnership(req.params.id, req.userId!);

    const { url } = req.body;
    if (!url || typeof url !== 'string') throw new AppError(400, 'Se requiere una URL de imagen');
    try { new URL(url); } catch { throw new AppError(400, 'La URL de imagen no es válida'); }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, plan: true, planExpiresAt: true },
    });

    const currentImages = service.images;

    const imageLimit = isProUser(user!) ? MAX_IMAGES_PRO : MAX_IMAGES_FREE;
    if (currentImages.length >= imageLimit) {
      const msg = !isProUser(user!)
        ? 'El plan gratuito permite máximo 3 fotos por servicio. Activa Pro para subir más.'
        : `Has alcanzado el límite de ${MAX_IMAGES_PRO} fotos por servicio.`;
      const code = !isProUser(user!) ? 'PRO_REQUIRED' : undefined;
      throw new AppError(403, msg, code);
    }

    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: { images: [...currentImages, url] },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id/images — Remove image URL from service images[]
router.delete('/:id/images', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const service = await verifyServiceOwnership(req.params.id, req.userId!);
    const { url } = req.body;
    if (!url || typeof url !== 'string') throw new AppError(400, 'Se requiere la URL de la imagen a eliminar');

    const currentImages = service.images;
    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: { images: currentImages.filter(img => img !== url) },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
