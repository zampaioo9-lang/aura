# Calendario de Citas para el Profesional

## Fecha
2026-03-01

## Qué se hizo
Implementación completa del calendario semanal de citas para el profesional, que permite crear citas directamente desde el Dashboard (para clientes que llegan por teléfono, WhatsApp, etc.).

## Archivos modificados/creados

### Backend
- `backend/src/routes/bookings.ts` — Nuevo endpoint `POST /api/bookings/professional` (auth)
  - Valida que el perfil pertenezca al usuario autenticado
  - Llama a `createBooking()` (respeta disponibilidad, detecta conflictos con 409)
  - Actualiza status a `CONFIRMED` inmediatamente con `prisma.booking.update`
  - Sin cambios al schema de Prisma

### Frontend (nuevos)
- `frontend/src/components/dashboard/ProfessionalCalendar.tsx`
  - Calendario semanal Lun–Dom con navegación anterior/siguiente/Hoy
  - Rango de horas derivado de `GET /availability/me`
  - Celdas dentro de horario → clickeables (abre modal)
  - Celdas fuera de horario → sombreadas
  - Bloques de citas con colores por estado (verde=CONFIRMED, amarillo=PENDING, etc.)
  - Se refresca automáticamente tras crear una cita

- `frontend/src/components/dashboard/NewBookingModal.tsx`
  - Fecha y hora pre-llenadas desde el slot clicado
  - Dropdown de servicios activos del profesional
  - Campos: nombre (req), email (req), teléfono (opcional), notas (opcional)
  - Error inline para conflictos (409)
  - Toast de éxito al crear

### Frontend (modificado)
- `frontend/src/pages/Dashboard.tsx`
  - `TabCitas` ahora recibe `profiles` prop
  - Toggle **Lista / Calendario** en la cabecera de la vista profesional
  - Preferencia guardada en `localStorage` key `aliax_citas_view`
  - Vista Calendario usa ancho completo (`w-full`)
  - El toggle solo aparece si el profesional tiene al menos un perfil

## Deploy
- Commit: `e851cea`
- Deploy producción: `npx vercel --prod` → aliax.io
- Estado: ✅ funcionando en producción
