# Sesión: 2026-04-24 — Implementación freemium + directorio

## Contexto

Continuación directa del rediseño del modelo de negocio de Aliax (ver sesión del mismo día sobre el nuevo modelo). Se implementó el plan completo: freemium permanente, galería de fotos por servicio, directorio público con SEO y analytics por plan.

---

## Qué se implementó

### Fase 1 — Freemium (acceso libre + gates Pro)

- **`requireActiveSubscription` desactivado** de todas las rutas del dashboard: los usuarios pueden entrar y usar la app sin suscripción activa.
- **`isProUser()` helper** (`backend/src/lib/planUtils.ts`): función central para verificar si un usuario es Pro, maneja PRO, LIFETIME, admin e isAdmin.
- **`requirePro` middleware** (`backend/src/middleware/requirePro.ts`): devuelve 403 con `{ code: 'PRO_REQUIRED' }` para features premium.
- **AppError extendido** con campo `code?: string` para errores machine-readable.
- **Guard de templates**: ELEGANT y CREATIVE solo para Pro en `PUT /profiles/me` y `PUT /profiles/:id`.
- **WhatsApp Pro gate**: las notificaciones de WhatsApp solo se envían si `isProUser(profile.user)`.
- **trialExpiryJob**: ya no desactiva perfiles al vencer el trial (freemium: los perfiles quedan publicados).
- **`isPro: boolean`** en `AuthContext` del frontend.
- **Pricing.tsx** reescrita: dos cards (Free $0 / Pro $9 USD/mes) con features, botón de Stripe, estado "Ya tienes Pro activo".

### Fase 2 — Galería de imágenes por servicio

- **Schema**: `images String[] @default([])` en modelo Service (Neon: `prisma db push` + migration SQL manual).
- **Endpoints**: `POST/DELETE /api/services/:id/images` — Free: máx 3 fotos, Pro: máx 20. Validación de URL, constantes `MAX_IMAGES_FREE/PRO`.
- **UI**: galería de thumbnails 56×56 con botón × para eliminar, botón + para agregar, caption con conteo. Implementado en `ServiceCard.tsx` con prop threading desde `ServicesDashboard` → `ServiceList` → `ServiceCard`.
- **Upgrade nudge**: al intentar subir la 4ta foto en Free → toast con link a /pricing.

### Fase 3 — Directorio público

- **Endpoint** `GET /api/profiles/directory` (sin auth): filtros por profesión y ciudad (campo `country`), paginación, Pro primero usando dos queries separadas (proWhere + freeWhere combinados), responde con `isPro` por perfil sin exponer datos de plan.
- **`Explorar.tsx`** (`/explorar`): búsqueda por profesión + ciudad, 8 filtros rápidos, grid de cards con badge PRO, bio truncada, servicios preview. Cards linkan a `/book/:slug`.
- **Ruta y nav**: `/explorar` en App.tsx (antes de `/book/:slug`), link "Explorar profesionales →" en navbar de Landing.

### Fase 4 — Analytics

- **Endpoint** `GET /api/bookings/analytics` (auth): Free → últimas 10 reservas (últimos 30 días), Pro → historial completo (cap 500). Devuelve `byStatus`, `byService` (por nombre::moneda), `perDay` (Pro only), `recentBookings`.
- **Dashboard**: tarjeta "Resumen de reservas" con 4 contadores por estado, top 3 servicios, nudge de upgrade para Free. Error state si falla el fetch.

---

## Archivos comprometidos al repo por primera vez

Varios archivos existían solo localmente y nunca habían sido commiteados:

- `backend/src/middleware/requireActiveSubscription.ts`
- `backend/src/services/audienceService.ts`
- `frontend/src/components/CountrySelect.tsx`
- `frontend/src/components/WhatsAppWidget.tsx`
- `frontend/src/pages/LandingBarberia.tsx`
- `frontend/src/pages/LandingSalon.tsx`
- `frontend/src/pages/Unete.tsx`
- `frontend/barberia.html`, `frontend/psicologo.html`, `frontend/salon.html`

Se recuperaron del git stash y se commitearon.

---

## Deploy

- Migración aplicada con `prisma migrate deploy` (campo `images[]` en Neon).
- Backend deployado en `api.aliax.io`.
- Frontend deployado en `www.aliax.io`.

---

## Decisiones técnicas relevantes

- **`prisma migrate dev` falla en Neon** (P3006, no soporta shadow DB). Se usa `prisma db push` + migration SQL manual para tracking en git.
- **Sort Pro en directorio**: dos queries separadas (Pro + Free) en vez de sort in-memory post-fetch, para que Pro siempre aparezca primero sin importar la paginación.
- **WhatsApp sigue en PENDING_REVIEW** con Meta. El gate Pro está listo; cuando se resuelva la aprobación, los usuarios Pro recibirán notificaciones automáticamente.
- **`requireActiveSubscription.ts` se mantiene**: las rutas de configuración (availability, schedule-blocks, booking-settings, service-availability) todavía lo importan. Se dejó como passthrough hasta que se evalúe si también deben liberarse.

---

## Estado al finalizar

- Modelo freemium completamente funcional en producción.
- Los 4 forzadores de upgrade están activos: no-shows por email, límite de fotos, analytics limitados, posición en directorio.
- Pendiente: resolver WhatsApp (Meta o migrar a WATI/360dialog).
