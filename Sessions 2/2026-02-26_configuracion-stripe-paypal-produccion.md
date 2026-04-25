# 2026-02-26 — Configuración Stripe + PayPal en producción

## Resumen
Configuración completa de Stripe y PayPal en sandbox y live. Corrección de bugs en el backend para producción.

---

## Bugs corregidos

### 1. Rutas de suscripciones faltantes en `api/index.ts`
- `api/index.ts` es el entry point de Vercel (no `src/index.ts`)
- Faltaba importar y montar `subscriptionRoutes`
- Faltaba el middleware `express.raw()` para el webhook de Stripe
- **Fix:** agregados ambos en `api/index.ts`

### 2. `FRONTEND_URL` no configurada en Vercel
- El backend usaba `http://localhost:5173` como URL de retorno de Stripe
- **Fix:** agregada variable `FRONTEND_URL=https://www.aliax.io` en Vercel backend

### 3. `STRIPE_SECRET_KEY` incorrecta en Vercel
- Se había pegado el ID de cuenta en lugar de la secret key
- **Fix:** corregida con el valor `sk_test_...` correcto

### 4. Planes de PayPal en entorno incorrecto
- Los planes fueron creados en el dashboard live de PayPal
- Las credenciales configuradas eran de Sandbox
- **Fix:** creados planes via API de Sandbox con script `scripts/create-paypal-plans.js`

### 5. Stripe Customer IDs de test en base de datos
- Al pasar a live, los `stripeCustomerId` guardados eran de test mode
- Stripe devolvía: "a similar object exists in test mode"
- **Fix:** script `scripts/clear-stripe-customers.js` limpió 4 registros

---

## Scripts creados

- `backend/scripts/create-paypal-plans.js` — crea producto + planes en PayPal Sandbox
- `backend/scripts/create-paypal-plans-live.js` — crea producto + planes en PayPal Live
- `backend/scripts/clear-stripe-customers.js` — limpia stripeCustomerId de test en DB

---

## Variables configuradas en Vercel

### Backend (`api.aliax.io`)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_wnhQDZcx0I5WTfUMuWvaaQDfVOhS3lUs
STRIPE_PRICE_MONTHLY=price_1T5EIxAZqLYg9sEbgrhwXfmB
STRIPE_PRICE_YEARLY=price_1T5EK9AZqLYg9sEbnOcRRxxg
PAYPAL_CLIENT_ID=live_client_id
PAYPAL_CLIENT_SECRET=live_client_secret
PAYPAL_PLAN_MONTHLY=P-16W684062T120722MNGQN5QA
PAYPAL_PLAN_YEARLY=P-5A3232125N868890PNGQN5QI
PAYPAL_BASE_URL=https://api-m.paypal.com
FRONTEND_URL=https://www.aliax.io
```

### Frontend (`www.aliax.io`)
```
VITE_PAYPAL_CLIENT_ID=live_client_id
VITE_PAYPAL_PLAN_MONTHLY=P-16W684062T120722MNGQN5QA
VITE_PAYPAL_PLAN_YEARLY=P-5A3232125N868890PNGQN5QI
```

---

## IDs de referencia (Sandbox)
- Stripe Price Monthly (test): `price_1T58evAZqLYg9sEbLp6nHY3h`
- Stripe Price Yearly (test): `price_1T58hZAZqLYg9sEbADSndddb`
- PayPal Plan Monthly (sandbox): `P-0PR63060HU229281TNGQL5HI`
- PayPal Plan Yearly (sandbox): `P-42911684NA986350ANGQL5HI`

---

## Estado final
- Stripe sandbox: funcionando ✓
- Stripe live: funcionando ✓
- PayPal sandbox: funcionando ✓
- PayPal live: botones visibles ✓ (no se probó con pago real)
- Webhook Stripe live: configurado ✓
