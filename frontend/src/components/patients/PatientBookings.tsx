import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../../api/client';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; durationMinutes: number; price: number; currency: string; sessionModality?: string | null };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  CONFIRMED:  { label: 'Confirmada',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  Icon: CheckCircle },
  COMPLETED:  { label: 'Completada',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  Icon: CheckCircle },
  PENDING:    { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  Icon: AlertCircle },
  CANCELLED:  { label: 'Cancelada',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   Icon: XCircle },
};

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function PatientBookings({ email, name, C }: { email: string; name: string; C: Colors }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/bookings/client/${encodeURIComponent(email)}`, { params: { name } })
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email, name]);

  const upcoming = bookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED');
  const past     = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');
  const _acNums = C.accent.match(/\d+/g) ?? ['45','212','191'];
  const [_r, _g, _b] = _acNums.map(Number);

  return (
    <div style={{
      background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${C.border}`, borderRadius: 16,
      padding: '18px 20px', marginBottom: 20,
      boxShadow: C.isDark ? 'none' : `0 4px 24px rgba(${_r},${_g},${_b},0.08)`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} style={{ color: C.accent }} />
          <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Historial de citas</span>
        </div>
        <span style={{ fontSize: 12, color: C.muted, background: C.accentLight, borderRadius: 20, padding: '2px 10px' }}>
          {bookings.length} {bookings.length === 1 ? 'sesión' : 'sesiones'}
        </span>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13, padding: '8px 0' }}>
          <Loader size={14} className="animate-spin" /> Cargando...
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Sin citas registradas aún.</p>
      )}

      {!loading && bookings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Upcoming first */}
          {upcoming.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 2px' }}>Próximas</p>
              {upcoming.map(b => <BookingRow key={b.id} b={b} C={C} />)}
            </>
          )}
          {past.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 2px' }}>Historial</p>
              {past.map(b => <BookingRow key={b.id} b={b} C={C} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const MODALITY_LABEL: Record<string, string> = {
  online: 'Online',
  in_person: 'Presencial',
  hybrid: 'Híbrida',
};

function BookingRow({ b, C }: { b: Booking; C: Colors }) {
  const s = STATUS_MAP[b.status] ?? STATUS_MAP['PENDING'];
  const { Icon } = s;
  const dateStr = b.date.slice(0, 10);
  const dateObj = new Date(dateStr + 'T12:00:00');
  const modality = b.service.sessionModality ? MODALITY_LABEL[b.service.sessionModality] ?? b.service.sessionModality : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 10,
      background: C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      border: `1px solid ${C.border}`,
    }}>
      {/* Date block */}
      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: C.text, lineHeight: 1, margin: 0 }}>
          {dateObj.getDate()}
        </p>
        <p style={{ fontSize: 10, color: C.muted, margin: 0, textTransform: 'uppercase' }}>
          {dateObj.toLocaleDateString('es-MX', { month: 'short' })}
        </p>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 36, background: C.border, flexShrink: 0 }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {b.service.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
          <Clock size={11} style={{ color: C.muted, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.muted }}>{fmt12(b.startTime)} · {b.service.durationMinutes} min</span>
          {modality && (
            <span style={{ fontSize: 10, color: C.accent, background: C.accentLight, borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
              {modality}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: s.bg, borderRadius: 20, padding: '3px 9px', flexShrink: 0 }}>
        <Icon size={11} style={{ color: s.color }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</span>
      </div>
    </div>
  );
}
