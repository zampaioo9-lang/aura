# Registro de Actividad de Usuarios (Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al admin de Aliax (AdminPanel) visibilidad de qué módulos usa cada usuario, con qué frecuencia, qué días entra a su cuenta, y un ranking global de módulos más/menos usados — con registro propio (sin herramienta de terceros), según la spec aprobada en `docs/superpowers/specs/2026-09-18-registro-actividad-usuarios-design.md`.

**Architecture:** Una tabla nueva `ActivityEvent` (Postgres/Neon vía Prisma). Un middleware genérico (`activityLogger`) registra un evento `VIEW` por cada petición autenticada, clasificando el módulo por el prefijo de la ruta — sin tocar el frontend. Handlers ya existentes de 4 acciones clave (crear/editar paciente, completar Historia Clínica, crear nota de sesión, publicar/cambiar plantilla de perfil) agregan un evento específico adicional. Dos endpoints nuevos en `admin.ts` exponen el detalle por usuario y el ranking global; dos bloques nuevos en `AdminPanel.tsx` los muestran.

**Tech Stack:** Node/Express/TypeScript, Prisma + PostgreSQL (Neon), React/Vite/TypeScript, Tailwind inline styles. Sin framework de tests (ni Jest ni Vitest en este repo) — verificación con `tsc --noEmit` + pruebas manuales (curl/navegador) contra Neon con datos desechables, igual que en el feature de reset de contraseña de este mismo repo.

**Nota respecto al spec:** el spec agrupaba "crear nota de sesión" con un campo `metadata.noteMethod: 'manual'|'ia'|'audio'`. Al leer el código real se confirmó que `POST /api/ai-notes/generate` solo GENERA texto (no guarda ninguna `SessionNote`) y `POST /api/audio-notes/transcribe/:clientId` solo INICIA una transcripción asíncrona — el guardado real de la nota siempre pasa por `POST /api/session-notes/:clientId`. Este plan usa 3 tipos de evento distintos y precisos (`NOTE_CREATED`, `NOTE_AI_GENERATED`, `AUDIO_TRANSCRIPTION_STARTED`) en vez de inventar un campo `noteMethod` que el frontend no envía hoy. Misma intención del spec, más fiel al flujo real.

**Nota sobre `$queryRaw`/`$executeRaw`:** este repo ya documentó (ver `AnnouncementLog` en `admin.ts`) que Vercel puede cachear un Prisma Client viejo tras un deploy, antes de que regenere el cliente con el modelo/tabla nueva — usar `prisma.activityEvent.create(...)` fallaría en producción justo después del primer deploy. Por eso, igual que `AnnouncementLog`, toda lectura/escritura de `ActivityEvent` usa `$queryRaw`/`$executeRaw` con SQL directo, nunca el accessor de modelo de Prisma.

---

## Setup: Worktree aislado

El working directory de Aliax tiene varios cambios sin commitear de trabajo previo no relacionado (schema.prisma, rutas, AdminPanel.tsx, Landing.tsx, etc.). Para no tocarlos ni mezclarlos, todo este plan se ejecuta en un worktree nuevo, igual que se hizo antes para el feature de reset de contraseña (`.worktrees/consentimiento-expreso`, `.worktrees/reset-password`).

- [ ] **Crear el worktree y la rama**

Run:
```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax"
git worktree add .worktrees/registro-actividad-usuarios -b feature/registro-actividad-usuarios
```
Expected: `Preparing worktree (new branch 'feature/registro-actividad-usuarios')` — el worktree se crea desde el HEAD actual de `master` (que ya incluye el commit `0c9910f` con la spec), SIN los archivos sin commitear del working directory principal (esos nunca se copian a un worktree nuevo).

Todos los pasos siguientes se ejecutan dentro de `C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\registro-actividad-usuarios`.

---

## Task 1: Modelo de datos `ActivityEvent`

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar el modelo `ActivityEvent` y la relación inversa en `User`**

Al final de `schema.prisma`, después del modelo `RateLimit` (línea 538 actual), agregar:

