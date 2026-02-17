# Aura

**Plataforma de perfiles profesionales con sistema de reservas y notificaciones por WhatsApp.**

Aura permite a profesionales (medicos, abogados, coaches, freelancers) crear un perfil publico personalizable con servicios, calendario de disponibilidad, sistema de reservas online y notificaciones automaticas por WhatsApp via Twilio.

---

## Tech Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind CSS v4 |
| Backend | Express + TypeScript + Prisma 5 |
| Base de datos | PostgreSQL |
| Uploads | Cloudinary (prod) / almacenamiento local (dev) |
| WhatsApp | Twilio |
| Auth | JWT + bcrypt |
| Validacion | Zod (backend + frontend) |
| Cron Jobs | node-cron (recordatorios 24h) |

## Caracteristicas

### Para profesionales
- Crear perfil publico con slug personalizado (ej: `aura.com/maria-lopez`)
- 4 templates visuales: **Minimalist**, **Bold**, **Elegant**, **Creative**
- Gestion de servicios con precios, duracion e imagenes
- Calendario de disponibilidad semanal configurable
- Dashboard con reservas entrantes y gestion de estados
- Notificaciones WhatsApp automaticas al recibir reservas

### Para clientes
- Explorar perfil publico del profesional
- Ver servicios disponibles con precios y duracion
- Reservar citas seleccionando fecha y hora disponible
- Recibir confirmacion y recordatorio 24h por WhatsApp

### Sistema de notificaciones WhatsApp
```
Nueva reserva    ──► Notifica al profesional
Confirmacion     ──► Notifica al cliente
Recordatorio 24h ──► Cron job automatico al cliente
Cancelacion      ──► Notifica a ambas partes
```

## Estructura del proyecto

```
aura/
├── frontend/                  # React SPA
│   └── src/
│       ├── components/        # UI reutilizable
│       │   ├── templates/     # 4 templates de perfil publico
│       │   └── availability/  # Componentes de calendario
│       ├── pages/             # Vistas principales
│       ├── hooks/             # Custom hooks (profile, services, upload)
│       ├── context/           # AuthContext (JWT)
│       └── schemas/           # Validacion Zod
│
├── backend/                   # API REST
│   └── src/
│       ├── routes/            # Auth, Profiles, Services, Bookings, Upload
│       ├── services/          # WhatsApp (Twilio), Auth, Booking, Cloudinary
│       ├── middleware/        # Auth JWT, error handler, multer upload
│       ├── jobs/              # Cron: recordatorios 24h
│       ├── config/            # Variables de entorno
│       └── utils/             # Validaciones Zod
│
└── README.md
```

## Inicio rapido

### Requisitos previos
- Node.js 18+
- PostgreSQL

### 1. Clonar

```bash
git clone https://github.com/zampaioo9-lang/aura.git
cd aura
```

### 2. Backend

```bash
cd backend
npm install
```

Crea un archivo `.env`:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/aura"
JWT_SECRET="tu-secreto-seguro"

# Twilio WhatsApp (opcional)
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Cloudinary (opcional, usa almacenamiento local si no se configuran)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

```bash
npx prisma db push     # Crea las tablas
npm run dev             # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## API Endpoints

### Auth
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuario actual |

### Profiles
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/profiles` | Mis perfiles |
| POST | `/api/profiles` | Crear perfil |
| GET | `/api/profiles/:slug` | Perfil publico |
| PUT | `/api/profiles/:id` | Editar perfil |
| DELETE | `/api/profiles/:id` | Eliminar perfil |

### Services
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/services` | Crear servicio |
| GET | `/api/services/me` | Mis servicios + stats |
| GET | `/api/services/profile/:id` | Servicios de un perfil |
| PUT | `/api/services/:id` | Editar servicio |
| DELETE | `/api/services/:id` | Desactivar servicio |
| PATCH | `/api/services/:id/toggle` | Toggle activo/inactivo |

### Bookings
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/bookings` | Crear reserva |
| GET | `/api/bookings` | Mis reservas |
| PATCH | `/api/bookings/:id/status` | Cambiar estado |

### Uploads
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/upload/image` | Subir imagen (5MB) |
| POST | `/api/upload/video` | Subir video (50MB) |

### Availability
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/availability/:profileId` | Horarios del perfil |
| PUT | `/api/availability/:profileId` | Actualizar horarios |

## Rutas Frontend

| Ruta | Pagina | Auth |
|------|--------|------|
| `/` | Landing | No |
| `/login` | Login | No |
| `/register` | Registro | No |
| `/dashboard` | Panel principal | Si |
| `/dashboard/services` | Gestion de servicios | Si |
| `/dashboard/availability` | Configurar horarios | Si |
| `/profile/edit/:id` | Editar perfil | Si |
| `/profile/new` | Crear perfil | Si |
| `/book/:slug` | Reservar cita | No |
| `/:slug` | Perfil publico | No |

## Modelos de datos

```
User ──┐
       ├── Profile ──┬── Service ──┐
       │             ├── AvailabilitySlot   │
       │             └── Booking ──┴── Notification
       └── Booking (como profesional)
```

### Estados de reserva

```
PENDING ──► CONFIRMED ──► COMPLETED
   │            │
   └──► CANCELLED ◄──┘
              │
          NO_SHOW
```

## Templates de perfil

| Template | Estilo |
|----------|--------|
| **Minimalist** | Fondo blanco, tipografia ligera, centrado en contenido |
| **Bold** | Fondo oscuro (slate-900), acentos amarillos, tipografia grande |
| **Elegant** | Fondo stone-50, acentos dorados, serif, refinado |
| **Creative** | Gradientes purple/pink, glassmorphism, sombras coloridas |

## Monedas soportadas

EUR, USD, MXN, COP, ARS, CLP

## Licencia

MIT
