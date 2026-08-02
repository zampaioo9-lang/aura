# Transcripción de audio → nota de sesión (MVP: subir archivo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el terapeuta suba el audio de una sesión, se transcriba con separación de hablantes vía AssemblyAI, y el texto caiga en el cuadro "Generar con IA" que ya alimenta la generación de nota de evolución existente (`/api/ai-notes/generate`), sin tocar ese endpoint.

**Architecture:** Flujo en dos pasos asíncronos (subir+iniciar / consultar estado por polling) porque una transcripción puede tardar minutos — más de lo que aguanta una función serverless en una sola petición. El audio nunca se persiste en Aliax; se sube directo a AssemblyAI y se borra ahí en cuanto se recupera el texto. Nota de desviación deliberada respecto al hábito general de TDD: este repo no tiene ninguna infraestructura de pruebas automatizadas (confirmado, sin Jest/Vitest en ningún `package.json`) y el spec aprobado (`docs/superpowers/specs/2026-08-02-transcripcion-audio-notas-design.md`) decidió explícitamente verificación manual en navegador en vez de introducir un framework nuevo solo para este feature — cada tarea de este plan usa ese mismo criterio de verificación (build/tsc + curl/navegador) en lugar de tests unitarios.

**Tech Stack:** Express + Prisma + TypeScript (backend), React + TypeScript + axios (frontend), AssemblyAI API REST (vía axios, sin SDK nuevo).

---

## Task 0: Gap de wiring — hacer `aiNotes` controlable desde AdminPanel

**Por qué este task existe:** el cuadro "Generar con IA" (donde va a caer el texto transcrito) está gateado por `useFeature('aiNotes')` en `SessionNotesFeed.tsx:263`. Hoy esa key **no** está en `VALID_KEYS` de `admin.ts` ni en `FEATURE_LABELS` de `AdminPanel.tsx` — es decir, `aiNotes` solo se activa con `isPro`, el admin no puede otorgarlo individualmente. Sin este ajuste, un cliente de PsicoSuite al que se le active `audio_notes` pero no tenga el plan Pro completo de Aliax no vería ni el cuadro donde cae la transcripción. Es requisito para el caso de uso explícito de vender el módulo por separado a psicólogos.

**Files:**
- Modify: `backend/src/routes/admin.ts:194-197`
- Modify: `frontend/src/pages/AdminPanel.tsx:381-389`

- [ ] **Step 1: Agregar `aiNotes` a `VALID_KEYS`**

En `backend/src/routes/admin.ts`, reemplazar:

```typescript
    const VALID_KEYS = [
      'historia_clinica', 'terapia_pareja', 'templates_premium',
      'pacientes', 'analytics', 'agenda', 'colores_premium',
    ];
```

por:

```typescript
    const VALID_KEYS = [
      'historia_clinica', 'terapia_pareja', 'templates_premium',
      'pacientes', 'analytics', 'agenda', 'colores_premium', 'aiNotes',
    ];
```

- [ ] **Step 2: Agregar `aiNotes` a `FEATURE_LABELS`**

En `frontend/src/pages/AdminPanel.tsx`, reemplazar:

```typescript
  const FEATURE_LABELS: { key: string; label: string }[] = [
    { key: 'historia_clinica',  label: 'HC Individual' },
    { key: 'terapia_pareja',    label: 'HC de Pareja' },
    { key: 'pacientes',         label: 'Pacientes' },
    { key: 'analytics',         label: 'Analytics' },
    { key: 'agenda',            label: 'Agenda' },
    { key: 'templates_premium', label: 'Templates Premium' },
    { key: 'colores_premium',   label: 'Colores Premium' },
  ];
```

por:

```typescript
  const FEATURE_LABELS: { key: string; label: string }[] = [
    { key: 'historia_clinica',  label: 'HC Individual' },
    { key: 'terapia_pareja',    label: 'HC de Pareja' },
    { key: 'pacientes',         label: 'Pacientes' },
    { key: 'analytics',         label: 'Analytics' },
    { key: 'agenda',            label: 'Agenda' },
    { key: 'templates_premium', label: 'Templates Premium' },
    { key: 'colores_premium',   label: 'Colores Premium' },
    { key: 'aiNotes',           label: 'Notas con IA' },
  ];
```

