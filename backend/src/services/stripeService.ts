import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

const LAUNCH_END = new Date('2026-03-29T00:00:00Z');

export async function createCheckoutSession(
  userId: string,
  email: string,
  interval: 'MONTHLY' | 'YEARLY' | 'LIFETIME',
): Promise<string> {
  // Find or create Stripe customer
  let user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  let customerId = user?.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { userId } });
    customerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  if (interval === 'LIFETIME') {
    const isLaunch = Date.now() < LAUNCH_END.getTime();
    const priceId = isLaunch ? env.STRIPE_PRICE_LIFETIME_LAUNCH : env.STRIPE_PRICE_LIFETIME;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/payment/cancel`,
      metadata: { userId, interval: 'LIFETIME' },
    });

    return session.url!;
  }

  const priceId = interval === 'MONTHLY' ? env.STRIPE_PRICE_MONTHLY : env.STRIPE_PRICE_YEARLY;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/payment/cancel`,
    metadata: { userId, interval },
    subscription_data: { metadata: { userId, interval } },
  });

  return session.url!;
}

export async function handleWebhookEvent(rawBody: Buffer, sig: string): Promise<void> {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${(err as Error).message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const interval = session.metadata?.interval as 'MONTHLY' | 'YEARLY' | 'LIFETIME' | undefined;

    if (!userId || !interval) return;

    if (interval === 'LIFETIME') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: 'PRO',
          planInterval: 'LIFETIME',
          planExpiresAt: null,
          stripeSubscriptionId: null,
        },
      });
      return;
    }

    const stripeSubscriptionId = session.subscription as string;
    const planExpiresAt = interval === 'MONTHLY'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'PRO',
        planInterval: interval,
        planExpiresAt,
        stripeSubscriptionId,
      },
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    await prisma.user.update({
      where: { id: userId },
      data: { plan: null, planInterval: null, planExpiresAt: null, stripeSubscriptionId: null },
    });
  }
}
