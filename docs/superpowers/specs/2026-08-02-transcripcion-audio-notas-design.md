# Transcripción de audio → nota de sesión (MVP: subir archivo)

## Contexto

Aliax ya genera notas de evolución estructuradas (LIBRE/SOAP/DIAMANTE/NECS) a partir de una descripción escrita por el terapeuta (`POST /api/ai-notes/generate`, ver `backend/src/routes/ai-notes.ts`). Este feature agrega una puerta de entrada alterna: en vez de escribir la descripción a mano, el terapeuta sube el audio de la sesión y el sistema lo transcribe (con separación de hablantes) directo al mismo cuadro de texto que ya alimenta la generación de nota. No se toca `/ai-notes/generate` ni el modelo de nota — solo se resuelve cómo llega el texto hasta ahí.

Este módulo es también el producto ancla de PsicoSuite (ver memoria `project_psicosuite`): la parte de estructurar la nota clínica ya existe y funciona; lo único nuevo es la transcripción.

**Fuera de alcance de este MVP:** grabar audio en vivo desde el navegador (`MediaRecorder`) — se hace en una fase posterior una vez validado este flujo de subir archivo.

## Arquitectura

- El audio **nunca se persiste en Aliax ni en Cloudinary**. Se recibe en memoria (multer), se sube directo a AssemblyAI, se transcribe, y en cuanto se recupera el texto se borra del lado de AssemblyAI (`DELETE /v2/transcript/:id`). Esto resuelve la política de retención (borrar tras transcribir) sin necesidad de storage ni jobs de limpieza propios.
- **Flujo en dos pasos (asíncrono), no una sola llamada síncrona:** una sesión de 45-60 min puede tardar varios minutos en transcribirse — más de lo que aguanta una función serverless de Vercel en una sola petición HTTP. Por eso:
  1. `POST /api/audio-notes/transcribe/:clientId` sube el audio y arranca el trabajo en AssemblyAI, responde de inmediato con `{ jobId }`.
  2. El frontend hace polling a `GET /api/audio-notes/transcribe/:jobId` cada 5s hasta que el estado sea `completed` o `failed`.
- Proveedor de transcripción: **AssemblyAI** (transcripción + diarización — separación de hablantes — en una sola llamada). Se descartó Whisper de OpenAI solo porque no diariza por sí mismo; habría requerido un segundo proveedor/paso solo para eso.
- Se usa `axios` (ya es dependencia del backend) para hablar con la API REST de AssemblyAI — no se agrega SDK nuevo.

## Modelo de datos

Nueva tabla en `schema.prisma`:

```prisma
model AudioTranscriptionJob {
  id                 String   @id @default(uuid())
  clientId           String
  userId             String
  assemblyAiId       String
  status             String   // 'processing' | 'completed' | 'failed'
  consentConfirmedAt DateTime
  errorMessage       String?
  createdAt          DateTime @default(now())
  client             Client   @relation(fields: [clientId], references: [id])
}
```

Solo rastrea el job mientras se transcribe y sirve para verificar ownership (`userId`) al consultar el estado. No guarda el texto transcrito de forma permanente — ese vive en la respuesta al frontend y termina en la nota solo si el terapeuta la guarda.

## Backend

**`backend/src/services/assemblyAiService.ts` (nuevo):**
- `uploadAndStartTranscription(buffer: Buffer): Promise<string>` — `POST /v2/upload` con el buffer, luego `POST /v2/transcript` con `{ audio_url, speaker_labels: true, language_code: 'es' }`. Regresa el `assemblyAiId`.
- `getTranscriptionResult(assemblyAiId: string)` — `GET /v2/transcript/:id`.
  - Si `status === 'completed'`: construye el texto desde `utterances` (formato `Hablante A: ...\nHablante B: ...`), llama `DELETE /v2/transcript/:id` (no bloqueante — si el borrado falla, se registra en logs pero no impide devolver el texto al usuario), regresa `{ status: 'completed', transcript }`.
  - Si `status === 'error'`: regresa `{ status: 'failed', errorMessage }`.
  - Si sigue en proceso: regresa `{ status: 'processing' }`.
- Nueva variable de entorno `ASSEMBLYAI_API_KEY` en `backend/src/config/env.ts`.

**`backend/src/middleware/upload.ts`:** nuevo `uploadAudio` (multer memoria), tipos permitidos `audio/mpeg, audio/mp4, audio/wav, audio/ogg`, límite 100MB (~1.5-2h de audio comprimido — cubre cualquier sesión real y limita el costo de un archivo desproporcionado).

**`backend/src/routes/audio-notes.ts` (nuevo):**
- `POST /api/audio-notes/transcribe/:clientId`
  - `authMiddleware` + verificación server-side de `featureOverrides.audio_notes || isPro` (a diferencia de `ai-notes.ts`, aquí sí se valida el plan en el backend, porque cada minuto de audio tiene costo variable real — no basta con ocultar el botón en el frontend).
  - Requiere `consentConfirmed: true` en el body; sin esto, `400` antes de tocar AssemblyAI.
  - Verifica ownership del `clientId` (mismo patrón `verifyClientOwnership` que ya usan `ai-notes.ts` y `session-notes.ts`).
  - Sube a AssemblyAI, crea el `AudioTranscriptionJob` con `consentConfirmedAt: new Date()`, responde `{ jobId }`.
