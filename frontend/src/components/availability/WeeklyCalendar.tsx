import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DaySchedule from './DaySchedule';
import { DAY_NAMES_SHORT } from '../../types/availability';
import type { AvailabilitySlot } from '../../types/availability';

interface WeeklyCalendarProps {
  slotsByDay: Record<number, AvailabilitySlot[]>;
  onAdd: (dayOfWeek: number) => void;
  onEdit: (slot: AvailabilitySlot) => void;
  onDelete: (slot: AvailabilitySlot) => void;
  onToggle: (slot: AvailabilitySlot) => void;
}

// Reorder: Mon(1) to Sun(0)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function WeeklyCalendar({ slotsByDay, onAdd, onEdit, onDelete, onToggle }: WeeklyCalendarProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden md:grid md:grid-cols-7 gap-3">
        {DAY_ORDER.map(day => (
          <DaySchedule
            key={day}
            dayOfWeek={day}
            slots={slotsByDay[day] || []}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        ))}
      </div>

      {/* Mobile: accordion */}
      <div className="md:hidden space-y-2">
        {DAY_ORDER.map(day => {
          const daySlots = slotsByDay[day] || [];
          const isExpanded = expandedDay === day;
          const hasSlots = daySlots.length > 0;

          return (
            <div key={day} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${hasSlots ? 'text-slate-900' : 'text-slate-400'}`}>
                    {DAY_NAMES_SHORT[day]}
                  </span>
                  {hasSlots && (
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {daySlots.length} horario{daySlots.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {isExpanded && (
                <div className="px-2 pb-2">
                  <DaySchedule
                    dayOfWeek={day}
                    slots={daySlots}
                    onAdd={onAdd}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
