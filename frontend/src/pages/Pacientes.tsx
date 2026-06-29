import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFeature } from '../hooks/useFeature';
import { Search, Plus, User, Users, X, Lock, ChevronRight, ClipboardList } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import type { Patient } from '../hooks/usePatients';
import PatientWizard from '../components/patients/PatientWizard';
import CoupleWizard from '../components/patients/CoupleWizard';
import SessionNotesFeed from '../components/patients/SessionNotesFeed';
import PatientBookings from '../components/patients/PatientBookings';
import Step1Datos from '../components/patients/wizard/Step1Datos';
import { WizardAccentContext, accentTokens } from '../components/patients/WizardAccentContext';

interface Colors { text: string; muted: string; accent: string; accentLight: string; border: string; cardBg: string; isDark: boolean; }

type WizardType = 'individual' | 'couple' | null;
type DetailTab = 'notas' | 'citas' | 'datos';
type DatosSection = 'basicos' | 'hc_ind' | 'hc_par' | null;

export default function Pacientes({ C, isPro = false, isActive }: { C: Colors; isPairTherapist?: boolean; isPro?: boolean; isActive?: boolean }) {
  const canHistoriaClinica = useFeature('historia_clinica');
  const canTerapiaPareja = useFeature('terapia_pareja');
  const { patients, loading, load, createPatient, updatePatient } = usePatients();

  useEffect(() => {
    if (isActive) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('notas');
  const [datosSection, setDatosSection] = useState<DatosSection>(null);
  const [activeWizard, setActiveWizard] = useState<WizardType>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await createPatient({ name: newName.trim(), email: newEmail.trim() });
      setSelected(p);
      setShowNewForm(false);
      setNewName(''); setNewEmail('');
    } finally { setCreating(false); }
  };

  const _acNums = C.accent.match(/\d+/g) ?? ['45','212','191'];
  const [_r, _g, _b] = _acNums.map(Number);
  const acA = (a: number) => `rgba(${_r},${_g},${_b},${a})`;

  const inp: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8,
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'white',
    border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none',
    fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box' as const,
  };

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
    background: C.accent,
    border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
    boxShadow: '0 2px 7px rgba(0,0,0,0.22)',
  };


  if (selected) {
    const doneInd = selected.clinicalHistory?.completedSteps?.length ?? 0;
    const doneCpl = selected.clinicalHistoryCouple?.completedSteps?.length ?? 0;
    const sessions = selected.sessionNotes?.length ?? 0;

    const tokens = accentTokens(C.accent);
    const inpDatos: React.CSSProperties = {
      width: '100%', padding: '10px 14px', borderRadius: 8,
      background: C.isDark ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.85)',
      border: `1px solid ${C.isDark ? tokens.border : tokens.borderFocus}`,
      color: C.isDark ? '#e8f0f0' : '#1a2e2b', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
      outline: 'none', boxSizing: 'border-box',
    };
    const lblDatos: React.CSSProperties = {
      fontSize: 11, fontWeight: 600, color: tokens.lblColor,
      textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5,
    };

    const TABS: { id: DetailTab; label: string; badge?: number }[] = [
      { id: 'notas', label: 'Notas', badge: sessions > 0 ? sessions : undefined },
      { id: 'citas', label: 'Citas' },
      { id: 'datos', label: 'Datos' },
    ];

    const pillTab = (id: DetailTab | DatosSection, label: string, isActive: boolean, badge?: number, onClick?: () => void) => (
      <button
        key={id}
        onClick={onClick}
        className="btn-lift"
        style={{
          flex: 1, padding: '9px 10px', border: 'none', borderRadius: 10, cursor: 'pointer',
          background: isActive ? C.accent : C.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.60)',
          color: isActive ? '#fff' : C.muted,
          fontSize: 13, fontWeight: isActive ? 700 : 500,
          boxShadow: isActive ? '0 3px 12px rgba(0,0,0,0.22)' : 'none',
          backdropFilter: isActive ? 'none' : 'blur(8px)',
          transition: 'all .18s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {badge !== undefined && (
          <span style={{
            background: isActive ? 'rgba(255,255,255,0.28)' : C.accent,
            color: '#fff', fontSize: 10, fontWeight: 700,
            borderRadius: 8, padding: '1px 6px', minWidth: 16, lineHeight: '16px',
          }}>{badge}</span>
        )}
      </button>
    );

    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 4px' }}>

        {/* Back */}
        <button
          onClick={() => { setSelected(null); setActiveWizard(null); setDetailTab('notas'); setDatosSection(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, marginBottom: 14, padding: 0 }}
        >
          ← Volver a pacientes
        </button>

        {/* Patient card */}
        <div style={{
          background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 20px',
          boxShadow: C.isDark ? 'none' : `0 4px 24px ${acA(0.08)}`,
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${C.accent}44, ${C.accent}18)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={20} color={C.accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.name}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', marginTop: 3 }}>
                {selected.email && <span style={{ color: C.muted, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.email}</span>}
                {selected.phone && <span style={{ color: C.muted, fontSize: 13, whiteSpace: 'nowrap' }}>{selected.phone}</span>}
                {!selected.email && !selected.phone && <span style={{ color: C.muted, fontSize: 13 }}>Sin datos de contacto</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Main pill tabs — mismo fondo que patient card */}
        <div style={{
          display: 'flex', gap: 3, padding: 4, borderRadius: 14, marginBottom: 16,
          background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${C.border}`,
          boxShadow: C.isDark ? 'none' : `0 4px 24px ${acA(0.08)}`,
        }}>
          {TABS.map(t => pillTab(t.id, t.label, detailTab === t.id, t.badge, () => setDetailTab(t.id)))}
        </div>

        {/* Tab content */}
        <div>

          {/* ── NOTAS ── */}
          {detailTab === 'notas' && (
            <SessionNotesFeed clientId={selected.id} accent={C.accent} isDark={C.isDark} />
          )}

          {/* ── CITAS ── */}
          {detailTab === 'citas' && (
            selected.email
              ? <PatientBookings email={selected.email} name={selected.name} C={C} />
              : <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                  Agrega un email en la pestaña Datos para ver el historial de citas.
                </p>
          )}

          {/* ── DATOS ── */}
          {detailTab === 'datos' && (
            <WizardAccentContext.Provider value={tokens}>
              {/* 3 opciones al mismo nivel — estilo card/campo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {/* Datos Básicos */}
                <button
                  className="btn-lift"
                  onClick={() => setDatosSection(datosSection === 'basicos' ? null : 'basicos')}
                  style={{
                    padding: '16px 12px', borderRadius: 12, cursor: 'pointer',
                    background: datosSection === 'basicos'
                      ? `linear-gradient(135deg, ${C.accent}28, ${C.accent}10)`
                      : C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)',
                    border: datosSection === 'basicos' ? `1.5px solid ${C.accent}88` : `1px solid ${C.border}`,
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    transition: 'all .18s', boxShadow: datosSection === 'basicos' ? `0 0 0 1px ${C.accent}33` : 'none',
                  }}
                >
                  <ClipboardList size={20} color={datosSection === 'basicos' ? C.accent : C.muted} />
                  <span style={{ color: datosSection === 'basicos' ? C.accent : C.text, fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>Datos Básicos</span>
                </button>

                {/* HC Individual */}
                {(isPro || canHistoriaClinica) ? (
                  <button
                    className="btn-lift"
                    onClick={() => { setDatosSection('hc_ind'); setActiveWizard('individual'); }}
                    style={{
                      padding: '16px 12px', borderRadius: 12, cursor: 'pointer',
                      background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)',
                      border: `1px solid ${C.border}`,
                      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'all .18s',
                    }}
                  >
                    <User size={20} color={C.muted} />
                    <span style={{ color: C.text, fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
                      HC Individual
                      {doneInd > 0 && <span style={{ display: 'block', fontSize: 10, color: C.accent, fontWeight: 700, marginTop: 2 }}>{doneInd}/9 pasos</span>}
                    </span>
                  </button>
                ) : (
                  <div style={{
                    padding: '16px 12px', borderRadius: 12,
                    background: C.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.40)',
                    border: `1px solid ${C.border}`, opacity: 0.5,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  }}>
                    <Lock size={16} color={C.muted} />
                    <span style={{ color: C.muted, fontSize: 11, fontWeight: 500, textAlign: 'center' }}>HC Individual</span>
                  </div>
                )}

                {/* HC Pareja */}
                {(isPro || canTerapiaPareja) ? (
                  <button
                    className="btn-lift"
                    onClick={() => { setDatosSection('hc_par'); setActiveWizard('couple'); }}
                    style={{
                      padding: '16px 12px', borderRadius: 12, cursor: 'pointer',
                      background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)',
                      border: `1px solid ${C.border}`,
                      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'all .18s',
                    }}
                  >
                    <Users size={20} color={C.muted} />
                    <span style={{ color: C.text, fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
                      HC Pareja
                      {doneCpl > 0 && <span style={{ display: 'block', fontSize: 10, color: C.accent, fontWeight: 700, marginTop: 2 }}>{doneCpl}/9 pasos</span>}
                    </span>
                  </button>
                ) : (
                  <div style={{
                    padding: '16px 12px', borderRadius: 12,
                    background: C.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.40)',
                    border: `1px solid ${C.border}`, opacity: 0.5,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  }}>
                    <Lock size={16} color={C.muted} />
                    <span style={{ color: C.muted, fontSize: 11, fontWeight: 500, textAlign: 'center' }}>HC Pareja</span>
                  </div>
                )}
              </div>

              {/* Datos Básicos — popup modal */}
              {datosSection === 'basicos' && createPortal(
                <div style={{
                  position: 'fixed', inset: 0, zIndex: 9999,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                }}>
                  <div style={{
                    width: '100%', maxWidth: 680, maxHeight: '90vh',
                    background: C.isDark ? tokens.modalBg : tokens.modalBgLight,
                    border: `1px solid ${tokens.borderFocus}`,
                    borderRadius: 20, display: 'flex', flexDirection: 'column',
                    boxShadow: C.isDark ? '0 24px 80px rgba(0,0,0,0.7)' : '0 8px 40px rgba(0,0,0,0.14)',
                    overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: `1px solid ${tokens.border}`, flexShrink: 0 }}>
                      <div>
                        <p style={{ color: tokens.lblColor, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', margin: 0 }}>Datos básicos</p>
                        <h3 style={{ color: C.isDark ? '#e8f0f0' : C.text, fontSize: 18, fontWeight: 700, margin: '4px 0 0' }}>{selected.name}</h3>
                      </div>
                      <button onClick={() => setDatosSection(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.lblColor, padding: 4, display: 'flex' }}>
                        <X size={20} />
                      </button>
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                      <Step1Datos
                        patient={selected}
                        onSave={async (data) => { await updatePatient(selected.id, data); setSelected({ ...selected, ...data }); }}
                        inp={inpDatos}
                        lbl={lblDatos}
                        accent={C.accent}
                        isDark={C.isDark}
                      />
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </WizardAccentContext.Provider>
          )}
        </div>

        {/* Wizards (overlay) */}
        {activeWizard === 'individual' && (
          <PatientWizard
            patient={selected}
            onClose={() => setActiveWizard(null)}
            onPatientUpdate={async (data) => { await updatePatient(selected.id, data); setSelected({ ...selected, ...data }); }}
            accent={C.accent}
            isDark={C.isDark}
          />
        )}
        {activeWizard === 'couple' && (
          <CoupleWizard patient={selected} onClose={() => setActiveWizard(null)} accent={C.accent} isDark={C.isDark} />
        )}
      </div>
    );
  }

  /* ── Patient list ── */
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 4px' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Pacientes</h2>
          <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 0' }}>{patients.length} registrados</p>
        </div>
        <button className="btn-lift" onClick={() => setShowNewForm(s => !s)} style={btnPrimary}>
          <Plus size={15} /> Nuevo paciente
        </button>
      </div>

      {/* New patient form */}
      {showNewForm && (
        <div style={{
          background: C.isDark ? acA(0.05) : acA(0.04),
          border: `1px dashed ${C.accent}55`, borderRadius: 12, padding: 16,
          marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre *</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="María García" style={inp} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</label>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="paciente@email.com" style={inp} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-lift"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              style={{ ...btnPrimary, opacity: creating || !newName.trim() ? 0.6 : 1, cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer' }}
            >
              {creating ? 'Creando...' : 'Crear'}
            </button>
            <button className="btn-lift" onClick={() => setShowNewForm(false)} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} color={C.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." style={{ ...inp, paddingLeft: 36 }} />
      </div>

      {loading && <p style={{ color: C.muted, textAlign: 'center', padding: 32 }}>Cargando...</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: C.muted, textAlign: 'center', padding: 32, fontSize: 14 }}>
          Sin pacientes{search ? ' con ese filtro' : ' aún'}.
        </p>
      )}

      {/* Hint */}
      {filtered.length > 0 && (
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronRight size={13} /> Toca un paciente para ver su historial clínico
        </p>
      )}

      {/* Patient cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(p => {
          const stepsInd = p.clinicalHistory?.completedSteps?.length ?? 0;
          const stepsCpl = p.clinicalHistoryCouple?.completedSteps?.length ?? 0;
          const sessions = p.sessionNotes?.length ?? 0;
          return (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              style={{
                background: C.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.80)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color .15s, box-shadow .15s',
                boxShadow: C.isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${C.accent}66`; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${C.accent}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.boxShadow = C.isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.04)'; }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${C.accent}33, ${C.accent}11)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={17} color={C.accent} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: C.text, fontWeight: 600, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.email || p.occupation || 'Sin datos adicionales'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {stepsInd > 0 && (
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: `${C.accent}20`, color: C.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    HC {stepsInd}/9
                  </span>
                )}
                {stepsCpl > 0 && (
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: `${C.accent}15`, color: C.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    HCP {stepsCpl}/9
                  </span>
                )}
                {sessions > 0 && (
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color: C.muted, whiteSpace: 'nowrap' }}>
                    {sessions} ses.
                  </span>
                )}
                <ChevronRight size={15} color={C.muted} style={{ opacity: 0.5 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
