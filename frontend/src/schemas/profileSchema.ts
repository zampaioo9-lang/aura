import { z } from 'zod';

export const profileFormSchema = z.object({
  slug: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .max(30, 'Maximo 30 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minusculas, numeros y guiones'),
  title: z.string().min(2, 'Minimo 2 caracteres').max(100),
  profession: z.string().min(2, 'Minimo 2 caracteres').max(100),
  specialty: z.string().max(100).optional().or(z.literal('')),
  yearsExperience: z.string().optional(),
  country: z.string().max(100).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  bio: z.string().max(500, 'Maximo 500 caracteres').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  template: z.enum(['MINIMALIST', 'BOLD', 'ELEGANT', 'CREATIVE', 'CARBONO']),
  published: z.boolean(),
  // Salud mental
  therapeuticApproaches: z.array(z.string()).optional(),
  problematics: z.array(z.string()).optional(),
  populations: z.array(z.string()).optional(),
  modality: z.string().optional().or(z.literal('')),
  pricePerSession: z.union([z.string(), z.number()]).optional(),
  sessionCurrency: z.string().optional(),
  sessionDurationMinutes: z.union([z.string(), z.number()]).optional(),
  cedula: z.string().max(50).optional().or(z.literal('')),
  university: z.string().max(200).optional().or(z.literal('')),
  degree: z.string().optional().or(z.literal('')),
  languages: z.array(z.string()).optional(),
  acceptsInvoice: z.boolean().optional(),
  workingStyle: z.string().max(1000).optional().or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

export const PROFESSIONS = [
  'Medico', 'Abogado', 'Psicologo', 'Coach', 'Nutricionista',
  'Dentista', 'Contador', 'Arquitecto', 'Disenador', 'Fotógrafo',
  'Consultor', 'Terapeuta', 'Veterinario', 'Personal Trainer',
  'Profesor', 'Freelancer',
];

export const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Canadá', 'Chile', 'Colombia',
  'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España',
  'Estados Unidos', 'Guatemala', 'Honduras', 'México', 'Nicaragua',
  'Panamá', 'Paraguay', 'Perú', 'Portugal', 'Puerto Rico',
  'Rep. Dominicana', 'Uruguay', 'Venezuela',
];
