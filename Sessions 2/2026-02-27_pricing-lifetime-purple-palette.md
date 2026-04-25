# 2026-02-27 — Nuevo modelo de pricing + paleta púrpura

## Resumen
Sesión larga con dos bloques principales:
1. Implementación completa del nuevo modelo de pricing (Monthly $19 + Lifetime $79/$149)
2. Refinamientos visuales: paleta púrpura, fixes mobile, anuncios de próximos features

---

## Modelo de pricing implementado

### Planes
- **Pro Mensual:** $19/mes (suscripción recurrente)
- **Pro Lifetime:** $79 lanzamiento / $149 regular (pago único, jamás expira)
  - Countdown regresivo hasta 2026-03-29
  - Badge "Precio de lanzamiento" en naranja/rojo durante launch
- **Ambos planes:** 1 perfil máximo

### Backend modificado
- `backend/src/config/env.ts` — +2 vars: `STRIPE_PRICE_LIFETIME_LAUNCH`, `STRIPE_PRICE_LIFETIME`
- `backend/src/services/stripeService.ts` — LIFETIME usa `mode: 'payment'`, `planExpiresAt: null`
- `backend/src/services/paypalService.ts` — +`createPayPalOrder`, `capturePayPalOrder` (Orders API v2)
- `backend/src/routes/subscriptions.ts` — +endpoints `/paypal/order/create` y `/paypal/order/capture`
- `backend/src/routes/profiles.ts` — guard: máximo 1 perfil por cuenta
- Backend desplegado manualmente con `vercel --prod` desde `backend/`

### Frontend modificado
- `Pricing.tsx` — reescritura completa: countdown, launch badge, PayPal redirect flow
- `PayPalReturn.tsx` — nueva página que captura el order de PayPal al retorno
- `AuthContext.tsx` — +campos `plan`, `planInterval`, `planExpiresAt`, `trialEndsAt`, `refreshUser`
- `Dashboard.tsx` — fix `trialExpired` para LIFETIME (nunca expira)
- `App.tsx` — +rutas `/pricing`, `/payment/success`, `/payment/paypal-return`, `/payment/cancel`

### IDs de Stripe (producción)
- Monthly: `price_1T5cfyAZqLYg9sEbrz58gQx8`
- Lifetime Launch ($79): `price_1T5cjGAZqLYg9sEbCAtEIWpq`
- Lifetime Regular ($149): `price_1T5cklAZqLYg9sEbpXkUUnCo`

### PayPal
- Plan mensual $19: `P-9EM96236TP137594GNGRFIAI`
- Lifetime usa Orders API (redirect flow), no Billing Plans

---

## Paleta de colores

### Landing (`index.css`)
```css
--color-aura-950: #080414
--color-aura-900: #0e0920
--color-aura-800: #160d30
--color-aura-700: #1e1240
--color-aura-600: #2a1858
--color-amber-glow: rgb(147, 51, 234)   /* #9333ea */
--color-amber-soft: rgb(196, 151, 255)
--color-amber-wash: rgba(147, 51, 234, 0.08)
--color-body-text: rgb(205, 192, 224)
```

### Aplicada también a:
- `MinimalistTemplate.tsx` (perfil público del cliente)
- `Dashboard.tsx` ACCENT_THEMES[0] Profesional + base DARK/LIGHT accent

---

## Fixes y features de esta sesión

| Cambio | Archivo |
|--------|---------|
| CTA button mobile: `whitespace-nowrap` | `Landing.tsx` |
| Scroll mobile: deshabilitar grain animation en ≤640px | `index.css` |
| Addon "Perfil adicional" → solo anuncio "Próximamente" en Landing | `Landing.tsx` |
| Botón "+Añadir Perfil" en Dashboard → deshabilitado + "Próximamente" | `Dashboard.tsx` |
| Link "Precios" en navbar Landing (desktop + mobile) | `Landing.tsx` |
| Link "Ver planes" en footer Dashboard (sidebar desktop + mobile) | `Dashboard.tsx` |
| Paleta púrpura en MinimalistTemplate (perfil público) | `MinimalistTemplate.tsx` |
| Paleta púrpura en Dashboard (sidebar Profesional + accent base) | `Dashboard.tsx` |

---

## Notas técnicas
- Vercel frontend: auto-deploy via GitHub push a `master`
- Vercel backend: deploy manual con `vercel --prod` desde `C:\Users\zampa\Downloads\aura\backend\`
- `vercel` CLI debe estar instalado globalmente: `npm i -g vercel`
- TypeScript strict: siempre correr `npx tsc --noEmit` antes de push
- Error recurrente: imports no usados → TS6133, rompe el build en Vercel
