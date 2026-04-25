# Sesión: 2026-03-01 — WhatsApp Token nuevo + Deploy + name_status bloqueado

## Resumen
Generación de nuevo token permanente de Meta System User, actualización en backend y deploy a Vercel. Diagnóstico de por qué los mensajes de WhatsApp no llegan.

---

## Lo que se hizo

### 1. Nuevo token permanente generado
- Se accedió a: business.facebook.com → Psique Citas → Usuarios del sistema → Aliax Asistente
- Token generado sin fecha de caducidad (permanente)
- System User: **Aliax Asistente** (ID: `61588408331093`, rol Admin)
- Activos asignados: App "Aliax Notificaciones" + Cuenta WA "Prueba Reservas" (ambos con Control total)

### 2. Token actualizado en backend
- Archivo local: `backend/.env` → `META_WA_TOKEN` actualizado
- Vercel (backend `api.aliax.io`) → Environment Variables → `META_WA_TOKEN` actualizado
- Redeploy hecho en Vercel

### 3. Script de deploy creado
- Archivo: `Sessions/DEPLOY.md`
- Contiene: flujo auto-deploy, deploy manual con CLI, todas las variables de entorno, configuración Vercel, info WhatsApp, checklist post-deploy

### 4. Health check verificado
- `GET https://api.aliax.io/api/health` → `{"status":"ok","timestamp":"2026-03-01T05:48:31.733Z"}` ✅

### 5. Test de WhatsApp ejecutado
- `GET https://api.aliax.io/api/test/whatsapp?to=+521XXXXXXXXXX`
- Respuesta: `{"success":true,"sid":"wamid.HBgNNTIxNDQ5MjEyMzcyMBUCABEYEjcwOTY3Q0FDNzA2Q0I0QTRFOAA="}` ✅
- Meta acepta el mensaje pero **no lo entrega**

---

## Problema identificado: name_status PENDING_REVIEW

Diagnóstico vía Graph API:
```json
{
  "display_phone_number": "+52 1 446 117 1069",
  "verified_name": "Aliax",
  "name_status": "PENDING_REVIEW",
  "status": "CONNECTED",
  "quality_rating": "UNKNOWN",
  "code_verification_status": "VERIFIED",
  "id": "1010239882170026"
}
```

- El nombre "Aliax" lleva **+5 días hábiles** en revisión (desde 2026-02-24)
- Meta acepta los mensajes (devuelve wamid válido) pero **no los entrega** mientras el nombre no sea aprobado
- Rango normal de revisión: 1-3 días hábiles — este caso está fuera del rango

---

## Pendientes

- [ ] Resolver `name_status: PENDING_REVIEW` — opciones:
  - Contactar soporte Meta: Business Suite → Ayuda → Soporte directo (mencionar WABA ID `1908864356384004`, número `+52 1 446 117 1069`)
  - O cambiar display name a algo más descriptivo (ej. "Aliax Citas") para reiniciar revisión
- [ ] Configurar número de prueba de Meta como fallback temporal para seguir probando
  - Meta for Developers → App Aliax Notificaciones → WhatsApp → Primeros pasos
  - Cambiar `META_WA_PHONE_NUMBER_ID` en `.env` y Vercel al del número de prueba
  - Permite agregar hasta 5 números destinatarios verificados

---

## Estado del sistema
- Backend deploy: ✅ (`api.aliax.io`)
- Frontend deploy: ✅ (`aliax.io`)
- Token Meta permanente: ✅ (nuevo, sin caducidad)
- Notificaciones WhatsApp: ❌ (bloqueadas por `name_status: PENDING_REVIEW`)
