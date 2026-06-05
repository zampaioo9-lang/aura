# Módulo: Infraestructura y Deploy

## Arquitectura General

```
aliax.io (dominio en Porkbun)
├── www / raíz  → Vercel (frontend)
└── api.aliax.io → Vercel (backend)
```

Ambos proyectos son deployados en **Vercel** de forma independiente.

---

## Frontend

| Detalle | Valor |
|---------|-------|
| Framework | React + Vite + TypeScript |
| Carpeta | `frontend/` |
| Build command | `npm run build` |
| Output dir | `dist/` |
| URL producción | `https://www.aliax.io` |

### Deploy frontend
```bash
# Desde la raíz del repo
npx vercel --prod
# Confirmar que muestra: Aliased: https://www.aliax.io
```

`git push` solo crea un deploy en **Preview**, NO en producción.

### Variables de entorno (frontend)
```
VITE_API_URL=https://api.aliax.io
```

---

## Backend

| Detalle | Valor |
|---------|-------|
| Framework | Express + TypeScript |
| Carpeta | `backend/` |
| Runtime | Node.js |
| URL producción | `https://api.aliax.io` |

### Deploy backend
```bash
# Desde la carpeta backend/
cd backend
npx vercel --prod
```

Los cambios en `backend/` requieren su propio deploy — son proyectos Vercel separados.

### Variables de entorno (backend)

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
RESEND_API_KEY=re_...
RESEND_AUDIENCE_ID=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=https://www.aliax.io
```

---

## Base de Datos

| Detalle | Valor |
|---------|-------|
| Motor | PostgreSQL |
| ORM | Prisma |
| Schema | `backend/prisma/schema.prisma` |
| Migraciones | `backend/prisma/migrations/` |

### Comandos de DB

```bash
# Ver estado de migraciones
npx prisma migrate status

# Aplicar migraciones pendientes (producción)
npx prisma migrate deploy

# Abrir Prisma Studio (visualizar datos)
npx prisma studio

# Resetear DB (solo desarrollo — DESTRUCTIVO)
npx prisma migrate reset
```

---

## Cloudinary (Imágenes)

Servicio para subida y hosting de imágenes (fotos de perfil, servicios).

- Las imágenes se suben directamente desde el frontend usando el SDK de Cloudinary
- Las URLs resultantes se guardan en la DB como strings
- Variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

---

## Estructura de Carpetas

```
aura/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Páginas de la app
│   │   ├── components/     # Componentes reutilizables
│   │   ├── context/        # AuthContext, etc.
│   │   ├── hooks/          # Hooks personalizados
│   │   ├── schemas/        # Validación Zod
│   │   └── utils/          # Utilidades
│   ├── public/
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── routes/         # Endpoints de la API
│   │   ├── middleware/      # Auth, adminAuth
│   │   ├── services/        # emailService, audienceService
│   │   └── index.ts         # Servidor Express
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
└── docs/
    └── manual/              # Esta documentación
```

---

## Flujo de Desarrollo Local

```bash
# Frontend
cd frontend
npm install
npm run dev     # http://localhost:5173

# Backend
cd backend
npm install
npx prisma generate
npm run dev     # http://localhost:3000
```

Asegurarse de que `VITE_API_URL` apunte a `http://localhost:3000` en desarrollo local.
