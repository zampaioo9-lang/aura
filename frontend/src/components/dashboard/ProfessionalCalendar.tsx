import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle, XCircle, Check, Pencil, Calendar, Clock } from 'lucide-react';
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
  CONFIRMED: { bg: 'rgba(16,185,129,0.82)', text: '#ffffff', border: '#059669' },
  PENDING:   { bg: 'rgba(245,158,11,0.80)', text: '#ffffff', border: '#d97706' },
  COMPLETED: { bg: 'rgba(59,130,246,0.75)',  text: '#ffffff', border: '#3b82f6' },
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
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [dragging, setDragging] = useState<CalendarBooking | null>(null);
  const [dragOver, setDragOver] = useState<{ date: string; startMins: number } | null>(null);
  const [dragError, setDragError] = useState('');

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
      if (b.status === 'CANCELLED') return false;
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

  function wouldConflict(newDate: string, newStartMins: number, duration: number, excludeId: string): boolean {
    const newEndMins = newStartMins + duration;
    return bookings.some(b => {
      if (b.id === excludeId) return false;
      if (b.date.slice(0, 10) !== newDate) return false;
      if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return false;
      return newStartMins < timeToMinutes(b.endTime) && newEndMins > timeToMinutes(b.startTime);
    });
  }

  async function handleDragReschedule(booking: CalendarBooking, newDate: string, newStartMins: number) {
    setDragging(null);
    setDragOver(null);
    const duration = timeToMinutes(booking.endTime) - timeToMinutes(booking.startTime);
    if (newDate === booking.date.slice(0, 10) && newStartMins === timeToMinutes(booking.startTime)) return;
    try {
      await api.patch(`/bookings/${booking.id}/reschedule`, {
        date: newDate,
        startTime: minutesToTime(newStartMins),
        endTime: minutesToTime(newStartMins + duration),
      });
      fetchWeek();
    } catch (err: any) {
      setDragError(err?.response?.data?.error ?? 'No se pudo mover la cita.');
      setTimeout(() => setDragError(''), 4000);
    }
  }

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
          Clic en horario libre para crear · clic o arrastra una cita para moverla
        </p>
      </div>

      {dragError && (
        <div style={{
          marginBottom: 10, padding: '8px 14px', borderRadius: 8,
          background: 'rgba(239,68,68,0.10)', border: '1px solid #fca5a5',
          fontSize: 13, color: '#b91c1c',
        }}>
          {dragError}
        </div>
      )}

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

                    // Preview drag target in this cell
                    const isPreviewCell = dragging && dragOver?.date === toDateStr(d) && Math.floor((dragOver?.startMins ?? -1) / 60) === hour;
                    const previewDuration = dragging ? timeToMinutes(dragging.endTime) - timeToMinutes(dragging.startTime) : 0;
                    const previewConflict = isPreviewCell && dragOver ? wouldConflict(dragOver.date, dragOver.startMins, previewDuration, dragging!.id) : false;

                    return (
                      <div
                        key={di}
                        onClick={() => !dragging && clickable && handleSlotClick(d, hour)}
                        onDragOver={e => {
                          if (!dragging) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          const rect = e.currentTarget.getBoundingClientRect();
                          const offsetY = Math.max(0, e.clientY - rect.top);
                          const snapped = Math.round((offsetY / CELL_H) * 4) * 15;
                          setDragOver({ date: toDateStr(d), startMins: hour * 60 + Math.min(45, snapped) });
                        }}
                        onDragLeave={e => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                        }}
                        onDrop={e => {
                          e.preventDefault();
                          if (!dragging || !dragOver || previewConflict) return;
                          handleDragReschedule(dragging, dragOver.date, dragOver.startMins);
                        }}
                        style={{
                          borderLeft: `1px solid ${C.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                          background: within ? 'transparent' : (C.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)'),
                          cursor: clickable && !dragging ? 'pointer' : 'default',
                          position: 'relative',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (clickable && !dragging) (e.currentTarget as HTMLDivElement).style.background = C.accentLight;
                        }}
                        onMouseLeave={e => {
                          if (clickable && !dragging) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        }}
                      >
                        {/* Free slot hint */}
                        {clickable && !dragging && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-3.5 w-3.5" style={{ color: C.accent }} />
                          </div>
                        )}

                        {/* Drag preview */}
                        {isPreviewCell && dragOver && (
                          <div style={{
                            position: 'absolute',
                            top: ((dragOver.startMins % 60) / 60) * CELL_H + 2,
                            left: 2, right: 2,
                            height: Math.max((previewDuration / 60) * CELL_H - 4, 20),
                            zIndex: 20,
                            background: previewConflict ? 'rgba(239,68,68,0.25)' : 'rgba(108,99,255,0.25)',
                            border: `2px dashed ${previewConflict ? '#ef4444' : '#6c63ff'}`,
                            borderRadius: 6,
                            pointerEvents: 'none',
                          }} />
                        )}

                        {/* Booking blocks */}
                        {slotBookings.map(b => {
                          const sc = STATUS_COLORS[b.status] ?? STATUS_COLORS.CONFIRMED;
                          // Only render the block at its starting hour to avoid duplicates
                          const startHour = Math.floor(timeToMinutes(b.startTime) / 60);
                          if (startHour !== hour) return null;

                          const durationMins = timeToMinutes(b.endTime) - timeToMinutes(b.startTime);
                          const heightPx = Math.max((durationMins / 60) * CELL_H - 4, CELL_H - 4);

                          const isDraggingThis = dragging?.id === b.id;
                          return (
                            <div
                              key={b.id}
                              draggable
                              onClick={e => { e.stopPropagation(); if (!dragging) setSelectedBooking(b); }}
                              onDragStart={e => {
                                e.stopPropagation();
                                setDragging(b);
                                setDragError('');
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => { setDragging(null); setDragOver(null); }}
                              style={{
                                position: 'absolute',
                                top: 2,
                                left: 2,
                                right: 2,
                                height: heightPx,
                                zIndex: 10,
                                background: sc.bg,
                                borderLeft: `3px solid ${sc.border}`,
                                borderTop: `1px solid ${sc.border}`,
                                borderRight: `1px solid ${sc.border}`,
                                borderBottom: `1px solid ${sc.border}`,
                                borderRadius: 6,
                                padding: '3px 7px',
                                overflow: 'hidden',
                                cursor: isDraggingThis ? 'grabbing' : 'grab',
                                transition: 'filter 0.15s, opacity 0.15s',
                                opacity: isDraggingThis ? 0.35 : 1,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                              }}
                              onMouseEnter={e => { if (!isDraggingThis) (e.currentTarget as HTMLDivElement).style.filter = 'brightness(0.92)'; }}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.filter = 'none'}
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

      {/* New booking modal */}
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

      {/* Booking detail modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          C={C}
          onClose={() => setSelectedBooking(null)}
          onUpdated={() => { setSelectedBooking(null); fetchWeek(); }}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOOKING DETAIL MODAL
// ════════════════════════════════════════════════════════════════════
const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  PENDING:   'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW:   'No se presentó',
};

function BookingDetailModal({
  booking, C, onClose, onUpdated,
}: {
  booking: CalendarBooking;
  C: Colors;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState(booking.date.slice(0, 10));
  const [editTime, setEditTime] = useState(booking.startTime.slice(0, 5));
  const [error, setError] = useState('');

  const sc = STATUS_COLORS[booking.status] ?? STATUS_COLORS.CONFIRMED;

  async function doAction(action: 'confirm' | 'cancel' | 'complete') {
    setLoading(true);
    setError('');
    try {
      await api.put(`/bookings/${booking.id}/${action}`);
      onUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo actualizar la cita. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function doEdit() {
    setLoading(true);
    setError('');
    try {
      const durationMins = timeToMinutes(booking.endTime) - timeToMinutes(booking.startTime);
      const newStartMins = timeToMinutes(editTime);
      const newEndTime = minutesToTime(newStartMins + durationMins);
      await api.patch(`/bookings/${booking.id}/reschedule`, {
        date: editDate,
        startTime: editTime,
        endTime: newEndTime,
      });
      onUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo actualizar la cita. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const canConfirm  = booking.status === 'PENDING';
  const canComplete = booking.status === 'CONFIRMED';
  const canCancel   = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const canEdit     = booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';

  const dayLabel = new Date(booking.date.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          boxShadow: C.cardShadow,
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: C.muted, marginBottom: 4 }}>
              Detalle de cita
            </p>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: C.text, lineHeight: 1.2 }}>
              {booking.clientName}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
            }}>
              {STATUS_LABELS[booking.status] ?? booking.status}
            </span>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, padding: 2, lineHeight: 0 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px' }}>
          {/* Service */}
          <div style={{
            background: C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 14,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{booking.service.name}</p>
            <p style={{ fontSize: 12, color: C.muted }}>{booking.profile.title}</p>
          </div>

          {/* Date / time — view or edit */}
          {!editMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: C.accent, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Fecha</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: C.text, textTransform: 'capitalize' }}>{dayLabel}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} style={{ color: C.accent, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Horario</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{booking.startTime.slice(0,5)} – {booking.endTime.slice(0,5)} ({booking.service.durationMinutes} min)</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Nueva fecha</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13,
                    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${C.border}`, color: C.text,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Nueva hora inicio</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 13,
                    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${C.border}`, color: C.text,
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: '#b91c1c', marginBottom: 10 }}>{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!editMode ? (
              <>
                {canEdit && (
                  <ActionBtn
                    icon={<Pencil size={13} />}
                    label="Editar"
                    onClick={() => setEditMode(true)}
                    color="#6c63ff"
                    bg="rgba(108,99,255,0.10)"
                    disabled={loading}
                  />
                )}
                {canConfirm && (
                  <ActionBtn
                    icon={<Check size={13} />}
                    label="Confirmar"
                    onClick={() => doAction('confirm')}
                    color="#16a34a"
                    bg="rgba(34,197,94,0.12)"
                    disabled={loading}
                  />
                )}
                {canComplete && (
                  <ActionBtn
                    icon={<CheckCircle size={13} />}
                    label="Completar"
                    onClick={() => doAction('complete')}
                    color="#475569"
                    bg="rgba(100,116,139,0.12)"
                    disabled={loading}
                  />
                )}
                {canCancel && (
                  <ActionBtn
                    icon={<XCircle size={13} />}
                    label="Cancelar"
                    onClick={() => doAction('cancel')}
                    color="#b91c1c"
                    bg="rgba(239,68,68,0.10)"
                    disabled={loading}
                  />
                )}
              </>
            ) : (
              <>
                <ActionBtn
                  icon={<Check size={13} />}
                  label="Guardar cambios"
                  onClick={doEdit}
                  color="#16a34a"
                  bg="rgba(34,197,94,0.12)"
                  disabled={loading}
                />
                <ActionBtn
                  icon={<X size={13} />}
                  label="Cancelar edición"
                  onClick={() => { setEditMode(false); setError(''); }}
                  color={C.muted}
                  bg={C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                  disabled={loading}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, color, bg, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
  bg: string;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '7px 14px', borderRadius: 8, border: 'none',
        background: bg, color, fontSize: 12, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {icon}{label}
    </button>
  );
}
