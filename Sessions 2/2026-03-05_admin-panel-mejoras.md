# 2026-03-05 — Mejoras al panel de administración + fix OG image WhatsApp

## OG Image WhatsApp (inicio de sesión)
- La imagen dejó de aparecer en WhatsApp por caché
- Solución: cambiar URL de og:image a `https://www.aliax.io/og-image.png?v=2` en `frontend/index.html` (Twitter también)
- Redesplegar para que WhatsApp re-crawlee con URL de imagen diferente
- Funcionó correctamente

## Admin Panel — `/admin`

### Nuevo campo en schema
- `stripeHasDiscount Boolean @default(false)` en modelo `User`
- `prisma db push` para aplicar sin migración

### Backend — `backend/src/services/stripeService.ts`
- En webhook `checkout.session.completed`: detectar descuento con `session.total_details?.amount_discount > 0`
- Guardar `stripeHasDiscount: true` al actualizar el usuario (tanto LIFETIME como suscripciones)

### Backend — `backend/src/routes/admin.ts`
- `/admin/stats`: añadidos 3 conteos nuevos:
  - `usersInTrial`: usuarios con `trialEndsAt > now` y sin plan
  - `usersPaid`: usuarios con `plan = 'PRO'`
  - `usersWithDiscount`: usuarios con `stripeHasDiscount = true`
- `/admin/users`: añadidos campos al select: `trialEndsAt`, `plan`, `planInterval`, `planExpiresAt`, `stripeSubscriptionId`, `paypalSubscriptionId`, `stripeHasDiscount`

### Frontend — `frontend/src/pages/AdminPanel.tsx`
- **Dark mode**: toggle Sol/Luna en header, lee/escribe `aliax_theme` en localStorage, objeto `C` con colores light/dark aplicados como inline styles
- **Nuevas stat cards**: "En periodo de prueba", "Clientes PRO", "Con código de descuento"
- **Nueva columna "Plan"** en tabla de usuarios con componente `PlanBadge`:
  - `Prueba · Día X/14` en amarillo (trial activo)
  - `Trial expirado` en rojo
  - `PRO · Mensual/Anual/Lifetime` en verde + método de pago + badge "Descuento" en dorado
  - `Sin plan` en gris
- **Fila expandida**: muestra detalles del plan (fecha expiración, IDs Stripe/PayPal, badge descuento)
- Interfaz `UserRow` actualizada con todos los nuevos campos
- Interfaz `Stats` actualizada con `inTrial`, `paid`, `withDiscount`

## Deploy
- Backend: `cd aura/backend && vercel --prod` ✅
- Frontend: `cd aura && vercel --prod` ✅
