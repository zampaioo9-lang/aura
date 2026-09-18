# Registro de actividad de usuarios (Admin)

## Contexto y objetivo

El dueño del negocio (Alberto/César) quiere poder ver, para cada usuario profesional de Aliax:
- Qué módulos/funciones usa (Pacientes, Historia Clínica, Agenda, Analytics, Perfil), y con qué frecuencia.
- Qué días entra a su cuenta.
- Cuáles módulos son más y menos usados en general, comparando entre todos los usuarios.

Se descartó explícitamente usar una herramienta de analítica de terceros (PostHog, Mixpanel, etc.) por dos razones:
1. Aliax maneja historia clínica de pacientes (datos de salud mental) — instrumentar el frontend con un SDK de tercero generaría registros de qué rutas clínicas visita cada profesional en un proveedor externo, ampliando innecesariamente la superficie de exposición de datos sensibles.
2. Sumar un proveedor nuevo obligaría a actualizar el Aviso de Privacidad (`frontend/src/pages/PrivacyPolicy.tsx`), que hoy lista explícitamente Stripe, PayPal, Resend, Meta, Neon, Cloudinary y Vercel — no hay necesidad real de ese costo de cumplimiento a esta escala (~27 usuarios).

Se optó por un registro propio, 100% dentro de la infraestructura ya existente (Prisma + Neon + AdminPanel).

## Estado actual verificado (no asumido)

- `User` no tiene ningún campo de actividad (`lastLoginAt` no existe).
- No existe ninguna tabla de eventos/auditoría hoy.
- El JWT de sesión dura **7 días** (`authService.ts`) — un usuario puede usar la app varios días sin volver a pegarle a `/login`, así que registrar solo logins subestimaría mucho los "días activos".
- El Dashboard (`frontend/src/pages/Dashboard.tsx`) es una sola página con tabs por estado local (`inicio`, `citas`, `resenas`, `agenda`, `pacientes`, `cuenta`), no rutas separadas por módulo.
- Rutas backend confirmadas para las 4 acciones clave elegidas:
  - `POST /api/clients`, `PATCH /api/clients/:id` — crear/editar paciente.
  - `PUT /api/clinical-history/:clientId`, `PUT /api/clinical-history-couple/:clientId` — completar pasos de Historia Clínica.
  - `POST /api/session-notes/:clientId` — nota manual; `POST /api/ai-notes/generate` — nota generada con IA; `POST /api/audio-notes/transcribe/:clientId` — transcripción de audio.
  - `PUT /api/profiles/:id` — un único handler genérico que recibe cualquier cambio de perfil, incluyendo `published` y `template`; el handler ya carga `existing` (estado previo) antes de aplicar `data` (cambios), lo que permite diferenciar publicar/despublicar/cambiar plantilla comparando ambos.
- Patrón ya usado en este repo que hay que replicar: cada ruta nueva debe registrarse tanto en `backend/src/index.ts` (dev) como en `backend/api/index.ts` (entry point real de Vercel producción) — lección de un bug real anterior (reseñas).

## Alcance

**Incluido:**
- Registro de vistas de módulo (capa genérica, automática, sin cambios en frontend).
- Registro de 4 acciones clave: crear/editar paciente, completar pasos de Historia Clínica, crear nota de sesión (manual/IA/audio), publicar-despublicar perfil o cambiar plantilla.
- Vista de detalle por usuario dentro del AdminPanel (fila expandida ya existente).
- Vista de resumen global (ranking de módulos) en el AdminPanel.

**Explícitamente fuera de alcance (decisión del usuario):**
- Cualquier herramienta de analítica de terceros (queda para el futuro, si se necesita análisis de comportamiento más sofisticado — funnels, heatmaps).
- Tracking de tiempo en pantalla, scroll, clics específicos de UI.
- Tablas de agregados pre-calculados — a esta escala (~27 usuarios) se consulta la tabla de eventos cruda directamente.
- Actualizar el Aviso de Privacidad (esto es tracking interno de comportamiento, no compartido con terceros; si se agrega una herramienta externa en el futuro, ESA sí requerirá actualizarlo).