```prisma
model ActivityEvent {
  id        String   @id @default(uuid())
  userId    String
  module    String
  type      String
  metadata  Json?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([module])
}
```

En `model User`, después de la línea `clients               Client[]` (línea 39), agregar:

```prisma
  activityEvents       ActivityEvent[]
```

- [ ] **Step 2: Aplicar el cambio a la base de datos de desarrollo**

Run (desde `backend/`, dentro del worktree):
```bash
cd backend
npx prisma db push
```
Expected: `The database is now in sync with your Prisma schema.` — este repo usa `db push`, NUNCA `migrate dev` (falla en Neon con error P3006, ya documentado en memoria del proyecto).

- [ ] **Step 3: Regenerar el cliente de Prisma**

Run:
```bash
npx prisma generate
```
Expected: `Generated Prisma Client` sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: agregar modelo ActivityEvent para registro de actividad de usuarios"
```

---

## Task 2: Servicio de logging (`activityService.ts`)

**Files:**
- Create: `backend/src/services/activityService.ts`

- [ ] **Step 1: Crear el servicio con la clasificación de módulos y el helper de logging**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Prefijos de ruta -> módulo. Se evalúa en orden; el primer match gana.
const MODULE_PATH_PREFIXES: { prefix: string; module: string }[] = [
  { prefix: '/api/clients', module: 'pacientes' },
  { prefix: '/api/session-notes', module: 'pacientes' },
  { prefix: '/api/clinical-history-couple', module: 'pacientes' },
  { prefix: '/api/clinical-history', module: 'pacientes' },
  { prefix: '/api/ai-notes', module: 'pacientes' },
  { prefix: '/api/audio-notes', module: 'pacientes' },
  { prefix: '/api/availability', module: 'agenda' },
  { prefix: '/api/schedule-blocks', module: 'agenda' },
  { prefix: '/api/recurring-schedule-blocks', module: 'agenda' },
  { prefix: '/api/booking-settings', module: 'agenda' },
  { prefix: '/api/service-availability', module: 'agenda' },
  { prefix: '/api/analytics', module: 'analytics' },
  { prefix: '/api/profiles', module: 'perfil' },
  { prefix: '/api/services', module: 'perfil' },
  { prefix: '/api/upload', module: 'perfil' },
  { prefix: '/api/bookings', module: 'citas' },
  { prefix: '/api/reviews', module: 'resenas' },
];

/**
 * Devuelve el módulo del producto correspondiente a una ruta de la API,
 * o null si la ruta no representa uso de una función del producto
 * (auth, admin, health, etc. — no se registran como actividad de módulo).
 */
export function classifyModule(path: string): string | null {
  const match = MODULE_PATH_PREFIXES.find(({ prefix }) => path.startsWith(prefix));
  return match ? match.module : null;
}

export type ActivityEventType =
  | 'VIEW'
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'HISTORY_STEP_COMPLETED'
  | 'NOTE_CREATED'
  | 'NOTE_AI_GENERATED'
  | 'AUDIO_TRANSCRIPTION_STARTED'
  | 'PROFILE_PUBLISHED'
  | 'PROFILE_UNPUBLISHED'
  | 'TEMPLATE_CHANGED';

/**
 * Inserta un ActivityEvent sin bloquear al llamador. Usa SQL directo (no el
 * accessor de modelo de Prisma) porque justo tras el primer deploy a Vercel
 * el Prisma Client cacheado puede no conocer todavia la tabla nueva — mismo
 * patron ya usado en este archivo/repo para AnnouncementLog.
 *
 * Nunca lanza: un fallo de logging jamas debe romper ni hacer mas lenta
 * la peticion real del usuario.
 */
export function logActivity(params: {
  userId: string;
  module: string;
  type: ActivityEventType;
  metadata?: Record<string, unknown>;
}): void {
  const { userId, module, type, metadata } = params;
  prisma.$executeRaw`
    INSERT INTO "ActivityEvent" (id, "userId", module, type, metadata, "createdAt")
    VALUES (gen_random_uuid(), ${userId}, ${module}, ${type}, ${metadata ? JSON.stringify(metadata) : null}::jsonb, NOW())
  `.catch((err) => {
    console.error('[activityService] Fallo al registrar evento (ignorado):', err instanceof Error ? err.message : err);
  });
}
```

