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
  template: z.enum(['MINIMALIST', 'BOLD', 'ELEGANT', 'CREATIVE', 'CARBONO']).default('MINIMALIST'),
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
  specialty: z.string().max(100).optional().or(z.literal('')),
  yearsExperience: z.number().int().min(0).max(100).optional().nullable(),
  country: z.string().max(100).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  published: z.boolean().optional(),
  // Salud mental
  therapeuticApproaches: z.array(z.string()).optional(),
  problematics: z.array(z.string()).optional(),
  populations: z.array(z.string()).optional(),
  modality: z.string().max(20).optional().or(z.literal('')),
  pricePerSession: z.number().min(0).optional().nullable(),
  sessionCurrency: z.string().max(10).optional(),
  sessionDurationMinutes: z.number().int().min(15).max(240).optional().nullable(),
  cedula: z.string().max(50).optional().or(z.literal('')),
  university: z.string().max(200).optional().or(z.literal('')),
  degree: z.string().max(50).optional().or(z.literal('')),
  languages: z.array(z.string()).optional(),
  acceptsInvoice: z.boolean().optional(),
  workingStyle: z.string().max(1000).optional().or(z.literal('')),
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
  sessionModality: z.enum(['presencial', 'online', 'hibrida']).optional(),
});

export const updateServiceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  image: z.string().url().optional().or(z.literal('')),
  imagePosition: z.string().max(20).optional(),
  price: z.number().min(0).max(100000).optional(),
  currency: z.enum(CURRENCIES).optional(),
  durationMinutes: z.number().refine(v => (DURATIONS as readonly number[]).includes(v), {
    message: 'Duracion no valida',
  }).optional(),
  sessionModality: z.enum(['presencial', 'online', 'hibrida']).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const bookingSchema = z.object({
  profileId: z.string(),
  serviceId: z.string(),
  clientName: z.string().min(2, 'Nombre minimo 2 caracteres').max(100, 'Nombre maximo 100 caracteres'),
  clientEmail: z.string().email('Email invalido'),
  clientPhone: z.union([
    z.string().regex(/^\+[1-9]\d{1,14}$/, 'Formato: +34612345678'),
    z.literal(''),
  ]).optional(),
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
  emailEnabled:       z.boolean().default(true),
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

export const createRecurringScheduleBlockSchema = z.object({
  profileId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  reason:    z.string().max(200).optional(),
}).refine(data => {
  const [sh, sm] = data.startTime.split(':').map(Number);
  const [eh, em] = data.endTime.split(':').map(Number);
  return (sh * 60 + sm) < (eh * 60 + em);
}, { message: 'La hora de inicio debe ser anterior a la hora de fin' });

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

export const createOfferingSchema = z.object({
  profileId: z.string(),
  type: z.enum(['LIVE_WORKSHOP', 'RECORDED_COURSE']),
  title: z.string().min(3, 'Minimo 3 caracteres').max(150, 'Maximo 150 caracteres'),
  description: z.string().max(1000, 'Maximo 1000 caracteres').optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  priceUSD: z.number().min(0, 'El precio no puede ser negativo').max(10000, 'Precio maximo 10,000'),
  priceMXN: z.number().min(0).max(200000).optional(),
  scheduledAt: z.string().datetime().optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
  externalLink: z.string().url('Debe ser una URL valida (ej. enlace de Zoom o Meet)').optional().or(z.literal('')),
}).refine(
  (data) => data.type !== 'LIVE_WORKSHOP' || (data.scheduledAt && data.externalLink),
  { message: 'Un taller en vivo requiere fecha/hora y enlace externo' }
);

export const updateOfferingSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  priceUSD: z.number().min(0).max(10000).optional(),
  priceMXN: z.number().min(0).max(200000).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  capacity: z.number().int().min(1).max(1000).optional().nullable(),
  externalLink: z.string().url().optional().nullable().or(z.literal('')),
});