## Modelo de datos

Una sola tabla nueva en `backend/prisma/schema.prisma`:

```prisma
model ActivityEvent {
  id        String   @id @default(uuid())
  userId    String
  module    String   // 'pacientes' | 'agenda' | 'analytics' | 'perfil' | 'citas' | 'resenas'
  type      String   // 'VIEW' | 'CLIENT_CREATED' | 'CLIENT_UPDATED' | 'HISTORY_STEP_COMPLETED' |
                      // 'NOTE_CREATED' | 'PROFILE_PUBLISHED' | 'PROFILE_UNPUBLISHED' | 'TEMPLATE_CHANGED'
  metadata  Json?    // ej. { clientName, noteMethod: 'manual'|'ia'|'audio', template, step }
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([module])
}
```

Se agrega la relación inversa `activityEvents ActivityEvent[]` en `model User`.

Sin tabla de agregados separada: con el volumen esperado a esta escala (decenas de miles de filas al mes en el escenario más activo), consultar `ActivityEvent` directamente con `groupBy`/`count` es simple y suficientemente rápido gracias a los índices declarados.

## Instrumentación

### Capa 1 — Vistas de módulo (genérica, automática)

Nuevo middleware `backend/src/middleware/activityLogger.ts`:
- Se registra una sola vez con `app.use(activityLogger)`, **antes** de montar los routers, en AMBOS entry points (`backend/src/index.ts` y `backend/api/index.ts`).
- Escucha `res.on('finish')` sobre la respuesta. Como `authMiddleware` corre después (a nivel de router) y muta el mismo objeto `req`, para cuando la respuesta termina `req.userId` ya está disponible si la petición fue autenticada.
- Si `req.userId` existe, clasifica el módulo por el prefijo de `req.path` usando una tabla de mapeo fija:
  - `/api/clients`, `/api/session-notes`, `/api/clinical-history`, `/api/clinical-history-couple`, `/api/ai-notes`, `/api/audio-notes` → `pacientes`
  - `/api/availability`, `/api/schedule-blocks`, `/api/recurring-schedule-blocks`, `/api/booking-settings`, `/api/service-availability` → `agenda`
  - `/api/analytics` → `analytics`
  - `/api/profiles`, `/api/services`, `/api/upload` → `perfil`
  - `/api/bookings` → `citas`
  - `/api/reviews` → `resenas`
  - Cualquier otro prefijo (`/api/auth`, `/api/admin`, `/api/health`, etc.) → no se registra como evento de módulo (es plumbing, no uso de una función del producto).
- Inserta `prisma.activityEvent.create({ data: { userId, module, type: 'VIEW' } })` **sin `await` bloqueante** — se dispara con `.catch(() => {})` para que un fallo del log nunca rompa ni haga más lenta la respuesta real al usuario.

### Capa 2 — Acciones clave (explícita, en los handlers existentes)

Se agrega una llamada a un helper compartido `logActivity(userId, module, type, metadata?)` (mismo helper que usa la Capa 1 internamente) directo en:
- `clients.ts`: `POST /` → `CLIENT_CREATED`; `PATCH /:id` → `CLIENT_UPDATED`. Metadata: `{ clientName: client.name }`.
- `clinical-history.ts` y `clinical-history-couple.ts`: `PUT /:clientId`, después de guardar → `HISTORY_STEP_COMPLETED`. Metadata: `{ completedSteps }` (ya existe ese campo en el modelo).
- `session-notes.ts`: `POST /:clientId` → `NOTE_CREATED` con `metadata: { noteMethod: 'manual' }`.
- `ai-notes.ts`: `POST /generate`, tras éxito → `NOTE_CREATED` con `metadata: { noteMethod: 'ia' }`.
- `audio-notes.ts`: `POST /transcribe/:clientId`, tras encolar exitosamente → `NOTE_CREATED` con `metadata: { noteMethod: 'audio' }`.
- `profiles.ts`: `PUT /:id`, comparando `existing` (ya cargado antes del update) contra `data`:
  - `existing.published === false && data.published === true` → `PROFILE_PUBLISHED`
  - `existing.published === true && data.published === false` → `PROFILE_UNPUBLISHED`
  - `data.template && data.template !== existing.template` → `TEMPLATE_CHANGED` con `metadata: { template: data.template }`

