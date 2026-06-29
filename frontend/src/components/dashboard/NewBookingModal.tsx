import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, User, Mail, Phone, FileText, Briefcase, UserPlus, ChevronDown, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../Toast';
import CustomDatePicker from '../CustomDatePicker';
import CustomSelect from '../CustomSelect';
import PhoneInput from '../PhoneInput';

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

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
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
  prefillClient?: { name: string; email: string; phone: string };
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function NewBookingModal({ slot, services, C, onClose, onCreated, prefillClient }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    date: slot.date,
    startTime: slot.time,
    serviceId: services[0]?.id ?? '',
    clientName: prefillClient?.name ?? '',
    clientEmail: prefillClient?.email ?? '',
    clientPhone: prefillClient?.phone ?? '',
    clientNotes: '',
  });

  // Available time slots from backend
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState('');
  const [availableDays, setAvailableDays] = useState<Set<number>>(new Set());

  const selectedService = services.find(s => s.id === form.serviceId);

  // Fetch availability days-of-week when service changes
  useEffect(() => {
    if (!selectedService) { setAvailableDays(new Set()); return; }
    api.get(`/availability/profile/${selectedService.profileId}`)
      .then(r => {
        const days = new Set<number>((r.data as { dayOfWeek: number }[]).map(s => s.dayOfWeek));
        setAvailableDays(days);
      })
      .catch(() => setAvailableDays(new Set()));
  }, [selectedService?.profileId]);

  // Fetch available slots whenever service or date changes
  useEffect(() => {
    if (!form.serviceId || !form.date || !selectedService) {
      setSlots([]);
      setSlotsMsg('');
      return;
    }
    setLoadingSlots(true);
    setSlotsMsg('');
    setForm(prev => ({ ...prev, startTime: '' }));
    api.get(`/bookings/available-slots?profileId=${selectedService.profileId}&serviceId=${form.serviceId}&date=${form.date}`)
      .then(r => {
        const s: string[] = r.data.slots ?? [];
        setSlots(s);
        if (s.length > 0) setForm(prev => ({ ...prev, startTime: s[0] }));
        else setSlotsMsg('Sin horarios disponibles para este día.');
      })
      .catch(() => setSlotsMsg('No se pudieron cargar los horarios.'))
      .finally(() => setLoadingSlots(false));
  }, [form.serviceId, form.date]);

  // Patient autocomplete
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/clients').then(r => setPatients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        nameInputRef.current && !nameInputRef.current.contains(e.target as Node)
      ) setShowSuggestions(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const query = form.clientName.trim().toLowerCase();
  const suggestions = query.length > 0
    ? patients.filter(p => p.name.toLowerCase().includes(query))
    : patients;
  const hasExactMatch = patients.some(p => p.name.toLowerCase() === query);

  function selectPatient(p: Patient) {
    setForm(prev => ({
      ...prev,
      clientName: p.name,
      clientEmail: p.email ?? prev.clientEmail,
      clientPhone: p.phone ?? prev.clientPhone,
    }));
    setShowSuggestions(false);
  }

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.serviceId)         { setError('Selecciona un servicio.'); return; }
    if (!form.clientName.trim()) { setError('El nombre del cliente es requerido.'); return; }
    if (!form.clientEmail.trim()){ setError('El email del cliente es requerido.'); return; }
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
      setError(err?.response?.data?.error ?? 'Error al crear la cita. Verifica los datos.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgb(248,247,252)',
    border: `1px solid ${C.border}`,
    color: C.text,
    borderRadius: 8,
    padding: '8px 12px',
    width: '100%',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box' as const,
  };

  const selectTrigger: React.CSSProperties = {
    ...inputStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: C.accent,
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const serviceOptions = services.map(s => ({
    value: s.id,
    label: `${s.name} (${s.durationMinutes} min)`,
  }));

  const slotOptions = slots.map(s => ({ value: s, label: fmt12(s) }));

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-[20px] sm:rounded-2xl overflow-hidden"
        style={{ background: C.cardBg, border: `1px solid ${C.border}`, maxHeight: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px) - 24px)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="font-semibold text-base" style={{ color: C.text }}>Nueva cita</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: C.muted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">

          {/* 1. Service — first so we know profileId + duration */}
          <div>
            <label style={labelStyle}><Briefcase className="h-3.5 w-3.5" /> Servicio</label>
            {services.length === 0 ? (
              <p className="text-sm" style={{ color: C.muted }}>No hay servicios activos.</p>
            ) : (
              <CustomSelect
                value={form.serviceId}
                onChange={v => set('serviceId', v)}
                options={serviceOptions}
                dark={C.isDark}
                accent={C.accent}
                triggerStyle={selectTrigger}
              />
            )}
          </div>

          {/* 2. Date */}
          <div>
            <label style={labelStyle}><Calendar className="h-3.5 w-3.5" /> Fecha</label>
            <CustomDatePicker
              value={form.date}
              onChange={v => set('date', v)}
              accent={C.accent}
              isDark={C.isDark}
              triggerStyle={inputStyle}
              highlightedDays={availableDays}
            />
          </div>

          {/* 3. Time — from real availability slots */}
          <div>
            <label style={labelStyle}><Clock className="h-3.5 w-3.5" /> Hora</label>
            {loadingSlots ? (
              <div style={{ ...inputStyle, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Cargando horarios...
              </div>
            ) : slotsMsg ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 8, background: C.isDark ? 'rgba(239,68,68,0.10)' : '#fef2f2', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13 }}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {slotsMsg}
              </div>
            ) : slots.length > 0 ? (
              <CustomSelect
                value={form.startTime}
                onChange={v => set('startTime', v)}
                options={slotOptions}
                dark={C.isDark}
                accent={C.accent}
                triggerStyle={selectTrigger}
              />
            ) : (
              <div style={{ ...inputStyle, color: C.muted }}>Selecciona un servicio y fecha primero</div>
            )}
          </div>

          <hr style={{ borderColor: C.border }} />

          {/* 4. Client name — combobox */}
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}><User className="h-3.5 w-3.5" /> Nombre del cliente *</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="Buscar paciente o nuevo nombre..."
                value={form.clientName}
                onChange={e => { set('clientName', e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                style={{ ...inputStyle, paddingRight: 32 }}
                autoComplete="off"
                required
              />
              <ChevronDown
                className="h-4 w-4"
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: showSuggestions ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                  color: C.muted, pointerEvents: 'none', transition: 'transform 0.2s',
                }}
              />
            </div>

            {showSuggestions && (
              <div ref={dropdownRef} style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: C.isDark ? '#1a1a2e' : 'white',
                border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 4,
                maxHeight: 200, overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}>
                {suggestions.length === 0 && !form.clientName.trim() && (
                  <p style={{ padding: '10px 14px', fontSize: 13, color: C.muted }}>Escribe para buscar pacientes...</p>
                )}
                {suggestions.map(p => (
                  <button key={p.id} type="button" onMouseDown={() => selectPatient(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, color: C.text }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: C.accentLight, color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                      {p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: C.text }}>{p.name}</p>
                      {p.email && <p style={{ fontSize: 11, margin: 0, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>}
                    </div>
                  </button>
                ))}
                {form.clientName.trim() && !hasExactMatch && (
                  <button type="button" onMouseDown={() => setShowSuggestions(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: C.accent }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <UserPlus className="h-4 w-4" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Nuevo cliente: <strong>"{form.clientName.trim()}"</strong></span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 5. Email */}
          <div>
            <label style={labelStyle}><Mail className="h-3.5 w-3.5" /> Email del cliente *</label>
            <input type="email" placeholder="cliente@email.com" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} style={inputStyle} required />
          </div>

          {/* 6. Phone */}
          <div>
            <label style={labelStyle}><Phone className="h-3.5 w-3.5" /> Teléfono (opcional)</label>
            <PhoneInput value={form.clientPhone} onChange={val => set('clientPhone', val)} placeholder="55 1234 5678" isDark={C.isDark} accent={C.accent} />
          </div>

          {/* 7. Notes */}
          <div>
            <label style={labelStyle}><FileText className="h-3.5 w-3.5" /> Notas internas (opcional)</label>
            <textarea placeholder="Notas sobre el cliente o la cita..." value={form.clientNotes} onChange={e => set('clientNotes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: C.muted }}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting || services.length === 0 || !form.startTime}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: C.accent, color: 'white', opacity: submitting || !form.startTime ? 0.6 : 1, cursor: !form.startTime ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Creando...' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
