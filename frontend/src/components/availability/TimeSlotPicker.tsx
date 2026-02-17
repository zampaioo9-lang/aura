import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { generateTimeOptions } from '../../lib/utils';
import { DAY_NAMES } from '../../types/availability';
import type { AvailabilitySlot } from '../../types/availability';

interface TimeSlotPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { dayOfWeek: number; startTime: string; endTime: string }) => Promise<void>;
  editingSlot?: AvailabilitySlot | null;
  defaultDay?: number;
}

const timeOptions = generateTimeOptions(0, 1440, 30);

export default function TimeSlotPicker({ isOpen, onClose, onSave, editingSlot, defaultDay }: TimeSlotPickerProps) {
  const [dayOfWeek, setDayOfWeek] = useState(defaultDay ?? 1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingSlot) {
      setDayOfWeek(editingSlot.dayOfWeek);
      setStartTime(editingSlot.startTime);
      setEndTime(editingSlot.endTime);
    } else {
      setDayOfWeek(defaultDay ?? 1);
      setStartTime('09:00');
      setEndTime('17:00');
    }
    setError('');
  }, [editingSlot, defaultDay, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (startTime >= endTime) {
      setError('La hora de inicio debe ser anterior a la de fin');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ dayOfWeek, startTime, endTime });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingSlot ? 'Editar Horario' : 'Nuevo Horario'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dia</label>
            <select
              value={dayOfWeek}
              onChange={e => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {timeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {timeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
