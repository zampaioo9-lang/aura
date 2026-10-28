import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createOfferingSchema, updateOfferingSchema, createModuleSchema, updateModuleSchema, createQuestionSchema, updateQuestionSchema, createScoringRuleSchema, updateScoringRuleSchema } from '../utils/validation';
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

// Helper: verify a module belongs to offeringId AND the offering's profile belongs to
// userId, in one atomic query. Closes the same class of IDOR that Fase 1's review found
// on the Module routes (see the comments on PUT/DELETE /:offeringId/modules/:moduleId
// below), but in a single query instead of two separate ones.
// Includes offering.status so callers can enforce the publish-state delete gates below
// without an extra round trip.
async function verifyModuleOwnership(offeringId: string, moduleId: string, userId: string) {
  const module = await prisma.module.findFirst({
    where: { id: moduleId, offeringId, offering: { profile: { userId } } },
    include: { offering: { select: { status: true } } },
  });
  if (!module) throw new AppError(404, 'Modulo no encontrado');
  return module;
}

// Helper: verify a question belongs to moduleId AND that module's offering's profile
// belongs to userId, in one atomic query, same pattern as above, one level deeper.
async function verifyQuestionOwnership(moduleId: string, questionId: string, userId: string) {
  const question = await prisma.question.findFirst({
    where: { id: questionId, moduleId, module: { offering: { profile: { userId } } } },
  });
  if (!question) throw new AppError(404, 'Pregunta no encontrada');
  return question;
}

// Helper: verify a scoring rule belongs to moduleId AND that module's offering's profile
// belongs to userId, same pattern as verifyQuestionOwnership.
async function verifyScoringRuleOwnership(moduleId: string, ruleId: string, userId: string) {
  const rule = await prisma.scoringRule.findFirst({
    where: { id: ruleId, moduleId, module: { offering: { profile: { userId } } } },
  });
  if (!rule) throw new AppError(404, 'Regla de puntuacion no encontrada');
  return rule;
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
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      isOwner = !!payload && payload.userId === offering.profile.userId;
    }

    if (offering.status !== 'PUBLISHED' && !isOwner) {
      throw new AppError(404, 'Oferta no encontrada');
    }

    // Cierra el TODO de Fase 1: ahora que Purchase existe y se usa de verdad (Fase 3/4),
    // quien no es el dueno del Offering ya no ve el contenido completo de los modulos --
    // solo lo esencial para decidir si comprar (titulo, descripcion, tipo, orden). El
    // contenido real se sirve unicamente por accessToken (ver access.ts, Fase 4).
    const sanitizedModules = isOwner
      ? offering.modules
      : offering.modules.map(({ textContent, fileUrl, ...rest }) => rest);

    // Do not leak the internal profile.userId to the client; it's only needed
    // above for the isOwner check.
    const { userId, ...publicProfile } = offering.profile;
    res.json({ ...offering, modules: sanitizedModules, profile: publicProfile });
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
      const modules = await prisma.module.findMany({
        where: { offeringId: existing.id },
        include: {
          questions: { select: { type: true } },
          _count: { select: { scoringRules: true } },
        },
      });
      if (modules.length === 0) {
        throw new AppError(400, 'Agrega al menos un modulo antes de publicar');
      }
      const emptyQuestionnaire = modules.find(
        (m) => m.type === 'QUESTIONNAIRE' && m.questions.length === 0
      );
      if (emptyQuestionnaire) {
        throw new AppError(
          400,
          `El modulo de cuestionario "${emptyQuestionnaire.title}" necesita al menos una pregunta antes de publicar`
        );
      }
      // Una pregunta de opcion (SINGLE_CHOICE/MULTIPLE_CHOICE) tiene un valor numerico
      // que se suma a un puntaje total; sin al menos una ScoringRule, ese puntaje no
      // coincide con ningun rango y el comprador no recibe mensaje de resultado en Fase 4.
      // Las preguntas de texto libre no puntuan, asi que un cuestionario compuesto solo de
      // esas no necesita reglas.
      const questionnaireMissingScoring = modules.find(
        (m) =>
          m.type === 'QUESTIONNAIRE' &&
          m._count.scoringRules === 0 &&
          m.questions.some((q) => q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE')
      );
      if (questionnaireMissingScoring) {
        throw new AppError(
          400,
          `El modulo de cuestionario "${questionnaireMissingScoring.title}" tiene preguntas de opcion y necesita al menos una regla de puntuacion antes de publicar`
        );
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
    const offering = await prisma.offering.findUnique({
      where: { id: req.params.offeringId },
      include: { profile: { select: { userId: true } } },
    });
    if (!offering) throw new AppError(404, 'Oferta no encontrada');
    if (offering.status !== 'PUBLISHED') throw new AppError(404, 'Oferta no encontrada');

    const authHeader = req.headers.authorization;
    let isOwner = false;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      isOwner = !!payload && payload.userId === offering.profile.userId;
    }

    const modules = await prisma.module.findMany({
      where: { offeringId: req.params.offeringId },
      orderBy: { order: 'asc' },
    });

    // Mismo cierre del TODO de Fase 1 que GET /:id (ver arriba).
    const sanitizedModules = isOwner
      ? modules
      : modules.map(({ textContent, fileUrl, ...rest }) => rest);

    res.json(sanitizedModules);
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
    } else if (existing.type === 'VIDEO' || existing.type === 'PDF') {
      if (!finalFileUrl) {
        throw new AppError(400, 'Un modulo de video o PDF requiere un archivo');
      }
    }
    // QUESTIONNAIRE no tiene invariante de textContent/fileUrl: su contenido son las
    // Preguntas (Question), que se gestionan por separado via las rutas de /questions.

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
    // verifyModuleOwnership (not just verifyOfferingOwnership) so a moduleId that doesn't
    // exist or doesn't belong to this offering 404s BEFORE the PUBLISHED-count gate below
    // runs. Checking the gate first would wrongly return 400 (and leak the offering's
    // module count) for a bad moduleId when the offering happens to have exactly 1 module.
    const module = await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);

    // Resolved design question from Fase 2's final review: deleting the only module of an
    // already-PUBLISHED offering would leave it in the exact invalid state that
    // PATCH /:id/publish blocks at publish time (0 modules). Block it here too, symmetric
    // with that gate, instead of silently allowing an invalid published offering to exist.
    // NOTE: this count check and the delete below are separate, non-transactional queries
    // (same as the rest of this file, e.g. order: currentCount + 1) — two concurrent
    // deletes against a 2-module offering could both pass and leave 0 modules. Acceptable
    // for now given no buyer flow exists yet; revisit if this becomes a real race.
    if (module.offering.status === 'PUBLISHED') {
      const moduleCount = await prisma.module.count({ where: { offeringId: req.params.offeringId } });
      if (moduleCount <= 1) {
        throw new AppError(400, 'No se puede borrar el unico modulo de una oferta ya publicada; despublica la oferta primero');
      }
    }

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

