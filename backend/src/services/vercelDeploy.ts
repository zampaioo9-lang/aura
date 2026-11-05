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