- [ ] **Step 2: Verificar que compila**

Run (desde `backend/`):
```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/activityService.ts
git commit -m "feat: agregar activityService con clasificacion de modulos y logging no bloqueante"
```

---

## Task 3: Middleware genérico de vistas de módulo

**Files:**
- Create: `backend/src/middleware/activityLogger.ts`
- Modify: `backend/src/index.ts:39-43`
- Modify: `backend/api/index.ts:21-56`

- [ ] **Step 1: Crear el middleware**

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { classifyModule, logActivity } from '../services/activityService';

/**
 * Registra un evento VIEW por cada peticion autenticada, clasificando el
 * modulo por el prefijo de la ruta. Se apoya en que authMiddleware (que
 * corre despues, a nivel de router) muta el mismo objeto req y setea
 * req.userId antes de que la respuesta termine.
 */
export function activityLogger(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    const userId = (req as AuthRequest).userId;
    if (!userId) return;
    const module = classifyModule(req.path);
    if (!module) return;
    logActivity({ userId, module, type: 'VIEW' });
  });
  next();
}
```

- [ ] **Step 2: Montarlo en `backend/src/index.ts`**

En `backend/src/index.ts`, agregar el import junto a los demás (después de la línea 5, `import { errorHandler } from './middleware/errorHandler';`):

```typescript
import { activityLogger } from './middleware/activityLogger';
```

Y montarlo justo después de `app.use(express.json());` (línea 39), antes del comentario `// Serve local uploads in dev mode`:

```typescript
app.use(express.json());

app.use(activityLogger);

// Serve local uploads in dev mode
```

- [ ] **Step 3: Montarlo en `backend/api/index.ts`**

Este archivo carga las rutas de forma perezosa dentro de un `try` para capturar errores de import — el middleware se agrega con el mismo patrón, dentro del `try`, como el primer `app.use` antes de los routers:

En el bloque `try` (línea 30 en adelante), agregar el require junto a los demás:

```typescript
  const { activityLogger } = require('../src/middleware/activityLogger');
```

Y como primera línea de montaje, antes de `app.use('/api/auth', authRoutes);` (línea 57):

```typescript
  app.use(activityLogger);
  app.use('/api/auth', authRoutes);
```

- [ ] **Step 4: Verificar que compila**

Run (desde `backend/`):
```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 5: Prueba manual — el middleware no rompe peticiones normales**

Con el backend corriendo en dev (`npm run dev` desde `backend/`), hacer login con un usuario de prueba y golpear cualquier endpoint autenticado (ej. `GET /api/auth/me`), confirmar que la respuesta sigue siendo 200 igual que antes. Luego revisar en la consola de Neon (o `psql`) que apareció una fila en `ActivityEvent` SOLO si la ruta golpeada mapea a un módulo (`/api/auth/me` NO debería generar fila, por diseño — no está en `MODULE_PATH_PREFIXES`). Golpear `GET /api/clients` y confirmar que SÍ aparece una fila con `module = 'pacientes'`, `type = 'VIEW'`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware/activityLogger.ts backend/src/index.ts backend/api/index.ts
git commit -m "feat: registrar vistas de modulo automaticamente via middleware"
```

---

## Task 4: Instrumentar Pacientes (crear/editar cliente)

**Files:**
- Modify: `backend/src/routes/clients.ts:43-73` (POST) y `:76-93` (PATCH)

- [ ] **Step 1: Importar el helper**

Al inicio de `clients.ts`, junto a los demás imports:

```typescript
import { logActivity } from '../services/activityService';
```

- [ ] **Step 2: Loguear en `POST /` (crear paciente)**

En el handler `POST /`, justo antes de `res.status(201).json(client);` (línea 71):

```typescript
    logActivity({ userId: req.userId!, module: 'pacientes', type: 'CLIENT_CREATED', metadata: { clientName: client.name } });
    res.status(201).json(client);
```

