# Arreglo de la carrera de despliegues de producción (proyecto "aura")

## Contexto

`/revista` en producción mostraba de forma intermitente "Perfil no encontrado" (el estado 404 de la SPA de React) en vez de la página real de Revista. Reportado dos veces por César, incluyendo una vez en ventana de incógnito (descarta caché del navegador).

Causa raíz confirmada: tres mecanismos disparan despliegues de producción del proyecto "aura" (frontend, `www.aliax.io`/`aliax.io`) sin coordinarse entre sí:

1. Auto-deploy nativo de GitHub en cada push a `master` (rama de producción).
2. Despliegues manuales por CLI (`vercel --prod`).
3. Un Deploy Hook de Vercel ("revista-publish", rama `master`) que el backend dispara sin esperar la respuesta (`triggerBlogRebuild()` en `backend/src/routes/articles.ts`) cada vez que se publica/despublica/elimina un artículo, o se usa "Publicar cambios en el sitio".

Vercel alía el dominio de producción al despliegue que termina de construir primero, no al que se disparó primero. Con tres disparadores concurrentes y duraciones de build variables, un commit más viejo puede terminar después y "regresar" el dominio a una versión vieja momentáneamente, hasta que otro despliegue lo corrija.

Dos arreglos rápidos fueron investigados y descartados la noche del 2026-11-04/05: cualquier variante de "Ignored Build Step" (Settings → Build and Deployment) se aplica por igual a los tres disparadores, incluyendo el Deploy Hook — como publicar un artículo no genera ningún commit nuevo, un chequeo de `git diff` siempre vería "sin cambios" para esos despliegues y los cancelaría en silencio, rompiendo "Publicar cambios en el sitio". Ambas variantes probadas fueron revertidas sin dejar nada roto.

## Objetivo

Eliminar la carrera por completo, sin romper "Publicar cambios en el sitio" ni cambiar la experiencia del admin al publicar contenido, y sin afectar ningún otro proyecto (backend de Aliax, PsiqueCreativa, Realize) ni la navegación normal de usuarios en el resto de la app Aliax (que es una SPA servida igual sin importar este cambio).

## Diseño

### 1. Desactivar auto-asignación de dominio (cambio de configuración, una sola vez)

En el proyecto "aura" → Settings → Environments → desactivar **"Auto-assign Custom Production Domains"**.

Efecto: ningún despliegue nuevo (de cualquier origen) actualiza `www.aliax.io`/`aliax.io` automáticamente al terminar de construir. Cada uno queda en estado `READY` pero sin tráfico, hasta que algo lo promueve explícitamente vía la API de Vercel (`POST /v10/projects/{projectId}/promote/{deploymentId}`) o el comando `vercel promote`.

Esto es reversible al instante (es un toggle) y no afecta a ningún otro proyecto de Vercel (cada proyecto tiene su propia configuración independiente) ni a la SPA de Aliax mientras una versión esté sirviendo tráfico.

### 2. Nuevas variables de entorno (backend, proyecto "backend" en Vercel)

- `VERCEL_API_TOKEN`: Access Token de Vercel, generado por César en Settings → Tokens de su cuenta, con permiso de lectura de deployments y de promoción sobre el proyecto "aura". No se genera automáticamente — César lo crea y lo pega.
- `VERCEL_PROJECT_ID`: `prj_huCsdxxSMJlDtV7sYpqmnBQSG0PT` (ID del proyecto "aura", ya conocido).
- `VERCEL_TEAM_ID`: `cesars-projects-ddd06b7a`. Este valor es el slug visible en las URLs del dashboard, no necesariamente el `teamId` real (que normalmente empieza con `team_`). Antes de escribir el código, verificar contra la API de Vercel (`GET /v2/teams?slug=cesars-projects-ddd06b7a` con el token) cuál es el `id` real del team, y usar ese `id` como query param `teamId` en las llamadas (no `slug`, que es un parámetro alternativo pero menos confiable para llamadas programáticas).

Mismo patrón que `RESEND_AUDIENCE_ID_PACIENTES`: agregar a `backend/src/config/env.ts` y a Vercel (proyecto backend, Production).

