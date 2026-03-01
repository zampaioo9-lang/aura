import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../../api/client';
import { timeToMinutes, minutesToTime } from '../../lib/utils';
import NewBookingModal from './NewBookingModal';

interface Colors {
  cardBg: string;
  border: string;
  cardShadow: string;
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  mainBg: string;
  isDark: boolean;
}

interface CalendarBooking {
  id: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; durationMinutes: number };
  profile: { title: string; slug: string };
}

interface AvailabilitySlot {
  id: string;
  profileId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday...
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
  profileId: string;
}

interface ModalSlot {
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Returns ISO date string YYYY-MM-DD for a given JS Date */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns start of week (Monday) for a given date */
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Returns array of 7 Date objects for Mon–Sun of the given week */
function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** JS dayOfWeek (0=Sun) → plan dayOfWeek (0=Sun) - same mapping, just clarifying */
function jsDayToSlotDay(jsDay: number): number {
  return jsDay;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CONFIRMED: { bg: 'rgba(34,197,94,0.15)', text: '#16a34a', border: '#86efac' },
  PENDING:   { bg: 'rgba(245,158,11,0.15)', text: '#b45309', border: '#fcd34d' },
  COMPLETED: { bg: 'rgba(100,116,139,0.15)', text: '#475569', border: '#94a3b8' },
  CANCELLED: { bg: 'rgba(239,68,68,0.10)', text: '#b91c1c', border: '#fca5a5' },
  NO_SHOW:   { bg: 'rgba(249,115,22,0.12)', text: '#c2410c', border: '#fdba74' },
};

export default function ProfessionalCalendar({ C, profiles }: { C: Colors; profiles: { id: string }[] }) {
  const [monday, setMonday] = useState<Date>(() => startOfWeek(new Date()));
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalSlot, setModalSlot] = useState<ModalSlot | null>(null);

