import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, Plus, Power, Sparkles, GripVertical, Pencil, CalendarDays, Layers, Ban, Settings2, Bell } from 'lucide-react';
import DatePickerField from '../components/DatePickerField';
import CustomSelect from '../components/CustomSelect';
import api from '../api/client';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import ProGate from '../components/ProGate';
import {
  DAY_NAMES_SHORT, TIMEZONES, LANGUAGES,
  type AvailabilitySlot, type BookingSettings,
  type ScheduleBlock, type ServiceAvailabilitySlot,
} from '../types/availability';
import { useServices, type Service } from '../hooks/useServices';
import ServiceFormModal from '../components/ServiceFormModal';
import QuickTemplates from '../components/availability/QuickTemplates';

// ── Google Fonts ─────────────────────────────────────────────────────
const FONT_LINK = document.createElement('link');
FONT_LINK.rel = 'stylesheet';
FONT_LINK.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap';
if (!document.head.querySelector('[href*="Syne"]')) document.head.appendChild(FONT_LINK);

// ── Helpers ──────────────────────────────────────────────────────────
function t2m(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function m2t(m: number) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

function genTimeOpts() {
  const opts: { value: string; label: string }[] = [];
  for (let m = 0; m < 1440; m += 30) {
    const h = Math.floor(m / 60), min = m % 60;
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    opts.push({ value: m2t(m), label: `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}` });
  }
  return opts;
}
const TIME_OPTS = genTimeOpts();
const SERVICE_COLORS = ['#2dd4bf', '#ff6584', '#43d9ad', '#f6c90e', '#ff8c42', '#a8ff78', '#ff61d2'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// ── Sub-components ───────────────────────────────────────────────────
function Dot({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: on ? '#2dd4bf' : 'var(--sc-border)', position: 'relative', transition: 'background .2s',
      }}
    >
      <span style={{
        position: 'absolute', width: 18, height: 18, background: 'white', borderRadius: '50%',
        top: 3, left: on ? 23 : 3, transition: 'left .2s',
      }} />
    </button>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--sc-side)', border: '1px solid var(--sc-border)', borderRadius: 12,
      padding: 24, marginBottom: 20,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.10)', ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ dot, title, action }: { dot: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15 }}>
        <Dot color={dot} /> {title}
      </div>
      {action}
    </div>
  );
}

function BtnPrimary({ onClick, children, disabled = false, small = false }: {
  onClick?: () => void; children: React.ReactNode; disabled?: boolean; small?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: '#2dd4bf', color: 'white', border: 'none', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
      padding: small ? '6px 12px' : '10px 20px', fontSize: small ? 13 : 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
      transition: 'background .15s', opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  );
}

function BtnGhost({ onClick, children, small = false }: { onClick?: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--sc-inner)', color: 'var(--sc-text)', border: '1px solid var(--sc-border)', borderRadius: 8, cursor: 'pointer',
      padding: small ? '6px 12px' : '10px 20px', fontSize: small ? 13 : 14, fontFamily: 'DM Sans, sans-serif',
      fontWeight: 500, transition: 'all .15s',
    }}>{children}</button>
  );
}

function BtnDanger({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'rgba(255,101,132,0.15)', color: '#ff6584', border: '1px solid rgba(255,101,132,0.3)',
      borderRadius: 8, cursor: 'pointer', padding: '6px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    }}>{children}</button>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string | number; onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--sc-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</label>
      <CustomSelect
        value={String(value)}
        onChange={onChange}
        options={options.map(o => ({ value: String(o.value), label: o.label }))}
      />
    </div>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: 'var(--sc-inner)', border: '1px solid var(--sc-border)', borderRadius: 8, padding: '8px 12px',
      color: 'var(--sc-text)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', width: 130,
    }}>
      {TIME_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function DayChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 20, border: `1px solid ${active ? '#2dd4bf' : 'var(--sc-border)'}`,
      background: active ? 'rgba(45,212,191,0.18)' : 'var(--sc-inner)', color: active ? '#2dd4bf' : 'var(--sc-muted)',
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400, fontFamily: 'DM Sans, sans-serif',
      transition: 'all .15s',
    }}>{label}</button>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 20px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--sc-border)' }} />
      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--sc-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--sc-border)' }} />
    </div>
  );
}

