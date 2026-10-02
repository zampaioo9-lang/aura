import { Router } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { sendEmail, emailTemplates } from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// POST /api/crisis-referrals — llamada servidor a servidor desde ia-terapia,
// autenticada con un secreto compartido (no es un usuario logueado). Busca
// un terapeuta Pro/Clínico elegible por rotación simple y lo notifica por
// correo; nunca devuelve el email ni ningún dato de contacto del terapeuta.
router.post('/', async (req, res, next) => {
  try {
    const secret = req.header('X-Ia-Terapia-Secret');
    const provided = Buffer.from(secret ?? '', 'utf8');
    const expected = Buffer.from(env.CRISIS_REFERRAL_SECRET, 'utf8');
    const authorized =
      env.CRISIS_REFERRAL_SECRET.length > 0 &&
      provided.length === expected.length &&
      crypto.timingSafeEqual(provided, expected);
    if (!authorized) {
      throw new AppError(401, 'No autorizado');
    }

    const { riskEventId, summary } = req.body as { riskEventId?: string; summary?: string };
    if (!riskEventId || !summary) {
      throw new AppError(400, 'riskEventId y summary son requeridos');
    }

    // Idempotencia: si ia-terapia reintenta el mismo riskEventId (timeout,
    // 5xx transitorio), no elegimos otro terapeuta ni reenviamos el correo,
    // solo devolvemos el resultado ya registrado.
    const existing = await prisma.crisisReferral.findUnique({ where: { riskEventId } });
    if (existing) {
      res.json({ notified: existing.emailSuccess, profileId: existing.profileId ?? undefined });
      return;
    }

    const now = new Date();
    // Criterio de elegibilidad (2026-10-02, decisión explícita del fundador):
    // mientras la base de terapeutas Pro/Clínico sea casi nula, filtrar por
    // plan de pago deja el sistema de crisis sin nadie a quien derivar casi
    // siempre, cayendo al respaldo del fundador en cada caso. En su lugar se
    // filtra por que el perfil esté realmente completo y publicado, sin
    // importar el plan — en una crisis importa más que el perfil sea real y
    // contactable que si el terapeuta paga la suscripción. "Completo" =
    // cédula capturada, especialidad definida, al menos un servicio activo,
    // y al menos un horario de disponibilidad activo. Excluye usuarios
    // bloqueados por admin.
    const eligible = await prisma.profile.findFirst({
      where: {
        published: true,
        AND: [
          { cedula: { not: null } },
          { cedula: { not: '' } },
          { specialty: { not: null } },
          { specialty: { not: '' } },
        ],
        services: { some: { isActive: true } },
        availabilitySlots: { some: { isActive: true } },
        user: { blocked: false },
      },
      orderBy: [{ lastCrisisAssignedAt: { sort: 'asc', nulls: 'first' } }],
      include: { user: { select: { name: true, email: true } } },
    });

    if (!eligible) {
      await prisma.crisisReferral.create({ data: { riskEventId, profileId: null, emailSuccess: false } });
      res.json({ notified: false });
      return;
    }

    await prisma.profile.update({ where: { id: eligible.id }, data: { lastCrisisAssignedAt: now } });

    const tpl = emailTemplates.crisisReferral({
      professionalName: eligible.user.name,
      professionalEmail: eligible.user.email,
      summary: escapeHtml(summary),
    });
    const emailResult = await sendEmail(tpl.to, tpl.subject, tpl.html);
    if (!emailResult.success) {
      console.error(`[CrisisReferral] Failed to notify profile ${eligible.id}:`, emailResult.error);
    }

    await prisma.crisisReferral.create({
      data: { riskEventId, profileId: eligible.id, emailSuccess: emailResult.success },
    });

    if (emailResult.success) {
      res.json({ notified: true, profileId: eligible.id });
    } else {
      res.json({ notified: false });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
