# Plan Clínico + precios por región Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un tercer tier de plan (`CLINICO`, con IA de notas y transcripción de audio) a Aliax, con precios independientes por región (México en MXN, Internacional en USD) en Stripe y PayPal, y un selector de región en la página de precios.

**Architecture:** `User.plan` gana el valor `'CLINICO'`. `aiNotes`/`audio_notes` pasan a depender de un nuevo `isClinicoUser()` en vez de `isProUser()`. El checkout de Stripe/PayPal gana un parámetro `tier` que viaja hasta el webhook para guardar el plan correcto. Los IDs de precio/plan de Clínico son **placeholders** hasta que se creen los reales — Stripe se crea manualmente en el Dashboard (fuera de este plan), PayPal se crea con un script que solo se corre contra producción con confirmación explícita del usuario.

**Tech Stack:** Express + Prisma (backend), React + Vite (frontend), Stripe SDK, PayPal REST API (fetch nativo, ya sin SDK).

---

## Task 1: `planUtils.ts` — agregar `isClinicoUser()`

**Files:**
- Modify: `backend/src/lib/planUtils.ts`

- [ ] **Step 1: Escribir el archivo completo**

```typescript
export interface PlanUser {
  plan?: string | null;
  planExpiresAt?: Date | null;
  isAdmin?: boolean;
}

export function isProUser(user: PlanUser): boolean {
  if (user.isAdmin) return true;
  if (!user.plan) return false;
  if (user.plan === 'LIFETIME') return true;
  if (user.plan === 'PRO' || user.plan === 'CLINICO') {
    return !user.planExpiresAt || user.planExpiresAt > new Date();
  }
  return false;
}

export function isClinicoUser(user: PlanUser): boolean {
  if (user.isAdmin) return true;
  if (!user.plan) return false;
  if (user.plan === 'CLINICO') {
    return !user.planExpiresAt || user.planExpiresAt > new Date();
  }
  return false;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores nuevos (puede haber errores preexistentes no relacionados; si aparecen, reportar antes de continuar).

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/planUtils.ts
git commit -m "feat: agregar isClinicoUser() y reconocer CLINICO como Pro-o-superior"
```

---

## Task 2: `audio-notes.ts` — gate por Clínico, no por Pro

**Files:**
- Modify: `backend/src/routes/audio-notes.ts`

- [ ] **Step 1: Cambiar el import y la función de verificación**

Reemplazar:
```typescript
import { isProUser } from '../lib/planUtils';
```
por:
```typescript
import { isClinicoUser } from '../lib/planUtils';
```

Reemplazar:
```typescript
  const hasAccess = isProUser(user) || overrides.audio_notes === true;
```
por:
```typescript
  const hasAccess = isClinicoUser(user) || overrides.audio_notes === true;
```

(el resto de la función `verifyAudioNotesAccess` no cambia — sigue seleccionando los mismos campos `plan, planExpiresAt, isAdmin, featureOverrides`).

- [ ] **Step 2: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/audio-notes.ts
git commit -m "feat: gate de transcripción de audio ahora requiere plan Clínico, no Pro"
```

---

## Task 3: Variables de entorno nuevas (placeholders)

**Files:**
- Modify: `backend/src/config/env.ts`

- [ ] **Step 1: Agregar las 6 variables nuevas**

En `backend/src/config/env.ts`, agregar después de `STRIPE_PRICE_LIFETIME_REGULAR_MXN`:

```typescript
  STRIPE_PRICE_CLINICO_MONTHLY: process.env.STRIPE_PRICE_CLINICO_MONTHLY || '',
  STRIPE_PRICE_CLINICO_MONTHLY_MXN: process.env.STRIPE_PRICE_CLINICO_MONTHLY_MXN || '',
```

Y después de `PAYPAL_PLAN_YEARLY`:

```typescript
  PAYPAL_PLAN_PRO_MONTHLY_MXN: process.env.PAYPAL_PLAN_PRO_MONTHLY_MXN || '',
  PAYPAL_PLAN_CLINICO_MONTHLY: process.env.PAYPAL_PLAN_CLINICO_MONTHLY || '',
  PAYPAL_PLAN_CLINICO_MONTHLY_MXN: process.env.PAYPAL_PLAN_CLINICO_MONTHLY_MXN || '',
