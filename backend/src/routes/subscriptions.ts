import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createCheckoutSession, handleWebhookEvent } from '../services/stripeService';
import { verifySubscription, resolveInterval, createPayPalOrder, capturePayPalOrder } from '../services/paypalService';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

const LAUNCH_END = new Date('2026-03-29T00:00:00Z');

// POST /api/subscriptions/stripe/checkout
router.post('/stripe/checkout', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interval } = req.body as { interval?: string };
    if (interval !== 'MONTHLY' && interval !== 'YEARLY' && interval !== 'LIFETIME') {
      throw new AppError(400, 'interval must be MONTHLY, YEARLY or LIFETIME');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true },
    });
    if (!user) throw new AppError(404, 'User not found');

    const url = await createCheckoutSession(req.userId!, user.email, interval);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/stripe/webhook  (raw body, no auth)
router.post('/stripe/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) throw new AppError(400, 'Missing stripe-signature header');

    await handleWebhookEvent(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/paypal/capture  (suscripción recurrente: MONTHLY/YEARLY)
router.post('/paypal/capture', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subscriptionId } = req.body as { subscriptionId?: string };
    if (!subscriptionId) throw new AppError(400, 'subscriptionId is required');

    const subscription = await verifySubscription(subscriptionId);
    if (subscription.status !== 'ACTIVE') {
      throw new AppError(400, `PayPal subscription is not active (status: ${subscription.status})`);
    }

    const interval = resolveInterval(subscription.plan_id);
    const planExpiresAt = interval === 'MONTHLY'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        plan: 'PRO',
        planInterval: interval,
        planExpiresAt,
        paypalSubscriptionId: subscriptionId,
      },
    });

    res.json({ success: true, interval, planExpiresAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/paypal/order/create  (pago único Lifetime)
router.post('/paypal/order/create', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isLaunch = Date.now() < LAUNCH_END.getTime();
    const amount = isLaunch ? '79.00' : '149.00';
    const { orderId, approvalUrl } = await createPayPalOrder(
      amount,
      `${env.FRONTEND_URL}/payment/paypal-return`,
      `${env.FRONTEND_URL}/pricing`,
    );
    res.json({ orderId, approvalUrl });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/paypal/order/capture  (confirmar pago único Lifetime)
router.post('/paypal/order/capture', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) throw new AppError(400, 'orderId is required');

    const result = await capturePayPalOrder(orderId);
    if (result.status !== 'COMPLETED') {
      throw new AppError(400, `PayPal order not completed (status: ${result.status})`);
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        plan: 'PRO',
        planInterval: 'LIFETIME',
        planExpiresAt: null,
        paypalSubscriptionId: null,
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions/current
router.get('/current', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { plan: true, planInterval: true, planExpiresAt: true },
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
