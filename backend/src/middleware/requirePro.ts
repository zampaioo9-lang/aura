import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';
import { isProUser } from '../lib/planUtils';

const prisma = new PrismaClient();

export async function requirePro(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, plan: true, planExpiresAt: true },
    });

    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    if (!isProUser(user)) {
      return res.status(403).json({
        error: 'Esta función requiere el plan Pro.',
        code: 'PRO_REQUIRED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
