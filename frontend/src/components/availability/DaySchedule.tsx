import { Pencil, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { formatTime } from '../../lib/utils';
import { DAY_NAMES } from '../../types/availability';
import type { AvailabilitySlot } from '../../types/availability';

interface DayScheduleProps {
  dayOfWeek: number;
  slots: AvailabilitySlot[];
  onAdd: (dayOfWeek: number) => void;
  onEdit: (slot: AvailabilitySlot) => void;
  onDelete: (slot: AvailabilitySlot) => void;
  onToggle: (slot: AvailabilitySlot) => void;
}

export default function DaySchedule({ dayOfWeek, slots, onAdd, onEdit, onDelete, onToggle }: DayScheduleProps) {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return (
    <div className={`rounded-xl border p-4 ${isWeekend ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-sm ${slots.length > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
          {DAY_NAMES[dayOfWeek]}
        </h3>
        <button
          onClick={() => onAdd(dayOfWeek)}
          className="text-indigo-600 hover:text-indigo-500 p-1 rounded-lg hover:bg-indigo-50 transition-colors"
          title="Agregar horario"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {slots.length === 0 ? (
        <p className="text-xs text-slate-400">Sin horarios</p>
      ) : (
        <div className="space-y-2">
          {slots.map(slot => (
            <div
              key={slot.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                slot.isActive
                  ? 'bg-indigo-50 text-indigo-900'
                  : 'bg-slate-100 text-slate-400 line-through'
              }`}
            >
              <span className="font-medium">
                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => onToggle(slot)} className="p-1 rounded hover:bg-white/60 transition-colors" title={slot.isActive ? 'Desactivar' : 'Activar'}>
                  {slot.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => onEdit(slot)} className="p-1 rounded hover:bg-white/60 transition-colors" title="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(slot)} className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors" title="Eliminar">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
