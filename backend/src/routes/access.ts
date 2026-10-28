import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { calculateScore } from '../services/scoringService';

const router = Router();
const prisma = new PrismaClient();

// Helper compartido por las tres rutas de este archivo: el accessToken es la UNICA
// credencial del comprador (sin login) -- quien lo tenga, tiene acceso a esta compra.
async function getPurchaseOrThrow(accessToken: string) {
  const purchase = await prisma.purchase.findUnique({ where: { accessToken } });
  if (!purchase) throw new AppError(404, 'Acceso no encontrado');
  return purchase;
}

// Helper compartido: calcula el puntaje+mensaje para un conjunto de respuestas de un
// modulo, consultando sus ScoringRule y el valor de cada QuestionOption. Usado tanto para
// mostrar el resultado de un cuestionario ya respondido (GET /:accessToken) como para
// calcularlo justo despues de guardar las respuestas (Task 6) y para el PDF (Task 7) --
// unico lugar que sabe como ir de "respuestas guardadas" a "puntaje y mensaje".
async function computeResultForModule(moduleId: string, answers: Array<{ valueOptionIds: string[] }>) {
  const [scoringRules, optionRows] = await Promise.all([
    prisma.scoringRule.findMany({ where: { moduleId } }),
    prisma.questionOption.findMany({ where: { question: { moduleId } } }),
  ]);
  const optionValues = new Map(optionRows.map((o) => [o.id, o.value]));
  return calculateScore(answers, optionValues, scoringRules);
}

// GET /api/access/:accessToken -- sin auth, el accessToken es la credencial.
router.get('/:accessToken', async (req, res, next) => {
  try {
    const purchase = await getPurchaseOrThrow(req.params.accessToken);

    const offering = await prisma.offering.findUnique({
      where: { id: purchase.offeringId },
      include: { modules: { orderBy: { order: 'asc' } } },
    });
    if (!offering) throw new AppError(404, 'Acceso no encontrado');

    const modules = await Promise.all(
      offering.modules.map(async (module) => {
        if (module.type !== 'QUESTIONNAIRE') {
          return module;
        }

        const existingAnswers = await prisma.answer.findMany({
          where: { purchaseId: purchase.id, question: { moduleId: module.id } },
        });

        if (existingAnswers.length > 0) {
          const result = await computeResultForModule(module.id, existingAnswers);
          return { ...module, result };
        }

        const questions = await prisma.question.findMany({
          where: { moduleId: module.id },
          orderBy: { order: 'asc' },
          include: { options: true },
        });
        return { ...module, questions };
      }),
    );

    res.json({
      buyerName: purchase.buyerName,
      offering: {
        id: offering.id,
        title: offering.title,
        description: offering.description,
        type: offering.type,
        scheduledAt: offering.scheduledAt,
        externalLink: offering.externalLink,
      },
      modules,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