- [ ] **Step 3: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

Run: `cd frontend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/admin.ts frontend/src/pages/AdminPanel.tsx
git commit -m "feat: permitir activar Generar con IA (aiNotes) por usuario desde AdminPanel"
```

---

## Task 1: Modelo de datos — `AudioTranscriptionJob`

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar el modelo y la relación en Client**

En `backend/prisma/schema.prisma`, dentro de `model Client { ... }`, agregar la línea de relación junto a las demás (después de `sessionNotes SessionNote[]`):

```prisma
  sessionNotes          SessionNote[]
  audioTranscriptionJobs AudioTranscriptionJob[]
```

Justo después del cierre de `model Client { ... }` (después del bloque de `ClinicalHistory`/`ClinicalHistoryCouple`/`SessionNote`, en cualquier punto del archivo es válido en Prisma, pero para mantener el orden junto a `SessionNote` colócalo inmediatamente después del modelo `SessionNote` ya existente), agregar el nuevo modelo:

```prisma
model AudioTranscriptionJob {
  id                 String   @id @default(cuid())
  clientId           String
  client             Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  userId             String
  assemblyAiId       String
  status             String   @default("processing")
  consentConfirmedAt DateTime
  errorMessage       String?
  createdAt          DateTime @default(now())

  @@index([clientId])
  @@index([userId])
}
```

- [ ] **Step 2: Crear la migración**

Run: `cd backend && npx prisma migrate dev --name add_audio_transcription_job`
Expected: crea `prisma/migrations/<timestamp>_add_audio_transcription_job/migration.sql` y termina con "Your database is now in sync with your schema."

- [ ] **Step 3: Regenerar el cliente de Prisma**

Run: `cd backend && npx prisma generate`
Expected: "Generated Prisma Client" sin errores.

- [ ] **Step 4: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores (confirma que `prisma.audioTranscriptionJob` ya existe en el cliente generado).

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat: agregar modelo AudioTranscriptionJob"
```

---

## Task 2: Variable de entorno `ASSEMBLYAI_API_KEY`

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`
- Modify: `backend/.env` (local, no se commitea)

- [ ] **Step 1: Agregar la variable a `env.ts`**

En `backend/src/config/env.ts`, agregar junto a las demás claves de servicios externos (después de la línea de `RESEND_WEBHOOK_SECRET`):

```typescript
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY || '',
```

- [ ] **Step 2: Documentar en `.env.example`**

En `backend/.env.example`, agregar al final:

```
# AssemblyAI (transcripción de audio con diarización)
ASSEMBLYAI_API_KEY="your-assemblyai-api-key"
```

- [ ] **Step 3: Agregar la key real al `.env` local**

