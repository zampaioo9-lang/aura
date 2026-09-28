import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { sendEmail, emailTemplates } from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

// POST /api/crisis-referrals — llamada servidor a servidor desde ia-terapia,
// autenticada con un secreto compartido (no es un usuario logueado). Busca
// un terapeuta Pro/Clínico elegible por rotación simple y lo notifica por
// correo; nunca devuelve el email ni ningún dato de contacto del terapeuta.
router.post('/', async (req, res, next) => {
  try {
    const secret = req.header('X-Ia-Terapia-Secret');
    if (!env.CRISIS_REFERRAL_SECRET || secret !== env.CRISIS_REFERRAL_SECRET) {
      throw new AppError(401, 'No autorizado');
    }

    const { riskEventId, summary } = req.body as { riskEventId?: string; summary?: string };
    if (!riskEventId || !summary) {
      throw new AppError(400, 'riskEventId y summary son requeridos');
    }

    const now = new Date();
    // Mismo criterio de plan vigente que /api/profiles/directory, sin
    // filtrar por enfoque terapéutico (decisión explícita del spec: en una
    // crisis importa más la disponibilidad que el modelo exacto).
    const eligible = await prisma.profile.findFirst({
      where: {
        published: true,
        user: {
          OR: [
            { plan: 'LIFETIME' },
            { plan: 'PRO', OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] },
            { plan: 'CLINICO', OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] },
          ],
        },
      },
      orderBy: [{ lastCrisisAssignedAt: { sort: 'asc', nulls: 'first' } }],
      include: { user: { select: { name: true, email: true } } },
    });

    if (!eligible) {
      res.json({ notified: false });
      return;
    }

    await prisma.profile.update({ where: { id: eligible.id }, data: { lastCrisisAssignedAt: now } });

    const tpl = emailTemplates.crisisReferral({
      professionalName: eligible.user.name,
      professionalEmail: eligible.user.email,
      summary,
    });
    await sendEmail(tpl.to, tpl.subject, tpl.html);

    res.json({ notified: true, profileId: eligible.id });
  } catch (err) {
    next(err);
  }
});

export default router;
