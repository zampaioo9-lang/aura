import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const profileSchema = z.object({
  slug: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, 'Solo letras minusculas, numeros y guiones'),
  title: z.string().min(2).max(100),
  bio: z.string().max(500).optional().or(z.literal('')),
  profession: z.string().min(2).max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  template: z.enum(['MINIMALIST', 'BOLD', 'ELEGANT', 'CREATIVE']).default('MINIMALIST'),
  avatar: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
  customization: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
  }).optional(),
  socialLinks: z.record(z.string()).optional(),
  availability: z.record(z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }))).optional(),
  published: z.boolean().optional(),
});

const CURRENCIES = ['EUR', 'USD', 'MXN', 'COP', 'ARS', 'CLP'] as const;
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240] as const;

export const createServiceSchema = z.object({
  profileId: z.string(),
  name: z.string().min(3, 'Minimo 3 caracteres').max(100, 'Maximo 100 caracteres'),
  description: z.string().max(500, 'Maximo 500 caracteres').optional().or(z.literal('')),
  image: z.string().url().optional().or(z.literal('')),
  price: z.number().min(0, 'El precio no puede ser negativo').max(100000, 'Precio maximo 100,000'),
  currency: z.enum(CURRENCIES).default('EUR'),
  durationMinutes: z.number().refine(v => (DURATIONS as readonly number[]).includes(v), {
    message: 'Duracion no valida',
  }),
});

export const updateServiceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  image: z.string().url().optional().or(z.literal('')),
  price: z.number().min(0).max(100000).optional(),
  currency: z.enum(CURRENCIES).optional(),
  durationMinutes: z.number().refine(v => (DURATIONS as readonly number[]).includes(v), {
    message: 'Duracion no valida',
  }).optional(),
  isActive: z.boolean().optional(),
});

export const bookingSchema = z.object({
  profileId: z.string(),
  serviceId: z.string(),
  clientName: z.string().min(2, 'Nombre minimo 2 caracteres').max(100, 'Nombre maximo 100 caracteres'),
  clientEmail: z.string().email('Email invalido'),
  clientPhone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Formato: +34612345678'),
  clientNotes: z.string().max(500, 'Maximo 500 caracteres').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD').refine(val => {
    const d = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  }, { message: 'La fecha debe ser hoy o futura' }),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
});

export const statusUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
  clientEmail: z.string().email().optional(),
});

// ── BookingSettings schemas ────────────────────────────────────────
export const upsertBookingSettingsSchema = z.object({
  bufferMinutes:      z.number().int().min(0).max(120).default(0),
  advanceBookingDays: z.number().int().min(1).max(365).default(60),
  minAdvanceHours:    z.number().int().min(0).max(72).default(1),
  cancellationHours:  z.number().int().min(0).max(168).default(24),
  autoConfirm:        z.boolean().default(false),
  timezone:           z.string().max(60).default('America/Mexico_City'),
  language:           z.string().max(10).default('es'),
});

// ── ScheduleBlock schemas ──────────────────────────────────────────
export const createScheduleBlockSchema = z.object({
  profileId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  isAllDay:  z.boolean().default(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason:    z.string().max(200).optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: 'La fecha de fin debe ser igual o posterior al inicio',
}).refine(data => {
  if (!data.isAllDay) return data.startTime && data.endTime;
  return true;
}, { message: 'Se requieren startTime y endTime cuando no es todo el día' });

export const updateScheduleBlockSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isAllDay:  z.boolean().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason:    z.string().max(200).optional(),
});

// ── ServiceAvailability schemas ────────────────────────────────────
export const createServiceAvailabilitySchema = z.object({
  serviceId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
}).refine(data => {
  const [sh, sm] = data.startTime.split(':').map(Number);
  const [eh, em] = data.endTime.split(':').map(Number);
  return (sh * 60 + sm) < (eh * 60 + em);
}, { message: 'La hora de inicio debe ser anterior a la hora de fin' });

export const bulkServiceAvailabilitySchema = z.object({
  serviceId: z.string(),
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime:   z.string().regex(/^\d{2}:\d{2}$/),
  })).max(50),
});

// ── Availability slot schemas ──────────────────────────────────────
export const createAvailabilitySlotSchema = z.object({
  profileId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
}).refine(data => {
  const [sh, sm] = data.startTime.split(':').map(Number);
  const [eh, em] = data.endTime.split(':').map(Number);
  return (sh * 60 + sm) < (eh * 60 + em);
}, { message: 'La hora de inicio debe ser anterior a la hora de fin' });

export const updateAvailabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido').optional(),
  isActive: z.boolean().optional(),
});

export const bulkCreateAvailabilitySchema = z.object({
  profileId: z.string(),
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1).max(50),
});
