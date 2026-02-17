# Aura - Plataforma de Perfiles Multi-Profesionales

Plataforma donde profesionales (medicos, abogados, coaches, freelancers) pueden crear un perfil publico con servicios, sistema de reservas y notificaciones por WhatsApp.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS v4
- **Backend**: Express + TypeScript + Prisma 5
- **Database**: PostgreSQL
- **Uploads**: Cloudinary (produccion) / almacenamiento local (desarrollo)
- **WhatsApp**: Twilio

## Setup

### 1. Base de datos

Crear una base de datos PostgreSQL:

```bash
createdb aura
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Editar .env con:
#   DATABASE_URL="postgresql://user:pass@localhost:5432/aura"
#   JWT_SECRET="tu-secreto"
#   CLOUDINARY_* (opcionales, usa almacenamiento local si no se configuran)
#   TWILIO_* (opcionales)
npm install
npx prisma db push
npm run dev                # Inicia en http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                # Inicia en http://localhost:5173 (proxy a :4000)
```

## Modelos de datos

### User

| Campo     | Tipo     | Descripcion        |
|-----------|----------|--------------------|
| id        | String   | CUID auto          |
| email     | String   | Unico              |
| password  | String   | Hash bcrypt         |
| name      | String   | Nombre completo     |
| phone     | String?  | Telefono opcional   |
| createdAt | DateTime | Fecha de creacion   |

### Profile

| Campo         | Tipo     | Descripcion                              |
|---------------|----------|------------------------------------------|
| id            | String   | CUID auto                                |
| userId        | String   | FK a User                                |
| slug          | String   | URL unica (ej: "maria-lopez")            |
| title         | String   | Nombre visible                           |
| bio           | String?  | Descripcion (max 500)                    |
| profession    | String   | Profesion                                |
| phone         | String?  | WhatsApp                                 |
| template      | Enum     | MINIMALIST, BOLD, ELEGANT, CREATIVE      |
| avatar        | String?  | URL imagen de perfil                     |
| coverImage    | String?  | URL imagen de portada                    |
| videoUrl      | String?  | URL video de presentacion                |
| socialLinks   | JSON     | Redes sociales                           |
| availability  | JSON     | Horarios: `{mon: [{start, end}], ...}`   |
| published     | Boolean  | Perfil visible publicamente              |

### Service

| Campo           | Tipo     | Descripcion                                    |
|-----------------|----------|------------------------------------------------|
| id              | String   | UUID auto                                      |
| profileId       | String   | FK a Profile                                   |
| name            | String   | Nombre del servicio (3-100 chars)               |
| description     | String?  | Descripcion (max 500)                          |
| image           | String?  | URL imagen del servicio                        |
| price           | Decimal  | Precio (0 - 100,000)                           |
| currency        | String   | EUR, USD, MXN, COP, ARS, CLP (default: EUR)   |
| durationMinutes | Int      | Duracion: 15, 30, 45, 60, 90, 120, 180 o 240  |
| isActive        | Boolean  | Activo/inactivo (default: true)                |
| createdAt       | DateTime | Fecha de creacion                              |
| updatedAt       | DateTime | Ultima actualizacion                           |

**Limites:** Maximo 20 servicios activos por perfil.

### Booking

| Campo            | Tipo     | Descripcion                          |
|------------------|----------|--------------------------------------|
| id               | String   | CUID auto                            |
| profileId        | String   | FK a Profile                         |
| serviceId        | String   | FK a Service                         |
| clientName       | String   | Nombre del cliente                   |
| clientEmail      | String   | Email del cliente                    |
| clientPhone      | String?  | Telefono del cliente                 |
| date             | DateTime | Fecha de la reserva                  |
| startTime        | String   | Hora inicio ("09:00")                |
| endTime          | String   | Hora fin ("10:00")                   |
| status           | Enum     | PENDING, CONFIRMED, CANCELLED, COMPLETED |
| notes            | String?  | Notas del cliente                    |
| whatsappNotified | Boolean  | Si se envio notificacion WhatsApp    |

## API Endpoints

### Auth

| Metodo | Endpoint             | Auth | Descripcion          |
|--------|----------------------|------|----------------------|
| POST   | /api/auth/register   | No   | Registro de usuario  |
| POST   | /api/auth/login      | No   | Inicio de sesion     |
| GET    | /api/auth/me         | Si   | Usuario actual       |

