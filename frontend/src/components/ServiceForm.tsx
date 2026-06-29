import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Move } from 'lucide-react';
import type { Service } from '../hooks/useServices';
import ImageUpload from './ImageUpload';

const CURRENCIES = [
  { value: 'EUR', label: '€ EUR' },
  { value: 'USD', label: '$ USD' },
  { value: 'MXN', label: '$ MXN' },
  { value: 'COP', label: '$ COP' },
  { value: 'ARS', label: '$ ARS' },
  { value: 'CLP', label: '$ CLP' },
  { value: 'PEN', label: 'S/ PEN' },
] as const;

const DURATIONS = [
  { value: 15,  label: '15 minutos' },
  { value: 30,  label: '30 minutos' },
  { value: 45,  label: '45 minutos' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1 hora 30 min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
] as const;

const serviceFormSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo').max(100000, 'Máximo 100,000'),
  currency: z.enum(['EUR', 'USD', 'MXN', 'COP', 'ARS', 'CLP', 'PEN']),
  durationMinutes: z.coerce.number().refine(v => [15, 30, 45, 60, 90, 120, 180, 240].includes(v), {
    message: 'Selecciona una duración válida',
  }),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export function ImagePositionPicker({
  image, position, onChange, onChangePicture, onRemove,
}: {
  image: string;
  position: string;
  onChange: (pos: string) => void;
  onChangePicture?: () => void;
  onRemove?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const posRef = useRef({ x: 50, y: 50 });
  const [pos, setPos] = useState(() => {
    const parts = (position || '50% 50%').split(' ');
    return { x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 };
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const parts = (position || '50% 50%').split(' ');
    const p = { x: parseFloat(parts[0]) || 50, y: parseFloat(parts[1]) || 50 };
    posRef.current = p;
    setPos(p);
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startPx = posRef.current.x;
    const startPy = posRef.current.y;

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current || !imgRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cW = rect.width;
      const cH = 150;
      const nW = imgRef.current.naturalWidth || cW;
      const nH = imgRef.current.naturalHeight || cH;
      const scale = Math.max(cW / nW, cH / nH);
      const overflowX = Math.max(1, nW * scale - cW);
      const overflowY = Math.max(1, nH * scale - cH);
      const newX = Math.max(0, Math.min(100, startPx - ((ev.clientX - startX) / overflowX) * 100));
      const newY = Math.max(0, Math.min(100, startPy - ((ev.clientY - startY) / overflowY) * 100));
      posRef.current = { x: newX, y: newY };
      setPos({ x: newX, y: newY });
      onChange(`${Math.round(newX)}% ${Math.round(newY)}%`);
    };

    const onUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#64748b' }}>
          Vista previa de la tarjeta
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onChangePicture && (
            <button type="button" onClick={onChangePicture}
              style={{ fontSize: 12, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: 500 }}>
              Cambiar foto
            </button>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove}
              style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Drag container — same dimensions as the public card image (max 320px × 150px) */}
      <div
        ref={containerRef}
        style={{
          height: 150, maxWidth: 320, overflow: 'hidden', borderRadius: 12, userSelect: 'none', position: 'relative',
          cursor: dragging ? 'grabbing' : 'grab',
          border: dragging ? '2px solid #2dd4bf' : '1.5px solid rgba(45,212,191,0.35)',
          transition: 'border-color 0.15s',
        }}
        onMouseDown={handleMouseDown}
      >
        <img
          ref={imgRef}
          src={image}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`, pointerEvents: 'none', userSelect: 'none', display: 'block' }}
          draggable={false}
        />
        {/* Drag hint — fades during drag */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: dragging ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.52)', borderRadius: 8, padding: '5px 12px',
            display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)',
          }}>
            <Move size={13} color="white" />
            <span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>Arrastra para reencuadrar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ServiceFormProps {
  onSubmit: (data: ServiceFormValues & { image?: string; imagePosition?: string; sessionModality?: string }) => Promise<void>;
  initialData?: Service | null;
  mode: 'create' | 'edit';
  loading?: boolean;
  onCancel?: () => void;
}

const fieldBase = `
  w-full px-3 py-2 rounded-lg outline-none transition-colors text-slate-900 placeholder:text-slate-400
  bg-white/60 backdrop-blur-sm
  border border-teal-200
  focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20
`;

export default function ServiceForm({ onSubmit, initialData, mode, loading = false, onCancel }: ServiceFormProps) {
  const [image, setImage] = useState('');
  const [imagePosition, setImagePosition] = useState('50% 50%');
  const [sessionModality, setSessionModality] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema) as any,
    defaultValues: { name: '', description: '', price: 0, currency: 'EUR', durationMinutes: 60 },
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
      setImagePosition(initialData.imagePosition || '50% 50%');
      setSessionModality(initialData.sessionModality || '');
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: ServiceFormValues) => {
    await onSubmit({ ...data, image: image || undefined, imagePosition, sessionModality: sessionModality || undefined });
  };

  const busy = isSubmitting || loading;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del servicio *</label>
        <input
          {...register('name')}
          placeholder="Ej: Consulta Psicológica"
          className={`${fieldBase} ${errors.name ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' : ''}`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Descripción <span className="text-slate-400 font-normal">({descriptionLength}/500)</span>
        </label>
        <textarea
          {...register('description')}
          rows={3} maxLength={500}
          placeholder="Describe tu servicio..."
          className={`${fieldBase} resize-none ${errors.description ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' : ''}`}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
      </div>

      {/* Modalidad */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Modalidad de atención</label>
        <div className="flex gap-3 flex-wrap">
          {[
            { value: 'presencial', label: 'Presencial' },
            { value: 'online',     label: 'En línea' },
            { value: 'hibrida',    label: 'Ambas' },
          ].map(m => (
            <button key={m.value} type="button"
              onClick={() => setSessionModality(prev => prev === m.value ? '' : m.value)}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 14,
                border: `1.5px solid ${sessionModality === m.value ? '#0d9488' : '#cbd5e1'}`,
                background: sessionModality === m.value ? 'linear-gradient(135deg, #2dd4bf, #0d9488)' : '#fff',
                color: sessionModality === m.value ? '#fff' : '#475569',
                fontWeight: sessionModality === m.value ? 600 : 400,
                cursor: 'pointer', transition: 'all .15s',
                boxShadow: sessionModality === m.value ? '0 2px 8px rgba(45,212,191,0.3)' : 'none',
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image */}
      <ImageUpload value={image} onChange={val => { setImage(val); setImagePosition('50% 50%'); }} label="Imagen del servicio" />
      {image && <ImagePositionPicker image={image} position={imagePosition} onChange={setImagePosition} />}

      {/* Price + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Precio *</label>
          <input
            type="number" step="0.01" min="0" max="100000"
            {...register('price')}
            className={`${fieldBase} ${errors.price ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' : ''}`}
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
          <select {...register('currency')} className={fieldBase}>
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Duración *</label>
        <select
          {...register('durationMinutes')}
          className={`${fieldBase} ${errors.durationMinutes ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' : ''}`}
        >
          {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
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
          style={{ background: 'linear-gradient(135deg, #2dd4bf, #0d9488)' }}
          className="inline-flex items-center gap-2 px-5 py-2 text-white text-sm font-medium rounded-lg transition-opacity disabled:opacity-50 hover:opacity-90">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Guardando...' : mode === 'create' ? 'Crear Servicio' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
