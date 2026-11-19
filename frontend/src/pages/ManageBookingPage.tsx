import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, Clock, Video, Briefcase, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/client';

/**
 * Pagina publica (sin cuenta) para que el paciente gestione su cita desde el enlace de su correo:
 * ver su cita en su hora local, cancelarla o elegir otro horario. El enlace lleva un codigo secreto.
 */

interface BookingInfo {
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  clientName: string;
  professionalName: string;
  serviceName: string;
  durationMinutes: number;
  modalityLabel: string | null;
  dateLabel: string;
  startTime: string;
  meetingLink: string | null;
  canChange: boolean;
  blockedReason: string | null;
  contactUrl: string | null;
}
interface Slot { time: string; label: string; localDateLabel: string }
type Mode = 'view' | 'reschedule' | 'cancel';
type Screen =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'ready'; info: BookingInfo }
  | { kind: 'done'; title: string; body: string; info: BookingInfo | null };

const ACCENT = '#0d9488';
const apiError = (err: any, fallback: string): string => err?.response?.data?.error || fallback;

export default function ManageBookingPage() {
  const { token } = useParams<{ token: string }>();
  const [search] = useSearchParams();
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const [mode, setMode] = useState<Mode>('view');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // La pagina de una cita no debe aparecer en buscadores
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const load = async (preferred?: Mode) => {
    try {
      const res = await api.get<BookingInfo>(`/manage-booking/${token}`);
      const info = res.data;
      setScreen({ kind: 'ready', info });
      const wanted = preferred ?? (search.get('accion') === 'cancelar' ? 'cancel' : search.get('accion') === 'reagendar' ? 'reschedule' : 'view');
      setMode(info.canChange ? wanted : 'view');
    } catch {
      setScreen({ kind: 'invalid' });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const pickDate = async (value: string) => {
    setDate(value);
    setPicked(null);
    setSlots(null);
    setError('');
    if (!value) return;
    setLoadingSlots(true);
    try {
      const res = await api.get<{ slots: Slot[] }>(`/manage-booking/${token}/slots`, { params: { date: value } });
      setSlots(res.data.slots);
    } catch (err) {
      setError(apiError(err, 'No se pudieron cargar los horarios.'));
    } finally {
      setLoadingSlots(false);
    }
  };

  const confirmReschedule = async () => {
    if (!picked || !date || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/manage-booking/${token}/reschedule`, { date, startTime: picked.time });
      const res = await api.get<BookingInfo>(`/manage-booking/${token}`);
      setScreen({
        kind: 'done',
        title: 'Tu cita fue reagendada',
        body: 'Te enviamos un correo con el nuevo horario.',
        info: res.data,
      });
    } catch (err) {
      setError(apiError(err, 'No se pudo cambiar la cita. Intenta con otro horario.'));
      if (date) pickDate(date);
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/manage-booking/${token}/cancel`, { reason: reason.trim() || undefined });
      setScreen({ kind: 'done', title: 'Tu cita fue cancelada', body: 'Le avisamos a tu profesional. Si quieres, puedes agendar una nueva cita cuando lo necesites.', info: null });
    } catch (err) {
      setError(apiError(err, 'No se pudo cancelar la cita.'));
    } finally {
      setBusy(false);
    }
  };

  if (screen.kind === 'loading') {
    return (
      <div style={styles.page}>
        <div style={{ width: 32, height: 32, border: `3px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (screen.kind === 'invalid') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.icon, background: 'rgba(239,68,68,0.1)' }}><XCircle size={26} color="#ef4444" /></div>
          <h1 style={styles.title}>Enlace no válido</h1>
          <p style={styles.body}>No encontramos esta cita. Revisa que copiaste el enlace completo del correo.</p>
        </div>
      </div>
    );
  }

  if (screen.kind === 'done') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.icon, background: 'rgba(13,148,136,0.12)' }}><CheckCircle2 size={26} color={ACCENT} /></div>
          <h1 style={styles.title}>{screen.title}</h1>
          <p style={styles.body}>{screen.body}</p>
          {screen.info && <Summary info={screen.info} />}
        </div>
      </div>
    );
  }

  const { info } = screen;
  const active = info.status === 'PENDING' || info.status === 'CONFIRMED';
  const statusLabel =
    info.status === 'CANCELLED' ? 'Cita cancelada'
    : info.status === 'COMPLETED' ? 'Cita realizada'
    : info.status === 'NO_SHOW' ? 'Cita no realizada'
    : info.status === 'PENDING' ? 'Pendiente de confirmación'
    : 'Cita confirmada';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 4px' }}>Hola {info.clientName}</p>
        <h1 style={{ ...styles.title, marginBottom: 4 }}>Tu cita con {info.professionalName}</h1>
        <span style={{ ...styles.badge, background: active ? 'rgba(13,148,136,0.12)' : 'rgba(113,113,122,0.14)', color: active ? ACCENT : '#52525b' }}>{statusLabel}</span>

        <Summary info={info} />

        {active && info.meetingLink && (
          <a href={info.meetingLink} target="_blank" rel="noopener noreferrer" style={{ ...styles.primary, display: 'block', textDecoration: 'none', textAlign: 'center', marginTop: 16 }}>
            Unirme a la videollamada
          </a>
        )}

        {active && mode === 'view' && info.canChange && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button style={{ ...styles.outline, flex: 1 }} onClick={() => { setMode('reschedule'); setError(''); }}>Cambiar horario</button>
            <button style={{ ...styles.outline, flex: 1, color: '#dc2626', borderColor: '#fecaca' }} onClick={() => { setMode('cancel'); setError(''); }}>Cancelar cita</button>
          </div>
        )}

        {active && !info.canChange && (
          <div style={styles.notice}>
            <p style={{ margin: 0 }}>{info.blockedReason}</p>
            {info.contactUrl && (
              <a href={info.contactUrl} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 600, display: 'inline-block', marginTop: 8 }}>
                Escribir a mi profesional por WhatsApp
              </a>
            )}
          </div>
        )}

        {active && mode === 'reschedule' && (
          <div style={{ marginTop: 20, textAlign: 'left' }}>
            <h2 style={styles.h2}>Elige un nuevo horario</h2>
            <p style={{ ...styles.body, margin: '0 0 10px', fontSize: 13 }}>
              Elige el día en la agenda de tu profesional. Los horarios se muestran en tu hora local.
            </p>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => pickDate(e.target.value)}
              style={styles.input}
            />
            {loadingSlots && <p style={{ ...styles.body, marginTop: 12 }}>Buscando horarios…</p>}
            {slots && slots.length === 0 && <p style={{ ...styles.body, marginTop: 12 }}>No hay horarios libres ese día. Prueba con otra fecha.</p>}
            {slots && slots.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {slots.map(s => {
                  const sel = picked?.time === s.time;
                  return (
                    <button
                      key={s.time}
                      onClick={() => setPicked(s)}
                      style={{
                        padding: '8px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                        border: `1.5px solid ${sel ? ACCENT : '#e4e4e7'}`,
                        background: sel ? 'rgba(13,148,136,0.12)' : '#fff',
                        color: sel ? ACCENT : '#18181b', fontWeight: sel ? 700 : 500,
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
            {picked && <p style={{ ...styles.body, marginTop: 10, fontSize: 13 }}>Nuevo horario: <strong>{picked.localDateLabel}, {picked.label}</strong></p>}
            {error && <p style={styles.error}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button style={{ ...styles.outline, flex: 1 }} onClick={() => { setMode('view'); setError(''); }}>Volver</button>
              <button style={{ ...styles.primary, flex: 1, opacity: picked && !busy ? 1 : 0.5, cursor: picked && !busy ? 'pointer' : 'not-allowed' }} disabled={!picked || busy} onClick={confirmReschedule}>
                {busy ? 'Guardando…' : 'Confirmar cambio'}
              </button>
            </div>
          </div>
        )}

        {active && mode === 'cancel' && (
          <div style={{ marginTop: 20, textAlign: 'left' }}>
            <h2 style={styles.h2}>¿Quieres cancelar tu cita?</h2>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Motivo (opcional)"
              maxLength={500}
              style={{ ...styles.input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
            />
            {error && <p style={styles.error}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button style={{ ...styles.outline, flex: 1 }} onClick={() => { setMode('view'); setError(''); }}>No, volver</button>
              <button style={{ ...styles.primary, flex: 1, background: '#dc2626', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={confirmCancel}>
                {busy ? 'Cancelando…' : 'Sí, cancelar mi cita'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ info }: { info: BookingInfo }) {
  const row = (icon: React.ReactNode, text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f4f4f5', textAlign: 'left' }}>
      <span style={{ color: ACCENT, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 14, color: '#18181b' }}>{text}</span>
    </div>
  );
  return (
    <div style={{ marginTop: 16 }}>
      {row(<Briefcase size={16} />, `${info.serviceName} (${info.durationMinutes} min)`)}
      {row(<CalendarDays size={16} />, info.dateLabel)}
      {row(<Clock size={16} />, info.startTime)}
      {info.modalityLabel && row(<Video size={16} />, info.modalityLabel)}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Inter','Plus Jakarta Sans',system-ui,sans-serif" },
  card: { background: '#fff', borderRadius: 16, padding: '36px 28px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' },
  icon: { width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  title: { margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#18181b' },
  h2: { margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#18181b' },
  body: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#52525b' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600 },
  primary: { padding: '12px 16px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  outline: { padding: '11px 16px', background: '#fff', color: '#18181b', border: '1.5px solid #d4d4d8', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 14, color: '#18181b', background: '#fafafa', boxSizing: 'border-box' },
  notice: { marginTop: 18, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, lineHeight: 1.5, color: '#78350f', textAlign: 'left' },
  error: { margin: '10px 0 0', fontSize: 13, color: '#dc2626' },
};