- [ ] **Step 3: Loguear en `PATCH /:id` (editar paciente)**

En el handler `PATCH /:id`, justo antes de `res.json(updated);` (línea 91):

```typescript
    logActivity({ userId: req.userId!, module: 'pacientes', type: 'CLIENT_UPDATED', metadata: { clientName: updated.name } });
    res.json(updated);
```

- [ ] **Step 4: Verificar que compila**

Run (desde `backend/`): `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 5: Prueba manual**

Con un cliente de prueba, `POST /api/clients` con `{ "name": "Paciente Prueba" }` y confirmar en `ActivityEvent` una fila `CLIENT_CREATED` con `metadata.clientName = "Paciente Prueba"` (además de la fila `VIEW` que ya pone el middleware genérico). Luego `PATCH /api/clients/:id` con `{ "notes": "prueba" }` y confirmar la fila `CLIENT_UPDATED`. Borrar el cliente de prueba al terminar.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/clients.ts
git commit -m "feat: registrar creacion y edicion de pacientes en ActivityEvent"
```

---

## Task 5: Instrumentar Historia Clínica

**Files:**
- Modify: `backend/src/routes/clinical-history.ts:29-41`
- Modify: `backend/src/routes/clinical-history-couple.ts:29-40`

- [ ] **Step 1: Importar el helper en ambos archivos**

En cada archivo, junto a los demás imports:

```typescript
import { logActivity } from '../services/activityService';
```

- [ ] **Step 2: Loguear en `clinical-history.ts`, handler `PUT /:clientId`**

Justo antes de `res.json(history);` (línea 39):

```typescript
    logActivity({ userId: req.userId!, module: 'pacientes', type: 'HISTORY_STEP_COMPLETED', metadata: { clientId: req.params.clientId, completedSteps: history.completedSteps } });
    res.json(history);
```

- [ ] **Step 3: Loguear en `clinical-history-couple.ts`, handler `PUT /:clientId`**

Justo antes de `res.json(history);` (línea 38):

```typescript
    logActivity({ userId: req.userId!, module: 'pacientes', type: 'HISTORY_STEP_COMPLETED', metadata: { clientId: req.params.clientId, completedSteps: history.completedSteps, couple: true } });
    res.json(history);
```

- [ ] **Step 4: Verificar que compila**

Run (desde `backend/`): `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 5: Prueba manual**

Con un cliente de prueba y plan Pro/Clínico (la ruta requiere `requirePro`), `PUT /api/clinical-history/:clientId` con `{ "chiefComplaint": "prueba", "completedSteps": [1,2] }` y confirmar la fila `HISTORY_STEP_COMPLETED` en `ActivityEvent`. Repetir para `clinical-history-couple`. Limpiar los registros de prueba al terminar.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/clinical-history.ts backend/src/routes/clinical-history-couple.ts
git commit -m "feat: registrar avance de Historia Clinica (individual y pareja) en ActivityEvent"
```

---

## Task 6: Instrumentar Notas (manual, IA, audio)

**Files:**
- Modify: `backend/src/routes/session-notes.ts:28-47`
- Modify: `backend/src/routes/ai-notes.ts` (handler `POST /generate`)
- Modify: `backend/src/routes/audio-notes.ts:36-83`

- [ ] **Step 1: Importar el helper en los 3 archivos**

```typescript
import { logActivity } from '../services/activityService';
```

- [ ] **Step 2: Loguear en `session-notes.ts`, handler `POST /:clientId` (guardado real de la nota)**

Justo antes de `res.status(201).json(note);` (línea 45):

```typescript
    logActivity({ userId: req.userId!, module: 'pacientes', type: 'NOTE_CREATED', metadata: { clientId: req.params.clientId, noteType: note.noteType } });
    res.status(201).json(note);
```

- [ ] **Step 3: Loguear en `ai-notes.ts`, handler `POST /generate` (generación con IA, no guarda nota)**

Buscar el `res.json(...)` final de éxito del handler `/generate` (después del bloque que arma `generated`, cerca del final de la función) y agregar justo antes:

