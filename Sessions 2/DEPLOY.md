# Deploy — Aliax (aliax.io)

## Arquitectura de producción

| Servicio | Plataforma | URL |
|---|---|---|
| Frontend | Vercel (auto-deploy desde GitHub) | https://www.aliax.io |
| Backend | Vercel (auto-deploy desde GitHub) | https://api.aliax.io |
| Base de datos | Neon (PostgreSQL serverless) | console.neon.tech |

---

## Deploy automático (lo normal)

Ambos proyectos tienen integración con GitHub. Cualquier push a `main` dispara un deploy automático en Vercel.

```bash
# Desde la carpeta raíz del proyecto
cd /c/Users/zampa/Downloads/aura

# Frontend
cd frontend
git add .
git commit -m "descripción del cambio"
git push origin main

# Backend
cd ../backend
git add .
git commit -m "descripción del cambio"
git push origin main
```

Vercel detecta el push y hace el build automáticamente. En ~1-2 minutos está en producción.

---

## Deploy manual con Vercel CLI

Si el auto-deploy falla o necesitas forzar un deploy:

```bash
# Instalar Vercel CLI (una sola vez)
npm install -g vercel

# Deploy frontend
cd /c/Users/zampa/Downloads/aura/frontend
vercel --prod

# Deploy backend
cd /c/Users/zampa/Downloads/aura/backend
vercel --prod
```

---

## Variables de entorno en Vercel

Las variables NO se despliegan con el código — viven solo en el dashboard de Vercel.
Para actualizar una variable: vercel.com → proyecto → Settings → Environment Variables

### Backend (`api.aliax.io`)
| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret para tokens de autenticación |
| `META_WA_TOKEN` | Token permanente de System User (Aliax Asistente) — **actualizar aquí cuando se regenere** |
| `META_WA_PHONE_NUMBER_ID` | `1010239882170026` (+52 1 446 117 1069) |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_wnhQDZcx0I5WTfUMuWvaaQDfVOhS3lUs` |
| `STRIPE_PRICE_MONTHLY` | `price_1T5EIxAZqLYg9sEbgrhwXfmB` |
| `STRIPE_PRICE_YEARLY` | `price_1T5EK9AZqLYg9sEbnOcRRxxg` |
| `PAYPAL_CLIENT_ID` | Live client ID |
| `PAYPAL_CLIENT_SECRET` | Live client secret |
| `PAYPAL_PLAN_MONTHLY` | `P-16W684062T120722MNGQN5QA` |
| `PAYPAL_PLAN_YEARLY` | `P-5A3232125N868890PNGQN5QI` |
| `PAYPAL_BASE_URL` | `https://api-m.paypal.com` |
| `FRONTEND_URL` | `https://www.aliax.io` |

### Frontend (`www.aliax.io`)
| Variable | Descripción |
|---|---|
| `VITE_PAYPAL_CLIENT_ID` | Live client ID de PayPal |
| `VITE_PAYPAL_PLAN_MONTHLY` | `P-16W684062T120722MNGQN5QA` |
| `VITE_PAYPAL_PLAN_YEARLY` | `P-5A3232125N868890PNGQN5QI` |

---

## Configuración Vercel (importante)

- **Frontend root directory**: `frontend` (Settings → General → Root Directory)
- **Backend root directory**: `backend` (Settings → General → Root Directory)
- El backend usa `api/index.ts` como entry point (ver `backend/vercel.json`)

---

## Base de datos — Neon

Neon pausa proyectos free tier tras 7 días sin actividad.
Si el backend devuelve errores de conexión, reactivar manualmente en console.neon.tech

```bash
# Si necesitas hacer cambios en el schema:
cd /c/Users/zampa/Downloads/aura/backend
npx prisma db push       # aplica cambios al schema en Neon
npx prisma generate      # regenera el cliente Prisma
```

---

## WhatsApp (Meta Cloud API)

- **WABA ID**: `1908864356384004` (nombre: "Prueba Reservas", negocio: Psique Citas)
- **System User**: Aliax Asistente (ID: 61588408331093) — Acceso Admin
- **Phone Number ID**: `1010239882170026`
- Token generado en: business.facebook.com → Psique Citas → Usuarios del sistema → Aliax Asistente → Generar token
- Al regenerar el token: actualizar `META_WA_TOKEN` en Vercel (backend) + en `backend/.env` (local)

---

## Checklist post-deploy

- [ ] Verificar https://www.aliax.io carga correctamente
- [ ] Verificar https://api.aliax.io/api/health responde `200`
- [ ] Probar login y booking flow
- [ ] Si se cambió algo de WhatsApp: `GET https://api.aliax.io/api/test/whatsapp?to=+52XXXXXXXXXX`