// POST /api/offerings/:offeringId/modules/:moduleId/questions: Add question (auth, owner, module must be QUESTIONNAIRE)
router.post('/:offeringId/modules/:moduleId/questions', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const module = await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    if (module.type !== 'QUESTIONNAIRE') {
      throw new AppError(400, 'Solo los modulos de tipo Cuestionario pueden tener preguntas');
    }

    const data = createQuestionSchema.parse(req.body);
    const currentCount = await prisma.question.count({ where: { moduleId: req.params.moduleId } });

    const question = await prisma.question.create({
      data: {
        moduleId: req.params.moduleId,
        order: currentCount + 1,
        text: data.text,
        type: data.type,
        ...(data.options ? { options: { create: data.options } } : {}),
      },
      include: { options: true },
    });
    res.status(201).json(question);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/:offeringId/modules/:moduleId/questions: List questions (auth, owner only, not public yet, same reasoning as the Fase 1 TODO on module content)
router.get('/:offeringId/modules/:moduleId/questions', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);

    const questions = await prisma.question.findMany({
      where: { moduleId: req.params.moduleId },
      orderBy: { order: 'asc' },
      include: { options: true },
    });
    res.json(questions);
  } catch (err) {
    next(err);
  }
});

// PUT /api/offerings/:offeringId/modules/:moduleId/questions/:questionId: Update question text (auth, owner). Type and options are immutable post-creation (same convention as Module.type/Offering.type). To change them, delete and recreate the question.
router.put('/:offeringId/modules/:moduleId/questions/:questionId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    await verifyQuestionOwnership(req.params.moduleId, req.params.questionId, req.userId!);

    const data = updateQuestionSchema.parse(req.body);
    const question = await prisma.question.update({
      where: { id: req.params.questionId },
      data,
      include: { options: true },
    });
    res.json(question);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offerings/:offeringId/modules/:moduleId/questions/:questionId: Delete question (auth, owner). Cascades to its QuestionOption rows and any Answer rows via the schema's onDelete: Cascade.
// Resolved design question from Fase 2's final review: deleting the last question of an
// already-PUBLISHED offering's QUESTIONNAIRE module would leave it in the exact invalid
// state that PATCH /:id/publish blocks at publish time (0 questions). Block it here too,
// symmetric with that gate and with the module-delete gate above.
router.delete('/:offeringId/modules/:moduleId/questions/:questionId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const module = await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    await verifyQuestionOwnership(req.params.moduleId, req.params.questionId, req.userId!);

    // NOTE: same non-transactional race as the module-delete gate above (count check and
    // delete are separate queries). Acceptable for now, same reasoning.
    if (module.offering.status === 'PUBLISHED') {
      const questionCount = await prisma.question.count({ where: { moduleId: req.params.moduleId } });
      if (questionCount <= 1) {
        throw new AppError(400, 'No se puede borrar la unica pregunta de un cuestionario ya publicado; despublica la oferta primero');
      }
    }

    // deleteMany + count-check (not delete()) even though verifyQuestionOwnership just
    // confirmed the row exists: delete() throws Prisma's P2025 if the row is gone by the
    // time this runs (e.g. a double-click firing two identical DELETEs, or the parent
    // Module being deleted concurrently, which cascades to its Questions), and P2025 isn't
    // an AppError/ZodError so errorHandler.ts would turn it into a 500 instead of a clean
    // 404. deleteMany can't throw on "not found", it just reports count: 0.
    const { count } = await prisma.question.deleteMany({
      where: { id: req.params.questionId, moduleId: req.params.moduleId },
    });
    if (count === 0) throw new AppError(404, 'Pregunta no encontrada');

    res.json({ message: 'Pregunta eliminada' });
  } catch (err) {
    next(err);
  }
});