### 3. Cambio de código: `triggerBlogRebuild()` espera y promueve

Ubicación: `backend/src/routes/articles.ts`.

Comportamiento actual: dispara el Deploy Hook (con un reintento), y si responde `ok`, actualiza `lastRebuiltAt`. Se llama con `await` desde `publish-site-changes`, y sin `await` (fire-and-forget) desde publish/unpublish/delete.

Comportamiento nuevo:

- El disparo del Deploy Hook (incluyendo el reintento) no cambia.
- Después de un disparo exitoso, el trabajo de esperar+promover se envuelve en `waitUntil()` (paquete `@vercel/functions`), el mecanismo oficial de Vercel para trabajo en segundo plano garantizado después de responder al cliente — evita el mismo riesgo de "la función se congela a medias" que causó el bug de los correos de confirmación no enviados.
- Dentro de ese trabajo en segundo plano:
  1. Hace polling cada 3 segundos (máximo 150 segundos en total) a `GET /v6/deployments` filtrando por el proyecto "aura" y `target=production`, buscando un deployment con `createdAt` posterior al momento en que se disparó el hook.
  2. Cuando aparece uno, sigue haciendo polling de `GET /v13/deployments/{id}` hasta que su `readyState` sea `READY` (o hasta agotar el tiempo total de 150s).
  3. Si llega a `READY`: llama `POST /v10/projects/{VERCEL_PROJECT_ID}/promote/{deploymentId}?teamId={VERCEL_TEAM_ID}` con el token. Si la llamada falla, se reintenta una vez; si vuelve a fallar, se registra en logs (`console.warn`) y no se reintenta más.
  4. Si el deployment llega a `ERROR`/`CANCELED`, o se agota el tiempo de espera sin encontrar uno `READY`: se registra en logs y no se promueve nada. El sitio se queda en la última versión promovida (nunca se cae ni muestra contenido a medias).
  5. `lastRebuiltAt` se actualiza solo cuando la promoción fue exitosa (antes se actualizaba solo con el disparo del hook) — refleja con más precisión cuándo el sitio realmente quedó al día, para el indicador "Cambios sin publicar" del CMS.
- Los 4 call sites existentes (`publish-site-changes`, publish, unpublish, delete) mantienen su timing de respuesta actual al admin — ninguno espera la promoción completa, todos responden rápido como hoy. La diferencia es que el trabajo de fondo ahora es seguro (vía `waitUntil`) en vez de un fire-and-forget sin garantías.

### 4. Flujo manual de despliegue (para quien opere el CLI, p. ej. Claude)

Dejar de usar `vercel --prod` simple para el frontend, porque ese flag ignora la configuración de auto-asignación desactivada y promueve igual. En su lugar: `vercel --prod --skip-domain` para construir sin promover, seguido de `vercel promote <url>` cuando se confirme que es la versión correcta. Esto es una convención operativa, no requiere cambio de código.

### 5. Qué NO cambia

- El backend (`api.aliax.io`) tiene su propio proyecto de Vercel, con su propia configuración — no se toca.
- PsiqueCreativa y Realize son proyectos/repos completamente separados — no se tocan.
- La navegación de usuarios en el resto de Aliax (dashboard, perfiles, agenda, chat, módulos de IA) no cambia: la SPA se sirve igual sin importar cuándo se promovió el último build.
- El tiempo que tarda un artículo publicado en verse en vivo no cambia de forma perceptible (sigue siendo el tiempo de build real, ~20-35s, más unos segundos de verificación).
- Este cambio no reduce la cantidad de builds que dispara cada push a `master` — solo hace que promoverlos sea seguro. Reducir el volumen de builds (filtrar por carpeta `frontend/`) sigue siendo una mejora aparte, de costo, no de seguridad, no incluida en este arreglo.

## Fuera de alcance

- Reducir la frecuencia de despliegues disparados por push de Git (mejora de costo, no de corrección — discutida y pospuesta la noche anterior).
- Los 3 pendientes de Newsletter (campo de nombre obligatorio, aviso de nuevo suscriptor, pestaña de suscriptores en Admin) — se retoman después de este arreglo.
