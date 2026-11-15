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

export interface TrialUser {
  clinicoTrialEndsAt?: Date | null;
}

export function isInClinicoTrial(user: TrialUser): boolean {
  return !!user.clinicoTrialEndsAt && user.clinicoTrialEndsAt > new Date();
}

export const CLINICO_TRIAL_DAYS = 5;
export const CLINICO_TRIAL_AUDIO_SECONDS = 120 * 60;
export const CLINICO_TRIAL_AI_NOTES = 10;

export function clinicoTrialExpiry(): Date {
  return new Date(Date.now() + CLINICO_TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

// Tope silencioso de transcripciones por mes para el plan de pago (Pro IA).
// Anti-abuso, no se anuncia como número en Pricing ("uso generoso").
export const AUDIO_MONTHLY_SESSION_CAP = 60;

export function monthlyAudioCapReached(jobsThisMonth: number): boolean {
  return jobsThisMonth >= AUDIO_MONTHLY_SESSION_CAP;
}

export function startOfCurrentMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
