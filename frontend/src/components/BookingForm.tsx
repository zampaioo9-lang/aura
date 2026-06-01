import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Loader2, X } from 'lucide-react';
import api from '../api/client';
import PhoneInput from './PhoneInput';

interface BookingFormProps {
  profileId: string;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: 'white',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

export default function BookingForm({ profileId, serviceId, serviceName, onClose, onSuccess }: BookingFormProps) {
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    date: '',
    startTime: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  useEffect(() => {
    if (!form.date) { setSlots([]); setSlotsError(''); return; }
    setSlotsLoading(true);
    setSlotsError('');
    setForm(f => ({ ...f, startTime: '' }));
    api.get('/bookings/available-slots', { params: { serviceId, profileId, date: form.date } })
      .then(res => {
        setSlots(res.data.slots || []);
        if (!(res.data.slots || []).length) setSlotsError('No hay horarios disponibles para esta fecha');
      })
      .catch(() => { setSlotsError('Error al cargar horarios'); setSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [form.date, serviceId, profileId]);

  const handlePhoneChange = (value: string) => {
    setForm(f => ({ ...f, clientPhone: value }));
    const digits = value.replace(/\D/g, '');
    if (digits.length > 6 && !/^\+\d{8,15}$/.test(value)) setPhoneError('Número inválido');
    else setPhoneError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = form.clientPhone.replace(/\D/g, '');
    if (digits.length > 6 && !/^\+\d{8,15}$/.test(form.clientPhone)) { setPhoneError('Número inválido'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/bookings', {
        profileId, serviceId,
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined,
        clientNotes: form.notes || undefined,
        date: form.date,
        startTime: form.startTime,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al reservar');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'rgba(12,9,28,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, maxWidth: 440, width: '100%', padding: 28, overflowY: 'auto', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: 0 }}>Reservar</h3>
            <p style={{ color: 'rgba(167,139,250,0.85)', fontSize: 13, margin: '4px 0 0' }}>{serviceName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px 7px', lineHeight: 1 }}>
            <X size={14} />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#fca5a5', fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input
              type="text" required value={form.clientName}
              onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(107,99,255,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email" required value={form.clientEmail}
              onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(107,99,255,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div>
            <PhoneInput
              label="Teléfono WhatsApp"
              optional
              value={form.clientPhone}
              onChange={handlePhoneChange}
              error={phoneError}
              isDark
            />
          </div>

          <div>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date" required value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(107,99,255,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          {/* Time slots */}
          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={11} />
              Horario
            </label>

            {!form.date && (
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, margin: 0, padding: '10px 0' }}>
                Selecciona una fecha para ver horarios disponibles
              </p>
            )}

            {form.date && slotsLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '10px 0' }}>
                <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                Cargando horarios...
              </div>
            )}

            {form.date && !slotsLoading && slotsError && (
              <p style={{ color: 'rgba(251,191,36,0.75)', fontSize: 13, margin: 0, padding: '8px 0' }}>{slotsError}</p>
            )}

            {form.date && !slotsLoading && slots.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 152, overflowY: 'auto' }}>
                {slots.map(slot => (
                  <button
                    key={slot} type="button"
                    onClick={() => setForm(f => ({ ...f, startTime: slot }))}
                    style={{
                      padding: '6px 4px',
                      fontSize: 12,
                      fontWeight: 500,
                      borderRadius: 8,
                      border: '1px solid',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                      ...(form.startTime === slot
                        ? { background: 'linear-gradient(135deg, #6b63ff, #9333ea)', color: 'white', borderColor: 'transparent' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.09)' }
                      ),
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} maxLength={500}
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(107,99,255,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: '11px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={loading || !form.startTime || !!phoneError}
              style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg, #6b63ff, #9333ea)', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (loading || !form.startTime || !!phoneError) ? 0.45 : 1, transition: 'opacity 0.2s', fontFamily: 'inherit' }}
            >
              {loading ? 'Reservando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