#### POST /api/auth/register

```json
// Request
{ "email": "user@example.com", "password": "123456", "name": "Juan", "phone": "+54..." }

// Response 201
{ "token": "jwt...", "user": { "id": "...", "email": "...", "name": "..." } }
```

#### POST /api/auth/login

```json
// Request
{ "email": "user@example.com", "password": "123456" }

// Response 200
{ "token": "jwt...", "user": { "id": "...", "email": "...", "name": "..." } }
```

### Profiles

| Metodo | Endpoint              | Auth | Descripcion          |
|--------|-----------------------|------|----------------------|
| GET    | /api/profiles         | Si   | Mis perfiles         |
| POST   | /api/profiles         | Si   | Crear perfil         |
| GET    | /api/profiles/:slug   | No   | Perfil publico       |
| PUT    | /api/profiles/:id     | Si   | Editar perfil        |
| DELETE | /api/profiles/:id     | Si   | Eliminar perfil      |

#### POST /api/profiles

```json
// Request
{
  "slug": "maria-lopez",
  "title": "Dra. Maria Lopez",
  "profession": "Psicologa",
  "bio": "Especialista en...",
  "template": "ELEGANT",
  "published": true,
  "availability": {
    "mon": [{ "start": "09:00", "end": "18:00" }],
    "tue": [{ "start": "09:00", "end": "18:00" }]
  }
}

// Response 201
{ "id": "...", "slug": "maria-lopez", ... }
```

### Services

| Metodo | Endpoint                        | Auth | Descripcion                         |
|--------|---------------------------------|------|-------------------------------------|
| POST   | /api/services                   | Si   | Crear servicio                      |
| GET    | /api/services/me                | Si   | Mis servicios + stats               |
| GET    | /api/services/profile/:profileId| No   | Servicios activos de un perfil      |
| GET    | /api/services/:id               | No   | Detalle de un servicio              |
| PUT    | /api/services/:id               | Si   | Editar servicio                     |
| DELETE | /api/services/:id               | Si   | Soft delete (isActive = false)      |
| PATCH  | /api/services/:id/toggle        | Si   | Toggle activo/inactivo              |

#### POST /api/services

```json
// Request
{
  "profileId": "cmljpeu63...",
  "name": "Terapia Individual",
  "description": "Sesion de terapia...",
  "image": "http://localhost:4000/uploads/img.jpg",
  "price": 85,
  "currency": "EUR",
  "durationMinutes": 60
}

// Response 201
{
  "id": "4301242a-...",
  "profileId": "cmljpeu63...",
  "name": "Terapia Individual",
  "description": "Sesion de terapia...",
  "image": "http://localhost:4000/uploads/img.jpg",
  "price": "85",
  "currency": "EUR",
  "durationMinutes": 60,
  "isActive": true,
  "createdAt": "2026-02-12T...",
  "updatedAt": "2026-02-12T..."
}
```

#### GET /api/services/me

```json
// Response 200
{
  "services": [
    {
      "id": "...",
      "name": "Terapia Individual",
      "price": "85",
      "currency": "EUR",
      "durationMinutes": 60,
      "isActive": true,
      "profile": { "id": "...", "title": "Dra. Maria", "slug": "maria-lopez" }
    }
  ],
  "stats": {
    "total": 4,
    "active": 4,
    "inactive": 0,
    "limit": 20
  }
}
```

#### PUT /api/services/:id

```json
// Request (todos los campos opcionales)
{
  "name": "Nuevo nombre",
  "price": 100,
  "currency": "USD",
  "durationMinutes": 90,
  "image": "http://...",
  "description": "Nueva descripcion"
}
```

#### DELETE /api/services/:id

```json
// Response 200 (soft delete)
{ "message": "Servicio desactivado", "service": { ... } }
```

#### PATCH /api/services/:id/toggle

```json
// Response 200
{ "id": "...", "isActive": false, ... }
```

### Bookings

| Metodo | Endpoint                    | Auth | Descripcion          |
|--------|-----------------------------|------|----------------------|
| POST   | /api/bookings               | No   | Crear reserva        |
| GET    | /api/bookings               | Si   | Mis reservas         |
| PATCH  | /api/bookings/:id/status    | Si   | Cambiar estado       |

### Uploads

