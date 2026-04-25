# Implementación de Newsletter para usuarios de Aliax

**Fecha:** 2026-03-26

---

## Objetivo

Implementar un sistema de newsletter para enviar emails masivos a los usuarios de Aliax con tracking de aperturas y clics, baja automática (unsubscribe) y diseño HTML rico con la marca de Aliax.

---

## Stack utilizado

- **Resend Broadcasts** — envío masivo, tracking, unsubscribe automático
- **Resend Audiences** — gestión de contactos
- **Admin Panel** — interfaz para enviar newsletters sin tocar código

---

## Credenciales y configuración

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | `re_5j9y8N3Q_HZUa6hwWm95LHyZ56L9pLN5n` (Full Access) |
| `RESEND_AUDIENCE_ID` | `defe601c-3150-4358-94f7-767322c85971` |
| Audience name | `General` (única audience en plan gratuito) |

> ⚠️ La key original (`RESEND_API_KEY`) era "Send only" — se reemplazó por una nueva con **Full Access** para poder usar Contacts y Broadcasts API.

---

## Archivos creados / modificados

### Backend

| Archivo | Cambio |
|---|---|
| `src/services/audienceService.ts` | **Nuevo** — wrapper de Resend Contacts y Broadcasts |
| `src/routes/admin.ts` | Añadidos 3 endpoints: `POST /newsletter`, `GET /newsletter`, `POST /newsletter/sync` |
| `src/routes/auth.ts` | Añade contacto a la audience al registrar nuevo usuario |
| `src/config/env.ts` | Añadida variable `RESEND_AUDIENCE_ID` |

### Frontend

| Archivo | Cambio |
|---|---|
| `src/pages/AdminPanel.tsx` | Añadida sección **Newsletter** con: sincronización de usuarios, envío de broadcast HTML, y resultado con broadcast ID |

---

## Endpoints nuevos

```
POST /api/admin/newsletter          — crea y envía un broadcast a toda la audiencia
GET  /api/admin/newsletter          — lista broadcasts anteriores
POST /api/admin/newsletter/sync     — sincroniza todos los usuarios actuales a la audience de Resend
```

---

## Flujo de uso

1. **Admin Panel → Newsletter → "↑ Sincronizar usuarios existentes"** (solo necesario la primera vez o cuando hay usuarios nuevos sin sincronizar)
2. Llenar campos:
   - **Nombre interno:** ej. `Newsletter Abril 2026 — IA`
   - **Asunto:** ej. `Tu competencia ya usa IA. Tus clientes, también.`
   - **HTML:** pegar el HTML del newsletter
3. Clic en **"Enviar Newsletter"**
4. Ver métricas en **resend.com → Broadcasts**

---

## Primer newsletter enviado

- **Fecha:** 2026-03-26
- **Broadcast ID:** `fb570aa4-b24e-4c16-a609-567844f8e2d6`
- **Asunto:** `Tu competencia ya usa IA. Tus clientes, también.`
- **Destinatarios:** 11 usuarios

---

## Notas importantes

- **Personalización:** `{{contact.first_name}}` NO funciona en HTML raw vía API. Usar saludo genérico `Hola 👋` en futuros newsletters.
- **Unsubscribe:** Resend lo añade automáticamente al footer — no hay que añadirlo manualmente.
- **Plan gratuito Resend:** 1 audience, 3,000 emails/mes.
- **Nuevos registros:** se añaden automáticamente a la audience al registrarse en Aliax.

---

## HTML base del newsletter (plantilla reutilizable)

Ver archivo de texto plano en `/Sessions/2026-03-26_newsletter-texto-plano.md`

El HTML completo con el diseño de Aliax (fondo oscuro, acento púrpura, stats destacados) fue generado el 2026-03-26 y está disponible en el historial de la conversación.
