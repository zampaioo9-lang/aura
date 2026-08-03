export interface PlanUser {
  plan?: string | null;
  planExpiresAt?: Date | null;
  isAdmin?: boolean;
}

export function isProUser(user: PlanUser): boolean {
  if (user.isAdmin) return true;
  if (!user.plan) return false;
  if (user.plan === 'LIFETIME') return true;
  if (user.plan === 'PRO' || user.plan === 'CLINICO') {
    return !user.planExpiresAt || user.planExpiresAt > new Date();
  }
  return false;
}

export function isClinicoUser(user: PlanUser): boolean {
  if (user.isAdmin) return true;
  if (!user.plan) return false;
  if (user.plan === 'CLINICO') {
    return !user.planExpiresAt || user.planExpiresAt > new Date();
  }
  return false;
}