// POST /api/offerings/:offeringId/modules/:moduleId/scoring-rules: Add scoring rule (auth, owner, module must be QUESTIONNAIRE)
router.post('/:offeringId/modules/:moduleId/scoring-rules', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const module = await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    if (module.type !== 'QUESTIONNAIRE') {
      throw new AppError(400, 'Solo los modulos de tipo Cuestionario pueden tener reglas de puntuacion');
    }

    const data = createScoringRuleSchema.parse(req.body);
    const rule = await prisma.scoringRule.create({
      data: { moduleId: req.params.moduleId, ...data },
    });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/:offeringId/modules/:moduleId/scoring-rules: List scoring rules (auth, owner only)
router.get('/:offeringId/modules/:moduleId/scoring-rules', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);

    const rules = await prisma.scoringRule.findMany({
      where: { moduleId: req.params.moduleId },
      orderBy: { minScore: 'asc' },
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

// PUT /api/offerings/:offeringId/modules/:moduleId/scoring-rules/:ruleId: Update scoring rule (auth, owner)
router.put('/:offeringId/modules/:moduleId/scoring-rules/:ruleId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    const existing = await verifyScoringRuleOwnership(req.params.moduleId, req.params.ruleId, req.userId!);

    const data = updateScoringRuleSchema.parse(req.body);

    // Re-check minScore<=maxScore against the MERGED result, same reasoning as every
    // other partial-update invariant check in this file (Offering.scheduledAt/externalLink,
    // Module.textContent/fileUrl): a PUT that only sends one of the two fields must not be
    // able to produce an inverted range.
    const finalMin = data.minScore !== undefined ? data.minScore : existing.minScore;
    const finalMax = data.maxScore !== undefined ? data.maxScore : existing.maxScore;
    if (finalMax < finalMin) {
      throw new AppError(400, 'maxScore debe ser mayor o igual a minScore');
    }

    const rule = await prisma.scoringRule.update({
      where: { id: req.params.ruleId },
      data,
    });
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offerings/:offeringId/modules/:moduleId/scoring-rules/:ruleId: Delete scoring rule (auth, owner)
router.delete('/:offeringId/modules/:moduleId/scoring-rules/:ruleId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);

    const { count } = await prisma.scoringRule.deleteMany({
      where: { id: req.params.ruleId, moduleId: req.params.moduleId },
    });
    if (count === 0) throw new AppError(404, 'Regla de puntuacion no encontrada');

    res.json({ message: 'Regla de puntuacion eliminada' });
  } catch (err) {
    next(err);
  }
});

export default router;