Crear una cuenta en AssemblyAI (https://www.assemblyai.com/), obtener la API key del dashboard, y agregar en `backend/.env`:

```
ASSEMBLYAI_API_KEY="<key real>"
```

- [ ] **Step 4: Commit (solo los archivos versionados)**

```bash
git add backend/src/config/env.ts backend/.env.example
git commit -m "feat: agregar variable de entorno ASSEMBLYAI_API_KEY"
```

---

## Task 3: Servicio de AssemblyAI

**Files:**
- Create: `backend/src/services/assemblyAiService.ts`

- [ ] **Step 1: Escribir el servicio completo**

```typescript
import axios from 'axios';
import { env } from '../config/env';

const BASE_URL = 'https://api.assemblyai.com/v2';

function authHeaders() {
  return { authorization: env.ASSEMBLYAI_API_KEY };
}

export async function uploadAndStartTranscription(buffer: Buffer): Promise<string> {
  const uploadRes = await axios.post(`${BASE_URL}/upload`, buffer, {
    headers: { ...authHeaders(), 'content-type': 'application/octet-stream' },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  const audioUrl = uploadRes.data.upload_url as string;

  const transcriptRes = await axios.post(
    `${BASE_URL}/transcript`,
    { audio_url: audioUrl, speaker_labels: true, language_code: 'es' },
    { headers: { ...authHeaders(), 'content-type': 'application/json' } }
  );
  return transcriptRes.data.id as string;
}

export type TranscriptionResult =
  | { status: 'processing' }
  | { status: 'completed'; transcript: string }
  | { status: 'failed'; errorMessage: string };

interface AssemblyAiUtterance { speaker: string; text: string; }

export async function getTranscriptionResult(assemblyAiId: string): Promise<TranscriptionResult> {
  const res = await axios.get(`${BASE_URL}/transcript/${assemblyAiId}`, {
    headers: authHeaders(),
  });
  const data = res.data;

  if (data.status === 'error') {
    return { status: 'failed', errorMessage: data.error ?? 'Error desconocido de transcripción' };
  }

  if (data.status !== 'completed') {
    return { status: 'processing' };
  }

  const utterances = data.utterances as AssemblyAiUtterance[] | null;
  const transcript = utterances?.length
    ? utterances.map(u => `Hablante ${u.speaker}: ${u.text}`).join('\n')
    : ((data.text as string) ?? '');

  try {
    await axios.delete(`${BASE_URL}/transcript/${assemblyAiId}`, { headers: authHeaders() });
  } catch (err) {
    console.error('[AssemblyAI] No se pudo borrar el transcript tras recuperarlo:', err);
  }

  return { status: 'completed', transcript };
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual del servicio contra la API real**

Con `ASSEMBLYAI_API_KEY` ya configurada en `.env`, crear un script temporal para probar el servicio de punta a punta antes de conectarlo a la ruta HTTP (evita depurar dos capas nuevas a la vez).

Crear `backend/scratch-test-assemblyai.ts` (archivo temporal, no se commitea):

```typescript
import fs from 'fs';
import { uploadAndStartTranscription, getTranscriptionResult } from './src/services/assemblyAiService';

async function main() {
  const buffer = fs.readFileSync(process.argv[2]); // ruta a un audio corto de prueba
  const id = await uploadAndStartTranscription(buffer);
  console.log('assemblyAiId:', id);

  let result = await getTranscriptionResult(id);
  while (result.status === 'processing') {
    console.log('procesando...');
    await new Promise(r => setTimeout(r, 5000));
    result = await getTranscriptionResult(id);
  }
  console.log(JSON.stringify(result, null, 2));
}

main();
```

Run: `cd backend && npx tsx scratch-test-assemblyai.ts ruta/a/audio-corto-2-voces.mp3`
Expected: imprime `assemblyAiId`, luego el resultado final con `status: 'completed'` y un `transcript` con líneas `Hablante A: ...` / `Hablante B: ...`.

Borrar el archivo temporal al terminar: `rm backend/scratch-test-assemblyai.ts`

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/assemblyAiService.ts
git commit -m "feat: agregar servicio de transcripción con diarización via AssemblyAI"
```

---

## Task 4: Middleware de subida de audio

**Files:**
- Modify: `backend/src/middleware/upload.ts`

- [ ] **Step 1: Agregar `uploadAudio`**

En `backend/src/middleware/upload.ts`, agregar junto a las constantes existentes (después de `ALLOWED_VIDEO_TYPES`):

```typescript
const AUDIO_MAX_SIZE = 100 * 1024 * 1024; // 100MB (~1.5-2h de audio comprimido)
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/x-m4a'];
```

Y agregar al final del archivo, después de `uploadVideo`:

```typescript
export const uploadAudio = multer({
  storage,
  limits: { fileSize: AUDIO_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      return cb(new AppError(400, 'Solo se permiten audios MP3, MP4, WAV, OGG o M4A'));
    }
    cb(null, true);
  },
}).single('file');
```

- [ ] **Step 2: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/middleware/upload.ts
git commit -m "feat: agregar middleware multer para subida de audio"
```

---

## Task 5: Ruta `audio-notes`

**Files:**
- Create: `backend/src/routes/audio-notes.ts`
- Modify: `backend/src/index.ts:25` (import) y `backend/src/index.ts:62` (registro)

- [ ] **Step 1: Escribir la ruta completa**

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { uploadAudio } from '../middleware/upload';
import { AppError } from '../middleware/errorHandler';
import { isProUser } from '../lib/planUtils';
import { uploadAndStartTranscription, getTranscriptionResult } from '../services/assemblyAiService';

const router = Router();
const prisma = new PrismaClient();

async function verifyClientOwnership(clientId: string, userId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, 'Paciente no encontrado');
  if (client.userId !== userId) throw new AppError(403, 'No autorizado');
}

async function verifyAudioNotesAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, isAdmin: true, featureOverrides: true },
  });
  if (!user) throw new AppError(401, 'No autorizado');
  const overrides = (user.featureOverrides as Record<string, boolean>) ?? {};
  const hasAccess = isProUser(user) || overrides.audio_notes === true;
  if (!hasAccess) throw new AppError(403, 'Esta función requiere el módulo de transcripción de audio');
}

// POST /api/audio-notes/transcribe/:clientId
router.post('/transcribe/:clientId', authMiddleware, (req, res, next) => {
  uploadAudio(req, res, (err) => {
    if (err) return next(err instanceof Error ? err : new AppError(400, 'Error al subir audio'));
    next();
  });
}, async (req: AuthRequest, res, next) => {
  try {
    await verifyAudioNotesAccess(req.userId!);
    await verifyClientOwnership(req.params.clientId, req.userId!);

    if (!req.file) throw new AppError(400, 'No se envió ningún audio');
    if (req.body.consentConfirmed !== 'true') {
      throw new AppError(400, 'Debes confirmar el consentimiento del paciente antes de subir el audio');
    }

    const assemblyAiId = await uploadAndStartTranscription(req.file.buffer);

    const job = await prisma.audioTranscriptionJob.create({
      data: {
        clientId: req.params.clientId,
        userId: req.userId!,
        assemblyAiId,
        status: 'processing',
        consentConfirmedAt: new Date(),
      },
    });

    res.status(201).json({ jobId: job.id });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(502, 'No se pudo iniciar la transcripción, intenta de nuevo'));
  }
});

// GET /api/audio-notes/transcribe/:jobId
router.get('/transcribe/:jobId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const job = await prisma.audioTranscriptionJob.findUnique({ where: { id: req.params.jobId } });
    if (!job) throw new AppError(404, 'Transcripción no encontrada');
    if (job.userId !== req.userId) throw new AppError(403, 'No autorizado');

    if (job.status !== 'processing') {
      return res.json({ status: job.status, errorMessage: job.errorMessage ?? undefined });
    }

    const result = await getTranscriptionResult(job.assemblyAiId);

    if (result.status === 'processing') {
      return res.json({ status: 'processing' });
    }

    if (result.status === 'completed') {
      await prisma.audioTranscriptionJob.update({ where: { id: job.id }, data: { status: 'completed' } });
      return res.json({ status: 'completed', transcript: result.transcript });
    }

    await prisma.audioTranscriptionJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorMessage: result.errorMessage },
    });
    return res.json({ status: 'failed', errorMessage: result.errorMessage });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Registrar la ruta en `index.ts`**

En `backend/src/index.ts`, agregar el import junto a los demás (después de la línea `import sessionNotesRoutes from './routes/session-notes';`):

```typescript
import audioNotesRoutes from './routes/audio-notes';
```

Y el registro junto a los demás `app.use` (después de `app.use('/api/session-notes', sessionNotesRoutes);`):

```typescript
app.use('/api/audio-notes', audioNotesRoutes);
```

- [ ] **Step 3: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación manual con el servidor corriendo**

Run: `cd backend && npm run dev` (en una terminal aparte, deja corriendo)

Con un token válido (`TOKEN`) de un usuario Pro o con `featureOverrides.audio_notes = true`, y un `CLIENT_ID` de un paciente propio de ese usuario:

```bash
curl -X POST http://localhost:4000/api/audio-notes/transcribe/$CLIENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@ruta/a/audio-corto.mp3" \
  -F "consentConfirmed=true"
```
Expected: `201` con `{ "jobId": "..." }`

```bash
curl http://localhost:4000/api/audio-notes/transcribe/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"
```
Expected: primero `{ "status": "processing" }`, después de un rato `{ "status": "completed", "transcript": "Hablante A: ...\nHablante B: ..." }`

También probar sin `consentConfirmed` → `400`; con un usuario sin acceso → `403`; con el `clientId` de otro usuario → `403`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/audio-notes.ts backend/src/index.ts
git commit -m "feat: agregar endpoints de transcripción de audio (POST/GET audio-notes)"
```

---

## Task 6: Feature gating de `audio_notes` en AdminPanel

**Files:**
- Modify: `backend/src/routes/admin.ts:194-197` (mismo bloque ya tocado en Task 0)
- Modify: `frontend/src/pages/AdminPanel.tsx:381-390` (mismo bloque ya tocado en Task 0)

- [ ] **Step 1: Agregar `audio_notes` a `VALID_KEYS`**

En `backend/src/routes/admin.ts`, el arreglo quedó así tras el Task 0:

```typescript
    const VALID_KEYS = [
      'historia_clinica', 'terapia_pareja', 'templates_premium',
      'pacientes', 'analytics', 'agenda', 'colores_premium', 'aiNotes',
    ];
```

Reemplazar por:

```typescript
    const VALID_KEYS = [
      'historia_clinica', 'terapia_pareja', 'templates_premium',
      'pacientes', 'analytics', 'agenda', 'colores_premium', 'aiNotes', 'audio_notes',
    ];
```

- [ ] **Step 2: Agregar `audio_notes` a `FEATURE_LABELS`**

En `frontend/src/pages/AdminPanel.tsx`, el arreglo quedó así tras el Task 0:

```typescript
  const FEATURE_LABELS: { key: string; label: string }[] = [
    { key: 'historia_clinica',  label: 'HC Individual' },
    { key: 'terapia_pareja',    label: 'HC de Pareja' },
    { key: 'pacientes',         label: 'Pacientes' },
    { key: 'analytics',         label: 'Analytics' },
    { key: 'agenda',            label: 'Agenda' },
    { key: 'templates_premium', label: 'Templates Premium' },
    { key: 'colores_premium',   label: 'Colores Premium' },
    { key: 'aiNotes',           label: 'Notas con IA' },
  ];
```

Reemplazar por:

```typescript
  const FEATURE_LABELS: { key: string; label: string }[] = [
    { key: 'historia_clinica',  label: 'HC Individual' },
    { key: 'terapia_pareja',    label: 'HC de Pareja' },
    { key: 'pacientes',         label: 'Pacientes' },
    { key: 'analytics',         label: 'Analytics' },
    { key: 'agenda',            label: 'Agenda' },
    { key: 'templates_premium', label: 'Templates Premium' },
    { key: 'colores_premium',   label: 'Colores Premium' },
    { key: 'aiNotes',           label: 'Notas con IA' },
    { key: 'audio_notes',       label: 'Transcripción de audio' },
  ];
```

- [ ] **Step 3: Verificar que compila**

Run: `cd backend && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación manual en AdminPanel**

Con el frontend y backend corriendo, entrar como admin a AdminPanel, expandir un usuario de prueba y confirmar que aparecen los checkboxes "Notas con IA" y "Transcripción de audio", que se pueden activar/desactivar, y que el cambio persiste al recargar la página.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/admin.ts frontend/src/pages/AdminPanel.tsx
git commit -m "feat: agregar audio_notes como módulo controlable desde AdminPanel"
```

---

## Task 7: Hook `useAudioTranscription`

**Files:**
- Create: `frontend/src/hooks/useAudioTranscription.ts`

- [ ] **Step 1: Escribir el hook completo**

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api/client';

export type TranscriptionStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120; // 120 * 5s = 10 minutos

export function useAudioTranscription(clientId: string) {
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const poll = useCallback((jobId: string) => {
    timeoutRef.current = setTimeout(async () => {
      attemptsRef.current += 1;
      try {
        const { data } = await api.get(`/audio-notes/transcribe/${jobId}`);
        if (data.status === 'completed') {
          setTranscript(data.transcript ?? '');
          setStatus('completed');
          return;
        }
        if (data.status === 'failed') {
          setError(data.errorMessage ?? 'No se pudo transcribir el audio');
          setStatus('failed');
          return;
        }
        if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
          setError('La transcripción está tardando más de lo normal. Intenta de nuevo.');
          setStatus('failed');
          return;
        }
        poll(jobId);
      } catch {
        setError('Se perdió la conexión mientras se transcribía el audio');
        setStatus('failed');
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const startTranscription = useCallback(async (file: File) => {
    setStatus('uploading');
    setError(null);
    setTranscript('');
    attemptsRef.current = 0;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consentConfirmed', 'true');
      const { data } = await api.post(`/audio-notes/transcribe/${clientId}`, formData);
      setStatus('processing');
      poll(data.jobId);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo subir el audio');
      setStatus('failed');
    }
  }, [clientId, poll]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setError(null);
    setTranscript('');
  }, [stopPolling]);

  return { status, transcript, error, startTranscription, reset };
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useAudioTranscription.ts
git commit -m "feat: agregar hook useAudioTranscription con polling"
```

---

## Task 8: Componente `AudioUploadBlock`

**Files:**
- Create: `frontend/src/components/patients/AudioUploadBlock.tsx`

- [ ] **Step 1: Escribir el componente completo**

```tsx
import { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, AlertCircle } from 'lucide-react';
import { useAudioTranscription } from '../../hooks/useAudioTranscription';

interface Props {
  clientId: string;
  onTranscriptReady: (text: string) => void;
  onBusyChange?: (busy: boolean) => void;
  isDark: boolean;
}

export default function AudioUploadBlock({ clientId, onTranscriptReady, onBusyChange, isDark }: Props) {
  const { status, transcript, error, startTranscription, reset } = useAudioTranscription(clientId);
  const [consentChecked, setConsentChecked] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deliveredRef = useRef(false);

  useEffect(() => {
    if (status === 'completed' && !deliveredRef.current) {
      deliveredRef.current = true;
      onTranscriptReady(transcript);
    }
    if (status === 'idle') deliveredRef.current = false;
  }, [status, transcript, onTranscriptReady]);

  useEffect(() => {
    onBusyChange?.(status === 'uploading' || status === 'processing');
  }, [status, onBusyChange]);

  const textColor = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)';
  const boxBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

  const handleFileSelected = (file: File) => {
    setPendingFile(file);
    setConsentChecked(false);
  };

  const handleConfirm = () => {
    if (!pendingFile) return;
    startTranscription(pendingFile);
    setPendingFile(null);
  };

  const handleRetry = () => {
    reset();
    setPendingFile(null);
    setConsentChecked(false);
  };

  if (status === 'uploading' || status === 'processing') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: `1px dashed ${boxBorder}`, borderRadius: 10, marginBottom: 10 }}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: textColor }} />
        <span style={{ fontSize: 12.5, color: textColor }}>
          Transcribiendo tu audio… puede tardar unos minutos
        </span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', border: '1px dashed rgba(239,68,68,0.4)', borderRadius: 10, marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#ef4444' }}>
          <AlertCircle size={15} />
          {error ?? 'No se pudo transcribir el audio'}
        </span>
        <button onClick={handleRetry} style={{ fontSize: 12, fontWeight: 600, color: textColor, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 8, border: `1px solid ${boxBorder}`, background: 'transparent',
          color: textColor, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <Mic size={14} /> Subir audio de la sesión
      </button>

      {pendingFile && (
        <div style={{ marginTop: 8, padding: '10px 12px', border: `1px dashed ${boxBorder}`, borderRadius: 10 }}>
          <p style={{ fontSize: 12, color: textColor, marginBottom: 8 }}>{pendingFile.name}</p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: textColor, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={e => setConsentChecked(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            Confirmo que el paciente dio su consentimiento para esta grabación
          </label>
          <button
            onClick={handleConfirm}
            disabled={!consentChecked}
            style={{
              marginTop: 8, padding: '6px 14px', borderRadius: 8, border: 'none',
              background: consentChecked ? '#7c3aed' : 'rgba(124,58,237,0.3)',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: consentChecked ? 'pointer' : 'not-allowed',
            }}
          >
            Transcribir
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/patients/AudioUploadBlock.tsx
git commit -m "feat: agregar componente AudioUploadBlock"
```

---

## Task 9: Integrar `AudioUploadBlock` en `SessionNotesFeed`

**Files:**
- Modify: `frontend/src/components/patients/SessionNotesFeed.tsx`

- [ ] **Step 1: Importar el componente y el hook de feature**

En `frontend/src/components/patients/SessionNotesFeed.tsx:1-8`, agregar el import junto a los demás:

```typescript
import AudioUploadBlock from './AudioUploadBlock';
```

(el import de `useFeature` en la línea 8 ya existe, se reutiliza).

- [ ] **Step 2: Agregar el flag de acceso y el estado de "ocupado"**

En la línea 263, donde está declarado `const canUseAI = useFeature('aiNotes');`, agregar justo debajo:

```typescript
  const canUseAudioNotes = useFeature('audio_notes');
  const [audioBusy, setAudioBusy] = useState(false);
```

- [ ] **Step 3: Renderizar el bloque dentro del cuadro "Generar con IA"**

En el bloque `canUseAI ? ( ... ) : ( ... )` (alrededor de la línea 449-493), justo antes de la línea:

```tsx
                <p style={{ fontSize: 12.5, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(109,40,217,0.75)', marginBottom: 10, lineHeight: 1.55 }}>
                  Describe brevemente lo que ocurrió en sesión y la IA completará los campos automáticamente.
                </p>
```

agregar:

```tsx
                {canUseAudioNotes && (
                  <AudioUploadBlock
                    clientId={clientId}
                    onTranscriptReady={text => setAiDraft(text)}
                    onBusyChange={setAudioBusy}
                    isDark={isDark}
                  />
                )}
```

- [ ] **Step 4: Deshabilitar el textarea de `aiDraft` mientras se transcribe**

En la línea del `<textarea value={aiDraft} ... />` dentro del mismo bloque (alrededor de la línea 454-460), agregar la prop `disabled`:

```tsx
                <textarea
                  value={aiDraft}
                  onChange={e => setAiDraft(e.target.value)}
                  disabled={audioBusy}
                  style={{ ...ta, minHeight: 72, borderColor: `rgba(${_ar},${_ag},${_ab},0.3)`, background: isDark ? `rgba(${_ar},${_ag},${_ab},0.08)` : 'rgba(255,255,255,0.85)', color: textStrong }}
                  rows={3}
                  placeholder="Ej: El paciente llegó ansioso por conflicto laboral. Trabajamos técnicas de regulación emocional. Logró identificar sus patrones de pensamiento. Tarea: diario de emociones..."
                />
```

- [ ] **Step 5: Verificar que compila**

Run: `cd frontend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/patients/SessionNotesFeed.tsx
git commit -m "feat: integrar subida de audio en el cuadro Generar con IA"
```

---

## Task 10: Verificación manual end-to-end en navegador

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar ambos servidores**

Run: `cd backend && npm run dev` (terminal 1)
Run: `cd frontend && npm run dev` (terminal 2)

- [ ] **Step 2: Activar los flags para el usuario de prueba**

Entrar a AdminPanel como admin, activar `Notas con IA` y `Transcripción de audio` para el usuario de prueba (si no es Pro).

- [ ] **Step 3: Recorrer el flujo completo**

1. Entrar a un paciente → pestaña de notas de sesión → "Nueva nota".
2. Confirmar que aparece el botón "Subir audio de la sesión" arriba del cuadro de texto.
3. Seleccionar un audio corto de prueba (1-2 min, idealmente 2 voces) → confirmar que aparece el checkbox de consentimiento y el botón "Transcribir" está deshabilitado hasta marcarlo.
4. Marcar el checkbox, presionar "Transcribir" → confirmar el estado "Transcribiendo tu audio…" y que el textarea queda deshabilitado.
5. Al completar, confirmar que el texto con `Hablante A: / Hablante B:` cae en el textarea y vuelve a ser editable.
6. Editar el texto si hace falta, presionar "Generar nota" → confirmar que `/ai-notes/generate` sigue funcionando igual que antes de este cambio.
7. Repetir subiendo un archivo con formato no soportado (ej. renombrar un `.pdf` a `.mp3`) → confirmar mensaje de error claro.
8. Desactivar `audio_notes` para el usuario de prueba desde AdminPanel → confirmar que el bloque de subir audio desaparece (candado, si se implementó el estado "sin acceso") y que llamar el endpoint directo con curl regresa `403`.

- [ ] **Step 4: Reportar hallazgos**

Si algún paso falla, no continuar a producción — corregir y repetir el recorrido completo antes de dar por cerrada la tarea.

---

## Notas para despliegue a producción (fuera del alcance de este plan de desarrollo local)

- Agregar `ASSEMBLYAI_API_KEY` a las variables de entorno del proyecto backend en Vercel antes de desplegar (`cd backend && npx vercel --prod` según el flujo ya establecido en este proyecto).
- La migración de Prisma se sincroniza en producción vía `prisma db push` (parte del script `start:prod` ya existente) — no requiere paso manual adicional.