```

(Se agrega también `PAYPAL_PLAN_PRO_MONTHLY_MXN` porque hoy Pro por PayPal recurrente es solo USD — descubierto al analizar el código; sin esto, Pro nunca podría cobrarse en MXN por PayPal recurrente, solo Stripe.)

- [ ] **Step 2: Agregar los placeholders al `.env` local** (no se commitea)

En `backend/.env`, agregar (con valores placeholder hasta crear los reales):

```
STRIPE_PRICE_CLINICO_MONTHLY="price_PLACEHOLDER_CLINICO_USD"
STRIPE_PRICE_CLINICO_MONTHLY_MXN="price_PLACEHOLDER_CLINICO_MXN"
PAYPAL_PLAN_PRO_MONTHLY_MXN=""
PAYPAL_PLAN_CLINICO_MONTHLY=""
PAYPAL_PLAN_CLINICO_MONTHLY_MXN=""
```

- [ ] **Step 3: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/env.ts
git commit -m "feat: agregar variables de entorno para precios/planes de Clínico y Pro MXN PayPal"
```

---

## Task 4: `stripeService.ts` — soporte de `tier` en el checkout

**Files:**
- Modify: `backend/src/services/stripeService.ts`

- [ ] **Step 1: Actualizar la firma y lógica de `createCheckoutSession`**

Reemplazar la función completa:

```typescript
export async function createCheckoutSession(
  userId: string,
  email: string,
  interval: 'MONTHLY' | 'YEARLY' | 'LIFETIME',
  currency: 'USD' | 'MXN' = 'USD',
  tier: 'PRO' | 'CLINICO' = 'PRO',
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
    const priceId = currency === 'MXN'
      ? (isLaunch ? env.STRIPE_PRICE_LIFETIME_LAUNCH_MXN : env.STRIPE_PRICE_LIFETIME_REGULAR_MXN)
      : (isLaunch ? env.STRIPE_PRICE_LIFETIME_LAUNCH : env.STRIPE_PRICE_LIFETIME);

    const sessionParams: any = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/payment/cancel`,
      metadata: { userId, interval: 'LIFETIME', tier: 'PRO' },
    };

    if (currency === 'MXN') {
      sessionParams.customer_email = email;
    } else {
      sessionParams.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return session.url!;
  }

  let priceId: string;
  if (tier === 'CLINICO') {
    priceId = currency === 'MXN' ? env.STRIPE_PRICE_CLINICO_MONTHLY_MXN : env.STRIPE_PRICE_CLINICO_MONTHLY;
  } else {
    priceId = interval === 'MONTHLY'
      ? (currency === 'MXN' ? env.STRIPE_PRICE_MONTHLY_MXN : env.STRIPE_PRICE_MONTHLY)
      : env.STRIPE_PRICE_YEARLY;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/payment/cancel`,
    metadata: { userId, interval, tier },
    subscription_data: { metadata: { userId, interval, tier } },
  });

  return session.url!;
}
```

(Nota: Clínico solo se vende `MONTHLY` por decisión de alcance — si `tier === 'CLINICO'` se ignora el `interval` YEARLY y siempre se usa el precio mensual.)

- [ ] **Step 2: Actualizar `handleWebhookEvent` para leer `tier` y guardar el plan correcto**

Reemplazar el bloque de `checkout.session.completed`:

```typescript
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const interval = session.metadata?.interval as 'MONTHLY' | 'YEARLY' | 'LIFETIME' | undefined;
    const tier = (session.metadata?.tier as 'PRO' | 'CLINICO' | undefined) ?? 'PRO';

    if (!userId || !interval) return;

    const hasDiscount = ((session.total_details as any)?.amount_discount ?? 0) > 0;

    if (interval === 'LIFETIME') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: 'PRO',
          planInterval: 'LIFETIME',
          planExpiresAt: null,
          stripeSubscriptionId: null,
          stripeHasDiscount: hasDiscount,
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
        plan: tier,
        planInterval: interval,
        planExpiresAt,
        stripeSubscriptionId,
        stripeHasDiscount: hasDiscount,
      },
    });
  }
```

- [ ] **Step 3: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/stripeService.ts
git commit -m "feat: checkout de Stripe soporta tier PRO/CLINICO"
```

---

## Task 5: `subscriptions.ts` — aceptar `tier` en las rutas de checkout

**Files:**
- Modify: `backend/src/routes/subscriptions.ts`

- [ ] **Step 1: Actualizar la ruta de Stripe checkout**

Reemplazar:
```typescript
router.post('/stripe/checkout', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interval, currency } = req.body as { interval?: string; currency?: string };
    if (interval !== 'MONTHLY' && interval !== 'YEARLY' && interval !== 'LIFETIME') {
      throw new AppError(400, 'interval must be MONTHLY, YEARLY or LIFETIME');
    }
    const resolvedCurrency = currency === 'MXN' ? 'MXN' : 'USD';

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true },
    });
    if (!user) throw new AppError(404, 'User not found');

    const url = await createCheckoutSession(req.userId!, user.email, interval, resolvedCurrency);
    res.json({ url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err?.message, err?.raw || '');
    const message = err?.raw?.message || err?.message || 'Error interno';
    res.status(500).json({ error: message });
  }
});
```
por:
```typescript
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
```

- [ ] **Step 2: Actualizar la ruta de creación de suscripción de PayPal**

Reemplazar:
```typescript
router.post('/paypal/subscription/create', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interval } = req.body as { interval?: string };
    const planId = interval === 'YEARLY' ? env.PAYPAL_PLAN_YEARLY : env.PAYPAL_PLAN_MONTHLY;
    if (!planId) throw new AppError(500, 'PayPal plan not configured');

    const approvalUrl = await createPayPalSubscription(
      planId,
      `${env.FRONTEND_URL}/payment/paypal-return`,
      `${env.FRONTEND_URL}/pricing`,
    );
    res.json({ approvalUrl });
  } catch (err) {
    next(err);
  }
});
```
por:
```typescript
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
    );
    res.json({ approvalUrl });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Actualizar `resolveInterval` y la captura de PayPal para guardar el `tier` correcto**

