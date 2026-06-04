import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../services/authService';

export interface AuthRequest extends Request {
  userId?: string;
}

const prisma = new PrismaClient();

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, blocked: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  if (user.blocked) {
    return res.status(403).json({ error: 'Cuenta suspendida. Contacta al administrador.' });
  }

  req.userId = payload.userId;
  next();
}
