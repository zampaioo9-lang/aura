# Módulo: Sistema de Emails (Resend)

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `backend/src/services/emailService.ts` | Templates y envío de emails |
| `backend/src/services/audienceService.ts` | Gestión de audiencia Resend |
| `backend/src/routes/admin.ts` | Endpoint de broadcast/anuncios |

---

## Proveedor

**Resend** — resend.com

- Dominio verificado: `aliax.io` (en Porkbun)
- From: `notificaciones@aliax.io`
- API Key en variables de entorno: `RESEND_API_KEY`

---

## Templates de Email

El sistema tiene 7 templates HTML para el flujo de reservas:

### 1. Bienvenida (`welcome`)
- **Trigger:** Al crear cuenta / envío manual desde AdminPanel
- **Destinatario:** El profesional nuevo
- **Contenido:** Bienvenida, acceso al panel, pasos para empezar

### 2. Nueva Reserva para el Profesional (`newBookingProfessional`)
- **Trigger:** Cuando un cliente crea una reserva
- **Destinatario:** El profesional
- **Contenido:** Datos del cliente, servicio, fecha y hora

### 3. Confirmación para el Cliente (`bookingConfirmedClient`)
- **Trigger:** Cuando el profesional confirma la reserva
- **Destinatario:** El cliente
- **Contenido:** Confirma la cita, fecha/hora, servicio

### 4. Cancelación para el Cliente (`bookingCancelledClient`)
- **Trigger:** Cuando se cancela una reserva (por cualquiera)
- **Destinatario:** El cliente

### 5. Cancelación para el Profesional (`bookingCancelledProfessional`)
- **Trigger:** Cuando el cliente cancela su reserva
- **Destinatario:** El profesional

### 6. Recordatorio 24h para el Cliente (`reminder24hClient`)
- **Trigger:** 24 horas antes de la cita
- **Destinatario:** El cliente

### 7. Recordatorio 24h para el Profesional (`reminder24hProfessional`)
- **Trigger:** 24 horas antes de la cita
- **Destinatario:** El profesional

---

## Uso en Código

```typescript
// emailService.ts
const tpl = emailTemplates.welcome({ userName, userEmail, hasProfile });
const result = await sendEmail(tpl.to, tpl.subject, tpl.html);

if (!result.success) {
  console.error(result.error);
}
```

---

## Newsletters (Resend Broadcasts)

Para envíos masivos a toda la audiencia, desde el AdminPanel → sección "Newsletter":

```typescript
// audienceService.ts
await sendBroadcast({ name, subject, html });
await addContact({ email, name });    // agregar a la audiencia
await getBroadcasts();                // listar broadcasts enviados
```

Variables de entorno requeridas:
```
RESEND_API_KEY=re_...
RESEND_AUDIENCE_ID=...    // ID de la audiencia en Resend
```

---

## Anuncios por Segmento

Desde AdminPanel → sección "Anuncios", se pueden enviar emails a:

| Audiencia | Filtro |
|-----------|--------|
| `all` | Todos los usuarios |
| `pro` | Solo usuarios con `plan = 'PRO'` |
| `trial` | Usuarios con `trialEndsAt != null && plan = null` |

El envío es individual (uno por uno) con `await sendEmail()` por cada usuario.

---

## Email de Bienvenida Manual

Desde el AdminPanel, en el panel expandido de cada usuario, hay un botón para enviar (o reenviar) el email de bienvenida:

```
POST /api/admin/users/:id/welcome-email
```

El campo `welcomeEmailSentAt` en User registra la fecha del último envío.
