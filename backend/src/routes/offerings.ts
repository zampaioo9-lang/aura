import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createOfferingSchema, updateOfferingSchema, createModuleSchema, updateModuleSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { isProUser } from '../lib/planUtils';
import { verifyToken } from '../services/authService';

const router = Router();
const prisma = new PrismaClient();

// Helper: verify user owns the profile that owns the offering
async function verifyOfferingOwnership(offeringId: string, userId: string) {
  const offering = await prisma.offering.findUnique({
    where: { id: offeringId },
    include: { profile: { select: { userId: true } } },
  });
  if (!offering) throw new AppError(404, 'Oferta no encontrada');
  if (offering.profile.userId !== userId) throw new AppError(403, 'No autorizado');
  return offering;
}

// POST /api/offerings — Create offering (auth, solo Pro/Clinico)
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, plan: true, planExpiresAt: true },
    });
    if (!user || !isProUser(user)) {
      throw new AppError(403, 'Vender talleres y cursos es un beneficio de los planes Pro y Clinico');
    }

    const data = createOfferingSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { id: data.profileId } });
    if (!profile || profile.userId !== req.userId) throw new AppError(403, 'No autorizado');

    const { scheduledAt, ...rest } = data;
    const offering = await prisma.offering.create({
      data: { ...rest, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined },
    });
    res.status(201).json(offering);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/me — My offerings with stats (auth)
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const profileIds = profiles.map(p => p.id);

    const offerings = await prisma.offering.findMany({
      where: { profileId: { in: profileIds } },
      include: {
        _count: { select: { modules: true, purchases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(offerings);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/profile/:profileId — Public: published offerings for a profile
router.get('/profile/:profileId', async (req, res, next) => {
  try {
    const offerings = await prisma.offering.findMany({
      where: { profileId: req.params.profileId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    });
    res.json(offerings);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/:id — Detail (public if PUBLISHED, owner can see any status)
router.get('/:id', async (req, res, next) => {
  try {
    const offering = await prisma.offering.findUnique({
      where: { id: req.params.id },
      include: {
        profile: { select: { title: true, slug: true, avatar: true, userId: true } },
        modules: { orderBy: { order: 'asc' } },
      },
    });
    if (!offering) throw new AppError(404, 'Oferta no encontrada');

    const authHeader = req.headers.authorization;
    let isOwner = false;
    if (authHeader?.startsWith('Bearer ') && offering.status !== 'PUBLISHED') {
      const payload = verifyToken(authHeader.slice(7));
      isOwner = !!payload && payload.userId === offering.profile.userId;
    }

    if (offering.status !== 'PUBLISHED' && !isOwner) {
      throw new AppError(404, 'Oferta no encontrada');
    }

    // Do not leak the internal profile.userId to the client; it's only needed
    // above for the isOwner check.
    const { userId, ...publicProfile } = offering.profile;
    res.json({ ...offering, profile: publicProfile });
  } catch (err) {
    next(err);
  }
});

// PUT /api/offerings/:id — Update (auth, owner)
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await verifyOfferingOwnership(req.params.id, req.userId!);
    const data = updateOfferingSchema.parse(req.body);
    const { scheduledAt, ...rest } = data;

    // IMPORTANT (added after Task 3's code-quality review flagged this gap):
    // updateOfferingSchema can't know the existing row's `type` (it's immutable, not part
    // of the update payload), so it can't refine against it. We must re-check the
    // LIVE_WORKSHOP invariant (scheduledAt + externalLink both present) ourselves here,
    // using the MERGED result (existing value if the update doesn't touch that field,
    // or the new value if it does — including an explicit null meaning "clear it"),
    // so a PUT can never leave a published or draft LIVE_WORKSHOP without a join link
    // or a date.
    if (existing.type === 'LIVE_WORKSHOP') {
      const finalScheduledAt = scheduledAt !== undefined ? scheduledAt : existing.scheduledAt;
      const finalExternalLink = rest.externalLink !== undefined ? rest.externalLink : existing.externalLink;
      if (!finalScheduledAt || !finalExternalLink) {
        throw new AppError(400, 'Un taller en vivo requiere fecha/hora y enlace externo');
      }
    }

    const offering = await prisma.offering.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
      },
    });
    res.json(offering);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/offerings/:id/publish — Toggle PUBLISHED/DRAFT (auth, owner)
router.patch('/:id/publish', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await verifyOfferingOwnership(req.params.id, req.userId!);

    if (existing.status === 'ARCHIVED') {
      throw new AppError(400, 'No se puede publicar una oferta archivada');
    }

    if (existing.status === 'DRAFT') {
      const moduleCount = await prisma.module.count({ where: { offeringId: existing.id } });
      if (moduleCount === 0) {
        throw new AppError(400, 'Agrega al menos un modulo antes de publicar');
      }
    }

    const newStatus = existing.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const offering = await prisma.offering.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });
    res.json(offering);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offerings/:id — Archive (auth, owner; no se borra fisicamente)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.id, req.userId!);
    const offering = await prisma.offering.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json({ message: 'Oferta archivada', offering });
  } catch (err) {
    next(err);
  }
});

// POST /api/offerings/:offeringId/modules — Add module (auth, owner)
router.post('/:offeringId/modules', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.offeringId, req.userId!);
    const data = createModuleSchema.parse(req.body);

    const currentCount = await prisma.module.count({ where: { offeringId: req.params.offeringId } });

    const module = await prisma.module.create({
      data: { ...data, offeringId: req.params.offeringId, order: currentCount + 1 },
    });
    res.status(201).json(module);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/:offeringId/modules — List modules (public if offering PUBLISHED)
router.get('/:offeringId/modules', async (req, res, next) => {
  try {
    const offering = await prisma.offering.findUnique({ where: { id: req.params.offeringId } });
    if (!offering) throw new AppError(404, 'Oferta no encontrada');
    if (offering.status !== 'PUBLISHED') throw new AppError(404, 'Oferta no encontrada');

    const modules = await prisma.module.findMany({
      where: { offeringId: req.params.offeringId },
      orderBy: { order: 'asc' },
    });
    res.json(modules);
  } catch (err) {
    next(err);
  }
});

// PUT /api/offerings/:offeringId/modules/:moduleId — Update module (auth, owner)
router.put('/:offeringId/modules/:moduleId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.offeringId, req.userId!);
    const data = updateModuleSchema.parse(req.body);

    // IMPORTANT (code-quality review after Task 4): the module must actually belong to
    // offeringId from the URL — looking it up by id alone would let an owner of ANY
    // offering edit a module of a DIFFERENT, unrelated offering (IDOR) by pairing their
    // own offeringId with a moduleId discovered elsewhere (e.g. a published offering's
    // public modules list). findFirst scoped to both ids both confirms ownership and
    // gives us the existing row to merge against for the type-invariant re-check below
    // (same pattern already applied to Offering's PUT).
    const existing = await prisma.module.findFirst({
      where: { id: req.params.moduleId, offeringId: req.params.offeringId },
    });
    if (!existing) throw new AppError(404, 'Modulo no encontrado');

    const finalTextContent = data.textContent !== undefined ? data.textContent : existing.textContent;
    const finalFileUrl = data.fileUrl !== undefined ? data.fileUrl : existing.fileUrl;

    if (existing.type === 'TEXT') {
      if (!finalTextContent) {
        throw new AppError(400, 'Un modulo de texto requiere contenido');
      }
    } else {
      if (!finalFileUrl) {
        throw new AppError(400, 'Un modulo de video o PDF requiere un archivo');
      }
    }

    const module = await prisma.module.update({
      where: { id: req.params.moduleId },
      data,
    });
    res.json(module);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offerings/:offeringId/modules/:moduleId — Delete module (auth, owner)
router.delete('/:offeringId/modules/:moduleId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.offeringId, req.userId!);

    // Scope the delete to offeringId as well (not just moduleId) to close the same
    // IDOR as above: without this, any offering owner could delete a module belonging
    // to someone else's offering by supplying their own offeringId with a foreign
    // moduleId.
    const { count } = await prisma.module.deleteMany({
      where: { id: req.params.moduleId, offeringId: req.params.offeringId },
    });
    if (count === 0) throw new AppError(404, 'Modulo no encontrado');

    res.json({ message: 'Modulo eliminado' });
  } catch (err) {
    next(err);
  }
});

export default router;