function ToggleRow({ label, desc, on, onChange }: { label: string; desc?: string | ReactNode; on: boolean; onChange: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--sc-border)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--sc-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: DISPONIBILIDAD
// ════════════════════════════════════════════════════════════════════
function TabDisponibilidad({ profileId }: { profileId: string }) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDays, setActiveDays] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [franjas, setFranjas] = useState<{ id?: string; startTime: string; endTime: string }[]>([]);
  const [settings, setSettings] = useState<Partial<BookingSettings>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cfgRes] = await Promise.allSettled([
        api.get('/availability/me'),
        api.get('/booking-settings', { params: { profileId } }),
      ]);
      if (sRes.status === 'fulfilled') {
        const all: AvailabilitySlot[] = (sRes.value.data as AvailabilitySlot[]).filter(s => s.profileId === profileId);
        setSlots(all);
        const days = [...new Set(all.filter(s => s.isActive).map(s => s.dayOfWeek))];
        setActiveDays(days);
        if (days.length > 0 && selectedDay === null) setSelectedDay(days[0]);
      }
      if (cfgRes.status === 'fulfilled') setSettings(cfgRes.value.data);
    } finally { setLoading(false); }
  }, [profileId]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  useEffect(() => {
    if (selectedDay === null) { setFranjas([]); return; }
    const daySlots = slots.filter(s => s.dayOfWeek === selectedDay && s.isActive)
      .map(s => ({ id: s.id, startTime: s.startTime, endTime: s.endTime }));
    setFranjas(daySlots.length > 0 ? daySlots : []);
  }, [selectedDay, slots]);

  const toggleDay = (day: number) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    setSelectedDay(day);
    if (!franjas.length) setFranjas([{ startTime: '09:00', endTime: '17:00' }]);
  };

  const addFranja = () => {
    const last = franjas[franjas.length - 1];
    const startM = last ? t2m(last.endTime) : t2m('09:00');
    const endM = Math.min(startM + 60, 1410);
    setFranjas(prev => [...prev, { startTime: m2t(startM), endTime: m2t(endM) }]);
  };

  const handleSave = async () => {
    if (selectedDay === null) return;
    setSaving(true);
    try {
      const existing = slots.filter(s => s.dayOfWeek === selectedDay);
      await Promise.all(existing.map(s => api.delete(`/availability/${s.id}`)));
      if (franjas.length > 0 && activeDays.includes(selectedDay)) {
        await api.post('/availability/bulk', { profileId, slots: franjas.map(f => ({ dayOfWeek: selectedDay, startTime: f.startTime, endTime: f.endTime })) });
      }
      toast('Horarios guardados');
      fetchSlots();
    } catch (err: any) { toast(err.response?.data?.error || 'Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const handleSaveZone = async () => {
    setSavingSettings(true);
    try {
      await api.put('/booking-settings', settings, { params: { profileId } });
      toast('Zona horaria guardada');
    } catch { toast('Error al guardar', 'error'); }
    finally { setSavingSettings(false); }
  };

  const handleApplyTemplate = async (templateSlots: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
    await Promise.all(slots.map(s => api.delete(`/availability/${s.id}`)));
    await api.post('/availability/bulk', { profileId, slots: templateSlots });
    toast('Plantilla aplicada');
    await fetchSlots();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div style={{ width: 32, height: 32, border: '3px solid rgba(45,212,191,0.3)', borderTopColor: '#2dd4bf', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;

  const dayHours = (day: number) => slots.filter(s => s.dayOfWeek === day && s.isActive).reduce((acc, s) => acc + (t2m(s.endTime) - t2m(s.startTime)) / 60, 0);

  return (
    <>
      {/* Días laborables */}
      <Card>
        <CardHeader dot="#2dd4bf" title="Días laborables" action={
          <button onClick={() => setShowTemplates(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 500, background: 'rgba(45,212,191,0.12)', color: '#2dd4bf' }}>
            <Sparkles size={13} /> Aplicar plantilla
          </button>
        } />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DAY_ORDER.map(d => (
            <DayChip key={d} label={DAY_NAMES_SHORT[d]} active={activeDays.includes(d)} onClick={() => toggleDay(d)} />
          ))}
        </div>
      </Card>

      {/* Horario de atención */}
      <Card>
        <CardHeader dot="#43d9ad" title="Horario de atención" action={
          activeDays.length > 0 ? (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {DAY_ORDER.filter(d => activeDays.includes(d)).map(d => (
                <button key={d} onClick={() => setSelectedDay(d)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans',
                  background: selectedDay === d ? '#2dd4bf' : 'var(--sc-inner)', color: selectedDay === d ? 'white' : 'var(--sc-muted)',
                }}>{DAY_NAMES_SHORT[d]}</button>
              ))}
            </div>
          ) : undefined
        } />

        {selectedDay === null ? (
          <p style={{ color: 'var(--sc-muted)', fontSize: 14 }}>Selecciona días laborables primero</p>
        ) : (
          <>
            {franjas.length === 0 && <p style={{ color: 'var(--sc-muted)', fontSize: 14, marginBottom: 16 }}>Sin franjas — pulsa "+ Añadir franja"</p>}
            {franjas.map((f, idx) => {
              const labels = ['MAÑANA', 'TARDE', 'NOCHE'];
              return (
                <div key={idx} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: 'var(--sc-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {labels[idx] ?? `FRANJA ${idx + 1}`}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <TimeSelect value={f.startTime} onChange={v => setFranjas(prev => prev.map((x, i) => i === idx ? { ...x, startTime: v } : x))} />
                    <span style={{ color: 'var(--sc-muted)', fontSize: 13 }}>–</span>
                    <TimeSelect value={f.endTime} onChange={v => setFranjas(prev => prev.map((x, i) => i === idx ? { ...x, endTime: v } : x))} />
                    <button
                      onClick={() => setFranjas(prev => prev.filter((_, i) => i !== idx))}
                      title="Eliminar franja"
                      style={{ background: 'rgba(255,101,132,0.15)', border: '1px solid rgba(255,101,132,0.3)', borderRadius: 8, cursor: 'pointer', padding: '6px 10px', color: '#ff6584', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--sc-border)', gap: 8, flexWrap: 'wrap' }}>
              <BtnGhost small onClick={addFranja}>+ Añadir franja</BtnGhost>
              <BtnPrimary onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</BtnPrimary>
            </div>
          </>
        )}
      </Card>

      {/* Resumen semanal */}
      <Card>
        <CardHeader dot="#f6c90e" title="Resumen semanal" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {DAY_ORDER.map(d => {
            const h = dayHours(d);
            return (
              <div key={d} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 8, background: h > 0 ? 'rgba(45,212,191,0.10)' : 'var(--sc-inner)', border: `1px solid ${h > 0 ? '#2dd4bf40' : 'var(--sc-border)'}` }}>
                <div style={{ fontSize: 10, color: 'var(--sc-muted)', marginBottom: 4 }}>{DAY_NAMES_SHORT[d]}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: h > 0 ? '#2dd4bf' : 'var(--sc-muted2)' }}>{h > 0 ? `${h.toFixed(1)}h` : '—'}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Zona horaria */}
      <Card>
        <CardHeader dot="#f6c90e" title="Zona horaria y región" />
        <div className="sc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormSelect
            label="Zona horaria"
            value={settings.timezone ?? 'America/Mexico_City'}
            onChange={v => setSettings(s => ({ ...s, timezone: v }))}
            options={TIMEZONES.map(tz => ({ value: tz, label: tz.replace('_', ' ') }))}
          />
          <FormSelect
            label="Idioma de la agenda"
            value={settings.language ?? 'es'}
            onChange={v => setSettings(s => ({ ...s, language: v }))}
            options={LANGUAGES.map(l => ({ value: l.value, label: l.label }))}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <BtnPrimary onClick={handleSaveZone} disabled={savingSettings}>{savingSettings ? 'Guardando...' : 'Guardar zona'}</BtnPrimary>
        </div>
      </Card>

      <QuickTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApply={handleApplyTemplate}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: SERVICIOS
// ════════════════════════════════════════════════════════════════════
type SvcFilter = 'active' | 'inactive' | 'all';

function TabServicios({ profileId, isPro = false }: { profileId: string; isPro?: boolean }) {
  const { toast } = useToast();
  const { services, stats, loading, createService, updateService, toggleService } = useServices();
  const [filter, setFilter] = useState<SvcFilter>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Horarios por servicio
  const [selectedSvc, setSelectedSvc] = useState<Service | null>(null);
  const [activeDays, setActiveDays] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [franjasByDay, setFranjasByDay] = useState<Record<number, { startTime: string; endTime: string }[]>>({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aliax_svc_order') || '[]'); } catch { return []; }
  });

  const filtered = useMemo(() => {
    const byProfile = services.filter(s => s.profileId === profileId);
    if (filter === 'active') return byProfile.filter(s => s.isActive);
    if (filter === 'inactive') return byProfile.filter(s => !s.isActive);
    return byProfile;
  }, [services, profileId, filter]);

  const colorMap: Record<string, string> = {};
  services.forEach((s, i) => { colorMap[s.id] = SERVICE_COLORS[i % SERVICE_COLORS.length]; });

  const loadSlots = async (svc: Service) => {
    setSelectedSvc(svc);
    try {
      const res = await api.get(`/service-availability/${svc.id}`);
      const data: ServiceAvailabilitySlot[] = res.data;
      const byDay: Record<number, { startTime: string; endTime: string }[]> = {};
      const days: number[] = [];
      data.forEach(s => {
        if (!byDay[s.dayOfWeek]) { byDay[s.dayOfWeek] = []; days.push(s.dayOfWeek); }
        byDay[s.dayOfWeek].push({ startTime: s.startTime, endTime: s.endTime });
      });
      setFranjasByDay(byDay);
      setActiveDays([...new Set(days)]);
      setSelectedDay(days[0] ?? null);
    } catch { setFranjasByDay({}); setActiveDays([]); setSelectedDay(null); }
  };

  const toggleDay = (day: number) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    setSelectedDay(day);
    if (!franjasByDay[day]) setFranjasByDay(prev => ({ ...prev, [day]: [{ startTime: '09:00', endTime: '17:00' }] }));
  };

  const addFranja = () => {
    if (selectedDay === null) return;
    const existing = franjasByDay[selectedDay] ?? [];
    const last = existing[existing.length - 1];
    const startM = last ? t2m(last.endTime) : t2m('09:00');
    setFranjasByDay(prev => ({ ...prev, [selectedDay]: [...existing, { startTime: m2t(startM), endTime: m2t(Math.min(startM + 60, 1410)) }] }));
  };

  const handleSaveSlots = async () => {
    if (!selectedSvc) return;
    setSaving(true);
    try {
      const slotsToSave: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
      activeDays.forEach(day => (franjasByDay[day] ?? []).forEach(f => slotsToSave.push({ dayOfWeek: day, ...f })));
      await api.post('/service-availability/bulk', { serviceId: selectedSvc.id, slots: slotsToSave });
      toast(`Horarios de "${selectedSvc.name}" guardados`);
      loadSlots(selectedSvc);
    } catch (err: any) { toast(err.response?.data?.error || 'Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      await toggleService(id);
    } catch { toast('Error al cambiar estado', 'error'); }
    finally { setTogglingId(null); }
  };

  const handleModalSubmit = async (data: any) => {
    setModalLoading(true);
    try {
      if (modalMode === 'create') {
        await createService({ ...data, profileId });
        toast('Servicio creado');
      } else if (editingService) {
        await updateService(editingService.id, data);
        toast('Servicio actualizado');
      }
      setModalOpen(false);
    } catch (err: any) { toast(err.message || 'Error', 'error'); }
    finally { setModalLoading(false); }
  };

  const openCreate = () => {
    if (stats && stats.active >= stats.limit) {
      toast(`Límite de ${stats.limit} servicios activos alcanzado`, 'error');
      return;
    }
    setEditingService(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingService(s);
    setModalMode('edit');
    setModalOpen(true);
  };

  const getSorted = (list: Service[]) => {
    if (!order.length) return list;
    const map = new Map(list.map(s => [s.id, s]));
    const sorted: Service[] = [];
    for (const id of order) { const s = map.get(id); if (s) sorted.push(s); }
    for (const s of list) { if (!order.includes(s.id)) sorted.push(s); }
    return sorted;
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const ids = getSorted(filtered).map(s => s.id);
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId);
    ids.splice(from, 1); ids.splice(to, 0, dragId);
    const allIds = order.filter(id => services.some(s => s.id === id));
    for (const s of services) { if (!allIds.includes(s.id)) allIds.push(s.id); }
    const finalOrder = [...new Set([...ids, ...allIds])];
    setOrder(finalOrder);
    localStorage.setItem('aliax_svc_order', JSON.stringify(finalOrder));
    setDragId(null); setDragOverId(null);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div style={{ width: 32, height: 32, border: '3px solid rgba(45,212,191,0.3)', borderTopColor: '#2dd4bf', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;

  const currentFranjas = selectedDay !== null ? (franjasByDay[selectedDay] ?? []) : [];
  const byProfile = services.filter(s => s.profileId === profileId);

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: -0.5, color: 'var(--sc-text)' }}>Servicios</h2>
          <p style={{ fontSize: 13, color: 'var(--sc-muted)', marginTop: 2 }}>
            {byProfile.filter(s => s.isActive).length} activos · {byProfile.filter(s => !s.isActive).length} inactivos
          </p>
        </div>
        <BtnPrimary onClick={openCreate}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> Agregar servicio</span>
        </BtnPrimary>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['active', 'inactive', 'all'] as SvcFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === f ? '#2dd4bf' : 'var(--sc-border)'}`,
            background: filter === f ? 'rgba(45,212,191,0.15)' : 'var(--sc-inner)',
            color: filter === f ? '#2dd4bf' : 'var(--sc-muted)',
            cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', fontWeight: filter === f ? 500 : 400,
          }}>
            {f === 'active' ? 'Activos' : f === 'inactive' ? 'Inactivos' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--sc-muted)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
            {filter === 'active' ? 'No tienes servicios activos.' : filter === 'inactive' ? 'No tienes servicios inactivos.' : 'No tienes servicios.'}
          </p>
        )}
        {getSorted(filtered).map(s => (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragOver={e => { e.preventDefault(); if (s.id !== dragId) setDragOverId(s.id); }}
            onDrop={() => handleDrop(s.id)}
            onDragEnd={() => { setDragId(null); setDragOverId(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 0,
              border: `1px solid ${dragOverId === s.id ? '#2dd4bf' : selectedSvc?.id === s.id ? '#2dd4bf' : 'var(--sc-border)'}`,
              borderRadius: 10, transition: 'all .15s',
              opacity: dragId === s.id ? 0.4 : s.isActive ? 1 : 0.6,
              outline: dragOverId === s.id ? '2px dashed #2dd4bf' : 'none',
              outlineOffset: 2,
            }}
          >
            {/* Drag handle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 8px', cursor: 'grab', color: 'var(--sc-muted)',
              borderRight: '1px solid var(--sc-border)', alignSelf: 'stretch',
              borderRadius: '10px 0 0 10px',
              background: 'var(--sc-inner)',
            }}>
              <GripVertical size={15} />
            </div>

            {/* Content */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 12,
              background: selectedSvc?.id === s.id ? 'rgba(45,212,191,0.08)' : 'var(--sc-inner)',
              borderRadius: '0 10px 10px 0', padding: '12px 14px',
            }}>
              <div style={{ width: 10, height: 36, borderRadius: 5, background: colorMap[s.id], flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => loadSlots(s)}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sc-text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {s.name}
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                    background: s.isActive ? 'rgba(67,217,173,0.15)' : 'rgba(255,255,255,0.06)',
                    color: s.isActive ? '#43d9ad' : 'var(--sc-muted)',
                  }}>{s.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--sc-muted)', marginTop: 2 }}>
                  {s.durationMinutes} min · ${Number(s.price).toLocaleString()} {s.currency}
                </div>
              </div>
              {/* Botón Editar */}
              <button
                onClick={e => { e.stopPropagation(); openEdit(s); }}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)',
                  borderRadius: 8, cursor: 'pointer', padding: '6px 12px',
                  color: '#2dd4bf', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 500,
                }}
              >
                <Pencil size={12} /> Editar
              </button>
              {/* Botón Activar/Desactivar */}
              <button
                onClick={() => handleToggle(s.id)}
                disabled={togglingId === s.id}
                title={s.isActive ? 'Desactivar' : 'Activar'}
                style={{
                  flexShrink: 0, background: s.isActive ? 'rgba(255,101,132,0.12)' : 'rgba(67,217,173,0.12)',
                  border: `1px solid ${s.isActive ? 'rgba(255,101,132,0.3)' : 'rgba(67,217,173,0.3)'}`,
                  borderRadius: 8, cursor: 'pointer', padding: '6px 10px', color: s.isActive ? '#ff6584' : '#43d9ad',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'DM Sans',
                  opacity: togglingId === s.id ? 0.5 : 1,
                }}
              >
                <Power size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor de horarios del servicio seleccionado */}
      {selectedSvc && (
        <ProGate isPro={isPro}>
        <Card>
          <CardHeader dot={colorMap[selectedSvc.id]} title={`Horario: ${selectedSvc.name}`} />
          <p style={{ fontSize: 12, color: 'var(--sc-muted)', marginBottom: 12 }}>Días disponibles para este servicio</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {DAY_ORDER.map(d => (
              <DayChip key={d} label={DAY_NAMES_SHORT[d]} active={activeDays.includes(d)} onClick={() => toggleDay(d)} />
            ))}
          </div>
          {activeDays.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
              {DAY_ORDER.filter(d => activeDays.includes(d)).map(d => (
                <button key={d} onClick={() => setSelectedDay(d)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                  background: selectedDay === d ? '#2dd4bf' : 'var(--sc-inner)', color: selectedDay === d ? 'white' : 'var(--sc-muted)',
                }}>{DAY_NAMES_SHORT[d]}</button>
              ))}
            </div>
          )}
          {selectedDay !== null && (
            <>
              {currentFranjas.length === 0 && <p style={{ color: 'var(--sc-muted)', fontSize: 13, marginBottom: 12 }}>Sin franjas — añade una</p>}
              {currentFranjas.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <TimeSelect value={f.startTime} onChange={v => setFranjasByDay(prev => ({ ...prev, [selectedDay]: prev[selectedDay].map((x, i) => i === idx ? { ...x, startTime: v } : x) }))} />
                  <span style={{ color: 'var(--sc-muted)', fontSize: 13 }}>–</span>
                  <TimeSelect value={f.endTime} onChange={v => setFranjasByDay(prev => ({ ...prev, [selectedDay]: prev[selectedDay].map((x, i) => i === idx ? { ...x, endTime: v } : x) }))} />
                  <button onClick={() => setFranjasByDay(prev => ({ ...prev, [selectedDay]: prev[selectedDay].filter((_, i) => i !== idx) }))}
                    style={{ background: 'rgba(255,101,132,0.15)', border: '1px solid rgba(255,101,132,0.3)', borderRadius: 8, cursor: 'pointer', padding: '6px 10px', color: '#ff6584', display: 'flex', alignItems: 'center' }}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--sc-border)', gap: 8, flexWrap: 'wrap' }}>
            <BtnGhost small onClick={addFranja}>+ Añadir franja</BtnGhost>
            <div style={{ display: 'flex', gap: 8 }}>
              <BtnGhost small onClick={() => setSelectedSvc(null)}>Cancelar</BtnGhost>
              <BtnPrimary onClick={handleSaveSlots} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</BtnPrimary>
            </div>
          </div>
        </Card>
        </ProGate>
      )}

      {/* Modal crear/editar servicio */}
      <ServiceFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        service={editingService}
        onSubmit={handleModalSubmit}
        loading={modalLoading}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: BLOQUEOS
// ════════════════════════════════════════════════════════════════════
function TabBloqueos({ profileId, isPro = false }: { profileId: string; isPro?: boolean }) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', startDate: '', endDate: '', type: 'vacaciones', isAllDay: true, startTime: '09:00', endTime: '18:00' });
  const [saving, setSaving] = useState(false);

  const typeIcons: Record<string, string> = { vacaciones: '🏖️', reunion: '💼', otro: '🔧', personal: '🏠' };

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedule-blocks', { params: { profileId } });
      setBlocks(res.data);
    } finally { setLoading(false); }
  }, [profileId]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const handleCreate = async () => {
    if (!form.title || !form.startDate) { toast('Completa los campos requeridos', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/schedule-blocks', {
        profileId, startDate: form.startDate, endDate: form.endDate || form.startDate,
        isAllDay: form.isAllDay, reason: form.title,
        startTime: form.isAllDay ? undefined : form.startTime,
        endTime: form.isAllDay ? undefined : form.endTime,
      });
      toast('Bloqueo creado');
      setShowForm(false);
      setForm({ title: '', startDate: '', endDate: '', type: 'vacaciones', isAllDay: true, startTime: '09:00', endTime: '18:00' });
      fetchBlocks();
    } catch (err: any) { toast(err.response?.data?.error || 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    try {
      await api.delete(`/schedule-blocks/${id}`);
      setBlocks(prev => prev.filter(b => b.id !== id));
      toast('Bloqueo eliminado');
    } catch { toast('Error al eliminar', 'error'); }
  };

  const formatRange = (b: ScheduleBlock) => {
    const s = new Date(b.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const e = new Date(b.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return b.startDate.slice(0, 10) === b.endDate.slice(0, 10) ? s : `${s} → ${e}`;
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div style={{ width: 32, height: 32, border: '3px solid rgba(45,212,191,0.3)', borderTopColor: '#2dd4bf', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, letterSpacing: -0.5, color: 'var(--sc-text)' }}>Bloqueos de horario</h2>
          <p style={{ fontSize: 13, color: 'var(--sc-muted)', marginTop: 2 }}>Fechas no disponibles que se superponen sobre tu agenda</p>
        </div>
        <BtnPrimary onClick={() => setShowForm(v => !v)}>+ Nuevo bloqueo</BtnPrimary>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{ background: 'rgba(45,212,191,0.06)', border: '1px dashed rgba(45,212,191,0.4)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: 'var(--sc-text)', marginBottom: 16 }}>Nuevo bloqueo</div>
          <div className="sc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--sc-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>Motivo del bloqueo</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ej. Vacaciones de verano"
                style={{ background: 'var(--sc-inner)', border: '1px solid var(--sc-border)', borderRadius: 8, padding: '10px 14px', color: 'var(--sc-text)', fontFamily: 'DM Sans', fontSize: 14, outline: 'none' }} />
            </div>
            <DatePickerField
              label="Fecha inicio"
              value={form.startDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={v => setForm(f => ({ ...f, startDate: v, endDate: v }))}
            />
            <DatePickerField
              label="Fecha fin"
              value={form.endDate}
              min={form.startDate}
              onChange={v => setForm(f => ({ ...f, endDate: v }))}
            />
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--sc-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>Tipo</label>
              <CustomSelect
                value={form.type}
                onChange={v => setForm(f => ({ ...f, type: v }))}
                options={[
                  { value: 'vacaciones', label: '🏖️ Vacaciones' },
                  { value: 'reunion',    label: '💼 Reunión interna' },
                  { value: 'personal',   label: '🏠 Personal' },
                  { value: 'otro',       label: '🔧 Otro' },
                ]}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Toggle on={form.isAllDay} onChange={() => setForm(f => ({ ...f, isAllDay: !f.isAllDay }))} />
            <span style={{ fontSize: 14, color: 'var(--sc-text)' }}>Todo el día</span>
          </div>
          {!form.isAllDay && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <TimeSelect value={form.startTime} onChange={v => setForm(f => ({ ...f, startTime: v }))} />
              <span style={{ color: 'var(--sc-muted)', fontSize: 13 }}>hasta</span>
              <TimeSelect value={form.endTime} onChange={v => setForm(f => ({ ...f, endTime: v }))} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <BtnPrimary small onClick={handleCreate} disabled={saving}>{saving ? 'Guardando...' : 'Agregar bloqueo'}</BtnPrimary>
            <BtnGhost small onClick={() => setShowForm(false)}>Cancelar</BtnGhost>
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blocks.length === 0 && <p style={{ color: 'var(--sc-muted)', fontSize: 14 }}>No tienes bloqueos configurados</p>}
        {blocks.map(b => {
          const expired = new Date(b.endDate) < new Date();
          return (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--sc-inner)', border: '1px solid var(--sc-border)', borderRadius: 10, padding: '12px 16px', opacity: expired ? 0.5 : 1,
            }}>
              <div style={{ fontSize: 18 }}>{typeIcons['otro']}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sc-text)' }}>{b.reason || 'Sin motivo'}</div>
                <div style={{ fontSize: 12, color: 'var(--sc-muted)', marginTop: 2 }}>
                  {formatRange(b)} · {b.isAllDay ? 'Todo el día' : `${b.startTime} — ${b.endTime}`}
                  {expired ? ' · Expirado' : ''}
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(45,212,191,0.18)', color: '#2dd4bf' }}>
                {b.isAllDay ? 'Completo' : 'Parcial'}
              </span>
              <BtnDanger onClick={() => handleDelete(b.id)}>Eliminar</BtnDanger>
            </div>
          );
        })}
      </div>

      <SectionDivider label="Bloqueos recurrentes" />
      <ProGate isPro={isPro}>
        <Card>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, marginBottom: 12, color: 'var(--sc-text)' }}>Bloqueos semanales fijos</div>
          <p style={{ color: 'var(--sc-muted)', fontSize: 14, marginBottom: 14 }}>Configura horarios que siempre estarán bloqueados independientemente de tu disponibilidad base.</p>
          <BtnGhost small>+ Añadir bloqueo recurrente</BtnGhost>
        </Card>
      </ProGate>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: REGLAS
// ════════════════════════════════════════════════════════════════════
function TabReglas({ profileId, isPro = false }: { profileId: string; isPro?: boolean }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BookingSettings>({
    profileId, bufferMinutes: 0, advanceBookingDays: 60, minAdvanceHours: 1,
    cancellationHours: 24, autoConfirm: false, timezone: 'America/Mexico_City', language: 'es',
  });
  const [toggles, setToggles] = useState({ waitlist: false, multiplePerSlot: false, allowCancel: true, requirePayment: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/booking-settings', { params: { profileId } })
      .then(r => setSettings(r.data))
      .finally(() => setLoading(false));
  }, [profileId]);

  const upd = <K extends keyof BookingSettings>(k: K, v: BookingSettings[K]) => setSettings(s => ({ ...s, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/booking-settings', settings, { params: { profileId } });
      toast('Reglas guardadas');
    } catch { toast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div style={{ width: 32, height: 32, border: '3px solid rgba(45,212,191,0.3)', borderTopColor: '#2dd4bf', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, letterSpacing: -0.5, color: 'var(--sc-text)' }}>Reglas de reserva</h2>
          <p style={{ fontSize: 13, color: 'var(--sc-muted)', marginTop: 2 }}>Controla cómo y cuándo pueden reservar tus clientes</p>
        </div>
        <BtnPrimary onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</BtnPrimary>
      </div>

      {/* Ventanas de tiempo */}
      <Card>
        <CardHeader dot="#2dd4bf" title="Ventanas de tiempo" />
        <div className="sc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormSelect label="Antelación mínima para reservar" value={String(settings.minAdvanceHours)} onChange={v => upd('minAdvanceHours', Number(v))} options={[
            { value: '0', label: 'Inmediatamente' }, { value: '1', label: '1 hora antes' },
            { value: '2', label: '2 horas antes' }, { value: '4', label: '4 horas antes' },
            { value: '8', label: '8 horas antes' }, { value: '24', label: '24 horas antes' },
            { value: '48', label: '48 horas antes' }, { value: '72', label: '72 horas antes' },
          ]} />
          <FormSelect label="Antelación máxima para reservar" value={String(settings.advanceBookingDays)} onChange={v => upd('advanceBookingDays', Number(v))} options={[
            { value: '7', label: '1 semana' }, { value: '14', label: '2 semanas' },
            { value: '30', label: '30 días' }, { value: '60', label: '60 días' },
            { value: '90', label: '90 días' }, { value: '180', label: '6 meses' },
          ]} />
          <FormSelect label="Cancelación permitida hasta" value={String(settings.cancellationHours)} onChange={v => upd('cancellationHours', Number(v))} options={[
            { value: '0', label: 'Sin límite' }, { value: '1', label: '1 hora antes' },
            { value: '12', label: '12 horas antes' }, { value: '24', label: '24 horas antes' },
            { value: '48', label: '48 horas antes' }, { value: '72', label: '72 horas antes' },
          ]} />
          <FormSelect label="Buffer entre citas" value={String(settings.bufferMinutes)} onChange={v => upd('bufferMinutes', Number(v))} options={[
            { value: '0', label: 'Sin buffer' }, { value: '5', label: '5 min' },
            { value: '10', label: '10 min' }, { value: '15', label: '15 min' },
            { value: '20', label: '20 min' }, { value: '30', label: '30 min' },
            { value: '45', label: '45 min' }, { value: '60', label: '1 hora' },
          ]} />
        </div>
      </Card>

      {/* Comportamiento del sistema */}
      <Card>
        <CardHeader dot="#43d9ad" title="Comportamiento del sistema" />
        <ProGate isPro={isPro}>
          <ToggleRow label="Confirmación automática" desc="Las reservas se confirman sin revisión manual" on={settings.autoConfirm} onChange={() => upd('autoConfirm', !settings.autoConfirm)} />
        </ProGate>
        <ProGate isPro={isPro}>
          <ToggleRow label="Lista de espera" desc="Los clientes pueden unirse a lista de espera si no hay slots" on={toggles.waitlist} onChange={() => setToggles(t => ({ ...t, waitlist: !t.waitlist }))} />
        </ProGate>
        <ProGate isPro={isPro}>
          <ToggleRow label="Múltiples reservas por slot" desc="Permite solapamiento de citas (requiere recursos separados)" on={toggles.multiplePerSlot} onChange={() => setToggles(t => ({ ...t, multiplePerSlot: !t.multiplePerSlot }))} />
        </ProGate>
        <ToggleRow label="Permitir cancelaciones" desc="Los clientes pueden cancelar por sí mismos" on={toggles.allowCancel} onChange={() => setToggles(t => ({ ...t, allowCancel: !t.allowCancel }))} />
        <div style={{ borderBottom: 'none' }}>
          <ProGate isPro={isPro}>
            <ToggleRow label="Pago requerido al reservar" desc="El cliente debe pagar antes de confirmar la cita" on={toggles.requirePayment} onChange={() => setToggles(t => ({ ...t, requirePayment: !t.requirePayment }))} />
          </ProGate>
        </div>
      </Card>

      {/* Límites por cliente */}
      <ProGate isPro={isPro}>
        <Card>
          <CardHeader dot="#ff6584" title="Límites por cliente" />
          <div className="sc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormSelect label="Máx. reservas activas por cliente" value="3" onChange={() => {}} options={[
              { value: '1', label: '1 reserva' }, { value: '2', label: '2 reservas' },
              { value: '3', label: '3 reservas' }, { value: '5', label: '5 reservas' },
              { value: '0', label: 'Sin límite' },
            ]} />
            <FormSelect label="Intervalo mínimo entre reservas" value="none" onChange={() => {}} options={[
              { value: 'none', label: 'Sin restricción' }, { value: '1d', label: '1 día' },
              { value: '3d', label: '3 días' }, { value: '7d', label: '1 semana' },
            ]} />
          </div>
        </Card>
      </ProGate>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB: NOTIFICACIONES
// ════════════════════════════════════════════════════════════════════
function TabNotificaciones({ isPro = false }: { isPro?: boolean }) {
  const { toast } = useToast();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminders, setReminders] = useState({
    confirmacion: true, recordatorio24h: true, recordatorio1h: false,
    cancelacion: true, feedback: false,
  });
  const [profNotifs, setProfNotifs] = useState({
    nuevaReserva: true, cancelacion: true, reagendamiento: false, listaEspera: false,
  });

  useEffect(() => {
    api.get('/booking-settings').then(r => {
      if (r.data.emailEnabled !== undefined) setEmailEnabled(r.data.emailEnabled);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/booking-settings', { emailEnabled });
      toast('Notificaciones guardadas');
    } catch {
      toast('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const tog = (_obj: any, set: any, key: string) => set((p: any) => ({ ...p, [key]: !p[key] }));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, letterSpacing: -0.5, color: 'var(--sc-text)' }}>Notificaciones</h2>
          <p style={{ fontSize: 13, color: 'var(--sc-muted)', marginTop: 2 }}>Configura cómo y cuándo se avisa al cliente y a ti</p>
        </div>
        <BtnPrimary onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</BtnPrimary>
      </div>

      {/* Canales */}
      <Card>
        <CardHeader dot="#22c55e" title="Canales de comunicación" />
        <ToggleRow
          label="📧 Email"
          desc={emailEnabled ? <span style={{ color: '#22c55e', fontWeight: 500 }}>✓ Conectado</span> : <span style={{ color: 'var(--sc-muted)', fontWeight: 500 }}>Desconectado</span>}
          on={emailEnabled}
          onChange={() => setEmailEnabled(v => !v)}
        />
      </Card>

      {/* Recordatorios */}
      <Card>
        <CardHeader dot="#2dd4bf" title="Recordatorios automáticos al cliente" />
        <ToggleRow label="Confirmación de reserva" desc="Inmediato tras reservar" on={reminders.confirmacion} onChange={() => tog(reminders, setReminders, 'confirmacion')} />
        <ToggleRow label="Recordatorio previo 24h" desc="24 horas antes de la cita" on={reminders.recordatorio24h} onChange={() => tog(reminders, setReminders, 'recordatorio24h')} />
        <ProGate isPro={isPro}>
          <ToggleRow label="Recordatorio previo 1h" desc="1 hora antes de la cita" on={reminders.recordatorio1h} onChange={() => tog(reminders, setReminders, 'recordatorio1h')} />
        </ProGate>
        <ToggleRow label="Aviso de cancelación" desc="Al cancelar la cita" on={reminders.cancelacion} onChange={() => tog(reminders, setReminders, 'cancelacion')} />
        <ProGate isPro={isPro}>
          <ToggleRow label="Solicitud de feedback" desc="2 horas después de la cita" on={reminders.feedback} onChange={() => tog(reminders, setReminders, 'feedback')} />
        </ProGate>
      </Card>

      {/* Notificaciones al profesional */}
      <Card>
        <CardHeader dot="#f6c90e" title="Notificaciones al profesional" />
        <ToggleRow label="Nueva reserva recibida" on={profNotifs.nuevaReserva} onChange={() => tog(profNotifs, setProfNotifs, 'nuevaReserva')} />
        <ToggleRow label="Cancelación de reserva" on={profNotifs.cancelacion} onChange={() => tog(profNotifs, setProfNotifs, 'cancelacion')} />
        <ProGate isPro={isPro}>
          <ToggleRow label="Reagendamiento" on={profNotifs.reagendamiento} onChange={() => tog(profNotifs, setProfNotifs, 'reagendamiento')} />
        </ProGate>
        <ProGate isPro={isPro}>
          <ToggleRow label="Nuevo cliente en lista de espera" on={profNotifs.listaEspera} onChange={() => tog(profNotifs, setProfNotifs, 'listaEspera')} />
        </ProGate>
      </Card>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
type Tab = 'availability' | 'services' | 'blocks' | 'rules' | 'notifications';

const PAGES: { id: Tab; icon: ReactNode; label: string }[] = [
  { id: 'availability',   icon: <CalendarDays size={15} />, label: 'Disponibilidad' },
  { id: 'services',       icon: <Layers       size={15} />, label: 'Servicios' },
  { id: 'blocks',         icon: <Ban          size={15} />, label: 'Bloqueos' },
  { id: 'rules',          icon: <Settings2    size={15} />, label: 'Reglas de reserva' },
  { id: 'notifications',  icon: <Bell         size={15} />, label: 'Notificaciones' },
];

interface Profile { id: string; title: string; slug: string }

const THEME_DARK  = { main: 'transparent', side: 'rgba(255,255,255,0.05)', inner: 'rgba(255,255,255,0.07)', border: 'rgba(45,212,191,0.15)', text: '#e8f0f0', muted: '#6aada8', muted2: 'rgba(45,212,191,0.2)' };
const THEME_LIGHT = { main: 'transparent', side: 'rgba(255,255,255,0.72)', inner: 'rgba(255,255,255,0.55)', border: 'rgba(13,148,136,0.18)', text: '#0a1f1e', muted: '#3d8a82', muted2: 'rgba(13,148,136,0.15)' };

// ════════════════════════════════════════════════════════════════════
// EMBEDDED PANEL — para incrustar en Dashboard como pestaña
// ════════════════════════════════════════════════════════════════════
export function SchedulingPanel({ theme }: { theme: 'dark' | 'light' }) {
  const { isPro } = useAuth();
  const [tab, setTab]               = useState<Tab>('availability');
  const [profiles, setProfiles]     = useState<Profile[]>([]);
  const [selectedProfileId, setSel] = useState('');
  const [loading, setLoading]       = useState(true);
  const [showFade, setShowFade]     = useState(true);
  const asideRef                    = useRef<HTMLElement>(null);
  const T = theme === 'dark' ? THEME_DARK : THEME_LIGHT;

  useEffect(() => {
    const el = asideRef.current;
    if (!el) return;
    const check = () => setShowFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [loading]);

  useEffect(() => {
    api.get('/profiles').then(res => {
      setProfiles(res.data);
      if (res.data.length > 0) setSel(res.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(45,212,191,0.3)', borderTopColor: '#2dd4bf', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div className="sc-panel" style={{
      color: T.text, fontFamily: 'DM Sans, sans-serif',
      '--sc-main': T.main, '--sc-side': T.side, '--sc-inner': T.inner,
      '--sc-border': T.border, '--sc-text': T.text, '--sc-muted': T.muted, '--sc-muted2': T.muted2,
    } as React.CSSProperties}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sc-panel { display: flex; flex-direction: row; min-height: 400px; gap: 10px; }
        .sc-panel-aside {
          width: 180px; flex-shrink: 0;
          display: flex; flex-direction: column; gap: 4px;
          padding: 12px 8px;
          border: 1px solid var(--sc-border);
          background: var(--sc-side);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
        }
        .sc-panel-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-radius: 8px; border: none;
          width: 100%; text-align: left; cursor: pointer;
          font-family: DM Sans, sans-serif; font-size: 13px;
          transition: all .15s;
        }
        .sc-panel-main { flex: 1; padding: 24px; overflow-y: auto; }
        @media (max-width: 767px) {
          .sc-panel { flex-direction: column !important; }
          .sc-panel-aside {
            width: 100% !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            padding: 8px 10px !important;
            border-radius: 10px !important;
            border-bottom: 1px solid var(--sc-border) !important;
            gap: 6px !important;
            -ms-overflow-style: none; scrollbar-width: none;
          }
          .sc-panel-aside::-webkit-scrollbar { display: none; }
          .sc-panel-btn {
            padding: 7px 14px !important;
            border-radius: 20px !important;
            white-space: nowrap !important;
            width: auto !important;
            flex-shrink: 0 !important;
            font-size: 12px !important;
            gap: 5px !important;
          }
          .sc-panel-main { padding: 16px !important; }
          .sc-grid-2 { grid-template-columns: 1fr !important; }
        }
        .sc-aside-wrap { position: relative; }
        .sc-aside-fade {
          display: none;
          position: absolute; right: 0; top: 0; bottom: 0; width: 48px;
          background: linear-gradient(to right, transparent, var(--sc-side));
          pointer-events: none;
          transition: opacity 0.2s;
        }
        @media (max-width: 767px) {
          .sc-aside-fade { display: block; }
        }
      `}</style>

      <div className="sc-aside-wrap">
      <aside className="sc-panel-aside" ref={asideRef}>
        {profiles.length > 1 && (
          <div style={{ paddingBottom: 8, flexShrink: 0 }}>
            <select value={selectedProfileId} onChange={e => setSel(e.target.value)}
              style={{ background: T.inner, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 10px', color: T.text, fontFamily: 'DM Sans', fontSize: 12, outline: 'none' }}>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}
        {PAGES.map(p => (
          <button
            key={p.id}
            onClick={() => setTab(p.id)}
            className="sc-panel-btn"
            style={{
              color: tab === p.id ? '#2dd4bf' : T.muted,
              background: tab === p.id ? 'rgba(45,212,191,0.15)' : 'transparent',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{p.icon}</span>
            {p.label}
          </button>
        ))}
      </aside>
      <div className="sc-aside-fade" style={{ opacity: showFade ? 1 : 0 }} />
      </div>

      <main className="sc-panel-main">
        {tab === 'availability' && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: -0.5, color: T.text, margin: 0 }}>Disponibilidad base</h2>
            <p style={{ fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 0 }}>Define tus días y horarios de atención generales</p>
          </div>
        )}
        {selectedProfileId ? (
          <>
            {tab === 'availability'  && <TabDisponibilidad profileId={selectedProfileId} />}
            {tab === 'services'      && <TabServicios      profileId={selectedProfileId} isPro={isPro ?? false} />}
            {tab === 'blocks'        && <TabBloqueos       profileId={selectedProfileId} isPro={isPro ?? false} />}
            {tab === 'rules'         && <TabReglas         profileId={selectedProfileId} isPro={isPro ?? false} />}
            {tab === 'notifications' && <TabNotificaciones isPro={isPro ?? false} />}
          </>
        ) : (
          <p style={{ color: T.muted, fontSize: 14 }}>No tienes perfiles configurados aún.</p>
        )}
      </main>
    </div>
  );
}

export default function SchedulingConfig() {
  const { isPro } = useAuth();
  const [tab, setTab]                 = useState<Tab>('availability');
  const [profiles, setProfiles]       = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [loading, setLoading]         = useState(true);
  const [theme]                       = useState<'dark'|'light'>(() => (localStorage.getItem('aliax_theme') as any) || 'dark');
  const T = theme === 'dark' ? THEME_DARK : THEME_LIGHT;

  useEffect(() => {
    api.get('/profiles').then(res => {
      setProfiles(res.data);
      if (res.data.length > 0) setSelectedProfileId(res.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: T.main }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(45,212,191,0.3)', borderTopColor: '#2dd4bf', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="sc-root" style={{
      display: 'flex', minHeight: '100vh', background: T.main, color: T.text, fontFamily: 'DM Sans, sans-serif',
      '--sc-main': T.main, '--sc-side': T.side, '--sc-inner': T.inner,
      '--sc-border': T.border, '--sc-text': T.text, '--sc-muted': T.muted, '--sc-muted2': T.muted2,
    } as React.CSSProperties}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select option { background: ${T.inner}; }
        @media (max-width: 767px) {
          .sc-root { flex-direction: column !important; }
          .sc-aside {
            width: 100% !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            overflow-x: visible !important;
            padding: 10px 12px 6px !important;
            border-right: none !important;
            border-bottom: 1px solid var(--sc-border) !important;
            gap: 6px !important;
            align-items: center !important;
          }
          .sc-aside-logo { display: none !important; }
          .sc-aside-section-label { display: none !important; }
          .sc-aside-spacer { display: none !important; }
          .sc-aside-back {
            font-size: 12px !important;
            padding: 6px 10px !important;
            margin: 0 4px 0 0 !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }
          .sc-aside-profile-select {
            padding: 0 0 0 4px !important;
            flex-shrink: 0 !important;
          }
          .sc-aside-tab {
            padding: 9px 12px !important;
            border-radius: 20px !important;
            white-space: nowrap !important;
            font-size: 13px !important;
            width: auto !important;
            flex: 1 !important;
            min-width: calc(33% - 6px) !important;
            justify-content: center !important;
          }
          .sc-main { padding: 16px !important; }
          .sc-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sc-aside" style={{ width: 240, background: T.side, borderRight: `1px solid ${T.border}`, padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        {/* Logo */}
        <div className="sc-aside-logo" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#2dd4bf', padding: '0 12px 8px', letterSpacing: -0.5 }}>
          Aliax.io<span style={{ color: T.text }}> Pro</span>
        </div>

        {/* Botón volver */}
        <Link to="/dashboard?tab=agenda" className="sc-aside-back" style={{
          display: 'flex', alignItems: 'center', gap: 6, margin: '0 4px 16px',
          padding: '8px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500,
          background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(45,212,191,0.08)',
          color: '#2dd4bf', border: `1px solid ${T.border}`, transition: 'all .15s', flexShrink: 0,
        }}>
          <ArrowLeft size={14} /> Volver
        </Link>

        {profiles.length > 1 && (
          <div className="sc-aside-profile-select" style={{ padding: '0 4px 16px' }}>
            <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}
              style={{ width: '100%', background: T.inner, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', color: T.text, fontFamily: 'DM Sans', fontSize: 12, outline: 'none' }}>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}

        <div className="sc-aside-section-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: T.muted, padding: '8px 12px 6px', fontWeight: 600 }}>Configuración</div>

        {PAGES.map(p => (
          <button key={p.id} onClick={() => setTab(p.id)} className="sc-aside-tab" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
            cursor: 'pointer', fontSize: 14, color: tab === p.id ? '#2dd4bf' : T.muted,
            background: tab === p.id ? 'rgba(45,212,191,0.15)' : 'transparent',
            border: 'none', width: '100%', textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
            transition: 'all .15s',
          }}>
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{p.icon}</span>
            {p.label}
          </button>
        ))}

        <div className="sc-aside-spacer" style={{ flex: 1 }} />
      </aside>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="sc-main" style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {/* Header con título dinámico */}
        {tab === 'availability' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, letterSpacing: -0.5 }}>Disponibilidad base</h2>
              <p style={{ fontSize: 13, color: 'var(--sc-muted)', marginTop: 2 }}>Define tus días y horarios de atención generales</p>
            </div>
          </div>
        )}

        {/* Tab content */}
        {selectedProfileId && (
          <>
            {tab === 'availability'   && <TabDisponibilidad profileId={selectedProfileId} />}
            {tab === 'services'       && <TabServicios      profileId={selectedProfileId} isPro={isPro ?? false} />}
            {tab === 'blocks'         && <TabBloqueos       profileId={selectedProfileId} isPro={isPro ?? false} />}
            {tab === 'rules'          && <TabReglas         profileId={selectedProfileId} isPro={isPro ?? false} />}
            {tab === 'notifications'  && <TabNotificaciones isPro={isPro ?? false} />}
          </>
        )}
      </main>
    </div>
  );
}
