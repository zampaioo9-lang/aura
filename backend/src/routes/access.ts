import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { calculateScore } from '../services/scoringService';
import { submitAnswersSchema } from '../utils/validation';

const router = Router();
const prisma = new PrismaClient();

// Helper compartido por las tres rutas de este archivo: el accessToken es la UNICA
// credencial del comprador (sin login) -- quien lo tenga, tiene acceso a esta compra.
// El chequeo de paidAt es un refuerzo: hoy siempre esta presente (purchaseService.ts es el
// unico lugar que crea un Purchase, y siempre lo hace con paidAt ya puesto), pero el campo
// es nullable en el schema -- este chequeo evita que el acceso dependa silenciosamente de
// un invariante que solo otro archivo garantiza.
async function getPurchaseOrThrow(accessToken: string) {
  const purchase = await prisma.purchase.findUnique({ where: { accessToken } });
  if (!purchase || !purchase.paidAt) throw new AppError(404, 'Acceso no encontrado');
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

        // select (no incluir `value`) en las opciones: el comprador todavia no respondio --
        // mostrarle el peso numerico de cada opcion le permitiria reconstruir como se
        // calcula el puntaje y elegir las respuestas que le den el resultado que quiera,
        // en vez de responder honestamente. El `value` solo hace falta del lado del
        // servidor (ver computeResultForModule), nunca en lo que se le manda al comprador.
        const questions = await prisma.question.findMany({
          where: { moduleId: module.id },
          orderBy: { order: 'asc' },
          include: { options: { select: { id: true, label: true } } },
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

// POST /api/access/:accessToken/modules/:moduleId/answers -- sin auth. El cuestionario se
// responde una sola vez (decision de diseno); un segundo intento se rechaza con 400.
//
// LIMITE CONOCIDO Y ACEPTADO: el chequeo de "ya respondiste" (existingCount > 0) y el
// prisma.answer.createMany de abajo son dos operaciones separadas, no una transaccion --
// dos envios casi simultaneos del mismo comprador podrian ambos pasar el chequeo y crear
// respuestas duplicadas para las mismas preguntas, inflando el puntaje calculado despues.
// Mismo tipo de condicion de carrera ya aceptada en otras partes de este proyecto (ver
// purchases.ts, el chequeo de capacity); cerrarla del todo requeriria una restriccion unica
// a nivel de base de datos (purchaseId, questionId), que el spec de esta fase decidio no
// agregar (sin cambios de schema). Bajo riesgo real: requiere que el mismo comprador
// envie el formulario dos veces en una ventana de milisegundos.
router.post('/:accessToken/modules/:moduleId/answers', async (req, res, next) => {
  try {
    const purchase = await getPurchaseOrThrow(req.params.accessToken);

    const module = await prisma.module.findFirst({
      where: { id: req.params.moduleId, offeringId: purchase.offeringId },
    });
    if (!module) throw new AppError(404, 'Modulo no encontrado');
    if (module.type !== 'QUESTIONNAIRE') {
      throw new AppError(400, 'Este modulo no es un cuestionario');
    }

    const existingCount = await prisma.answer.count({
      where: { purchaseId: purchase.id, question: { moduleId: module.id } },
    });
    if (existingCount > 0) {
      throw new AppError(400, 'Ya respondiste este cuestionario');
    }

    const data = submitAnswersSchema.parse(req.body);

    const questions = await prisma.question.findMany({
      where: { moduleId: module.id },
      include: { options: true },
    });
    if (questions.length === 0) throw new AppError(400, 'Este cuestionario no tiene preguntas');

    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const answeredIds = new Set(data.answers.map((a) => a.questionId));

    if (answeredIds.size !== data.answers.length) {
      throw new AppError(400, 'Hay respuestas duplicadas para la misma pregunta');
    }
    if (answeredIds.size !== questions.length || questions.some((q) => !answeredIds.has(q.id))) {
      throw new AppError(400, 'Debes responder todas las preguntas del cuestionario');
    }

    for (const answer of data.answers) {
      const question = questionsById.get(answer.questionId)!;

      if (question.type === 'FREE_TEXT') {
        if (!answer.valueText || answer.valueText.trim().length === 0) {
          throw new AppError(400, `La pregunta "${question.text}" requiere una respuesta de texto`);
        }
        if (answer.valueOptionIds && answer.valueOptionIds.length > 0) {
          throw new AppError(400, `La pregunta "${question.text}" no acepta opciones`);
        }
      } else {
        const validOptionIds = new Set(question.options.map((o) => o.id));
        const selected = answer.valueOptionIds ?? [];
        if (selected.length === 0) {
          throw new AppError(400, `La pregunta "${question.text}" requiere al menos una opcion`);
        }
        if (question.type === 'SINGLE_CHOICE' && selected.length > 1) {
          throw new AppError(400, `La pregunta "${question.text}" acepta solo una opcion`);
        }
        if (selected.some((id) => !validOptionIds.has(id))) {
          throw new AppError(400, `La pregunta "${question.text}" tiene una opcion invalida`);
        }
        if (answer.valueText) {
          throw new AppError(400, `La pregunta "${question.text}" no acepta texto libre`);
        }
      }
    }

    await prisma.answer.createMany({
      data: data.answers.map((a) => ({
        purchaseId: purchase.id,
        questionId: a.questionId,
        valueText: a.valueText || null,
        valueOptionIds: a.valueOptionIds ?? [],
      })),
    });

    const result = await computeResultForModule(
      module.id,
      data.answers.map((a) => ({ valueOptionIds: a.valueOptionIds ?? [] })),
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
