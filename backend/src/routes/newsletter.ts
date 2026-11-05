import { Router } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { subscribeNewsletterSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { addContact, removeContact, type AudienceTarget } from '../services/audienceService';
import { emailTemplates, sendEmail } from '../services/emailService';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

function toAudienceTarget(audience: 'PACIENTES' | 'TERAPEUTAS'): AudienceTarget {
  return audience === 'PACIENTES' ? 'PACIENTES' : 'GENERAL';
}

// POST /api/newsletter/subscribe: public, rate-limited by IP+email per day
router.post('/subscribe', async (req, res, next) => {
  try {
    const { email, audience } = subscribeNewsletterSchema.parse(req.body);

    const ip = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const today = new Date().toISOString().split('T')[0];
    const rlKey = `newsletter-subscribe:${ip}:${today}`;
    const existingLimit = await prisma.rateLimit.findUnique({ where: { key: rlKey } });
    if (existingLimit && existingLimit.count >= 5) {
      throw new AppError(429, 'Demasiados intentos. Vuelve a intentarlo más tarde.');
    }
    await prisma.rateLimit.upsert({
      where: { key: rlKey },
      update: { count: { increment: 1 } },
      create: { key: rlKey, count: 1, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email_audience: { email, audience } },
    });

    if (existing?.status === 'CONFIRMED') {
      // Ya confirmado: responder éxito sin reenviar nada.
      return res.json({ ok: true });
    }

    const confirmToken = crypto.randomBytes(24).toString('hex');
    const subscriber = existing
      ? await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { status: 'PENDING', confirmToken },
        })
      : await prisma.newsletterSubscriber.create({
          data: { email, audience, status: 'PENDING', confirmToken },
        });

    const confirmUrl = `${env.API_BASE_URL}/api/newsletter/confirm/${subscriber.confirmToken}`;
    const tpl = emailTemplates.newsletterConfirm({ email, confirmUrl, audience });
    // Se espera el envio (a diferencia de un intento anterior sin await): en una funcion
    // serverless, una promesa sin await puede quedar cortada a medias cuando la funcion se
    // congela justo despues de responder, y el correo nunca sale -- confirmado en produccion
    // (varias suscripciones de prueba no generaron ningun registro en Resend). El canal de
    // tiempo que evitaba el await es un riesgo menor comparado con que el correo no se envie.
    await sendEmail(tpl.to, tpl.subject, tpl.html);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/newsletter/confirm/:token: public, link from the confirmation email
router.get('/confirm/:token', async (req, res, next) => {
  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: req.params.token },
    });
    if (!subscriber) {
      return res.redirect(`${env.FRONTEND_URL}/revista?newsletter=invalido`);
    }
    if (subscriber.status === 'UNSUBSCRIBED') {
      // Un link de confirmacion viejo (reenviado, guardado en la bandeja) no debe poder
      // revivir a alguien que ya se dio de baja -- para volver a suscribirse hay que pedir
      // un token nuevo via /subscribe.
      return res.redirect(`${env.FRONTEND_URL}/revista?newsletter=invalido`);
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    await addContact(subscriber.email, subscriber.email, toAudienceTarget(subscriber.audience));

    res.redirect(`${env.FRONTEND_URL}/revista?newsletter=confirmado`);
  } catch (err) {
    next(err);
  }
});

// GET /api/newsletter/unsubscribe/:token: public
router.get('/unsubscribe/:token', async (req, res, next) => {
  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: req.params.token },
    });
    if (!subscriber) {
      return res.redirect(`${env.FRONTEND_URL}/revista?newsletter=invalido`);
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED' },
    });

    await removeContact(subscriber.email, toAudienceTarget(subscriber.audience));

    res.redirect(`${env.FRONTEND_URL}/revista?newsletter=baja`);
  } catch (err) {
    next(err);
  }
});

export default router;
