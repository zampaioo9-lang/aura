import { z } from 'zod';

export const profileFormSchema = z.object({
  slug: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .max(30, 'Maximo 30 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minusculas, numeros y guiones'),
  title: z.string().min(2, 'Minimo 2 caracteres').max(100),
  profession: z.string().min(2, 'Minimo 2 caracteres').max(100),
  bio: z.string().max(500, 'Maximo 500 caracteres').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  template: z.enum(['MINIMALIST', 'BOLD', 'ELEGANT', 'CREATIVE']),
  published: z.boolean(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

export const PROFESSIONS = [
  'Medico',
  'Abogado',
  'Psicologo',
  'Coach',
  'Nutricionista',
  'Dentista',
  'Contador',
  'Arquitecto',
  'Disenador',
  'Fotógrafo',
  'Consultor',
  'Terapeuta',
  'Veterinario',
  'Personal Trainer',
  'Profesor',
  'Freelancer',
];
