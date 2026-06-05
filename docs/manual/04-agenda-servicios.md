# Módulo: Agenda y Servicios

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/SchedulingConfig.tsx` | Configuración completa de agenda |
| `frontend/src/pages/AvailabilityDashboard.tsx` | Vista de disponibilidad semanal |
| `frontend/src/pages/ServicesDashboard.tsx` | Gestión de servicios |
| `frontend/src/components/availability/*.tsx` | Componentes del calendario |
| `backend/src/routes/availability.ts` | Slots de disponibilidad |
| `backend/src/routes/booking-settings.ts` | Configuración de reservas |
| `backend/src/routes/schedule-blocks.ts` | Bloqueos de fecha |
| `backend/src/routes/services.ts` | CRUD de servicios |

---

## SchedulingConfig

Página accesible desde `/dashboard/scheduling` o desde el tab "Configurar Agenda" en el Dashboard.

### Tabs de SchedulingConfig

| Tab | ID | Descripción |
|-----|-----|------------|
| Disponibilidad | `availability` | Horarios semanales por día |
| Servicios | `services` | Crear/editar/eliminar servicios |
| Bloqueos | `blocks` | Vacaciones y ausencias |
| Reglas | `rules` | Buffer, días anticipados, auto-confirm |
| Notificaciones | `notifications` | Templates de email (Pro) |

### Acceso

Los tabs Servicios, Bloqueos, Reglas y Notificaciones requieren `isPro` o `featureOverrides.agenda`. Se protegen con el componente `<ProGate>`.

---

## Disponibilidad Semanal

### Modelo `AvailabilitySlot`
```
dayOfWeek: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
startTime: "09:00"
endTime: "18:00"
isActive: boolean
profileId: string
```

### Endpoints
```
GET    /api/availability/me         → Mis slots
POST   /api/availability            → Crear slot
PUT    /api/availability/:id        → Actualizar slot
DELETE /api/availability/:id        → Eliminar slot
POST   /api/availability/bulk       → Crear múltiples slots
```

### Plantillas rápidas
SchedulingConfig incluye plantillas predefinidas (Lun-Vie 9-18, Lun-Vie 10-14, etc.) que crean slots en bulk.

---

## Disponibilidad por Servicio

Cada servicio puede tener su propia disponibilidad que **sobreescribe** la disponibilidad general del perfil.

```
GET    /api/service-availability/:serviceId
POST   /api/service-availability
PUT    /api/service-availability/:id
DELETE /api/service-availability/:id
POST   /api/service-availability/bulk
```

---

## Servicios

### Modelo `Service`
```
name: string          → Nombre del servicio
description: string   → Descripción
price: number         → Precio
currency: string      → MXN, USD, EUR, COP, ARS, CLP
durationMinutes: int  → Duración de la sesión
isActive: boolean     → Visible en perfil público
image/images: string  → Foto del servicio (Cloudinary)
profileId: string
```

### Endpoints
```
GET    /api/services/:profileId    → Servicios del perfil (público)
POST   /api/services               → Crear (auth)
PUT    /api/services/:id           → Editar (auth)
DELETE /api/services/:id           → Eliminar (auth)
PATCH  /api/services/:id/toggle    → Activar/desactivar (auth)
```

---

## Configuración de Reservas (BookingSettings)

### Modelo `BookingSettings`
```
bufferMinutes: int        → Tiempo entre reservas (default: 0)
advanceBookingDays: int   → Días máximos de anticipación (default: 30)
minAdvanceHours: int      → Horas mínimas de anticipación (default: 1)
cancellationHours: int    → Horas antes para cancelar (default: 24)
autoConfirm: boolean      → Confirmar automáticamente (default: false)
emailEnabled: boolean     → Enviar emails de notificación (default: true)
timezone: string          → Zona horaria (default: "America/Mexico_City")
language: string          → Idioma emails (default: "es")
```

```
GET  /api/booking-settings    → Obtener configuración
PUT  /api/booking-settings    → Actualizar configuración
```

---

## Bloqueos de Fechas (ScheduleBlocks)

Para vacaciones, días libres o ausencias específicas:

### Modelo `ScheduleBlock`
```
startDate: DateTime    → Inicio del bloqueo
endDate: DateTime      → Fin del bloqueo
startTime: string?     → null = todo el día
endTime: string?       → null = todo el día
isAllDay: boolean
reason: string?        → "Vacaciones", "Día libre", etc.
```

```
GET    /api/schedule-blocks        → Mis bloqueos
POST   /api/schedule-blocks        → Crear bloqueo
PUT    /api/schedule-blocks/:id    → Actualizar
DELETE /api/schedule-blocks/:id    → Eliminar
```

---

## SchedulingPanel (componente embebido)

Además de la página `/dashboard/scheduling`, existe `SchedulingPanel` que se exporta como componente y se embebe directamente en el tab "Agenda" del Dashboard. Ambos usan la misma lógica pero con layouts distintos.
