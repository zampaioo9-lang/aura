# Revista Aliax — Fase 2: Newsletter

**Fecha:** 2026-11-04
**Depende de:** Fase 1 ya en producción ([[2026-10-29-revista-aliax-blog-design]], [[2026-11-02-revista-aliax-fase1-gap-design]]). Reutiliza `emailService.ts` (Resend, patrón de templates HTML existentes) y `audienceService.ts` (Resend Audiences/Broadcasts, hoy usado por el Newsletter general de AdminPanel).
**No incluye (fuera de alcance, explícito):** que terapeutas Pro suban sus propios artículos (Fase 3), analítica de aperturas/clics más allá de lo que Resend ya reporta, exportar/importar listas de correos manualmente, envío automático al publicar (el envío siempre lo dispara el admin a mano).

## Resumen

Fase 1 dejó fuera a propósito el envío de artículos por correo y la captura de suscriptores — el formulario "Suscríbete" del mockup original nunca se construyó porque mostrar un formulario que no hace nada es peor que no mostrarlo. Esta fase lo construye: una banda de suscripción en las páginas públicas de Revista, con doble opt-in, que alimenta dos audiencias de Resend separadas (terapeutas y pacientes), más un botón en el CMS para mandar cualquier artículo publicado como newsletter a la audiencia que el admin elija, cuando él decida.

## Contexto importante descubierto durante el diseño

Aliax ya tiene un sistema de Newsletter en producción (`backend/src/routes/admin.ts` → `/api/admin/newsletter*`, UI en `AdminPanel.tsx`) que envía broadcasts HTML libres a **una sola audiencia de Resend**, sincronizada automáticamente desde la tabla `User` (los usuarios registrados en Aliax, mayoritariamente terapeutas). `audienceService.ts` tiene el `audienceId` fijo a una sola variable de entorno (`RESEND_AUDIENCE_ID`).

Decisión de César: los suscriptores de Revista que se identifiquen como terapeuta se suman a **esa misma audiencia** (Resend deduplica por email, así que no hay conflicto si ya estaban registrados). Los que se identifiquen como paciente van a una **audiencia nueva y separada**, porque son un público completamente distinto (no tienen cuenta en Aliax, es contenido/alcance, no el producto).

## Alcance

### 1. Modelo de datos (backend)

```prisma
enum SubscriberStatus {
  PENDING
  CONFIRMED
  UNSUBSCRIBED
}

model NewsletterSubscriber {
  id            String            @id @default(cuid())
  email         String
  audience      CategoryAudience  // PACIENTES | TERAPEUTAS (enum ya existente, reutilizado)
  status        SubscriberStatus  @default(PENDING)
  confirmToken  String?           @unique
  confirmedAt   DateTime?
  createdAt     DateTime          @default(now())

  @@unique([email, audience])
}
```

Un mismo correo puede existir una vez por audiencia (p. ej. alguien que se suscribe primero como paciente y luego, en otro momento, también como terapeuta) pero no duplicado dentro de la misma.

### 2. `audienceService.ts` — generalizar

Las funciones `addContact`, `removeContact` y `sendBroadcast` dejan de usar `getAudienceId()` fijo y reciben el `audienceId` como parámetro. Se agrega `env.RESEND_AUDIENCE_ID_PACIENTES` (nueva variable de entorno — César la configura manualmente creando la Audience en el dashboard de Resend, mismo tipo de paso manual que ya hizo con `BLOG_DEPLOY_HOOK_URL`). Las rutas existentes de `/api/admin/newsletter*` pasan a aceptar qué audiencia usar (ver punto 5) en vez de asumir una sola.

### 3. Endpoints nuevos (backend, públicos — sin auth, con rate limiting reutilizando el modelo `RateLimit` de Prisma que ya usa `ai-matching.ts`, por IP+email en `/subscribe`)

