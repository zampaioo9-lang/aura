# 2026-03-02 — Notificaciones por email con Resend

## Contexto
WhatsApp (Meta) bloqueado por problemas de nombre de negocio y método de pago.
Decisión: lanzar Aliax al mercado y agregar email como canal de notificaciones mientras se resuelve WhatsApp.

## Lo que se hizo

### Instalación
- `npm install resend` en backend (resend@6.9.3)

### Archivos nuevos
- `backend/src/services/emailService.ts` — servicio Resend con 7 templates HTML:
  - `bookingReceived` → al cliente (solicitud recibida, pendiente de confirmación)
  - `newBooking` → al profesional (nueva reserva pendiente)
  - `confirmation` → al cliente (reserva confirmada)
  - `reminder24h` → al cliente (recordatorio 24h)
  - `reminderProfessional` → al profesional (recordatorio 24h)
  - `cancellationClient` → al cliente (cita cancelada)
  - `cancellationProfessional` → al profesional (cancelada por cliente)

### Archivos modificados
- `backend/src/config/env.ts` — agregadas `RESEND_API_KEY` y `RESEND_FROM_EMAIL`
- `backend/.env` — placeholders agregados
- `backend/src/services/bookingService.ts` — emails en createBooking, confirmBooking, cancelBooking
- `backend/src/jobs/reminderJob.ts` — emails de recordatorio 24h con deduplicación

### Comportamiento
- Email es ADICIONAL a WhatsApp, no lo reemplaza
- Si RESEND_API_KEY está vacía, hace log pero no falla
- Emails se registran en tabla Notification igual que WhatsApp

## Configuración Resend
- Cuenta creada en resend.com
- Dominio `aliax.io` verificado (registros DNS en Porkbun)
- Región: North Virginia (us-east-1) — funcional, sin problema
- From: `Aliax <notificaciones@aliax.io>`

## Variables de entorno
Agregadas en **Vercel → proyecto "backend"**:
- `RESEND_API_KEY=re_F7rQv626_DBLSvQbURNWDtdrpruLDsuyC`
- `RESEND_FROM_EMAIL=Aliax <notificaciones@aliax.io>`

## Flujo completo de emails
### Cliente recibe
1. Solicitud recibida — al instante de agendar
2. Reserva confirmada — cuando el profesional confirma
3. Cita cancelada — si alguien cancela
4. Recordatorio 24h — el día anterior

### Profesional recibe
1. Nueva reserva — al instante de que el cliente agenda
2. Cita cancelada — si el cliente cancela
3. Recordatorio 24h — el día anterior

## Deploy
- Backend real en producción: **https://api.aliax.io** (dominio aliado en Vercel)
- `backend-one-neon-96.vercel.app` es un deployment antiguo — NO usar para pruebas
- Para desplegar manualmente: `cd backend && vercel --prod`
- Commits: `f0b7081` (inicial), `b256851` (bookingReceived), `bc91fb6` (timeout WA), `5c6e810` (limpieza)
- Email verificado funcionando en producción via `api.aliax.io`

## Estado final
- Todos los correos verificados funcionando en producción con reserva real
- Diseño limpio: header oscuro Aliax, badges de color por tipo, datos completos
- Email llegó correctamente a cliente (Sabina) con cita de Alberto A. el 4 de marzo

## Pendiente
- WhatsApp: Meta no aprueba nombre "software para profesionales", problema con método de pago
- Estrategia: lanzar Aliax con email funcional, agregar badge "WhatsApp próximamente" en UI