- `GET /api/audio-notes/transcribe/:jobId`
  - `authMiddleware`. Verifica `job.userId === req.userId` (403 si no coincide).
  - Si el job ya está `completed`/`failed` en DB, responde eso directo.
  - Si sigue `processing`, consulta AssemblyAI vía `getTranscriptionResult`, actualiza el job en DB según el resultado, responde `{ status, transcript? , errorMessage? }`.

**Feature gating (`backend/src/routes/admin.ts`, `frontend/src/pages/AdminPanel.tsx`):**
- Se agrega `'audio_notes'` a `VALID_KEYS` en `admin.ts`.
- Se agrega `{ key: 'audio_notes', label: 'Transcripción de audio' }` a `FEATURE_LABELS` en `AdminPanel.tsx`.
- Esto permite activar el módulo por usuario individual desde el panel admin sin depender del plan Pro completo — es el mecanismo que hace posible venderlo por separado a un cliente de PsicoSuite.

## Frontend

**Nuevo hook `useAudioTranscription(clientId)`** (junto a `usePatients.ts` o archivo propio): encapsula subir el archivo, iniciar el polling y exponer `{ status, transcript, error, startTranscription }`. Mantiene la lógica de polling fuera de `SessionNotesFeed.tsx`.

**`frontend/src/components/patients/SessionNotesFeed.tsx`:** dentro del cuadro "Generar con IA", arriba del `textarea` de `aiDraft` que ya existe, nuevo bloque gateado por `useFeature('audio_notes')` (gate independiente de `aiNotes`/`canUseAI` — un terapeuta puede tener uno sin el otro):

- **Sin acceso:** mismo patrón visual de candado que ya usa el bloque `canUseAI`, con copy propio ("Sube el audio de tu sesión y la IA transcribe y redacta la nota por ti").
- **Con acceso:**
  1. Botón "Subir audio de la sesión" (input file oculto, `accept="audio/*"`).
  2. Al seleccionar archivo aparece el checkbox obligatorio: "Confirmo que el paciente dio su consentimiento para esta grabación". El envío queda deshabilitado hasta marcarlo.
  3. Al confirmar: `POST /audio-notes/transcribe/:clientId` (multipart, incluye `consentConfirmed: true`) → recibe `jobId`, arranca el polling.
  4. Mientras transcribe: estado "Transcribiendo tu audio… puede tardar unos minutos" con spinner; el `textarea` de `aiDraft` queda deshabilitado.
  5. Al completar: `setAiDraft(transcript)` — cae en el mismo textarea editable de siempre. El terapeuta puede corregir texto/etiquetas de hablante y luego presiona "Generar nota" sin ningún cambio en ese flujo.
  6. Si falla: mensaje de error, se limpia el estado para permitir reintentar.
  7. El polling se abandona tras ~10 minutos sin `completed`/`failed`, mostrando "esto está tardando más de lo normal" con opción de reintentar.

## Manejo de errores

- **Formato/tamaño inválido:** rechazado por `fileFilter`, mensaje claro (mismo patrón que `upload.ts`).
- **Consentimiento no marcado:** `400`, nunca se gasta en transcribir sin el checkbox.
- **Sin acceso al feature:** `403` server-side aunque se manipule la petición directamente.
- **Falla al subir/iniciar en AssemblyAI:** `502`, mensaje genérico de reintento; no se crea el `AudioTranscriptionJob`.
- **AssemblyAI regresa error:** se guarda `errorMessage`, el job queda `failed`, frontend muestra el error y permite reintentar.
- **Ownership incorrecto al consultar estado:** `403`.
- **Polling sin fin:** abandono client-side a los ~10 min.
- **Falla el borrado post-transcripción en AssemblyAI:** no bloquea la respuesta al usuario, solo se registra en logs — prioriza que el terapeuta nunca pierda su transcripción sobre la limpieza perfecta.

## Testing

Aliax no tiene infraestructura de pruebas automatizadas hoy (sin Jest/Vitest, sin `.test.`/`.spec.`, sin script `test` en ningún `package.json`). Siguiendo el patrón ya establecido en el proyecto, no se introduce un framework de testing solo para este feature. Verificación manual en navegador antes de dar por terminado:

1. Subir audio corto (1-2 min, 2 voces) sin marcar consentimiento → botón bloqueado.
2. Marcarlo, subir → ver "Transcribiendo…" → texto con hablantes cae en el textarea.
3. Editar el texto y generar la nota normal → confirmar que `/ai-notes/generate` sigue funcionando igual.
4. Subir un archivo de formato no soportado → mensaje de error claro.
5. Usuario sin `audio_notes` activo → candado en frontend y `403` llamando el endpoint directo.
6. Activar `audio_notes` desde AdminPanel para ese usuario → se desbloquea sin romper la sesión.
7. Simular fallo (ej. `ASSEMBLYAI_API_KEY` inválida) → error visible, job no queda colgado.

## Variables de entorno nuevas

- `ASSEMBLYAI_API_KEY` — clave de API de AssemblyAI (backend, Vercel env vars de producción).
