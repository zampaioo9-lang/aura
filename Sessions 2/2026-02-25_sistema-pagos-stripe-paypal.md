# 2026-02-25 — Sistema de pagos Stripe + PayPal

## Resumen
Implementación completa del sistema de pagos Pro ($9/mes · $79/año) con Stripe (tarjeta) y PayPal. Migración aplicada en producción y deploy a Vercel.

---

## Cambios implementados

### Backend

**`prisma/schema.prisma`**
- Añadidos 6 campos al modelo `User`: `plan`, `planInterval`, `planExpiresAt`, `stripeCustomerId`, `stripeSubscriptionId`, `paypalSubscriptionId`

**`src/config/env.ts`**
- Añadidas variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_MONTHLY`, `PAYPAL_PLAN_YEARLY`, `PAYPAL_BASE_URL`

**`src/services/stripeService.ts`** (nuevo)
- `createCheckoutSession(userId, email, interval)` → crea/reutiliza customer, devuelve URL de Stripe Checkout
- `handleWebhookEvent(rawBody, sig)` → maneja `checkout.session.completed` (activa plan) y `customer.subscription.deleted` (desactiva plan)

**`src/services/paypalService.ts`** (nuevo)
- `getAccessToken()` → OAuth2 con client credentials
- `verifySubscription(subscriptionId)` → verifica estado en API de PayPal
- `resolveInterval(planId)` → mapea plan ID a `MONTHLY` | `YEARLY`

**`src/routes/subscriptions.ts`** (nuevo)
- `POST /api/subscriptions/stripe/checkout` — requiere auth
- `POST /api/subscriptions/stripe/webhook` — sin auth, raw body
- `POST /api/subscriptions/paypal/capture` — requiere auth
- `GET  /api/subscriptions/current` — requiere auth

**`src/routes/auth.ts`**
- Selects de `GET /me` y `PATCH /me` incluyen `plan`, `planInterval`, `planExpiresAt`

**`src/index.ts`**
- Raw body middleware para `/api/subscriptions/stripe/webhook` antes de `express.json()`
- Montado `subscriptionRoutes` en `/api/subscriptions`

**Dependencia instalada:** `stripe`

### Base de datos (Neon / producción)
- Migración `20260225_add_payment_fields` aplicada en producción
- Proceso: baseline de `20260218_add_scheduling_config` → `prisma migrate deploy`
- SQL: `ALTER TABLE "User" ADD COLUMN ...` (6 columnas nullable, no destructivo)

### Frontend

**`src/context/AuthContext.tsx`**
- Tipo `User` extendido: `plan?`, `planInterval?`, `planExpiresAt?`
- Nueva función `refreshUser()` para re-fetch de `/auth/me`

**`src/pages/Pricing.tsx`** (nuevo)
- Dos cards: Pro Mensual ($9/mes) y Pro Anual ($79/año, badge "Ahorra 2 meses")
- Stripe: botón "Pagar con tarjeta" → `POST /api/subscriptions/stripe/checkout` → redirect
- PayPal: `PayPalButtons` con `createSubscription` + `onApprove` → `POST /api/subscriptions/paypal/capture`
- Sin auth: guarda intervalo en `sessionStorage('pending_plan')` → redirige a `/register`
- `PayPalScriptProvider` wrapping con `vault=true`, `intent=subscription`

**`src/pages/PaymentSuccess.tsx`** (nuevo)
- Llama `GET /api/subscriptions/current`, luego `refreshUser()`
- Estados: loading → success → (error como fallback)
- Botón → `/dashboard`

**`src/App.tsx`**
- Nuevas rutas: `/pricing`, `/payment/success` (ProtectedRoute), `/payment/cancel` → Pricing

**`src/pages/Dashboard.tsx`**
- `trialExpired`: si `user.plan === 'PRO'` y `planExpiresAt > now` → no expirado
- Banner "Activar plan" → `<Link to="/pricing">`
- `TrialExpiredScreen` botón → `<Link to="/pricing">` (antes era mailto)

**Dependencia instalada:** `@paypal/react-paypal-js`

---

## Deploy

| Proyecto | URL producción |
|---|---|
| Backend | https://api.aliax.io |
| Frontend | https://www.aliax.io |

**Pendiente:** Configurar env vars en Vercel (usuario debe pegar los valores de Stripe y PayPal).

### Variables backend (proyecto `backend` en Vercel)
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_YEARLY
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_PLAN_MONTHLY
PAYPAL_PLAN_YEARLY
PAYPAL_BASE_URL
```

### Variables frontend (proyecto `aura` en Vercel)
```
VITE_PAYPAL_CLIENT_ID
VITE_PAYPAL_PLAN_MONTHLY
VITE_PAYPAL_PLAN_YEARLY
```

---

## Flujo de pago implementado

### Stripe
1. `/pricing` → clic "Pagar con tarjeta" → `POST /api/subscriptions/stripe/checkout`
2. Backend crea Stripe Checkout Session → devuelve URL
3. Frontend redirige a URL de Stripe
4. Stripe redirige a `/payment/success?session_id=xxx`
5. Webhook `checkout.session.completed` → activa plan en DB

### PayPal
1. `PayPalButtons.createSubscription` → popup PayPal
2. Usuario aprueba → SDK devuelve `subscriptionID`
3. `onApprove` → `POST /api/subscriptions/paypal/capture`
4. Backend verifica con API PayPal → activa plan en DB
5. Frontend navega a `/payment/success`

---

## Notas técnicas
- Neon no soporta shadow database → `migrate dev --create-only` falló → migración creada manualmente
- Vercel usa caché agresivo del build: cambios en archivos TS se reflejan en el siguiente upload completo
- El webhook de Stripe requiere `express.raw()` ANTES de `express.json()` en index.ts
