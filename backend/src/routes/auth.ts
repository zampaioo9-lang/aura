import { Router } from 'express';
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
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        phone: data.phone || null,
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
      select: { id: true, email: true, name: true, phone: true, isAdmin: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
