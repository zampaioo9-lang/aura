import { Clock } from 'lucide-react';
import { formatTime } from '../../lib/utils';
import { DAY_NAMES } from '../../types/availability';

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface AvailabilitySummaryProps {
  slots: Slot[];
  className?: string;
}

export default function AvailabilitySummary({ slots, className = '' }: AvailabilitySummaryProps) {
  if (!slots || slots.length === 0) return null;

  // Group by day, ordered Mon-Sun
  const byDay: Record<number, Slot[]> = {};
  for (const slot of slots) {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  }

  // Display order: Mon(1) to Sun(0)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const activeDays = dayOrder.filter(d => byDay[d]?.length);

  if (activeDays.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Clock className="h-4 w-4" />
        Horario de Atencion
      </h3>
      <div className="space-y-1.5">
        {activeDays.map(day => (
          <div key={day} className="flex items-start gap-2 text-sm">
            <span className="font-medium w-24 flex-shrink-0">{DAY_NAMES[day]}</span>
            <span className="text-slate-600">
              {byDay[day]
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map(s => `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`)
                .join(', ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