Estas inserciones específicas se suman a la vista genérica que la Capa 1 ya registró para esa misma petición (una petición puede generar 1 evento `VIEW` + 1 evento específico) — es intencional: la vista genérica alimenta el conteo de módulos, y el evento específico alimenta el feed de "acciones recientes".

## Endpoints nuevos (admin, protegidos por `authMiddleware` + chequeo `isAdmin` existente)

- `GET /api/admin/users/:id/activity?days=30`
  - Devuelve: `{ activeDays: number, lastActiveAt: string | null, moduleCounts: { [module]: number }, recentActions: Array<{ type, module, metadata, createdAt }> }` (últimas 10 acciones específicas, excluyendo `VIEW`).
- `GET /api/admin/activity/summary?period=30d|90d|all`
  - Devuelve: `[{ module: string, count: number }]`, ordenado descendente, agregando eventos `VIEW` de todos los usuarios en el periodo pedido.

Ambos en `backend/src/routes/admin.ts` (ya existe ese archivo con los demás endpoints de admin), registrados igual en ambos entry points como ya lo está el resto de rutas de admin.

## Frontend — AdminPanel

**1. Bloque "Actividad" dentro de la fila expandida de cada usuario** (mismo patrón visual que el bloque "Correos enviados (N)" ya existente: fondo `C.subCard`, sombra `C.subCardShadow`, sin borde, respeta dark/light):

```
Actividad
Activo 12 de los últimos 30 días · última vez: hace 2 días

Módulos más usados:
  Pacientes (48)  Agenda (22)  Analytics (6)

Acciones recientes:
  🧑‍⚕️ Creó paciente "Juan Pérez" — hace 2 días
  📝 Nota de sesión (IA) — hace 3 días
  ✅ Completó Historia Clínica (paso 5) — hace 5 días
  🌐 Publicó su perfil — hace 12 días
```

Se carga con `GET /api/admin/users/:id/activity` al expandir la fila (lazy, igual que ya se hace con "Correos enviados").

**2. Bloque de resumen global** nuevo, cerca del panel de 5 métricas ya existente en `AdminPanel.tsx`, con selector de periodo (30 días / 90 días / todo el tiempo — mismo patrón visual que el selector `analyticsPeriod` que ya existe en `Dashboard.tsx`):

```
Módulos más usados (todos los usuarios)
1. Pacientes — 342 usos
2. Agenda — 210 usos
3. Analytics — 45 usos
4. Perfil — 30 usos
```

## No incluido en esta versión (fast-follow explícito, no ambigüedad)

- Heatmap tipo calendario (estilo GitHub) de días activos — visualmente atractivo pero no pedido; los mismos datos ya alcanzan (`activeDays` + `recentActions`), agregar la visualización es un cambio de solo frontend sobre datos que ya existirán.
- Cualquier política de retención/purga de `ActivityEvent` — al volumen actual no hace falta; revisar si la base de usuarios crece significativamente.

## Verificación

Este repo no tiene framework de tests (ni Jest ni Vitest en `backend/`/`frontend/`, confirmado en trabajo previo de reset de contraseña). Verificación:
- `tsc --noEmit` en backend y frontend tras cada cambio.
- Pruebas manuales vía curl y navegador contra Neon, usando un usuario de prueba desechable (creado y borrado en la propia tarea) para generar eventos y verificar que aparecen correctamente en ambos endpoints nuevos y en el AdminPanel — nunca usando cuentas ni datos reales de usuarios de Aliax.
- Confirmar explícitamente que un fallo simulado en `activityLogger` (ej. columna inexistente a propósito en una prueba local) NO rompe ninguna petición normal de la API — es el requisito de seguridad más importante de este diseño.
