import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  next();
}
