# 2026-03-09 — Cambios y correcciones en la página de precios

## Resumen
Sesión enfocada en correcciones visuales y funcionales de la página de precios (`/pricing`), detección de moneda MXN/USD, y ajustes de branding.

---

## 1. Detección de moneda MXN/USD en Pricing

- Se agregó estado `currency: 'USD' | 'MXN'` en `Pricing.tsx`
- Detección primaria por timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- Fallback por IP con `ipapi.co`
- Los precios se muestran en MXN si el usuario está en México:
  - Mensual: $299 MXN / $19 USD
  - Lifetime lanzamiento: $1,299 MXN / $79 USD
  - Lifetime regular: $2,499 MXN / $149 USD
- `currency` se pasa a los checkout de Stripe y PayPal

## 2. Precios MXN en Stripe

- Se crearon nuevos Price IDs en Stripe para MXN:
  - Monthly MXN: `price_1T8uphAZqLYg9sEbavcdnU5P`
  - Lifetime lanzamiento MXN: `price_1T8uxOAZqLYg9sEb6h6Y8kY0`
  - Lifetime regular MXN: `price_1T8uvxAZqLYg9sEbAK7xMQHb`
- Se agregaron variables de entorno en Vercel backend:
  - `STRIPE_PRICE_MONTHLY_MXN`
  - `STRIPE_PRICE_LIFETIME_LAUNCH_MXN`
  - `STRIPE_PRICE_LIFETIME_REGULAR_MXN`
- Se actualizó `env.ts` y `stripeService.ts` para manejar currency

## 3. Fix: Stripe API Key expirada

- Error: `api_key_expired` en logs de Vercel
- Solución: Usuario creó nueva `sk_live_...v0kS` en Stripe dashboard y actualizó `STRIPE_SECRET_KEY` en Vercel

## 4. Fix: Lifetime MXN — precio recurrente en modo payment

- Error: "You specified `payment` mode but passed a recurring price"
- Causa: El precio MXN de Lifetime estaba configurado como recurrente en Stripe
- Solución: Usuario cambió el tipo a "pago único" en el dashboard de Stripe (mismos IDs)
- Fix adicional en `stripeService.ts`: Para MXN Lifetime se usa `customer_email` en lugar de `customer` para evitar el "currency lock" de Stripe

## 5. Cupón CONFIANZA20

- Cupón anterior (ESPECIAL15 / CONFIANZA20 USD fijo $4) no funcionaba con MXN
- Se eliminó y creó nuevo cupón:
  - Código: `CONFIANZA20`
  - Tipo: 20% de descuento
  - Duración: 12 meses repetido
  - Máx canjes: 20
  - Vence: 5 junio 2026
  - Funciona con cualquier moneda
- Precio efectivo mensual MXN: ~$239 por 12 meses

## 6. Fix: Botón PayPal mensual cortado visualmente

- Causa: `overflow: 'hidden'` en el div contenedor cortaba el botón
- Fix en `Pricing.tsx` (MonthlyCard):
  ```jsx
  <div style={{ borderRadius: 12, overflow: 'visible', minHeight: 55 }}>
    <PayPalButtons
      style={{ layout: 'horizontal', height: 48, tagline: false, shape: 'rect', color: 'gold', borderRadius: 12 }}
  ```
- Se cambió `overflow: 'hidden'` → `overflow: 'visible'`
- Se agregó `borderRadius: 12` directamente en el style del componente PayPalButtons

## 7. Favicon / Logo en explorador y Google

- Antes: mostraba el logo de Vite ("V")
- Fix en `index.html`:
  ```html
  <link rel="icon" type="image/svg+xml" href="/logo-aliax.svg" />
  <link rel="shortcut icon" href="/logo-aliax.svg" />
  <link rel="apple-touch-icon" href="/logo-aliax.svg" />
  ```
- SVG ya existía en `frontend/public/logo-aliax.svg` (A + anillos concéntricos + punto morado)
- En Google tardará unos días en actualizarse (caché de Googlebot)

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/index.html` | Favicon → `/logo-aliax.svg` |
| `frontend/src/pages/Pricing.tsx` | Currency detection, MXN prices, PayPal button fix, borderRadius |
| `backend/src/config/env.ts` | Nuevas vars MXN price IDs |
| `backend/src/services/stripeService.ts` | Soporte currency MXN, customer_email para MXN Lifetime |
| `backend/src/services/paypalService.ts` | Soporte currency en createPayPalOrder |
| `backend/src/routes/subscriptions.ts` | Lee currency del body, mejor manejo de errores Stripe |

---

## Deployments

- Frontend: `cd aura && vercel --prod`
- Backend: `cd aura/backend && vercel --prod`
- Ambos deployados exitosamente el 2026-03-09
