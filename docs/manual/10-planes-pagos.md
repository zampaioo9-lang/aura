# Módulo: Planes y Pagos

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/Pricing.tsx` | Página de planes |
| `frontend/src/pages/PaymentSuccess.tsx` | Confirmación post-pago |
| `frontend/src/pages/PayPalReturn.tsx` | Retorno desde PayPal |
| `backend/src/routes/subscriptions.ts` | Endpoints de suscripción |

---

## Planes

| Plan | Precio | Descripción |
|------|--------|-------------|
| **Free** | $0 permanente | Perfil público, directorio, reservas básicas, 1 template |
| **Pro Mensual** | ~$9 USD/mes (o ~$299 MXN/mes) | Todo Free + módulos Pro |
| **Pro Anual** | Descuento aplicado | Mismo Pro con precio reducido |
| **Lifetime** | Pago único | Acceso Pro permanente |

### Descuento Lanzamiento
- Cupón: `CONFIANZA20`
- Descuento: 20% off, 12 meses
- Precio efectivo: $239.20 MXN/mes o $15.20 USD/mes
- Solo aplica al plan mensual
- Expiró: 5 jun 2026 (revisar si se renueva)

---

## Stripe

### Flujo de pago Stripe

```
1. Usuario hace click "Suscribirse"
2. POST /api/subscriptions/stripe/checkout
   → Backend crea Session de Stripe Checkout
   → Retorna sessionUrl
3. Frontend redirige a Stripe Checkout
4. Usuario completa el pago
5. Stripe llama al webhook: /api/subscriptions/stripe/webhook
6. Backend actualiza User: plan = 'PRO', planInterval, stripeCustomerId, etc.
7. Usuario regresa a /payment/success
8. PaymentSuccess verifica el estado de la suscripción
```

### Campos relevantes en User (Stripe)
```
stripeCustomerId: string?
stripeSubscriptionId: string?
stripeHasDiscount: boolean     → ¿Usó cupón de descuento?
plan: 'PRO' | 'LIFETIME' | null
planInterval: 'MONTHLY' | 'YEARLY' | 'LIFETIME'
planExpiresAt: DateTime?       → null = no expira (Lifetime o suscripción activa)
```

---

## PayPal

### Flujo de pago PayPal

```
1. Usuario hace click "Pagar con PayPal"
2. POST /api/subscriptions/paypal/create-order
   → Backend crea Order en PayPal
   → Retorna approvalUrl
3. Frontend redirige a PayPal
4. Usuario aprueba el pago en PayPal
5. PayPal redirige a /payment/paypal-return?token=...&PayerID=...
6. PayPalReturn captura la orden: POST /api/subscriptions/paypal/capture-order
7. Backend actualiza User: plan = 'PRO', paypalSubscriptionId, etc.
8. Usuario ve confirmación
```

### Campos relevantes en User (PayPal)
```
paypalSubscriptionId: string?
plan, planInterval, planExpiresAt (igual que Stripe)
```

---

## Verificar Suscripción Actual

```
GET /api/subscriptions/current → {
  plan: 'PRO' | 'LIFETIME' | null,
  planInterval: 'MONTHLY' | 'YEARLY' | 'LIFETIME' | null,
  planExpiresAt: string | null,
  stripeSubscriptionId: string | null,
  paypalSubscriptionId: string | null
}
```

---

## Lógica isPro en el Frontend

```typescript
const isPro = (() => {
  if (!user) return false;
  if (user.isAdmin) return true;             // Admins siempre tienen Pro
  if (!user.plan) return false;
  if (user.plan === 'LIFETIME') return true;  // Lifetime nunca expira
  if (user.plan === 'PRO') {
    if (!user.planExpiresAt) return true;     // Suscripción activa sin fecha fin
    return new Date(user.planExpiresAt) > new Date();
  }
  return false;
})();
```

---

## Variables de Entorno Requeridas (Backend)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_PLAN_ID_MONTHLY=P-...
```

Todas configuradas en Vercel → proyecto "backend" → Settings → Environment Variables.
