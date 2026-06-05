# Aliax — Visión General

## ¿Qué es Aliax?

Aliax es una plataforma SaaS **freemium** para psicólogos y terapeutas independientes. Permite a los profesionales crear un perfil público, gestionar su agenda, recibir reservas de pacientes, y llevar historia clínica — todo en un solo lugar.

---

## Modelo de Negocio

| Plan | Precio | Incluye |
|------|--------|---------|
| **Free** | Gratis permanente | Perfil público, directorio, reservas básicas, 1 template |
| **Pro** | ~$9 USD/mes | Todo Free + Historia Clínica, Terapia de Pareja, templates premium, analytics, colores, agenda avanzada |

El admin puede otorgar acceso a módulos Pro individuales a usuarios Free desde el panel de administración.

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL (Neon) via Prisma ORM |
| Deploy | Vercel (frontend + backend por separado) |
| Pagos | Stripe + PayPal |
| Email | Resend (notificaciones@aliax.io) |
| Imágenes | Cloudinary |
| Auth | JWT (jsonwebtoken) |

---

## URLs de Producción

| Recurso | URL |
|---------|-----|
| Frontend | https://www.aliax.io |
| Backend API | https://api.aliax.io |
| Admin panel | https://www.aliax.io/admin |
| GitHub | https://github.com/zampaioo9-lang/aura |

---

## Ubicaciones Locales

```
C:\Users\zampa\Mis Proyectos\aura\
├── frontend/          → React app
│   └── src/
│       ├── pages/     → Páginas principales
│       ├── components/→ Componentes reutilizables
│       ├── hooks/     → Custom hooks
│       ├── context/   → AuthContext
│       ├── lib/       → Utilidades y datos
│       ├── schemas/   → Zod schemas
│       └── api/       → Axios client
├── backend/           → Express API
│   └── src/
│       ├── routes/    → Endpoints
│       ├── middleware/→ Auth, admin
│       ├── services/  → Email, auth, pagos
│       └── config/    → Variables de entorno
├── docs/
│   ├── manual/        → Este manual
│   └── superpowers/   → Specs y planes de implementación
└── prisma/
    └── schema.prisma  → Modelos de DB
```

---

## Deploy

```bash
# Frontend (desde raíz del proyecto)
cd "C:\Users\zampa\Mis Proyectos\aura"
npx vercel --prod

# Backend
cd "C:\Users\zampa\Mis Proyectos\aura\backend"
npx vercel --prod

# Cambios de schema DB
cd backend
npx prisma db push   # ← usar db push, NO migrate dev (falla con Neon)
```

**Confirmar siempre:** `Aliased: https://www.aliax.io` en output del frontend.

---

## Convenciones de Temas de Color

Los usuarios eligen un color de acento que afecta toda la UI del dashboard:

| ID | Color | RGB |
|----|-------|-----|
| `aguamarina` | Teal | rgb(45,212,191) — **default** |
| `profesional` | Púrpura | rgb(147,51,234) |
| `bold` | Amarillo | rgb(253,224,71) — Pro |
| `elegante` | Azul | rgb(62,153,201) — Pro |
| `creative` | Magenta | rgb(217,72,240) |
| `carbono` | Verde oscuro | rgb(20,70,65) — Pro |
| `nocturno` | Morado oscuro | rgb(88,28,155) — Pro |

Guardados en `localStorage`: `aliax_accent` (id) y `aliax_theme` ('dark'|'light').