En `backend/src/services/paypalService.ts`, reemplazar:
```typescript
export function resolveInterval(planId: string): 'MONTHLY' | 'YEARLY' {
  if (planId === env.PAYPAL_PLAN_YEARLY) return 'YEARLY';
  return 'MONTHLY';
}
```
por:
```typescript
export function resolveInterval(planId: string): 'MONTHLY' | 'YEARLY' {
  if (planId === env.PAYPAL_PLAN_YEARLY) return 'YEARLY';
  return 'MONTHLY';
}

export function resolveTier(planId: string): 'PRO' | 'CLINICO' {
  if (planId === env.PAYPAL_PLAN_CLINICO_MONTHLY || planId === env.PAYPAL_PLAN_CLINICO_MONTHLY_MXN) return 'CLINICO';
  return 'PRO';
}
```

En `backend/src/routes/subscriptions.ts`, en la ruta `/paypal/capture`, actualizar el import:
```typescript
import { verifySubscription, resolveInterval, createPayPalOrder, capturePayPalOrder, createPayPalSubscription } from '../services/paypalService';
```
por:
```typescript
import { verifySubscription, resolveInterval, resolveTier, createPayPalOrder, capturePayPalOrder, createPayPalSubscription } from '../services/paypalService';
```

Y reemplazar el cuerpo de la ruta `/paypal/capture`:
```typescript
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
```

- [ ] **Step 4: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/subscriptions.ts backend/src/services/paypalService.ts
git commit -m "feat: subscriptions.ts y paypalService.ts soportan tier PRO/CLINICO y Pro MXN"
```

---

## Task 6: Script para crear los planes de PayPal de Clínico (y Pro MXN)

**Files:**
- Create: `backend/scripts/create-paypal-plans.ts`

- [ ] **Step 1: Escribir el script completo**

```typescript
import { env } from '../src/config/env';

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function createProduct(token: string, name: string): Promise<string> {
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type: 'SERVICE', category: 'SOFTWARE' }),
  });
  if (!res.ok) throw new Error(`PayPal create product failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id: string };
  return data.id;
}

async function createPlan(token: string, productId: string, name: string, currency: 'USD' | 'MXN', amount: string): Promise<string> {
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      name,
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: amount, currency_code: currency } },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
      },
    }),
  });
  if (!res.ok) throw new Error(`PayPal create plan failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id: string };
  return data.id;
}