| Metodo | Endpoint           | Auth | Descripcion                      |
|--------|--------------------|------|----------------------------------|
| POST   | /api/upload/image  | Si   | Subir imagen (JPG/PNG/WebP, 5MB) |
| POST   | /api/upload/video  | Si   | Subir video (MP4/WebM, 50MB)     |

En desarrollo los archivos se guardan en `backend/uploads/` y se sirven desde `/uploads/`.

## Validaciones

### Service (backend - Zod)

**Crear:**
- `profileId`: string requerido
- `name`: 3-100 caracteres
- `description`: max 500 caracteres (opcional)
- `image`: URL valida (opcional)
- `price`: 0 - 100,000
- `currency`: EUR | USD | MXN | COP | ARS | CLP
- `durationMinutes`: 15 | 30 | 45 | 60 | 90 | 120 | 180 | 240

**Limites:**
- Maximo 20 servicios activos por perfil
- Al intentar crear o activar el servicio #21, retorna error 400

### Errores de validacion

```json
// Response 400
{
  "error": "Datos invalidos",
  "details": [
    "name: Minimo 3 caracteres",
    "durationMinutes: Duracion no valida"
  ]
}
```

## Componentes Frontend

### ServiceForm

```tsx
<ServiceForm
  onSubmit={async (data) => { /* crear o editar */ }}
  initialData={service}       // null para crear
  mode="create"               // "create" | "edit"
  loading={false}
  onCancel={() => closeModal()}
/>
```

Campos: nombre, descripcion, imagen (upload), precio, moneda (dropdown), duracion (dropdown).
Validacion con React Hook Form + Zod. Estados visuales verde/rojo en inputs.

### ServiceCard

```tsx
<ServiceCard
  service={service}
  showActions={true}          // muestra botones editar/eliminar/toggle
  onEdit={(s) => openEdit(s)}
  onDelete={(s) => confirmDelete(s)}
  onToggle={(s) => toggleActive(s)}
  onBook={(id) => goToBooking(id)}
  variant="default"           // "default" | "public"
/>
```

Muestra imagen del servicio como banner (si existe), nombre, descripcion, precio, duracion, badge de estado.

### ServiceFormModal

```tsx
<ServiceFormModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  service={editingService}    // null para crear
  mode="create"
/>
```

Modal con overlay oscuro. Cierra con ESC, click fuera. Bloquea scroll del body.

### ServiceList

```tsx
<ServiceList
  services={filteredServices}
  loading={isLoading}
  emptyMessage="No hay servicios"
/>
```

Grid responsive con skeleton loading.

## Formateo

### Precios

| Currency | Ejemplo      |
|----------|-------------|
| EUR      | 60,00 EUR   |
| USD      | $60.00      |
| MXN      | $60.00 MXN  |
| COP      | $60.00 COP  |
| ARS      | $60.00 ARS  |
| CLP      | $60 CLP     |

### Duracion

| Minutos | Resultado          |
|---------|--------------------|
| 15      | 15 minutos         |
| 30      | 30 minutos         |
| 45      | 45 minutos         |
| 60      | 1 hora             |
| 90      | 1 hora 30 minutos  |
| 120     | 2 horas            |
| 180     | 3 horas            |
| 240     | 4 horas            |

## Templates

4 templates disponibles para perfiles publicos:

- **Minimalist** - Fondo blanco, tipografia ligera, centrado en contenido
- **Bold** - Fondo oscuro (slate-900), acentos amarillos, tipografia grande
- **Elegant** - Fondo stone-50, acentos dorados (amber), serif, refinado
- **Creative** - Gradientes purple/pink, glassmorphism, sombras coloridas

Cada template muestra maximo 6 servicios activos con imagen, precio, duracion y boton de reserva.

## Rutas Frontend

| Ruta                     | Componente        | Auth | Descripcion                |
|--------------------------|-------------------|------|----------------------------|
| /                        | Landing           | No   | Pagina de inicio           |
| /login                   | Login             | No   | Inicio de sesion           |
| /register                | Register          | No   | Registro                   |
| /dashboard               | Dashboard         | Si   | Panel principal            |
| /dashboard/services      | ServicesDashboard | Si   | Gestion de servicios       |
| /profile/edit/:id        | ProfileEditor     | Si   | Editar perfil              |
| /profile/new             | ProfileEditor     | Si   | Crear perfil               |
| /book/:slug              | BookingPage       | No   | Reservar servicio          |
| /:slug                   | PublicProfile     | No   | Perfil publico             |
