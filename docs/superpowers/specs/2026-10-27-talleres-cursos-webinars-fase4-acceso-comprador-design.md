# Fase 4: Página de acceso del comprador — Design Spec

**Fecha:** 2026-10-27
**Depende de:** Fase 1 (Offering/Module CRUD, PR #4), Fase 2 (Question/ScoringRule CRUD + gates, PR #5/#6) y Fase 3 (checkout de invitado + pago, PR #7), todas mergeadas y desplegadas en producción.
**Sigue a:** `docs/superpowers/plans/2026-10-27-talleres-cursos-webinars-fase3-checkout.md`, sección "Qué sigue después de esta Fase 3".

## Resumen

Con el link de acceso que recibió por correo en la Fase 3 (`${FRONTEND_URL}/mi-compra/${accessToken}`), el comprador entra a su compra sin necesidad de cuenta ni login — el `accessToken` es, por sí solo, su credencial de acceso. Ve los módulos del Offering que compró (texto, video, PDF) con navegación libre, y si hay un módulo de cuestionario, puede responderlo una sola vez. Al enviarlo, el backend calcula su puntaje, lo compara contra las `ScoringRule` del módulo, y muestra el resultado en pantalla junto con un botón para descargar un PDF del resultado, generado al vuelo.

## Decisiones de alcance (ya acordadas)

1. **PDF descargable real**, generado con `pdfkit` (pura JS, sin navegador headless) al momento de la descarga — no se persiste ningún archivo.
2. **El cuestionario se responde una sola vez.** Una vez enviadas las respuestas, quedan fijas; no hay reenvío ni edición posterior.
3. **Navegación libre entre módulos.** Todos los módulos están disponibles desde el inicio, sin bloqueo secuencial ni seguimiento de progreso.
4. **Un `LIVE_WORKSHOP` muestra, además de sus módulos (si tiene), la fecha/hora (`scheduledAt`) y un botón para unirse usando `externalLink`.**
5. **Si el puntaje no cae en ningún rango de `ScoringRule` configurado (hueco entre reglas), se muestra un mensaje genérico de respaldo** en vez de fallar o dejar la pantalla en blanco. El profesional sigue siendo responsable de configurar rangos sin huecos.

## Backend

### Archivos nuevos

- **`backend/src/routes/access.ts`** — montado en `/api/access`, **sin middleware de auth** (el `accessToken` en la URL es la credencial, igual que el patrón ya usado para `offeringId` en las rutas públicas de Fase 1):

  - **`GET /:accessToken`** — resuelve `Purchase` por `accessToken` único (404 si no existe). Devuelve:
    - Datos básicos de la compra (`buyerName`, fecha de compra).
    - El `Offering` completo (título, descripción, tipo, `scheduledAt`/`externalLink` si es `LIVE_WORKSHOP`).
    - Sus `Module`, ordenados, con `textContent`/`fileUrl` según el tipo (TEXT/VIDEO/PDF) servidos completos (a diferencia de las rutas públicas de Fase 1/2, que no los sirven sin una compra verificada — aquí la verificación YA ES el `accessToken` válido).
    - Para cada módulo `QUESTIONNAIRE`: si ya existen `Answer` de este `Purchase` para sus preguntas, el resultado ya calculado (puntaje total + mensaje de la `ScoringRule` que aplica, o el mensaje genérico de respaldo); si no, las `Question`+`QuestionOption` para que el frontend construya el formulario.

  - **`POST /:accessToken/modules/:moduleId/answers`** — recibe `{ answers: [{ questionId, valueText?, valueOptionIds? }] }`. Valida, en orden:
    1. El `Purchase` existe (`accessToken` válido) y el `moduleId` pertenece a su `Offering`.
    2. El módulo es de tipo `QUESTIONNAIRE` (400 si no).
    3. No existen ya `Answer` de este `Purchase` para ninguna pregunta de este módulo (400 "Ya respondiste este cuestionario" si las hay — refuerza la decisión #2).
    4. El payload tiene exactamente una respuesta por cada `Question` del módulo, ni de más ni de menos (400 si falta alguna o sobra alguna).
    5. Cada respuesta tiene la forma correcta según el `type` de su pregunta: `FREE_TEXT` requiere `valueText` no vacío y ningún `valueOptionIds`; `SINGLE_CHOICE` requiere exactamente un id en `valueOptionIds` (y ningún `valueText`); `MULTIPLE_CHOICE` requiere uno o más ids en `valueOptionIds` (y ningún `valueText`); todo id en `valueOptionIds` debe pertenecer a esa pregunta.

    Si todo valida: crea las filas `Answer`, calcula el puntaje total (ver sección "Cálculo de puntaje"), busca la `ScoringRule` que aplica, y responde con `{ totalScore, message }`.

  - **`GET /:accessToken/modules/:moduleId/result.pdf`** — solo si ya hay `Answer` guardadas para ese módulo+comprador (404 si no). Genera el PDF (ver sección "PDF") y lo transmite con `Content-Type: application/pdf` y `Content-Disposition: attachment`.

- **`backend/src/services/scoringService.ts`** — una función pura, sin acceso a base de datos, que recibe las `Answer` ya guardadas (con sus `QuestionOption.value` ya resueltos) y las `ScoringRule` del módulo, y devuelve `{ totalScore: number, message: string }`. El `totalScore` es la suma de `value` de todas las `QuestionOption` seleccionadas en preguntas `SINGLE_CHOICE`/`MULTIPLE_CHOICE` (las `FREE_TEXT` no suman). El `message` es el de la primera `ScoringRule` donde `minScore <= totalScore <= maxScore`, o un mensaje genérico fijo (`"Gracias por completar el cuestionario."`) si ninguna coincide.

- **`backend/src/services/pdfService.ts`** — una función que recibe `{ offeringTitle, buyerName, totalScore, message }` y devuelve un `Buffer` con el PDF generado vía `pdfkit`: una sola página con el título del Offering, el nombre del comprador, el puntaje, y el mensaje de resultado.

### Cierre de un TODO heredado de Fase 1: las rutas públicas de Offering filtran contenido pagado

`GET /api/offerings/:id` y `GET /api/offerings/:offeringId/modules` (ambas públicas, sin auth) sirven hoy `textContent`/`fileUrl` completos de **todos** los módulos de un Offering publicado, sin verificar que quien pregunta haya comprado nada — el comentario `TODO(Fase 3/4 — checkout y gating de acceso)` ya presente en `backend/src/routes/offerings.ts` desde Fase 1 dice explícitamente: *"en cuanto exista Purchase, hay que dejar de incluir fileUrl/textContent aquí para quien no haya comprado"*. Ahora que `Purchase` existe y se usa de verdad (Fase 3) y esta fase construye el flujo que depende de que el contenido esté protegido, ese gatillo ya se cumplió — dejarlo sin cerrar significaría que cualquiera puede ver gratis, vía esas dos rutas públicas, el mismo contenido que esta fase está construyendo para entregar solo a quien pagó.

Esta fase cierra ese TODO: en ambas rutas, cuando el Offering está `PUBLISHED` y quien pregunta **no** es su dueño autenticado (mismo chequeo `isOwner` que `GET /:id` ya usa para decidir si mostrar un Offering no publicado), cada módulo se sirve sin `textContent` ni `fileUrl` — se mantienen `id`, `title`, `description`, `type`, `order`. El dueño autenticado sigue viendo todo completo, igual que hoy.

### Modelo de datos

No requiere cambios de schema — `Purchase`, `Module`, `Question`, `QuestionOption`, `ScoringRule` y `Answer` ya existen completos desde Fase 1/2. Esta fase es la primera que efectivamente **lee** `Question`/`QuestionOption`/`ScoringRule` para calcular algo (hasta ahora solo se creaban/editaban) y la primera que **escribe** en `Answer` (el modelo existe desde Fase 1 pero nunca se usó).

## Frontend

- **Página nueva**, ruta `/mi-compra/:accessToken` (fuera de `ProtectedRoute`, mismo nivel que `/oferta/:offeringId`): `frontend/src/pages/AccessPurchase.tsx`. Llama a `GET /api/access/:accessToken` al cargar.
  - Si el `Offering` es `LIVE_WORKSHOP`, muestra arriba de todo la fecha/hora formateada y un botón "Unirse" (`externalLink`), mismo patrón visual ya usado en `OfferingPublic.tsx` para mostrar `scheduledAt`.
  - Debajo, la lista de módulos, cada uno renderizado según su tipo: `TEXT` muestra `textContent` directo; `VIDEO` un `<video controls src={fileUrl}>`; `PDF` un enlace de descarga a `fileUrl` (el archivo ya vive en Cloudinary, no hay que generarlo); `QUESTIONNAIRE` muestra el formulario (una pregunta a la vez o todas juntas — detalle de implementación, no de diseño) si no se ha respondido, o el resultado (puntaje + mensaje + botón "Descargar PDF" apuntando a `GET /api/access/:accessToken/modules/:moduleId/result.pdf`) si ya se respondió.

## Casos especiales y límites conocidos

- **No hay forma de recuperar el `accessToken` si el comprador pierde el correo.** Fuera de alcance de esta fase (requeriría, por ejemplo, un "reenviar mi acceso" que pida el correo y lo valide contra `Purchase.buyerEmail` — se puede agregar después si se vuelve un problema real).
- **El `accessToken` es la única barrera de acceso** (es un UUID v4 generado con `crypto.randomUUID()`, no adivinable por fuerza bruta en la práctica) — quien tenga el link, tiene acceso. Mismo nivel de seguridad que cualquier "magic link" sin contraseña; aceptado desde el diseño original de Fase 3.
- **Un módulo `QUESTIONNAIRE` sin ninguna `ScoringRule` configurada** (válido si solo tiene preguntas `FREE_TEXT`, según el gate de Fase 2) simplemente no tiene nada que puntuar — el resultado mostrado es puntaje 0 y el mensaje genérico de respaldo. No es un error.

## Fuera de alcance (explícito)

- Progreso o bloqueo secuencial entre módulos.
- Reenvío o edición de respuestas ya enviadas.
- Validación que impida publicar/comprar un cuestionario con huecos en sus rangos de `ScoringRule` (ya se decidió no bloquear, solo usar el mensaje genérico).
- Diseño elaborado del PDF (logo, colores de marca del profesional, etc.) — una página simple de texto.
- Reenvío del link de acceso si el comprador lo pierde.
- Cualquier cambio al checkout o al flujo de pago (Fase 3, ya cerrada).

## Verificación

Este backend no tiene suite de tests. La verificación será empírica contra el dev server local + datos de prueba desechables: crear un `Purchase` de prueba directo vía Prisma (sin pasar por checkout real, ya que Fase 3 ya está verificada), responder un cuestionario, confirmar el cálculo de puntaje contra rangos de `ScoringRule` de prueba, confirmar que un segundo envío se rechaza, y confirmar que el PDF se genera y descarga correctamente.
