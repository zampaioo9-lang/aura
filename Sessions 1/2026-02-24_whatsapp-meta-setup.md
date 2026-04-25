# Sesión: 2026-02-24 — WhatsApp Meta API + Deploy

## Resumen
Migración de Twilio a Meta WhatsApp Cloud API, diagnóstico de entrega de mensajes, deploy a producción y limpieza de datos de prueba.

---

## Lo que se hizo

### 1. Migración Twilio → Meta WhatsApp Cloud API
- Se descartó Twilio Sandbox por límite de 5 msgs/día y error 63015 (opt-in requerido)
- Se integró Meta WhatsApp Cloud API v21.0
- Reescrito `backend/src/services/whatsappService.ts` con:
  - `sendWhatsApp()` — mensajes de texto libre (solo dentro de ventana de 24h)
  - `sendWhatsAppTemplate()` — plantillas aprobadas (para notificaciones outbound)
  - `templateComponents` — parámetros para las 4 plantillas
  - `templates` — textos de fallback

### 2. Credenciales Meta configuradas en `backend/.env`
```
META_WA_TOKEN="EAANCTv8MzI..." (token permanente via System User)
META_WA_PHONE_NUMBER_ID="1010239882170026"  (+52 1 446 117 1069 — número Aliax)
```

### 3. WABA y plantillas
- **WABA ID**: `1908864356384004` (nombre: "Prueba Reservas", negocio: Psique Citas)
- **Plantillas APROBADAS** (en `es_MX`):
  - `nueva_reserva` — notifica al profesional de nueva reserva (5 parámetros)
  - `reserva_confirmada` / `cita_confirmada` — confirmación al cliente
  - `recordatorio_cita` — recordatorio 24h antes (job cron)
  - `cita_cancelada` — cancelación a ambas partes
- El `bookingService.ts` intenta plantilla primero, hace fallback a texto libre si falla

### 4. Fix número de teléfono mexicano
- **Problema**: México requiere `+521XXXXXXXXXX` pero en DB estaba `+524492123720`
- **Fix**: `normalizePhone()` en `whatsappService.ts` convierte automáticamente `+52XXXXXXXXXX → +521XXXXXXXXXX`

### 5. Diagnóstico: mensajes no llegaban
- API de Meta acepta mensajes (retorna wamid válido) pero no se entregan
- **Causa**: `name_status: "PENDING_REVIEW"` — Meta está revisando el nombre "Aliax" para el número
- **Estado**: En revisión, se aprueba en 1-3 días hábiles. Una vez aprobado, los mensajes funcionarán automáticamente.
- El número está: `status: CONNECTED`, `code_verification_status: VERIFIED`, `quality_rating: UNKNOWN` (nuevo)

### 6. Política de privacidad
- Creado `frontend/src/pages/PrivacyPolicy.tsx`
- Ruta `/privacidad` agregada en `App.tsx`

### 7. Endpoint de prueba actualizado
- `GET /api/test/whatsapp?to=+52...` ahora usa plantilla `nueva_reserva` en lugar de texto libre

### 8. Deploy a producción
- Frontend: `aliax.io` ✅
- Backend: `api.aliax.io` ✅

### 9. Base de datos Neon reactivada
- Neon pausa proyectos free tier tras 7 días sin actividad
- Se reactivó manualmente desde `console.neon.tech`
- Pendiente: configurar ping automático o upgrade a Pro (~$19/mes)

### 10. Limpieza de reservas de prueba
- Eliminadas 15 reservas de prueba (emails con `test.com` / `prueba`)
- Eliminadas 16 notificaciones asociadas
- Se conservaron reservas reales: Sabina, Olguita

---

## Archivos modificados
| Archivo | Cambio |
|---|---|
| `backend/src/services/whatsappService.ts` | Reescrito para Meta API + normalizePhone() |
| `backend/src/services/bookingService.ts` | Usa plantillas, fallback a texto libre |
| `backend/src/jobs/reminderJob.ts` | Usa plantilla `recordatorio_cita` |
| `backend/src/index.ts` | Test endpoint usa plantilla |
| `backend/src/config/env.ts` | Variables Meta en lugar de Twilio |
| `backend/.env` | Credenciales Meta |
| `frontend/src/pages/PrivacyPolicy.tsx` | Nueva página |
| `frontend/src/App.tsx` | Ruta `/privacidad` |

---

## Pendientes
- [ ] Esperar aprobación de nombre "Aliax" en Meta (`name_status: PENDING_REVIEW`)
- [ ] Configurar ping automático a Neon para evitar pausas (o upgrade a Pro)
- [ ] Fix error `Unknown field 'bio'` en `/api/auth/me` (requiere `prisma generate`)
- [ ] Fix `prisma generate` EPERM en Windows (archivo bloqueado por proceso)
- [ ] Plantilla `reserva_confirmada` — revisar nombre exacto en WABA (hay `cita_confirmada` y `confirmacion_de_cita`)

---

## Estado actual del sistema
- Login: ✅
- Dashboard: ✅ (9 reservas reales)
- Perfil público `aliax.io/alberto`: ✅
- Booking flow: ✅
- Notificaciones WhatsApp: ⏳ (pendiente aprobación Meta)
