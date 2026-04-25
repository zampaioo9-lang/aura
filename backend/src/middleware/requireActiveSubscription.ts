import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export async function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, trialEndsAt: true, plan: true, planExpiresAt: true },
    });

    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    // Admins always pass
    if (user.isAdmin) return next();

    const now = new Date();
    const trialActive = user.trialEndsAt !== null && user.trialEndsAt > now;
    const planActive =
      user.plan !== null && (user.planExpiresAt === null || user.planExpiresAt > now);

    if (!trialActive && !planActive) {
      return res.status(403).json({
        error: 'Tu período de prueba ha finalizado. Activa tu plan para continuar.',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
