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
  // limit=5: suficiente margen para los triggers que puedan coincidir (push a master, CLI
  // manual, este mismo Deploy Hook) sin pedir una pagina completa de historial.
  const url = `${VERCEL_API_BASE}/v6/deployments?projectId=${env.VERCEL_PROJECT_ID}&target=production&teamId=${env.VERCEL_TEAM_ID}&limit=5`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { headers: authHeaders(), signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[Revista] findNewProductionDeployment: la API de Vercel respondio ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { deployments: VercelDeploymentSummary[] };
    // La API normalmente ya devuelve mas reciente primero, pero no esta documentado como
    // garantia -- se ordena explicitamente para no depender de eso.
    const sorted = [...data.deployments].sort((a, b) => b.createdAt - a.createdAt);
    return sorted.find((d) => d.createdAt > afterTimestamp) || null;
  } catch (err) {
    console.warn('[Revista] findNewProductionDeployment: fallo de red', err);
    return null;
  }
}

// Hace polling cada 3s del estado de un deployment hasta que quede READY (true), hasta que
// falle con ERROR/CANCELED (false), o hasta `deadline` (ms epoch, false).
export async function waitForDeploymentReady(deploymentId: string, deadline: number): Promise<boolean> {
  let warnedBadStatus = false;
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${VERCEL_API_BASE}/v13/deployments/${deploymentId}?teamId=${env.VERCEL_TEAM_ID}`, {
        headers: authHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as { readyState: VercelDeploymentSummary['readyState'] };
        if (data.readyState === 'READY') return true;
        if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') return false;
      } else if (!warnedBadStatus) {
        // Avisar una sola vez (no en cada poll de 3s) para distinguir "todavia construyendo"
        // de un fallo real de credenciales/config (401/403) que se repetiria siempre igual.
        console.warn(`[Revista] waitForDeploymentReady: la API de Vercel respondio ${res.status} para ${deploymentId}`);
        warnedBadStatus = true;
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { method: 'POST', headers: authHeaders(), signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return true;
      console.warn(`[Revista] promoteDeployment intento ${attempt}: la API de Vercel respondio ${res.status}`);
    } catch (err) {
      console.warn(`[Revista] promoteDeployment intento ${attempt}: fallo de red`, err);
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}