async function main() {
  console.log(`Creando planes contra: ${env.PAYPAL_BASE_URL}`);
  const token = await getAccessToken();

  const proProductId = await createProduct(token, 'Aliax Pro (México)');
  const proMxnPlanId = await createPlan(token, proProductId, 'Aliax Pro Mensual MXN', 'MXN', '210.00');
  console.log('PAYPAL_PLAN_PRO_MONTHLY_MXN =', proMxnPlanId);

  const clinicoProductId = await createProduct(token, 'Aliax Clínico');
  const clinicoUsdPlanId = await createPlan(token, clinicoProductId, 'Aliax Clínico Mensual USD', 'USD', '60.00');
  console.log('PAYPAL_PLAN_CLINICO_MONTHLY =', clinicoUsdPlanId);

  const clinicoMxnPlanId = await createPlan(token, clinicoProductId, 'Aliax Clínico Mensual MXN', 'MXN', '900.00');
  console.log('PAYPAL_PLAN_CLINICO_MONTHLY_MXN =', clinicoMxnPlanId);

  console.log('\nCopia estos 3 valores a tu .env (local y producción).');
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Correr el script en SANDBOX primero (seguro, no toca dinero real)**

Confirmar que `backend/.env` local NO tiene `PAYPAL_BASE_URL` en `https://api-m.paypal.com` (por defecto usa sandbox si no está seteada — ver `env.ts`).

Run: `cd backend && npx tsx scripts/create-paypal-plans.ts`
Expected: imprime "Creando planes contra: https://api-m.sandbox.paypal.com" y luego los 3 IDs de plan nuevos. Pegar esos 3 valores en `backend/.env` local para poder probar el flujo completo en desarrollo.

- [ ] **Step 3: NO correr contra producción todavía**

Correr este mismo script apuntando a `https://api-m.paypal.com` (producción) crea planes de facturación reales en la cuenta de PayPal real. **Esto requiere confirmación explícita del usuario antes de ejecutarse** — no es parte automática de este plan. Cuando el usuario confirme, se corre con `PAYPAL_BASE_URL=https://api-m.paypal.com` seteada temporalmente en el entorno del comando.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/create-paypal-plans.ts
git commit -m "feat: script para crear planes de PayPal (Pro MXN, Clínico USD/MXN)"
```

---

## Task 7: Frontend — `isClinico` en `AuthContext` + `useClinicoFeature`

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/hooks/useClinicoFeature.ts`

- [ ] **Step 1: Agregar `isClinico` al contexto**

En `AuthContextType`, agregar el campo:
```typescript
  isClinico: boolean;
```

Después del cálculo de `isPro`, agregar:
```typescript
  const isClinico = (() => {
    if (!user) return false;
    if (user.isAdmin) return true;
    if (user.plan !== 'CLINICO') return false;
    if (!user.planExpiresAt) return true;
    return new Date(user.planExpiresAt) > new Date();
  })();
```

Y agregarlo al value del Provider:
```typescript
    <AuthContext.Provider value={{ user, token, isPro, isClinico, featureOverrides, login, register, resetPassword, logout, updateAccount, refreshUser, loading }}>
```

- [ ] **Step 2: Crear el hook `useClinicoFeature`**

```typescript
import { useAuth } from '../context/AuthContext';

export function useClinicoFeature(key: string): boolean {
  const { isClinico, featureOverrides } = useAuth();
  return isClinico || featureOverrides[key] === true;
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/hooks/useClinicoFeature.ts
git commit -m "feat: agregar isClinico y useClinicoFeature al frontend"
```

---

## Task 8: `SessionNotesFeed.tsx` — usar `useClinicoFeature` para IA/audio

**Files:**
- Modify: `frontend/src/components/patients/SessionNotesFeed.tsx`

- [ ] **Step 1: Cambiar el import**

Reemplazar:
```typescript
import { useFeature } from '../../hooks/useFeature';
```
por:
```typescript
import { useFeature } from '../../hooks/useFeature';
import { useClinicoFeature } from '../../hooks/useClinicoFeature';
```

- [ ] **Step 2: Cambiar los dos flags de IA/audio**

Reemplazar:
```typescript
  const canUseAI = useFeature('aiNotes');
  const canUseAudioNotes = useFeature('audio_notes');
```
por:
```typescript
  const canUseAI = useClinicoFeature('aiNotes');
  const canUseAudioNotes = useClinicoFeature('audio_notes');
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/patients/SessionNotesFeed.tsx
git commit -m "feat: Generar con IA y transcripción de audio ahora requieren plan Clínico"
```

---

## Task 9: `Pricing.tsx` — 3 planes, selector de región, checkout por tier

**Files:**
- Modify: `frontend/src/pages/Pricing.tsx`

- [ ] **Step 1: Escribir el archivo completo**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Gift, Sparkles } from 'lucide-react';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