export const createModuleSchema = z.object({
  title: z.string().min(2, 'Minimo 2 caracteres').max(150, 'Maximo 150 caracteres'),
  description: z.string().max(500).optional().or(z.literal('')),
  type: z.enum(['TEXT', 'VIDEO', 'PDF', 'QUESTIONNAIRE'], {
    errorMap: () => ({ message: 'Tipo de modulo no valido (TEXT, VIDEO, PDF o QUESTIONNAIRE)' }),
  }),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
}).refine(
  (data) => data.type !== 'TEXT' || !!data.textContent,
  { message: 'Un modulo de texto requiere contenido' }
).refine(
  (data) => !(data.type === 'VIDEO' || data.type === 'PDF') || !!data.fileUrl,
  { message: 'Un modulo de video o PDF requiere un archivo subido primero (fileUrl)' }
);

export const updateModuleSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
});

export const createQuestionSchema = z.object({
  text: z.string().min(3, 'Minimo 3 caracteres').max(300, 'Maximo 300 caracteres'),
  type: z.enum(['FREE_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
  options: z.array(z.object({
    label: z.string().min(1, 'La opcion no puede estar vacia').max(100, 'Maximo 100 caracteres'),
    value: z.number().int('El valor debe ser un numero entero'),
  })).max(20, 'Maximo 20 opciones').optional(),
}).refine(
  (data) => data.type === 'FREE_TEXT' || (!!data.options && data.options.length >= 2),
  { message: 'Las preguntas de opcion unica o multiple requieren al menos 2 opciones' }
).refine(
  (data) => data.type !== 'FREE_TEXT' || !data.options,
  { message: 'Las preguntas de texto libre no llevan opciones' }
);

export const updateQuestionSchema = z.object({
  text: z.string().min(3, 'Minimo 3 caracteres').max(300, 'Maximo 300 caracteres'),
});

export const createScoringRuleSchema = z.object({
  minScore: z.number().int('minScore debe ser un numero entero'),
  maxScore: z.number().int('maxScore debe ser un numero entero'),
  message: z.string().min(3, 'Minimo 3 caracteres').max(500, 'Maximo 500 caracteres'),
}).refine(
  (data) => data.maxScore >= data.minScore,
  { message: 'maxScore debe ser mayor o igual a minScore' }
);

export const updateScoringRuleSchema = z.object({
  minScore: z.number().int().optional(),
  maxScore: z.number().int().optional(),
  message: z.string().min(3).max(500).optional(),
}).refine(
  (data) => data.minScore === undefined || data.maxScore === undefined || data.maxScore >= data.minScore,
  { message: 'maxScore debe ser mayor o igual a minScore' }
);

export const checkoutSchema = z.object({
  offeringId: z.string().uuid('offeringId invalido'),
  // .trim() antes de validar longitud: este endpoint es publico y sin auth (invitados), asi
  // que no se puede confiar en que el frontend ya haya recortado espacios -- sin esto, un
  // nombre/correo con espacios de sobra llega tal cual a Purchase y a los correos de
  // confirmacion/admin.
  buyerName: z.string().trim().min(2, 'Minimo 2 caracteres').max(100, 'Maximo 100 caracteres'),
  buyerEmail: z.string().trim().email('Correo invalido').max(150, 'Maximo 150 caracteres'),
  buyerPhone: z.string().trim().max(30, 'Maximo 30 caracteres').optional().or(z.literal('')),
  currency: z.enum(['USD', 'MXN'], { errorMap: () => ({ message: 'currency debe ser USD o MXN' }) }),
  provider: z.enum(['stripe', 'paypal'], { errorMap: () => ({ message: 'provider debe ser stripe o paypal' }) }),
});

export const submitAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid('questionId invalido'),
    valueText: z.string().max(2000, 'Maximo 2000 caracteres').optional(),
    valueOptionIds: z.array(z.string().uuid('id de opcion invalido')).optional(),
  })).min(1, 'Debes responder al menos una pregunta'),
});
