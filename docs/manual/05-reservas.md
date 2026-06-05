# Módulo: Sistema de Reservas

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/BookingPage.tsx` | Página de reserva con selección de fecha/hora |
| `frontend/src/components/BookingForm.tsx` | Formulario modal de reserva |
| `backend/src/routes/bookings.ts` | CRUD de reservas + slots disponibles |

---

## Flujo de Reserva (Cliente)

1. Cliente entra al perfil público `/:slug`
2. Ve los servicios activos del profesional
3. Hace click en "Reservar" → abre `BookingForm` modal
4. Selecciona fecha del calendario
5. Ve los slots disponibles para esa fecha
6. Llena sus datos: nombre, email, teléfono (opcional), notas
7. Confirma la reserva → `POST /api/bookings`
8. Recibe email de confirmación (si emailEnabled)
9. El profesional recibe email de nueva reserva

---

## Estados de una Reserva

```
PENDING    → Creada, esperando confirmación del profesional
CONFIRMED  → Confirmada por el profesional
COMPLETED  → Sesión realizada
CANCELLED  → Cancelada (por cliente o profesional)
NO_SHOW    → Cliente no se presentó
```

### Transiciones permitidas
```
PENDING    → CONFIRMED, CANCELLED
CONFIRMED  → COMPLETED, CANCELLED, NO_SHOW
COMPLETED  → (final)
CANCELLED  → (final)
NO_SHOW    → (final)
```

---

## Modelo `Booking`

```typescript
{
  id: string
  profileId: string
  serviceId: string
  professionalId: string     // userId del profesional
  clientName: string
  clientEmail: string
  clientPhone: string?
  date: DateTime             // Fecha de la sesión
  startTime: string          // "10:00"
  endTime: string            // "11:00"
  status: BookingStatus
  whatsappNotified: boolean  // ¿Se notificó por WhatsApp?
  cancelledAt: DateTime?
  cancelledBy: string?       // "client" | "professional"
  cancellationReason: string?
}
```

---

## Cálculo de Slots Disponibles

`GET /api/bookings/available-slots?profileId=&serviceId=&date=YYYY-MM-DD`

El backend calcula los slots disponibles considerando:
1. `AvailabilitySlot` del perfil (horario semanal)
2. `ServiceAvailability` del servicio (si existe, sobreescribe)
3. `ScheduleBlock` — bloqueos de fecha (vacaciones, días libres)
4. Reservas ya existentes en esa fecha
5. `BookingSettings.bufferMinutes` — tiempo entre reservas
6. `BookingSettings.minAdvanceHours` — anticipación mínima
7. `BookingSettings.advanceBookingDays` — no mostrar fechas muy lejanas

---

## Endpoints

```
GET  /api/bookings/available-slots  → Slots disponibles (SIN auth, público)
POST /api/bookings                  → Crear reserva (SIN auth, público)
GET  /api/bookings                  → Mis reservas (auth)
GET  /api/bookings/analytics        → Resumen estadístico (auth)
GET  /api/bookings/client/:email    → Reservas de un cliente específico
PUT  /api/bookings/:id/confirm      → Confirmar (auth, profesional)
PUT  /api/bookings/:id/complete     → Completar (auth, profesional)
PUT  /api/bookings/:id/no-show      → No-show (auth, profesional)
PUT  /api/bookings/:id/cancel       → Cancelar (auth o público)
```

---

## Tab Citas en el Dashboard

El tab "Mis Citas" muestra:
- **Reservas pendientes** — requieren acción del profesional (confirmar / cancelar)
- **Reservas confirmadas** — próximas sesiones
- **Historial** — todas las reservas (completadas, canceladas, no-show)

El profesional puede:
- **Confirmar** una reserva pendiente
- **Cancelar** cualquier reserva activa
- **Marcar como completada** o **no-show** las confirmadas

---

## Notificaciones por Reserva

Cuando se crea o cambia el estado de una reserva, se disparan emails automáticos via Resend.

Ver `docs/manual/10-emails.md` para detalle de templates.

Hay un flag `whatsappNotified` en el modelo pero la integración con Meta Cloud API está pendiente de aprobación desde feb 2026.