type Region = 'MX' | 'INTL';

const FREE_FEATURES = [
  'Listado en el directorio de Aliax',
  '1 perfil profesional',
  'Agenda configurable',
  'Notas de sesión manuales',
  'Servicios y reservas ilimitadas',
];

const PRO_FEATURES = [
  'Todo lo del plan gratuito',
  'Todos los templates y colores premium',
  'Analytics completos',
  'Historia Clínica Individual y de Pareja',
  'Configuración avanzada de disponibilidad',
];

const CLINICO_FEATURES = [
  'Todo lo del plan Pro',
  'Notas de sesión generadas con IA (Libre, SOAP, Diamante TBCS, Centrada en Soluciones)',
  'Transcripción de audio de sesión → nota automática',
  'Separación de hablantes, consentimiento del paciente, el audio nunca se almacena',
  'Uso generoso para tu consulta de tiempo completo',
];

const PRICES = {
  PRO:     { MX: { amount: '$210 MXN', currency: 'MXN' as const }, INTL: { amount: '$14 USD',  currency: 'USD' as const } },
  CLINICO: { MX: { amount: '$900 MXN', currency: 'MXN' as const }, INTL: { amount: '$60 USD', currency: 'USD' as const } },
};

const TEAL   = '#2dd4bf';
const TEAL_D = '#0d9488';
const PURPLE = '#7c3aed';
const TEXT   = '#e8f0f0';
const MUTED  = '#6aada8';
const DIM    = '#3d7a75';

