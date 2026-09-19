import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createCheckoutSession, handleWebhookEvent } from '../services/stripeService';
import { verifySubscription, resolveInterval, resolveTier, createPayPalOrder, capturePayPalOrder, createPayPalSubscription, verifyPayPalWebhookSignature } from '../services/paypalService';
import { env } from '../config/env';
import { sendEmail, emailTemplates } from '../services/emailService';

const router = Router();
const prisma = new PrismaClient();

const LAUNCH_END = new Date('2026-03-29T00:00:00Z');

// POST /api/subscriptions/stripe/checkout
router.post('/stripe/checkout', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interval, currency, tier } = req.body as { interval?: string; currency?: string; tier?: string };
    if (interval !== 'MONTHLY' && interval !== 'YEARLY' && interval !== 'LIFETIME') {
      throw new AppError(400, 'interval must be MONTHLY, YEARLY or LIFETIME');
    }
    const resolvedCurrency = currency === 'MXN' ? 'MXN' : 'USD';
    const resolvedTier = tier === 'CLINICO' ? 'CLINICO' : 'PRO';

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true },
    });
    if (!user) throw new AppError(404, 'User not found');

    const url = await createCheckoutSession(req.userId!, user.email, interval, resolvedCurrency, resolvedTier);
    res.json({ url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err?.message, err?.raw || '');
    const message = err?.raw?.message || err?.message || 'Error interno';
    res.status(500).json({ error: message });
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

// POST /api/subscriptions/paypal/subscription/create  (crea suscripción mensual/anual)
router.post('/paypal/subscription/create', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interval, currency, tier } = req.body as { interval?: string; currency?: string; tier?: string };
    const resolvedCurrency = currency === 'MXN' ? 'MXN' : 'USD';
    const resolvedTier = tier === 'CLINICO' ? 'CLINICO' : 'PRO';

    let planId: string;
    if (resolvedTier === 'CLINICO') {
      planId = resolvedCurrency === 'MXN' ? env.PAYPAL_PLAN_CLINICO_MONTHLY_MXN : env.PAYPAL_PLAN_CLINICO_MONTHLY;
    } else if (interval === 'YEARLY') {
      planId = env.PAYPAL_PLAN_YEARLY;
    } else {
      planId = resolvedCurrency === 'MXN' ? env.PAYPAL_PLAN_PRO_MONTHLY_MXN : env.PAYPAL_PLAN_MONTHLY;
    }
    if (!planId) throw new AppError(500, 'PayPal plan not configured');

    const approvalUrl = await createPayPalSubscription(
      planId,
      `${env.FRONTEND_URL}/payment/paypal-return`,
      `${env.FRONTEND_URL}/pricing`,
      req.userId,
    );
    res.json({ approvalUrl });
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
    const tier = resolveTier(subscription.plan_id);
    const planExpiresAt = interval === 'MONTHLY'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        plan: tier,
        planInterval: interval,
        planExpiresAt,
        paypalSubscriptionId: subscriptionId,
      },
    });

    res.json({ success: true, interval, tier, planExpiresAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/paypal/order/create  (pago único Lifetime)
router.post('/paypal/order/create', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currency } = req.body as { currency?: string };
    const resolvedCurrency = currency === 'MXN' ? 'MXN' : 'USD';
    const isLaunch = Date.now() < LAUNCH_END.getTime();
    const amount = resolvedCurrency === 'MXN'
      ? (isLaunch ? '1299.00' : '2499.00')
      : (isLaunch ? '79.00' : '149.00');
    const { orderId, approvalUrl } = await createPayPalOrder(
      amount,
      `${env.FRONTEND_URL}/payment/paypal-return`,
      `${env.FRONTEND_URL}/pricing`,
      resolvedCurrency,
      req.userId,
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

async function notifyAdminPayPalPayment(userId: string, tier: string, interval: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) return;
  const tpl = emailTemplates.adminNewPayment({
    userName: user.name,
    userEmail: user.email,
    provider: 'PayPal',
    tier,
    interval,
  });
  sendEmail(tpl.to, tpl.subject, tpl.html).catch(() => {});
}

// POST /api/subscriptions/paypal/webhook  (respaldo servidor-a-servidor, no depende
// de que el navegador del usuario complete el regreso desde PayPal)
router.post('/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const valid = await verifyPayPalWebhookSignature(req.headers as Record<string, string>, req.body);
    if (!valid) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const { event_type, resource } = req.body as { event_type: string; resource: any };
    const userId: string | undefined = resource?.custom_id;

    if (event_type === 'PAYMENT.CAPTURE.COMPLETED' && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: 'PRO', planInterval: 'LIFETIME', planExpiresAt: null, paypalSubscriptionId: null },
      });
      await notifyAdminPayPalPayment(userId, 'PRO', 'LIFETIME');
    }

    if (event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' && userId) {
      const interval = resolveInterval(resource.plan_id);
      const tier = resolveTier(resource.plan_id);
      const planExpiresAt = interval === 'MONTHLY'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: { plan: tier, planInterval: interval, planExpiresAt, paypalSubscriptionId: resource.id },
      });
      await notifyAdminPayPalPayment(userId, tier, interval);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[PayPal Webhook] Error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
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
