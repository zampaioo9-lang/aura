# Desconectar y conectar Email

## Donde esta

Perfil profesional > Configurar agenda > Notificaciones > Canales de comunicacion

## Como funciona

El toggle de Email controla si el sistema envia o no correos automaticos a clientes y al profesional.

- **Conectado** (verde): se envian todos los emails automaticos
- **Desconectado** (gris): no se envia ningun email

Despues de cambiar el estado, hay que presionar **Guardar cambios** para que surta efecto.

## Que emails se detienen al desconectar

- Solicitud recibida (al cliente al hacer la reserva)
- Confirmacion de cita (al cliente cuando el profesional confirma)
- Aviso de cancelacion (al cliente y al profesional)
- Recordatorio 24h antes de la cita (al cliente y al profesional)

## Implementacion tecnica

### Base de datos
Campo `emailEnabled` (Boolean, default: true) en la tabla `BookingSettings`.

### Backend
- `booking-settings.ts`: endpoint `GET /api/booking-settings` devuelve el campo, `PUT /api/booking-settings` lo guarda
- `bookingService.ts`: consulta `emailEnabled` antes de enviar emails en `createBooking`, `confirmBooking` y `cancelBooking`
- `reminderJob.ts`: consulta `emailEnabled` antes de enviar recordatorios por email

### Frontend
- `SchedulingConfig.tsx` > `TabNotificaciones`: carga el valor real de la DB al montar, guarda con el boton "Guardar cambios"

## Notas

- WhatsApp esta deshabilitado en la UI (pendiente aprobacion Meta). Cuando este listo se agregara como segundo canal en esta misma seccion.
- El email del profesional (notificacion de nueva reserva) tambien se desactiva al desconectar. Si en el futuro se quiere separar "emails al cliente" de "emails al profesional", se pueden agregar dos campos independientes en `BookingSettings`.