```typescript
    logActivity({ userId: req.userId!, module: 'pacientes', type: 'NOTE_AI_GENERATED', metadata: { noteType, clientId: clientId ?? null } });
```

- [ ] **Step 4: Loguear en `audio-notes.ts`, handler `POST /transcribe/:clientId` (inicio de transcripción)**

Justo antes de `res.status(201).json({ jobId: job.id });` (línea 63):

```typescript
    logActivity({ userId: req.userId!, module: 'pacientes', type: 'AUDIO_TRANSCRIPTION_STARTED', metadata: { clientId: req.params.clientId } });
    res.status(201).json({ jobId: job.id });
```

- [ ] **Step 5: Verificar que compila**

Run (desde `backend/`): `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 6: Prueba manual**

`POST /api/session-notes/:clientId` de un cliente de prueba con un body mínimo válido, confirmar fila `NOTE_CREATED`. `POST /api/ai-notes/generate` con una descripción de prueba, confirmar fila `NOTE_AI_GENERATED` (esto consume la API de Anthropic real — usar una descripción corta). El flujo de audio (`audio-notes/transcribe`) requiere plan Clínico/override `audio_notes` y un archivo de audio real — si no es práctico probarlo end-to-end en esta tarea, verificar al menos que el código compila y que la línea de `logActivity` está en el lugar correcto (antes del `res.status(201)` de éxito), y dejarlo anotado como pendiente de verificación manual la próxima vez que se use esa función real.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/session-notes.ts backend/src/routes/ai-notes.ts backend/src/routes/audio-notes.ts
git commit -m "feat: registrar creacion de notas (manual, IA, audio) en ActivityEvent"
```

---

## Task 7: Instrumentar Perfil (publicar / plantilla)

**Files:**
- Modify: `backend/src/routes/profiles.ts:365-396`

- [ ] **Step 1: Importar el helper**

```typescript
import { logActivity } from '../services/activityService';
```

- [ ] **Step 2: Loguear en `PUT /:id`, comparando estado previo vs. nuevo**

El handler ya carga `existing` antes de aplicar `data`. Justo antes de `res.json(profile);` (línea 392):

```typescript
    if (existing.published === false && data.published === true) {
      logActivity({ userId: req.userId!, module: 'perfil', type: 'PROFILE_PUBLISHED', metadata: { profileId: profile.id } });
    } else if (existing.published === true && data.published === false) {
      logActivity({ userId: req.userId!, module: 'perfil', type: 'PROFILE_UNPUBLISHED', metadata: { profileId: profile.id } });
    }
    if (data.template && data.template !== existing.template) {
      logActivity({ userId: req.userId!, module: 'perfil', type: 'TEMPLATE_CHANGED', metadata: { profileId: profile.id, template: data.template } });
    }
    res.json(profile);
```

- [ ] **Step 3: Verificar que compila**

Run (desde `backend/`): `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 4: Prueba manual**

Con un perfil de prueba, `PUT /api/profiles/:id` con `{ "published": true }` (partiendo de `published: false`) y confirmar fila `PROFILE_PUBLISHED`. Luego `{ "published": false }` y confirmar `PROFILE_UNPUBLISHED`. Luego `{ "template": "BOLD" }` (distinto al actual) y confirmar `TEMPLATE_CHANGED`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/profiles.ts
git commit -m "feat: registrar publicar/despublicar perfil y cambio de plantilla en ActivityEvent"
```

---

## Task 8: Endpoints de admin

**Files:**
- Modify: `backend/src/routes/admin.ts` (agregar al final, antes de `export default router;`)

- [ ] **Step 1: Agregar `GET /api/admin/users/:id/activity`**

