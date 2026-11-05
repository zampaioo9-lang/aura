# Arreglo de la carrera de despliegues (proyecto "aura") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que publicar/despublicar/eliminar un artículo (o usar "Publicar cambios en el sitio") promueva el deployment correcto de forma determinística, eliminando la carrera entre el auto-deploy de GitHub, los deploys manuales por CLI y el Deploy Hook.

**Architecture:** Tres funciones puras nuevas en `backend/src/services/vercelDeploy.ts` (buscar el deployment nuevo, esperar a que quede `READY`, promoverlo) orquestadas por una función en `backend/src/routes/articles.ts` que se ejecuta dentro de `waitUntil()` después de disparar el Deploy Hook existente — sin cambiar el tiempo de respuesta al admin.

**Tech Stack:** Express + TypeScript + Prisma (ya existentes). Paquete nuevo: `@vercel/functions` (para `waitUntil`). Sin librería HTTP nueva — se usa `fetch` nativo (Node 24, ya en uso en el propio `triggerBlogRebuild`).

**Nota sobre pruebas:** este backend no tiene suite de pruebas automatizadas (no hay jest/vitest configurado) ni ambiente de desarrollo separado (`backend/.env` y producción apuntan a la misma Neon compartida) — mismo patrón ya establecido en el resto del proyecto (ver `docs/superpowers/plans/2026-11-04-revista-aliax-fase2-newsletter.md`). La verificación de cada tarea es: `npx tsc -b` compila sin errores, y donde aplica, un script Node desechable corrido contra la API real de Vercel (no contra el backend desplegado) para confirmar el comportamiento, sin disparar un despliegue real innecesario.

---

### Task 0 (manual, no es código): César genera el token y resuelve el Team ID real

Este paso lo hace César directamente, fuera de este plan de código. Documentado aquí para que quede registrado como prerequisito antes de que el Task 5 (verificación) se pueda ejecutar.

1. En Vercel, ir a Account Settings → Tokens → Create Token. Nombre sugerido: `aura-deploy-promote`. Scope: el team "cesar's projects" (`cesars-projects-ddd06b7a`). Expiración: sin expirar o 1 año (es un token de uso continuo del backend, no de un solo uso).
2. Con el token recién creado, correr este comando (reemplazando `<TOKEN>`) para confirmar el `teamId` real (no el slug):

```bash
curl -s "https://api.vercel.com/v2/teams?slug=cesars-projects-ddd06b7a" -H "Authorization: Bearer <TOKEN>" | grep -o '"id":"team_[^"]*"'
```

Esperado: algo como `"id":"team_xxxxxxxxxxxxxxxxxxxxxxxx"`. Ese valor (con el prefijo `team_`) es el que se usa como `VERCEL_TEAM_ID`, NO el slug `cesars-projects-ddd06b7a`.

3. En el proyecto "backend" de Vercel → Settings → Environment Variables (Production), agregar:
   - `VERCEL_API_TOKEN` = el token generado en el paso 1
   - `VERCEL_PROJECT_ID` = `prj_huCsdxxSMJlDtV7sYpqmnBQSG0PT`
   - `VERCEL_TEAM_ID` = el `team_...` resuelto en el paso 2
4. En el proyecto "aura" de Vercel → Settings → Environments → desactivar **"Auto-assign Custom Production Domains"**.

Sin los pasos 3 y 4, el código de este plan compila y se despliega sin romper nada (se degrada a solo loguear advertencias, ver Task 3), pero no corrige la carrera todavía.

---

### Task 1: Variables de entorno nuevas

**Files:**
- Modify: `backend/src/config/env.ts`

- [ ] **Step 1: Agregar las 3 variables nuevas**

En `backend/src/config/env.ts`, después de la línea `CRISIS_REFERRAL_SECRET: process.env.CRISIS_REFERRAL_SECRET || '',` (última línea antes del `};` de cierre), agregar:

```typescript
  // Usadas por backend/src/services/vercelDeploy.ts para promover manualmente el deployment
  // correcto del proyecto "aura" tras un rebuild de Revista, en vez de depender de la
  // auto-asignación de dominio de Vercel (desactivada a propósito -- ver
  // docs/superpowers/specs/2026-11-05-deploy-race-fix-design.md). Sin estas 3 variables,
  // waitAndPromoteBlogDeployment() se degrada a solo loguear una advertencia y no promueve nada.
  VERCEL_API_TOKEN: process.env.VERCEL_API_TOKEN || '',
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID || '',
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || '',
```

- [ ] **Step 2: Verificar que compila**

Run: `cd backend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/env.ts
git commit -m "feat: add Vercel API env vars for deployment promotion"
```

---

### Task 2: Dependencia `@vercel/functions`

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Instalar el paquete**

Run: `cd backend && npm install @vercel/functions`
Expected: agrega `@vercel/functions` a `dependencies` en `backend/package.json` y a `backend/package-lock.json`.

- [ ] **Step 2: Verificar que compila**

Run: `cd backend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add @vercel/functions dependency for waitUntil"
```

---

### Task 3: Funciones puras de la API de Vercel

**Files:**
- Create: `backend/src/services/vercelDeploy.ts`

- [ ] **Step 1: Escribir el archivo completo**

```typescript
import { env } from '../config/env';

// Funciones puras que hablan con la API REST de Vercel para encontrar, esperar y promover
// el deployment de producción correcto del proyecto "aura" -- usadas por
// waitAndPromoteBlogDeployment() en backend/src/routes/articles.ts tras disparar el Deploy
// Hook. Ver docs/superpowers/specs/2026-11-05-deploy-race-fix-design.md para el porqué.

const VERCEL_API_BASE = 'https://api.vercel.com';

export interface VercelDeploymentSummary {
  uid: string;
  readyState: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED' | string;
  createdAt: number;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env.VERCEL_API_TOKEN}` };
}

function isConfigured(): boolean {
  return !!(env.VERCEL_API_TOKEN && env.VERCEL_PROJECT_ID && env.VERCEL_TEAM_ID);
}

// Busca, entre los últimos deployments de producción del proyecto, uno creado después de
// `afterTimestamp` (ms epoch). Devuelve null si no hay ninguno todavía o si la llamada falla.
export async function findNewProductionDeployment(afterTimestamp: number): Promise<VercelDeploymentSummary | null> {
  if (!isConfigured()) return null;
  const url = `${VERCEL_API_BASE}/v6/deployments?projectId=${env.VERCEL_PROJECT_ID}&target=production&teamId=${env.VERCEL_TEAM_ID}&limit=5`;
  try {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as { deployments: VercelDeploymentSummary[] };
    return data.deployments.find((d) => d.createdAt > afterTimestamp) || null;
  } catch {
    return null;
  }
}

// Hace polling cada 3s del estado de un deployment hasta que quede READY (true), hasta que
// falle con ERROR/CANCELED (false), o hasta `deadline` (ms epoch, false).
export async function waitForDeploymentReady(deploymentId: string, deadline: number): Promise<boolean> {
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${VERCEL_API_BASE}/v13/deployments/${deploymentId}?teamId=${env.VERCEL_TEAM_ID}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as { readyState: VercelDeploymentSummary['readyState'] };
        if (data.readyState === 'READY') return true;
        if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') return false;
      }
    } catch {
      // red transitoria: seguir intentando hasta el deadline
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return false;
}

