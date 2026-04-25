# 2026-03-19 — Rediseño Dashboard, Profesiones y Explorar

## Resumen
Sesión enfocada en rediseño del dashboard profesional, sistema de clientes, gestión de profesiones y mejoras en Explorar.

---

## 1. Email de bienvenida
- Creado template de bienvenida (#8) en `emailService.ts` con CTA para crear perfil profesional si no tiene uno
- Se envía automáticamente al registrarse (non-blocking) en `auth.ts`
- Campo `welcomeEmailSentAt` agregado al modelo `User` en Prisma
- Admin panel: columna "Bienvenida" con badge verde/rojo + botón de envío manual (`POST /api/admin/users/:id/welcome-email`)

## 2. Rediseño Dashboard — Inicio (TabInicio)
- Eliminados bloques estadísticos del tab Profesional
- Añadidos al tab Inicio con toggle cliente/profesional (solo visible si tiene perfil profesional)
- Stats diferenciados por vista: citas como cliente vs citas como profesional

## 3. Rediseño Dashboard — Perfil Profesional (TabProfesional)
- Removidos bloques de stats superiores
- Nuevos botones colapsables:
  - **Clientes**: lista de clientes (manuales + de bookings), con iconos de acción (email, WhatsApp, editar, crear cita, eliminar con confirmación)
  - **Configurar agenda**: link a `/dashboard/scheduling`
  - **Comparte link**: por perfil, con link copiable
- Botón "+Añadir Perfil (Próximamente)" conservado

## 4. Sistema de clientes
- Nuevo modelo `Client` en Prisma (con `@@unique([userId, email])`)
- Endpoints:
  - `POST /api/bookings/clients` — crear/editar cliente (upsert)
  - `DELETE /api/bookings/clients/:email` — eliminar cliente
  - `GET /api/bookings/clients` — lista mergeada (manual + bookings), con `source: 'manual' | 'booking' | 'both'`
- Componente `AddClientModal` para crear y editar clientes
- Acciones por cliente: mailto, wa.me, editar, crear cita, eliminar (con candado de seguridad)

## 5. Profesiones — catálogo obligatorio
- Campo de profesión cambiado de texto libre a `<select>` con categorías (`PROFESSION_CATEGORIES`) en:
  - `ProfileEditor.tsx` (`/profile/edit/:id`)
  - `AccountSettings.tsx` (`/account`)
- Catálogo en `frontend/src/lib/professions.ts` — 13 categorías, 160+ profesiones
- Se agregó "Terapeuta" a Salud Mental (no existía)
- Backend: directorio filtra perfiles sin profesión (`profession: { not: '' }`)
- Validación Zod ya rechaza strings vacíos (`z.string().min(2)`)

## 6. Correcciones en DB (SQL directo)
- `"Psicóloga"` / `"Psicologa"` / `"Psicóloga "` (con espacio) → `"Psicólogo/a"`
- `"Alma Kareli"` (nombre en campo profesión) → `"Psicólogo/a"`
- Perfil de Perú: título corregido a `"Psi. Maryori Marreros"`
- Perfiles normalizados: Consultor, Consultor de TI, Estilista y Barbero, Psicoterapeuta, Terapeuta — todos ya existen en catálogo

## 7. Explorar — rediseño del buscador
- Categorías ocultas por defecto — solo se muestran al escribir en el buscador
- Placeholder con ejemplos: "Psicólogo, Estilista, Entrenador..."
- Buscador más compacto (`max-w-lg`, padding reducido)
- Mensaje guía cuando no hay búsqueda: "Escribe una profesión para buscar profesionales"
- En tarjetas de profesionales: columna principal ahora muestra el **nombre** (`title`) en vez de la profesión

## 8. WhatsApp widget
- Botón flotante subido de `bottom: 24px` a `bottom: 80px` para no tapar la barra de navegación ni el badge Pro en móvil

## 9. Fix dropdown dark mode
- `NewBookingModal.tsx`: añadido `colorScheme: C.isDark ? 'dark' : 'light'` al `inputStyle` para que las opciones de los select sean visibles en modo oscuro

---

## Archivos modificados

### Backend
- `prisma/schema.prisma` — `welcomeEmailSentAt` en User, nuevo modelo `Client`
- `src/services/emailService.ts` — template welcome
- `src/routes/auth.ts` — envío automático de welcome email
- `src/routes/admin.ts` — columna welcome + endpoint envío manual
- `src/routes/bookings.ts` — CRUD clientes, merge manual+bookings
- `src/routes/profiles.ts` — filtro `profession: { not: '' }` en directory
- `src/utils/validation.ts` — sin cambios (ya validaba min 2 chars)

### Frontend
- `src/pages/Dashboard.tsx` — TabInicio, TabProfesional, TabExplorar rediseñados
- `src/pages/ProfileEditor.tsx` — profesión como `<select>`
- `src/pages/AccountSettings.tsx` — profesión como `<select>`
- `src/pages/AdminPanel.tsx` — columna welcome email
- `src/components/WhatsAppWidget.tsx` — bottom 80px
- `src/components/dashboard/NewBookingModal.tsx` — dark mode fix
- `src/lib/professions.ts` — añadido "Terapeuta"

---

## Deploys
- Backend: `cd aura/backend && vercel --prod` ✅
- Frontend: `cd aura && vercel --prod` ✅ (múltiples deploys durante la sesión)
