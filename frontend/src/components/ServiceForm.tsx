import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { Service } from '../hooks/useServices';
import ImageUpload from './ImageUpload';

const CURRENCIES = [
  { value: 'EUR', label: '€ EUR' },
  { value: 'USD', label: '$ USD' },
  { value: 'MXN', label: '$ MXN' },
  { value: 'COP', label: '$ COP' },
  { value: 'ARS', label: '$ ARS' },
  { value: 'CLP', label: '$ CLP' },
] as const;

const DURATIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 hora 30 min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
] as const;

const serviceFormSchema = z.object({
  name: z.string().min(3, 'Minimo 3 caracteres').max(100, 'Maximo 100 caracteres'),
  description: z.string().max(500, 'Maximo 500 caracteres').optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo').max(100000, 'Maximo 100,000'),
  currency: z.enum(['EUR', 'USD', 'MXN', 'COP', 'ARS', 'CLP']),
  durationMinutes: z.coerce.number().refine(v => [15, 30, 45, 60, 90, 120, 180, 240].includes(v), {
    message: 'Selecciona una duracion valida',
  }),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  onSubmit: (data: ServiceFormValues & { image?: string }) => Promise<void>;
  initialData?: Service | null;
  mode: 'create' | 'edit';
  loading?: boolean;
  onCancel?: () => void;
}

export default function ServiceForm({ onSubmit, initialData, mode, loading = false, onCancel }: ServiceFormProps) {
  const [image, setImage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      currency: 'EUR',
      durationMinutes: 60,
    },
  });

  const descriptionLength = watch('description')?.length || 0;

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || '',
        price: typeof initialData.price === 'string' ? parseFloat(initialData.price) : initialData.price,
        currency: initialData.currency as any,
        durationMinutes: initialData.durationMinutes,
      });
      setImage(initialData.image || '');
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: ServiceFormValues) => {
    await onSubmit({ ...data, image: image || undefined });
  };

  const busy = isSubmitting || loading;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="svc-name" className="block text-sm font-medium text-slate-700 mb-1">
          Nombre del servicio *
        </label>
        <input
          id="svc-name"
          {...register('name')}
          placeholder="Ej: Consulta Psicologica"
          className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors ${
            errors.name ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500'
          } focus:ring-2 focus:border-transparent`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="svc-desc" className="block text-sm font-medium text-slate-700 mb-1">
          Descripcion <span className="text-slate-400 font-normal">({descriptionLength}/500)</span>
        </label>
        <textarea
          id="svc-desc"
          {...register('description')}
          rows={3}
          maxLength={500}
          placeholder="Describe tu servicio..."
          className={`w-full px-3 py-2 border rounded-lg outline-none resize-none transition-colors ${
            errors.description ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500'
          } focus:ring-2 focus:border-transparent`}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
      </div>

      {/* Image */}
      <ImageUpload value={image} onChange={setImage} label="Imagen del servicio" />

      {/* Price + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="svc-price" className="block text-sm font-medium text-slate-700 mb-1">Precio *</label>
          <input
            id="svc-price"
            type="number"
            step="0.01"
            min="0"
            max="100000"
            {...register('price')}
            className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors ${
              errors.price ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500'
            } focus:ring-2 focus:border-transparent`}
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <label htmlFor="svc-currency" className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
          <select
            id="svc-currency"
            {...register('currency')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {CURRENCIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Duration */}
      <div>
        <label htmlFor="svc-duration" className="block text-sm font-medium text-slate-700 mb-1">Duracion *</label>
        <select
          id="svc-duration"
          {...register('durationMinutes')}
          className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors ${
            errors.durationMinutes ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500'
          } focus:ring-2 focus:border-transparent`}
        >
          {DURATIONS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        {errors.durationMinutes && <p className="text-xs text-red-500 mt-1">{errors.durationMinutes.message}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-50">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Guardando...' : mode === 'create' ? 'Crear Servicio' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
