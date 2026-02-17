import { useState } from 'react';
import { X, Briefcase, Sun, Coffee, Moon } from 'lucide-react';

interface QuickTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (slots: { dayOfWeek: number; startTime: string; endTime: string }[]) => Promise<void>;
}

interface Template {
  name: string;
  description: string;
  icon: React.ReactNode;
  slots: { dayOfWeek: number; startTime: string; endTime: string }[];
}

const TEMPLATES: Template[] = [
  {
    name: 'Oficina',
    description: 'Lunes a Viernes, 9:00 - 17:00',
    icon: <Briefcase className="h-5 w-5" />,
    slots: [1, 2, 3, 4, 5].map(day => ({ dayOfWeek: day, startTime: '09:00', endTime: '17:00' })),
  },
  {
    name: 'Media jornada',
    description: 'Lunes a Viernes, 9:00 - 13:00',
    icon: <Sun className="h-5 w-5" />,
    slots: [1, 2, 3, 4, 5].map(day => ({ dayOfWeek: day, startTime: '09:00', endTime: '13:00' })),
  },
  {
    name: 'Jornada partida',
    description: 'Lunes a Viernes, 9:00-13:00 y 15:00-19:00',
    icon: <Coffee className="h-5 w-5" />,
    slots: [1, 2, 3, 4, 5].flatMap(day => [
      { dayOfWeek: day, startTime: '09:00', endTime: '13:00' },
      { dayOfWeek: day, startTime: '15:00', endTime: '19:00' },
    ]),
  },
  {
    name: 'Tarde/Noche',
    description: 'Lunes a Sabado, 14:00 - 21:00',
    icon: <Moon className="h-5 w-5" />,
    slots: [1, 2, 3, 4, 5, 6].map(day => ({ dayOfWeek: day, startTime: '14:00', endTime: '21:00' })),
  },
];

export default function QuickTemplates({ isOpen, onClose, onApply }: QuickTemplatesProps) {
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleApply = async (template: Template) => {
    setApplying(template.name);
    setError('');
    try {
      await onApply(template.slots);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al aplicar plantilla');
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900">Plantillas Rapidas</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Se eliminaran todos los horarios actuales y se aplicara la plantilla seleccionada.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <div className="space-y-3">
          {TEMPLATES.map(template => (
            <button
              key={template.name}
              onClick={() => handleApply(template)}
              disabled={applying !== null}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left disabled:opacity-50"
            >
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                {template.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{template.name}</p>
                <p className="text-sm text-slate-500">{template.description}</p>
              </div>
              {applying === template.name && (
                <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