function detectRegion(): Region {
  try {
    const lang = navigator.language || '';
    if (lang.toLowerCase().includes('mx')) return 'MX';
  } catch { /* noop */ }
  return 'INTL';
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isPro, isClinico } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>('INTL');

  useEffect(() => {
    const resolved = detectRegion();
    setRegion(resolved);
    if (!user) return; // /profiles requiere sesión — no llamar en la página pública sin login
    api.get('/profiles').then(res => {
      const country = res.data?.[0]?.country as string | undefined;
      if (country && /m[eé]xico|^mx$/i.test(country)) setRegion('MX');
    }).catch(() => { /* si falla, se queda con la detección por idioma */ });
  }, [user]);

  const priceOf = (tier: 'PRO' | 'CLINICO') => PRICES[tier][region];

  const handleStripe = async (tier: 'PRO' | 'CLINICO') => {
    if (!user) { navigate('/register'); return; }
    setLoading(`stripe-${tier}`);
    try {
      const { currency } = priceOf(tier);
      const res = await api.post('/subscriptions/stripe/checkout', { interval: 'MONTHLY', currency, tier });
      window.location.href = res.data.url;
    } catch {
      setLoading(null);
    }
  };

  const handlePayPal = async (tier: 'PRO' | 'CLINICO') => {
    if (!user) { navigate('/register'); return; }
    setLoading(`paypal-${tier}`);
    try {
      const { currency } = priceOf(tier);
      const res = await api.post('/subscriptions/paypal/subscription/create', { interval: 'MONTHLY', currency, tier });
      window.location.href = res.data.approvalUrl;
    } catch {
      setLoading(null);
    }
  };

  const regionToggle = (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
      {(['MX', 'INTL'] as Region[]).map(r => (
        <button
          key={r}
          onClick={() => setRegion(r)}
          style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${region === r ? TEAL : 'rgba(255,255,255,0.15)'}`,
            background: region === r ? 'rgba(45,212,191,0.15)' : 'transparent',
            color: region === r ? TEAL : MUTED,
          }}
        >
          {r === 'MX' ? '🇲🇽 México' : '🌎 Internacional'}
        </button>
      ))}
    </div>
  );

  const proPrice = priceOf('PRO');
  const clinicoPrice = priceOf('CLINICO');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '120px 20px 60px', fontFamily: 'system-ui, sans-serif', position: 'relative',
    }}>
      <LandingHeader />
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'inline-block', background: 'rgba(45,212,191,0.12)',
          border: '1px solid rgba(45,212,191,0.3)', borderRadius: 20, padding: '6px 16px',
          color: TEAL, fontSize: 13, marginBottom: 16,
        }}>
          Planes simples, sin sorpresas
        </div>
        <h1 style={{ color: TEXT, fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>
          Automatiza tu nota clínica
        </h1>
        <p style={{ color: MUTED, fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
          Grabas la sesión, Aliax transcribe y genera la nota. Tu perfil, reservas y servicios son siempre gratis.
        </p>
      </div>

      {regionToggle}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 1160 }}>

        {/* Free Card */}
        <div style={{ flex: '1 1 320px', maxWidth: 360, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 20, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Gift size={20} color={MUTED} />
            <span style={{ color: MUTED, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Gratuito</span>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ color: TEXT, fontSize: 38, fontWeight: 800 }}>$0</span>
            <span style={{ color: DIM, fontSize: 15 }}> / siempre</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {FREE_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: MUTED, fontSize: 13.5 }}>
                <Check size={15} color={TEAL_D} style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => user ? navigate('/dashboard') : navigate('/register')}
            style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: `1px solid rgba(45,212,191,0.35)`, background: 'transparent', color: TEAL, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {user ? 'Ir al dashboard' : 'Crear cuenta gratis'}
          </button>
        </div>

        {/* Pro Card */}
        <div style={{ flex: '1 1 320px', maxWidth: 360, background: 'linear-gradient(135deg, rgba(45,212,191,0.12) 0%, rgba(13,148,136,0.08) 100%)', border: `2px solid rgba(45,212,191,0.45)`, borderRadius: 20, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Zap size={20} color={TEAL} />
            <span style={{ color: TEAL, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Pro</span>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ color: TEXT, fontSize: 38, fontWeight: 800 }}>{proPrice.amount}</span>
            <span style={{ color: MUTED, fontSize: 15 }}> / mes</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {PRO_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: TEXT, fontSize: 13.5 }}>
                <Check size={15} color={TEAL} style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
          {isPro && !isClinico ? (
            <div style={{ width: '100%', padding: '12px 20px', borderRadius: 12, background: 'rgba(45,212,191,0.15)', color: TEAL, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
              ✓ Ya tienes Pro activo
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => handleStripe('PRO')} disabled={!!loading} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: `linear-gradient(90deg, ${TEAL}, ${TEAL_D})`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'stripe-PRO' ? 0.7 : 1 }}>
                {loading === 'stripe-PRO' ? 'Redirigiendo...' : `Pagar con tarjeta — ${proPrice.amount}/mes`}
              </button>
              <button onClick={() => handlePayPal('PRO')} disabled={!!loading} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: '#FFC439', color: '#003087', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'paypal-PRO' ? 0.7 : 1 }}>
                {loading === 'paypal-PRO' ? 'Redirigiendo...' : `PayPal — ${proPrice.amount}/mes`}
              </button>
            </div>
          )}
        </div>

        {/* Clínico Card */}
        <div style={{ flex: '1 1 320px', maxWidth: 360, background: 'linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(88,28,135,0.08) 100%)', border: `2px solid rgba(124,58,237,0.5)`, borderRadius: 20, padding: 28, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg, ${PURPLE}, #a855f7)`, borderRadius: 20, padding: '4px 16px', color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
            RECOMENDADO
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Sparkles size={20} color={PURPLE} />
            <span style={{ color: PURPLE, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Clínico</span>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ color: TEXT, fontSize: 38, fontWeight: 800 }}>{clinicoPrice.amount}</span>
            <span style={{ color: MUTED, fontSize: 15 }}> / mes</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {CLINICO_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: TEXT, fontSize: 13.5 }}>
                <Check size={15} color={PURPLE} style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
          {isClinico ? (
            <div style={{ width: '100%', padding: '12px 20px', borderRadius: 12, background: 'rgba(124,58,237,0.18)', color: PURPLE, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
              ✓ Ya tienes Clínico activo
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => handleStripe('CLINICO')} disabled={!!loading} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: `linear-gradient(90deg, ${PURPLE}, #a855f7)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'stripe-CLINICO' ? 0.7 : 1 }}>
                {loading === 'stripe-CLINICO' ? 'Redirigiendo...' : `Pagar con tarjeta — ${clinicoPrice.amount}/mes`}
              </button>
              <button onClick={() => handlePayPal('CLINICO')} disabled={!!loading} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: '#FFC439', color: '#003087', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'paypal-CLINICO' ? 0.7 : 1 }}>
                {loading === 'paypal-CLINICO' ? 'Redirigiendo...' : `PayPal — ${clinicoPrice.amount}/mes`}
              </button>
            </div>
          )}
          <p style={{ color: DIM, fontSize: 11.5, textAlign: 'center', marginTop: 8 }}>Sin costo de instalación</p>
        </div>
      </div>

      <div style={{ maxWidth: 560, width: '100%', marginTop: 40, color: MUTED, fontSize: 14, textAlign: 'center' }}>
        <p>¿Dudas? Escríbenos a <a href="mailto:hola@aliax.io" style={{ color: TEAL }}>hola@aliax.io</a></p>
      </div>
      <div style={{ width: '100%', marginTop: 40 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Pricing.tsx
git commit -m "feat: Pricing.tsx con 3 planes, selector de región y checkout por tier"
```

---

## Task 10: Verificación manual end-to-end (con IDs placeholder de Stripe/PayPal)

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar ambos servidores**

Run: `cd backend && npm run dev`
Run: `cd frontend && npm run dev`

- [ ] **Step 2: Verificar el selector de región y los 3 precios**

Entrar a `/pricing`, confirmar que aparecen los 3 planes (Free/Pro/Clínico), que el toggle México/Internacional cambia el precio mostrado (`$210 MXN` ↔ `$14 USD` para Pro, `$900 MXN` ↔ `$60 USD` para Clínico), y que por defecto se detecta una región razonable según el idioma del navegador.

- [ ] **Step 3: Verificar el gate de IA/audio sin plan Clínico**

Con un usuario Pro (no Clínico), entrar a un paciente → Nueva nota → confirmar que "Generar con IA" y "Subir audio de la sesión" muestran el candado de Pro (ya no se desbloquean solo con Pro).

- [ ] **Step 4: Verificar con `featureOverrides` manual**

Desde AdminPanel, activar `aiNotes` y `audio_notes` para un usuario sin plan Clínico → confirmar que se desbloquean igual (el override sigue funcionando, independiente del plan).

- [ ] **Step 5: Reportar hallazgos**

Si algo falla, no continuar — corregir antes de considerar esto listo. El checkout real de Stripe/PayPal no se puede probar de punta a punta hasta reemplazar los placeholders por IDs reales (Task 3 y Task 6).

---

## Pendiente fuera de este plan (requiere acción del usuario)

- Crear los 2 Price IDs de Stripe para Clínico (MXN y USD, mensual) en el Dashboard de Stripe, y reemplazar los placeholders en `.env` (local y producción).
- Decidir cuándo correr `create-paypal-plans.ts` contra producción (`PAYPAL_BASE_URL=https://api-m.paypal.com`) — requiere confirmación explícita antes de ejecutarse, porque crea planes de facturación reales.
- Migrar a los 4 usuarios Pro actuales al nuevo esquema con precio de fundador (manual, vía Stripe/PayPal dashboard o script aparte).
- Ajustar guion de diagnóstico y copy de marketing para liderar con el plan Clínico.
- Evaluar cambiar el modelo de `ai-notes.ts` de Opus a Sonnet para reducir costo por nota (mencionado en sesiones anteriores, no incluido aquí).