```typescript
// GET /api/admin/users/:id/activity?days=30
router.get('/users/:id/activity', async (req, res, next) => {
  try {
    const { id } = req.params;
    const days = Math.max(1, Math.min(365, parseInt(String(req.query.days ?? '30'), 10) || 30));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [activeDaysRows, lastActiveRows, moduleCountRows, recentActionRows] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT DATE("createdAt")) as count
        FROM "ActivityEvent"
        WHERE "userId" = ${id} AND "createdAt" >= ${cutoff}
      `,
      prisma.$queryRaw<{ lastActiveAt: Date | null }[]>`
        SELECT MAX("createdAt") as "lastActiveAt"
        FROM "ActivityEvent"
        WHERE "userId" = ${id}
      `,
      prisma.$queryRaw<{ module: string; count: bigint }[]>`
        SELECT module, COUNT(*)::int as count
        FROM "ActivityEvent"
        WHERE "userId" = ${id} AND type = 'VIEW' AND "createdAt" >= ${cutoff}
        GROUP BY module
        ORDER BY count DESC
      `,
      prisma.$queryRaw<{ type: string; module: string; metadata: unknown; createdAt: Date }[]>`
        SELECT type, module, metadata, "createdAt"
        FROM "ActivityEvent"
        WHERE "userId" = ${id} AND type != 'VIEW'
        ORDER BY "createdAt" DESC
        LIMIT 10
      `,
    ]);

    res.json({
      activeDays: Number(activeDaysRows[0]?.count ?? 0),
      periodDays: days,
      lastActiveAt: lastActiveRows[0]?.lastActiveAt ?? null,
      moduleCounts: moduleCountRows.map(r => ({ module: r.module, count: Number(r.count) })),
      recentActions: recentActionRows.map(r => ({ type: r.type, module: r.module, metadata: r.metadata, createdAt: r.createdAt })),
    });
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Agregar `GET /api/admin/activity/summary`**

```typescript
// GET /api/admin/activity/summary?period=30d|90d|all
router.get('/activity/summary', async (req, res, next) => {
  try {
    const period = String(req.query.period ?? '30d');
    const cutoff =
      period === '90d' ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) :
      period === 'all' ? new Date(0) :
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const rows = await prisma.$queryRaw<{ module: string; count: bigint }[]>`
      SELECT module, COUNT(*)::int as count
      FROM "ActivityEvent"
      WHERE type = 'VIEW' AND "createdAt" >= ${cutoff}
      GROUP BY module
      ORDER BY count DESC
    `;

    res.json(rows.map(r => ({ module: r.module, count: Number(r.count) })));
  } catch (err) { next(err); }
});
```

Ambos endpoints heredan `authMiddleware` + `adminMiddleware` de `router.use(...)` ya declarado al inicio de `admin.ts` (líneas 15-16) — no hace falta repetirlos.

- [ ] **Step 3: Verificar que compila**

Run (desde `backend/`): `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 4: Prueba manual**

Con un token de admin de prueba (crear un admin desechable en la DB si hace falta, como se hizo en el feature de reset de contraseña — nunca usar credenciales reales):
```bash
curl -H "Authorization: Bearer <token_admin_prueba>" "http://localhost:4000/api/admin/users/<id_usuario_prueba>/activity?days=30"
curl -H "Authorization: Bearer <token_admin_prueba>" "http://localhost:4000/api/admin/activity/summary?period=30d"
```
Expected: JSON con la forma descrita arriba, reflejando los eventos de prueba generados en las tareas 3-7.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/admin.ts
git commit -m "feat: agregar endpoints admin de actividad por usuario y resumen global"
```

---

## Task 9: Frontend — bloque "Actividad" por usuario

**Files:**
- Modify: `frontend/src/pages/AdminPanel.tsx`

- [ ] **Step 1: Agregar estado para cachear la actividad por usuario cargada**

Junto a los demás `useState` del componente (cerca de la línea 472, `const [expandedUser, setExpandedUser] = useState<string | null>(null);`):

```typescript
  const [activityByUser, setActivityByUser] = useState<Record<string, {
    activeDays: number;
    lastActiveAt: string | null;
    moduleCounts: { module: string; count: number }[];
    recentActions: { type: string; module: string; metadata: any; createdAt: string }[];
  }>>({});
  const [loadingActivity, setLoadingActivity] = useState<string | null>(null);
```

- [ ] **Step 2: Cargar la actividad al expandir una fila**

Buscar el `onClick` que hace `setExpandedUser(expandedUser === u.id ? null : u.id)` (línea 1421) y reemplazarlo por:

```typescript
                        onClick={() => {
                          const next = expandedUser === u.id ? null : u.id;
                          setExpandedUser(next);
                          if (next && !activityByUser[next]) {
                            setLoadingActivity(next);
                            api.get(`/admin/users/${next}/activity?days=30`)
                              .then(res => setActivityByUser(prev => ({ ...prev, [next]: res.data })))
                              .finally(() => setLoadingActivity(null));
                          }
                        }}
```

- [ ] **Step 3: Renderizar el bloque "Actividad" dentro de la fila expandida**

Agregar justo antes del bloque `{/* Correos enviados a este usuario */}` (línea 1563):

```typescript
                            {/* Actividad */}
                            {loadingActivity === u.id ? (
                              <div className="rounded-lg px-3 py-3 mt-3 text-xs" style={{ background: C.subCard, boxShadow: C.subCardShadow, color: C.textFaint }}>
                                Cargando actividad...
                              </div>
                            ) : activityByUser[u.id] ? (
                              <div className="rounded-lg px-3 py-3 mt-3" style={{ background: C.subCard, boxShadow: C.subCardShadow }}>
                                <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>Actividad (últimos 30 días)</p>
                                <p className="text-sm mb-2" style={{ color: C.text }}>
                                  Activo <strong>{activityByUser[u.id].activeDays}</strong> de los últimos 30 días
                                  {activityByUser[u.id].lastActiveAt && (
                                    <> · última vez: {new Date(activityByUser[u.id].lastActiveAt!).toLocaleDateString('es-ES')}</>
                                  )}
                                </p>
                                {activityByUser[u.id].moduleCounts.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {activityByUser[u.id].moduleCounts.map(m => (
                                      <span key={m.module} className="text-xs rounded-full px-2 py-0.5" style={{ background: C.accentLight, color: C.accent }}>
                                        {m.module} ({m.count})
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {activityByUser[u.id].recentActions.length > 0 ? (
                                  <ul className="text-xs space-y-1" style={{ color: C.textFaint }}>
                                    {activityByUser[u.id].recentActions.map((a, i) => (
                                      <li key={i}>
                                        {ACTIVITY_LABELS[a.type] ?? a.type} — {new Date(a.createdAt).toLocaleDateString('es-ES')}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs italic" style={{ color: C.textFaint }}>Sin acciones registradas todavía.</p>
                                )}
                              </div>
                            ) : null}

```

- [ ] **Step 4: Agregar el mapa de etiquetas legibles**

Fuera del componente (junto a otras constantes del archivo, ej. cerca de `ONBOARDING_TEMPLATES`/`REACTIVATION_TEMPLATES`):

```typescript
const ACTIVITY_LABELS: Record<string, string> = {
  CLIENT_CREATED: '🧑‍⚕️ Creó un paciente',
  CLIENT_UPDATED: '🧑‍⚕️ Editó un paciente',
  HISTORY_STEP_COMPLETED: '✅ Avanzó en Historia Clínica',
  NOTE_CREATED: '📝 Creó una nota de sesión',
  NOTE_AI_GENERATED: '🤖 Generó una nota con IA',
  AUDIO_TRANSCRIPTION_STARTED: '🎙️ Inició una transcripción de audio',
  PROFILE_PUBLISHED: '🌐 Publicó su perfil',
  PROFILE_UNPUBLISHED: '🌐 Despublicó su perfil',
  TEMPLATE_CHANGED: '🎨 Cambió de plantilla',
};
```

- [ ] **Step 5: Verificar que compila**

Run (desde `frontend/`):
```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 6: Prueba manual en navegador**

Con el backend y frontend en dev, entrar al AdminPanel con una cuenta admin de prueba, expandir la fila de un usuario que tenga eventos de prueba de las tareas 4-7, y confirmar que el bloque "Actividad" muestra los días activos, módulos y acciones recientes correctamente, en modo claro y oscuro.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/AdminPanel.tsx
git commit -m "feat: mostrar actividad por usuario en la fila expandida del AdminPanel"
```

---

## Task 10: Frontend — ranking global de módulos