- `POST /api/newsletter/subscribe` — body `{ email, audience }`. Crea (o reactiva si ya existía `UNSUBSCRIBED`) el registro `PENDING` con `confirmToken` random, envía el correo de confirmación. Si ya existe `CONFIRMED` para ese email+audiencia, responde éxito sin reenviar nada (evita que alguien spamee el botón).
- `GET /api/newsletter/confirm/:token` — marca `CONFIRMED`, llama `addContact(email, name, audienceId correspondiente)`, redirige a una página de "¡Listo, ya estás suscrito!" en el frontend.
- `GET /api/newsletter/unsubscribe/:token` — marca `UNSUBSCRIBED`, llama `removeContact`. (Resend también agrega su propio link de baja en los broadcasts; este endpoint cubre el caso de que alguien quiera darse de baja sin esperar a recibir un correo.)

### 4. Frontend público — banda "Suscríbete"

Nuevo bloque en `generate-blog.ts` (mismo archivo de Fase 1), al final de `/revista` y de cada `/revista/:slug`, con el estilo visual ya establecido (modo claro, DM Sans, acentos aguamarina): campo de correo, selector "Soy terapeuta" / "Busco ayuda psicológica", checkbox de consentimiento con link a `/privacidad`, botón enviar. Es un formulario estático que hace `fetch` a `POST /api/newsletter/subscribe` con JavaScript plano (mismo patrón que ya usa `renderPillsScript()` para los filtros — sin build step ni framework cliente).

Se agrega una línea sobre correos de newsletter/marketing al Aviso de Privacidad (`PrivacyPolicy.tsx`), que hoy no lo menciona (sí menciona Resend como proveedor, para los correos transaccionales).

### 5. CMS / AdminPanel — enviar un artículo como newsletter

- En `AdminRevista.tsx`, botón "Enviar como newsletter" en cada artículo **publicado**. Arma automáticamente: asunto = título del artículo, HTML = plantilla con imagen de portada + extracto + botón "Leer artículo completo →" apuntando a `https://www.aliax.io/revista/<slug>` (mismo patrón visual que los templates existentes de `emailService.ts`).
- Abre la sección Newsletter de `AdminPanel.tsx` con esos campos pre-llenados y foco en un selector nuevo de audiencia (Terapeutas / Pacientes / Ambas) que hoy no existe (hoy el botón dice "a TODA la audiencia" porque solo hay una).
- El envío sigue siendo 100% manual: el admin revisa, elige audiencia, confirma — nada se dispara solo al publicar.

### 6. Correos nuevos en `emailService.ts`

- `sendNewsletterConfirmationEmail(email, confirmUrl)` — "Confirma tu suscripción a Revista Aliax".
- El HTML del newsletter en sí (punto 5) usa el mismo helper de maquetado que ya existe para los templates actuales (header gradient, botón CTA), no uno nuevo desde cero.

## Fuera de alcance (explícito)

- Que terapeutas Pro suban sus propios artículos — Fase 3, no esta.
- Envío automático al publicar un artículo — siempre lo dispara el admin a mano.
- Analítica de aperturas/clics más allá de lo que el dashboard de Resend ya reporta.
- Exportar/importar listas de correos manualmente, segmentación más fina que terapeuta/paciente.
- Landing page dedicada para la suscripción (`/unete` existe en el código como página huérfana de una iniciativa anterior, no relacionada — no se reutiliza ni se enruta aquí).

## Verificación

Sin suite de tests en este repo. Verificación empírica:
1. Suscribirse de prueba como terapeuta y como paciente (correos desechables), confirmar que llega el correo de confirmación, dar clic y confirmar que el estado pasa a `CONFIRMED` y aparece en la Audience correcta de Resend (verificar en el dashboard de Resend, no solo en la DB).
2. Confirmar que un email ya `CONFIRMED` que intenta suscribirse de nuevo no reenvía el correo de confirmación.
3. Probar `unsubscribe` y confirmar que el contacto queda marcado como dado de baja en Resend.
4. Publicar un artículo de prueba, usar "Enviar como newsletter", confirmar que el formulario de AdminPanel se pre-llena correctamente y que el HTML generado se ve bien en un cliente de correo real (enviar una prueba a una cuenta propia antes de enviar a audiencia real).
5. Confirmar visualmente la banda "Suscríbete" en `/revista` y en un artículo, en claro y verificando que es legible (contraste) con la paleta actual.
6. Limpiar todos los datos de prueba (`NewsletterSubscriber` de prueba, contactos de prueba en Resend) al terminar, con verificación independiente de que quedaron borrados.
