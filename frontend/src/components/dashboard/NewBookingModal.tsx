import { useState } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, FileText, Briefcase } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../Toast';
import { generateTimeOptions } from '../../lib/utils';

interface Colors {
  cardBg: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  isDark: boolean;
  mainBg: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
  profileId: string;
}

interface ModalSlot {
  date: string;
  time: string;
}

interface Props {
  slot: ModalSlot;
  services: Service[];
  profiles: { id: string }[];
  C: Colors;
  onClose: () => void;
  onCreated: () => void;
}

const TIME_OPTIONS = generateTimeOptions(0, 1440, 15);

export default function NewBookingModal({ slot, services, C, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    date: slot.date,
    startTime: slot.time,
    serviceId: services[0]?.id ?? '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientNotes: '',
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  const selectedService = services.find(s => s.id === form.serviceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.serviceId) { setError('Selecciona un servicio.'); return; }
    if (!form.clientName.trim()) { setError('El nombre del cliente es requerido.'); return; }
    if (!form.clientEmail.trim()) { setError('El email del cliente es requerido.'); return; }
    if (!form.date || !form.startTime) { setError('Fecha y hora son requeridas.'); return; }

    setSubmitting(true);
    try {
      const profileId = selectedService?.profileId;
      if (!profileId) { setError('Servicio no tiene perfil asociado.'); setSubmitting(false); return; }

      await api.post('/bookings/professional', {
        profileId,
        serviceId: form.serviceId,
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientPhone: form.clientPhone.trim() || undefined,
        clientNotes: form.clientNotes.trim() || undefined,
        date: form.date,
        startTime: form.startTime,
      });

      toast('Cita creada y confirmada', 'success');
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Error al crear la cita. Verifica los datos.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgb(248,247,252)',
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: 8,
    padding: '8px 12px',
    width: '100%',
    fontSize: 14,
    outline: 'none',
  } as React.CSSProperties;

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: C.muted,
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: C.cardBg, border: `1px solid ${C.border}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <h2 className="font-semibold text-base" style={{ color: C.text }}>Nueva cita</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: C.muted }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}><Calendar className="h-3.5 w-3.5" /> Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}><Clock className="h-3.5 w-3.5" /> Hora inicio</label>
              <select
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
                style={inputStyle}
                required
              >
                {TIME_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Service */}
          <div>
            <label style={labelStyle}><Briefcase className="h-3.5 w-3.5" /> Servicio</label>
            {services.length === 0 ? (
              <p className="text-sm" style={{ color: C.muted }}>No hay servicios activos.</p>
            ) : (
              <select
                value={form.serviceId}
                onChange={e => set('serviceId', e.target.value)}
                style={inputStyle}
                required
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min)
                  </option>
                ))}
              </select>
            )}
          </div>

          <hr style={{ borderColor: C.border }} />

          {/* Client Name */}
          <div>
            <label style={labelStyle}><User className="h-3.5 w-3.5" /> Nombre del cliente *</label>
            <input
              type="text"
              placeholder="María García"
              value={form.clientName}
              onChange={e => set('clientName', e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Client Email */}
          <div>
            <label style={labelStyle}><Mail className="h-3.5 w-3.5" /> Email del cliente *</label>
            <input
              type="email"
              placeholder="cliente@email.com"
              value={form.clientEmail}
              onChange={e => set('clientEmail', e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* Client Phone */}
          <div>
            <label style={labelStyle}><Phone className="h-3.5 w-3.5" /> Teléfono (opcional)</label>
            <input
              type="tel"
              placeholder="+34612345678"
              value={form.clientPhone}
              onChange={e => set('clientPhone', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}><FileText className="h-3.5 w-3.5" /> Notas internas (opcional)</label>
            <textarea
              placeholder="Notas sobre el cliente o la cita..."
              value={form.clientNotes}
              onChange={e => set('clientNotes', e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: C.muted }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || services.length === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
              style={{
                background: C.accent,
                color: 'white',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Creando...' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