**Files:**
- Modify: `frontend/src/pages/AdminPanel.tsx`

- [ ] **Step 1: Agregar estado y carga del resumen global**

Junto al estado agregado en la Tarea 9:

```typescript
  const [activitySummary, setActivitySummary] = useState<{ module: string; count: number }[]>([]);
  const [activityPeriod, setActivityPeriod] = useState<'30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    api.get(`/admin/activity/summary?period=${activityPeriod}`).then(res => setActivitySummary(res.data));
  }, [activityPeriod]);
```

(Agregar este `useEffect` junto a los demás `useEffect` del componente; confirmar que `useEffect` ya está importado de React en este archivo — si no lo está, agregarlo al import de React.)

- [ ] **Step 2: Renderizar el bloque de ranking**

Justo después del cierre del bloque `{/* ── Resumen compacto ── */}` (buscar dónde termina ese bloque, después de la línea 939 vista en la exploración — el bloque de badges de estado de citas), agregar un bloque nuevo:

```typescript
        {/* ── Módulos más usados ── */}
        <div className="rounded-lg px-4 py-3 mb-4" style={{ background: C.subCard, boxShadow: C.subCardShadow }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textFaint }}>
              Módulos más usados (todos los usuarios)
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['30d', '90d', 'all'] as const).map(p => {
                const label = p === '30d' ? '30 días' : p === '90d' ? '90 días' : 'Todo';
                const isActive = activityPeriod === p;
                return (
                  <button
                    key={p}
                    onClick={() => setActivityPeriod(p)}
                    style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${isActive ? C.accent : C.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                      background: isActive ? C.accent : 'transparent',
                      color: isActive ? '#fff' : C.muted,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {activitySummary.length === 0 ? (
            <p className="text-xs italic" style={{ color: C.textFaint }}>Sin actividad registrada en este periodo.</p>
          ) : (
            <ol className="text-sm space-y-1.5" style={{ color: C.text }}>
              {activitySummary.map((m, i) => (
                <li key={m.module} className="flex items-center justify-between">
                  <span>{i + 1}. {m.module}</span>
                  <span style={{ color: C.textFaint }}>{m.count} usos</span>
                </li>
              ))}
            </ol>
          )}
        </div>

```

- [ ] **Step 3: Verificar que compila**

Run (desde `frontend/`): `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 4: Prueba manual en navegador**

Confirmar que el bloque aparece cerca del resumen de métricas, que el ranking coincide con los `moduleCounts` de la Tarea 8/9, y que cambiar entre 30 días / 90 días / Todo actualiza la lista. Verificar en modo claro y oscuro.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AdminPanel.tsx
git commit -m "feat: agregar ranking global de modulos mas usados en AdminPanel"
```

---

## Task 11: Verificación final y limpieza

- [ ] **Step 1: Revisar que ningún dato de prueba quedó en la base de datos**

Consultar (en Neon o `psql`) y borrar cualquier `Client`, `Profile`, `SessionNote`, `ClinicalHistory(Couple)`, `User` admin desechable o fila de `ActivityEvent` creada durante las pruebas manuales de las tareas 3-10.

- [ ] **Step 2: `tsc --noEmit` completo en backend y frontend**

```bash
cd backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```
Expected: sin errores en ninguno de los dos.

- [ ] **Step 3: Revisar el diff completo de la rama contra `master`**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\registro-actividad-usuarios"
git diff master --stat
```
Confirmar que solo aparecen los archivos tocados en este plan (schema.prisma, activityService.ts, activityLogger.ts, index.ts, api/index.ts, clients.ts, clinical-history.ts, clinical-history-couple.ts, session-notes.ts, ai-notes.ts, audio-notes.ts, profiles.ts, admin.ts, AdminPanel.tsx) — nada de los cambios sin commitear que ya existían en el working directory principal antes de crear el worktree.

- [ ] **Step 4: Entregar para revisión/merge**

No hacer push ni abrir PR todavía — esto queda para que el usuario decida (merge directo, PR, o revisión adicional), siguiendo el patrón de `finishing-a-development-branch` ya usado en features anteriores de este repo.