  const days = weekDays(monday);
  const fromDate = toDateStr(days[0]);
  const toDate   = toDateStr(days[6]);

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const [bookRes, availRes, svcRes] = await Promise.all([
        api.get('/bookings/professional', { params: { from: fromDate, to: toDate } }),
        api.get('/availability/me'),
        api.get('/services/me'),
      ]);
      setBookings(bookRes.data);
      setAvailability(availRes.data);
      setServices(svcRes.data.services ?? svcRes.data);
    } catch {
      // silently fail — calendar stays empty
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  // Derive hour range from availability config
  const activeSlots = availability.filter(s => s.isActive);
  const allStartMins = activeSlots.map(s => timeToMinutes(s.startTime));
  const allEndMins   = activeSlots.map(s => timeToMinutes(s.endTime));
  const minHour = allStartMins.length > 0 ? Math.floor(Math.min(...allStartMins) / 60) : 8;
  const maxHour = allEndMins.length   > 0 ? Math.ceil(Math.max(...allEndMins)   / 60) : 20;
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);

  function isWithinAvailability(dayDate: Date, hour: number): boolean {
    const dow = jsDayToSlotDay(dayDate.getDay());
    return activeSlots.some(s =>
      s.dayOfWeek === dow &&
      timeToMinutes(s.startTime) <= hour * 60 &&
      hour * 60 < timeToMinutes(s.endTime)
    );
  }

  function getBookingsForSlot(dayDate: Date, hour: number): CalendarBooking[] {
    const dateStr = toDateStr(dayDate);
    return bookings.filter(b => {
      if (b.date.slice(0, 10) !== dateStr) return false;
      const start = timeToMinutes(b.startTime);
      const end   = timeToMinutes(b.endTime);
      return start < (hour + 1) * 60 && end > hour * 60;
    });
  }

  function handleSlotClick(dayDate: Date, hour: number) {
    if (!isWithinAvailability(dayDate, hour)) return;
    const slotBookings = getBookingsForSlot(dayDate, hour);
    if (slotBookings.length > 0) return; // occupied
    setModalSlot({ date: toDateStr(dayDate), time: minutesToTime(hour * 60) });
  }

  function prevWeek() {
    setMonday(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  }
  function nextWeek() {
    setMonday(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  }
  function goToday() { setMonday(startOfWeek(new Date())); }

  const weekLabel = (() => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const start = days[0].toLocaleDateString('es-ES', opts);
    const end   = days[6].toLocaleDateString('es-ES', { ...opts, year: 'numeric' });
    return `${start} – ${end}`;
  })();

  const todayStr = toDateStr(new Date());

  const CELL_H = 52; // px per hour row

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: C.accentLight, color: C.accent }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium" style={{ color: C.text }}>{weekLabel}</span>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: C.accentLight, color: C.accent }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors ml-1"
            style={{ background: C.accentLight, color: C.accent }}
          >
            Hoy
          </button>
        </div>
        <p className="text-xs" style={{ color: C.muted }}>
          Clic en un horario libre para crear una cita
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full" style={{ color: C.accent }} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 600 }}>
            {/* Day headers */}
            <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div /> {/* spacer for time column */}
              {days.map((d, i) => {
                const isToday = toDateStr(d) === todayStr;
                return (
                  <div
                    key={i}
                    className="text-center pb-2"
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <p className="text-xs font-medium" style={{ color: C.muted }}>{DAY_LABELS[i]}</p>
                    <p
                      className="text-sm font-bold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full"
                      style={isToday
                        ? { background: C.accent, color: 'white' }
                        : { color: C.text }}
                    >
                      {d.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="relative" style={{ marginTop: 4 }}>
              {hours.map(hour => (
                <div
                  key={hour}
                  className="grid"
                  style={{
                    gridTemplateColumns: '48px repeat(7, 1fr)',
                    height: CELL_H,
                    borderBottom: `1px solid ${C.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  }}
                >
                  {/* Hour label */}
                  <div
                    className="flex items-start justify-end pr-2 pt-1 text-xs select-none"
                    style={{ color: C.muted }}
                  >
                    {minutesToTime(hour * 60)}
                  </div>

                  {/* Day cells */}
                  {days.map((d, di) => {
                    const within  = isWithinAvailability(d, hour);
                    const slotBookings = getBookingsForSlot(d, hour);
                    const occupied = slotBookings.length > 0;
                    const clickable = within && !occupied;

                    return (
                      <div
                        key={di}
                        onClick={() => clickable && handleSlotClick(d, hour)}
                        style={{
                          borderLeft: `1px solid ${C.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                          background: within
                            ? (C.isDark ? 'transparent' : 'transparent')
                            : (C.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)'),
                          cursor: clickable ? 'pointer' : 'default',
                          position: 'relative',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (clickable) (e.currentTarget as HTMLDivElement).style.background = C.accentLight;
                        }}
                        onMouseLeave={e => {
                          if (clickable) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        }}
                      >
                        {/* Free slot hint */}
                        {clickable && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-3.5 w-3.5" style={{ color: C.accent }} />
                          </div>
                        )}

                        {/* Booking blocks */}
                        {slotBookings.map(b => {
                          const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.CONFIRMED;
                          // Only render the block at its starting hour to avoid duplicates
                          const startHour = Math.floor(timeToMinutes(b.startTime) / 60);
                          if (startHour !== hour) return null;

                          const durationMins = timeToMinutes(b.endTime) - timeToMinutes(b.startTime);
                          const heightPx = Math.max((durationMins / 60) * CELL_H - 4, CELL_H - 4);

                          return (
                            <div
                              key={b.id}
                              style={{
                                position: 'absolute',
                                top: 2,
                                left: 2,
                                right: 2,
                                height: heightPx,
                                zIndex: 10,
                                background: sc.bg,
                                border: `1px solid ${sc.border}`,
                                borderRadius: 6,
                                padding: '2px 5px',
                                overflow: 'hidden',
                                pointerEvents: 'none',
                              }}
                            >
                              <p className="text-xs font-semibold leading-tight truncate" style={{ color: sc.text }}>
                                {b.clientName}
                              </p>
                              <p className="text-xs leading-tight truncate opacity-80" style={{ color: sc.text }}>
                                {b.service.name}
                              </p>
                              <p className="text-xs leading-tight opacity-70" style={{ color: sc.text }}>
                                {b.startTime}–{b.endTime}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {[
          { key: 'CONFIRMED', label: 'Confirmada' },
          { key: 'PENDING',   label: 'Pendiente' },
          { key: 'COMPLETED', label: 'Completada' },
        ].map(({ key, label }) => {
          const sc = STATUS_COLORS[key];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: sc.bg, border: `1px solid ${sc.border}` }} />
              <span className="text-xs" style={{ color: C.muted }}>{label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: C.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)', border: `1px solid ${C.border}` }} />
          <span className="text-xs" style={{ color: C.muted }}>Fuera de horario</span>
        </div>
      </div>

      {/* Modal */}
      {modalSlot && (
        <NewBookingModal
          slot={modalSlot}
          services={services.filter(s => s.isActive)}
          profiles={profiles}
          C={C}
          onClose={() => setModalSlot(null)}
          onCreated={() => { setModalSlot(null); fetchWeek(); }}
        />
      )}
    </>
  );
}
