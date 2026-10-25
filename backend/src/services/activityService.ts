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
