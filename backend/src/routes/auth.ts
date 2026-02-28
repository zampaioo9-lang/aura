import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, signToken } from '../services/authService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { registerSchema, loginSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Email already registered');

    const hashed = await hashPassword(data.password);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        phone: data.phone || null,
        trialEndsAt,
      },
    });

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError(401, 'Invalid credentials');

    const valid = await comparePassword(data.password, user.password);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, phone: true, bio: true, socialLinks: true, isAdmin: true, createdAt: true, trialEndsAt: true, plan: true, planInterval: true, planExpiresAt: true },
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me
router.patch('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name:            z.string().min(2).max(100).optional(),
      bio:             z.string().max(500).optional(),
      email:           z.string().email().optional(),
      phone:           z.string().max(20).optional(),
      socialLinks:     z.record(z.string()).optional(),
      currentPassword: z.string().optional(),
      newPassword:     z.string().min(6).optional(),
    });
    const body = schema.parse(req.body);

    const current = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!current) throw new AppError(404, 'User not found');

    const updateData: Record<string, any> = {};
    if (body.name        !== undefined) updateData.name        = body.name;
    if (body.bio         !== undefined) updateData.bio         = body.bio;
    if (body.phone       !== undefined) updateData.phone       = body.phone;
    if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks;

    // Email change
    if (body.email && body.email !== current.email) {
      const taken = await prisma.user.findUnique({ where: { email: body.email } });
      if (taken) throw new AppError(409, 'Ese correo ya está en uso');
      updateData.email = body.email;
    }

    // Password change
    if (body.newPassword) {
      if (!body.currentPassword) throw new AppError(400, 'Se requiere la contraseña actual');
      const valid = await comparePassword(body.currentPassword, current.password);
      if (!valid) throw new AppError(401, 'Contraseña actual incorrecta');
      updateData.password = await hashPassword(body.newPassword);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: { id: true, email: true, name: true, phone: true, bio: true, socialLinks: true, isAdmin: true, trialEndsAt: true, plan: true, planInterval: true, planExpiresAt: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