// Promueve un deployment ya READY a producción (hace que el dominio custom apunte a él).
// Reintenta una vez. Devuelve false si ambos intentos fallan.
export async function promoteDeployment(deploymentId: string): Promise<boolean> {
  if (!isConfigured()) return false;
  const url = `${VERCEL_API_BASE}/v10/projects/${env.VERCEL_PROJECT_ID}/promote/${deploymentId}?teamId=${env.VERCEL_TEAM_ID}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: authHeaders() });
      if (res.ok) return true;
    } catch {
      // fall through to retry
    }
  }
  return false;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd backend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Verificación manual contra la API real (requiere Task 0 completado)**

Crear un script desechable en el scratchpad (NO en el repo) para confirmar que `findNewProductionDeployment` ve los deployments reales sin tener que publicar un artículo:

```javascript
// scratchpad: check-vercel-deploy.mjs
const token = 'PEGAR_TOKEN_AQUI_TEMPORALMENTE';
const projectId = 'prj_huCsdxxSMJlDtV7sYpqmnBQSG0PT';
const teamId = 'PEGAR_TEAM_ID_REAL_AQUI';

const res = await fetch(
  `https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&teamId=${teamId}&limit=3`,
  { headers: { Authorization: `Bearer ${token}` } }
);
console.log(res.status);
console.log(JSON.stringify(await res.json(), null, 2));
```

Run: `node check-vercel-deploy.mjs` (desde el scratchpad)
Expected: status 200, y un JSON con `deployments` listando los últimos 3 deployments de producción reales de "aura" (los mismos que se ven en el dashboard). Si da 403/401, el token o el teamId están mal — corregir antes de seguir. Borrar el script del scratchpad al terminar (contiene el token en texto plano).

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/vercelDeploy.ts
git commit -m "feat: add Vercel deployment polling and promotion helpers"
```

---

### Task 4: Conectar `triggerBlogRebuild()` al flujo de promoción

**Files:**
- Modify: `backend/src/routes/articles.ts:1-50`

- [ ] **Step 1: Agregar los imports nuevos**

En `backend/src/routes/articles.ts`, la línea 13 actual es:

```typescript
import { env } from '../config/env';
```

Reemplazar por:

```typescript
import { env } from '../config/env';
import { waitUntil } from '@vercel/functions';
import { findNewProductionDeployment, waitForDeploymentReady, promoteDeployment } from '../services/vercelDeploy';
```

- [ ] **Step 2: Reemplazar `triggerBlogRebuild()` completo**

El bloque actual (líneas 18-50, desde el comentario `// Publishing/unpublishing/deleting...` hasta el `}` que cierra `triggerBlogRebuild`) se reemplaza por:

```typescript
// Espera a que aparezca un deployment de producción nuevo del proyecto "aura" (más reciente
// que `triggeredAt`), espera a que quede READY, y lo promueve -- en vez de depender de la
// auto-asignación de dominio de Vercel (desactivada a propósito: con 3 disparadores de
// deploy sin coordinar -- push de Git, CLI manual, y este mismo Deploy Hook -- Vercel podía
// alinear el dominio al que terminara de construir primero, no al más reciente, causando
// que una versión vieja apareciera brevemente en producción. Ver
// docs/superpowers/specs/2026-11-05-deploy-race-fix-design.md).
//
// Si VERCEL_API_TOKEN/PROJECT_ID/TEAM_ID no están configurados (p. ej. en local), las
// funciones de vercelDeploy.ts devuelven null/false de inmediato y esto solo loguea una
// advertencia -- nunca lanza, nunca bloquea nada.
async function waitAndPromoteBlogDeployment(triggeredAt: number): Promise<void> {
  const deadline = triggeredAt + 150_000;

  let deployment = await findNewProductionDeployment(triggeredAt);
  while (!deployment && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    deployment = await findNewProductionDeployment(triggeredAt);
  }
  if (!deployment) {
    console.warn('[Revista] No aparecio un deployment nuevo de produccion dentro del tiempo de espera');
    return;
  }

  const ready = await waitForDeploymentReady(deployment.uid, deadline);
  if (!ready) {
    console.warn(`[Revista] El deployment ${deployment.uid} no quedo READY (fallo o se agoto el tiempo)`);
    return;
  }

  const promoted = await promoteDeployment(deployment.uid);
  if (!promoted) {
    console.warn(`[Revista] No se pudo promover el deployment ${deployment.uid} tras 2 intentos`);
    return;
  }

  try {
    await prisma.blogRebuildState.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', lastRebuiltAt: new Date() },
      update: { lastRebuiltAt: new Date() },
    });
  } catch (err) {
    console.warn('[Revista] Se promovio el deployment pero no se pudo registrar lastRebuiltAt', err);
  }
}

// Publishing/unpublishing/deleting a published article, or clicking "Publicar cambios
// en el sitio" in the CMS, regenerates the static /revista HTML by calling a Vercel
// Deploy Hook, then waits for the resulting build and promotes it explicitly (see
// waitAndPromoteBlogDeployment above). A failure here must NEVER fail the request -- the
// DB write already succeeded, and the only consequence of a missed deploy is a stale
// public page, corrected by the next real trigger or a manual deploy. Retry the hook
// trigger once, then just log.
//
// The wait-and-promote work runs inside waitUntil() (from @vercel/functions): it keeps
// the serverless function alive in the background after the HTTP response is already
// sent, without blocking that response -- the Vercel-native fix for the same class of
// bug that silently dropped newsletter confirmation emails when a bare un-awaited
// promise got cut off mid-flight (see project_aliax_revista_newsletter memory).
async function triggerBlogRebuild(): Promise<void> {
  const hookUrl = process.env.BLOG_DEPLOY_HOOK_URL;
  if (!hookUrl) return;

  const triggeredAt = Date.now();
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(hookUrl, { method: 'POST' });
      if (res.ok) {
        waitUntil(waitAndPromoteBlogDeployment(triggeredAt));
        return;
      }
    } catch {
      // fall through to retry/log below
    }
  }
  console.warn('[Revista] No se pudo disparar el deploy hook tras 2 intentos');
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd backend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Verificar que los 4 call sites no cambiaron su forma de llamar**

Run: `grep -n "triggerBlogRebuild()" backend/src/routes/articles.ts`
Expected: 4 resultados (líneas ~165 con `await`, y 3 más sin `await`, en publish/unpublish/delete) -- ninguno debe cambiar, `triggerBlogRebuild` sigue teniendo la misma firma `(): Promise<void>`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/articles.ts
git commit -m "feat: wait for and explicitly promote the blog deployment after rebuild"
```

---

### Task 5: Verificación end-to-end en producción (requiere Task 0 completo)

No es código -- son pasos de verificación manual, igual que se hizo para el newsletter (no hay ambiente de desarrollo separado).

- [ ] **Step 1: Confirmar que el backend desplegado tiene las 3 variables nuevas**

Run: `cd backend && npx vercel env ls production`
Expected: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` aparecen en la lista.

- [ ] **Step 2: Confirmar que "Auto-assign Custom Production Domains" está desactivado**

En el dashboard de Vercel, proyecto "aura" → Settings → Environments. Confirmar visualmente que el toggle está apagado (Task 0, paso 4).

- [ ] **Step 3: Publicar un artículo de prueba (o editar uno existente y usar "Publicar cambios en el sitio") y observar los logs del backend**

Run: `cd backend && npx vercel logs api.aliax.io` (streaming, dejar corriendo mientras se publica desde el Admin)
Expected: en los ~30-60s siguientes a publicar, aparecen líneas con `[Revista]` indicando el progreso. Si todo sale bien, NO debe aparecer ninguna advertencia de `console.warn` -- solo silencio hasta que el artículo esté visible.

- [ ] **Step 4: Confirmar visualmente que el artículo quedó publicado**

Visitar `https://www.aliax.io/revista/<slug-del-articulo>` en una pestaña nueva (o incógnito) unos 60-90 segundos después de publicar.
Expected: el artículo se ve, sin necesidad de refrescar dos veces ni de esperar más.

- [ ] **Step 5: Confirmar que el indicador "Cambios sin publicar" del CMS se limpia correctamente**

En el Admin → Revista, después del paso 3-4, el indicador debe mostrar que no hay cambios pendientes (se actualiza `lastRebuiltAt` solo tras la promoción exitosa, Task 4).

- [ ] **Step 6: Actualizar la memoria del proyecto**

Agregar una nota a la memoria `project_aliax_revista_newsletter.md` o crear una nueva (`project_aliax_deploy_race_fix.md`) documentando: el bug original, la causa raíz, y que quedó resuelto con el flujo de promoción explícita -- para que sesiones futuras no vuelvan a investigar esto desde cero.
