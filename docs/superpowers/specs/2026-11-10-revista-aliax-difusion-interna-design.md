# Difusión interna de Revista Aliax: correo de anuncio + tarjeta de suscripción en el Dashboard

## Contexto

César quiere empezar a difundir la Revista Aliax (ver [[project_aliax_revista_blog]] y [[project_aliax_revista_newsletter]]) entre los usuarios ya registrados de Aliax (terapeutas), para que la lean y la compartan con sus pacientes. Esto requiere dos piezas separadas: (1) un correo único de anuncio, y (2) una forma de que los usuarios se suscriban a futuros envíos desde dentro de la plataforma, no solo desde `/revista`.

Explícitamente fuera de este trabajo: mezclar esta difusión con los clientes inactivos de PsiqueCreativa (otro proyecto, otra identidad — ver [[user_identidad_dual_cesar_alberto]]), que se tratará por separado.

## Goal

1. Redactar el correo de anuncio para que César lo pegue y envíe manualmente desde el panel de Admin ya existente.
2. Agregar una tarjeta fija de suscripción a la Revista en el Dashboard del terapeuta, sin pedir datos que ya conocemos, que cambie de estado una vez que la suscripción quede confirmada.

## Parte 1 — Correo de anuncio (sin cambios de código)

- Se usa el panel ya existente **Admin → Comunicación → Anuncios** (`POST /api/admin/send-announcement`), NO el panel "Newsletter" (Resend Broadcasts). "Anuncios" es un envío directo uno-a-uno con seguimiento por destinatario (`AnnouncementLog`), dirigido exactamente a usuarios de Aliax — no depende de que la sincronización a la audiencia de Resend ya haya corrido.
- El campo `body` de ese formulario se inserta sin escapar dentro de `emailTemplates.announcement` (`backend/src/services/emailService.ts`), que solo convierte `\n` en `<br>` — puede incluir HTML simple (negritas, enlaces) y se renderiza tal cual.
- César elige la audiencia (todos / solo PRO / solo Free) y ejecuta el envío él mismo desde el panel. El envío no se automatiza.
- Esta parte no tiene cambios de código — solo el texto que se entrega para pegar.

## Parte 2 — Tarjeta de suscripción en el Dashboard

### Backend

- `GET /api/auth/me` (`backend/src/routes/auth.ts`): se agrega a la respuesta un campo `newsletterSubscribed: boolean`, calculado con una consulta a `NewsletterSubscriber` (`findUnique({ where: { email_audience: { email: user.email, audience: 'TERAPEUTAS' } } })`) → `true` solo si existe y `status === 'CONFIRMED'`. No se crea ningún endpoint nuevo.
- La suscripción en sí reutiliza el endpoint público ya existente `POST /api/newsletter/subscribe` (mismo rate-limit, mismo doble opt-in, misma plantilla de confirmación) — lo único que cambia es que el frontend llama con los datos ya conocidos de la cuenta (`fullName`, `email`, `audience: 'TERAPEUTAS'` fijo) en vez de un formulario libre.

### Frontend — componente nuevo

- Componente nuevo (ubicación sugerida: `frontend/src/components/dashboard/RevistaSubscribeCard.tsx`), usado dentro de `Dashboard.tsx`. Recibe el `user` del `AuthContext` (ya expone `name`/`email`, se le suma `newsletterSubscribed`) y los tokens de color `C` que ya usa el resto del Dashboard, para heredar el tema oscuro/claro y el acento dinámico.
- Dos estados:
  - **No suscrito:** título "Suscríbete a Revista Aliax" + texto corto ("Recibe los artículos nuevos y compártelos con tus pacientes") + checkbox de consentimiento obligatorio (mismo texto legal que la caja pública de los artículos, enlaza a `/privacidad`) + botón "Suscribirme" (deshabilitado hasta marcar el checkbox). Al enviar: `POST /api/newsletter/subscribe` con `{ fullName: user.name, email: user.email, audience: 'TERAPEUTAS' }` → mensaje inline "Revisa tu correo para confirmar tu suscripción."
  - **Ya confirmado** (`user.newsletterSubscribed === true`): "✓ Ya estás suscrito a Revista Aliax" + enlace a `/revista`.
- Estilo visual: mismo esqueleto que las tarjetas "Comparte tu perfil" (escritorio) / "Comparte este link con tus clientes" (móvil) que ya existen en `Dashboard.tsx` — mismo blur/backdrop/bordes con el acento dinámico `C.accent` — para que se vea nativa del dashboard, no como un banner pegado encima.

### Ubicación (`Dashboard.tsx`)

- **Escritorio:** dentro de la misma columna lateral de 300px, inmediatamente debajo de la tarjeta "Comparte tu perfil" (dentro del mismo wrapper `width: 300`), visible solo cuando `profiles.length > 0` — misma condición que ya envuelve esa columna hoy.
- **Móvil:** en el layout de una sola columna, inmediatamente debajo de la tarjeta "Comparte este link con tus clientes" (antes de `{analyticsBlock}`), misma condición `profiles.length > 0`.
- Sin botón de cerrar ni `localStorage` — es una tarjeta fija, no un banner descartable.

## Fuera de alcance

- No se toca el mecanismo de doble opt-in, las plantillas de confirmación/baja, ni el panel "Newsletter" (Resend Broadcasts).
- No se agrega esta tarjeta para usuarios sin perfil publicado (hoy tampoco existe la columna/tarjeta de compartir en ese caso; se deja igual, sin crear un estado nuevo).
- El correo de anuncio no se envía ni se automatiza desde código — sigue siendo una acción manual de César en el panel existente.
- No se mezcla esta audiencia con los clientes de PsiqueCreativa.

## Testing / verificación

Sin suite automatizada (patrón ya establecido en el resto del proyecto). Verificación manual: `npx tsc -b` en frontend y backend; en local (servidores apuntando a la base de datos compartida) probar el flujo completo con una cuenta de prueba — ver la tarjeta en estado "no suscrito", marcar el checkbox, suscribirse, confirmar que llega el correo, confirmar desde el link, recargar el dashboard y verificar el cambio a "✓ Ya estás suscrito" — dando de baja esa cuenta de prueba al terminar para no dejar un registro real en la audiencia Terapeutas.
