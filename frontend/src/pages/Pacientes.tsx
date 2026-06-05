import { useState } from 'react';
import { useFeature } from '../hooks/useFeature';
import { Search, Plus, User, Users, X, Lock, ClipboardList } from 'lucide-react';
import { usePatients } from '../hooks/usePatients';
import type { Patient } from '../hooks/usePatients';
import PatientWizard from '../components/patients/PatientWizard';
import CoupleWizard from '../components/patients/CoupleWizard';
import SessionNotesFeed from '../components/patients/SessionNotesFeed';
import Step1Datos from '../components/patients/wizard/Step1Datos';
import { WizardAccentContext, accentTokens } from '../components/patients/WizardAccentContext';

interface Colors { text: string; muted: string; accent: string; accentLight: string; border: string; cardBg: string; isDark: boolean; }

type WizardType = 'datos' | 'individual' | 'couple' | null;

export default function Pacientes({ C, isPairTherapist = false, isPro = false }: { C: Colors; isPairTherapist?: boolean; isPro?: boolean }) {
  const canHistoriaClinica = useFeature('historia_clinica');
  const canTerapiaPareja = useFeature('terapia_pareja');
  const { patients, loading, createPatient, updatePatient } = usePatients();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
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

  const inp: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8,
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'white',
    border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none',
    fontFamily: 'DM Sans, sans-serif', width: '100%', boxSizing: 'border-box' as const,
  };

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px',
    background: `linear-gradient(135deg, ${C.accent}, #0d9488)`,
    border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  };

  const btnOutline: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px',
    background: 'transparent',
    border: `1.5px solid ${C.accent}`,
    borderRadius: 10, color: C.accent,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  };

  if (selected) {
    const doneInd = selected.clinicalHistory?.completedSteps?.length ?? 0;
    const doneCpl = selected.clinicalHistoryCouple?.completedSteps?.length ?? 0;

    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 4px' }}>

        {/* Back */}
        <button
          onClick={() => { setSelected(null); setActiveWizard(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, marginBottom: 16, padding: 0 }}
        >
          ← Volver a pacientes
        </button>

        {/* Patient card */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 20px 16px', marginBottom: 20 }}>

          {/* Header row — name + buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>

            {/* Name & email */}
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.name}
              </h2>
              {selected.email && (
                <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected.email}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* Datos Básicos — siempre disponible */}
              <button
                onClick={() => setActiveWizard(activeWizard === 'datos' ? null : 'datos')}
                style={activeWizard === 'datos' ? btnPrimary : btnOutline}
              >
                <ClipboardList size={14} />
                Datos Básicos
              </button>

              {/* HC Individual */}
              {(isPro || canHistoriaClinica) ? (
                <button onClick={() => setActiveWizard('individual')} style={btnPrimary}>
                  <User size={14} />
                  HC Individual
                  {doneInd > 0 && (
                    <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                      {doneInd}/9
                    </span>
                  )}
                </button>
              ) : (
                <div title="Disponible en plan Pro" style={{ ...btnPrimary, opacity: 0.45, cursor: 'not-allowed', gap: 6 }}>
                  <Lock size={12} />
                  HC Individual
                </div>
              )}

              {/* HC Pareja — solo si es terapeuta de parejas */}
              {isPairTherapist && (
                (isPro || canTerapiaPareja) ? (
                  <button onClick={() => setActiveWizard('couple')} style={btnOutline}>
                    <Users size={14} />
                    HC de Pareja
                    {doneCpl > 0 && (
                      <span style={{ background: `${C.accent}22`, borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                        {doneCpl}/9
                      </span>
                    )}
                  </button>
                ) : (
                  <div title="Disponible en plan Pro" style={{ ...btnOutline, opacity: 0.45, cursor: 'not-allowed', gap: 6 }}>
                    <Lock size={12} />
                    HC de Pareja
                  </div>
                )
              )}
            </div>
          </div>

          {/* Demographic fields */}
          {([
            ['Género', selected.gender], ['Estado civil', selected.maritalStatus],
            ['Ocupación', selected.occupation], ['Ciudad', selected.city],
            ['País', selected.country], ['Escolaridad', selected.education],
          ] as [string, string | undefined][]).filter(([, v]) => v).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px 16px' }}>
              {([
                ['Género', selected.gender], ['Estado civil', selected.maritalStatus],
                ['Ocupación', selected.occupation], ['Ciudad', selected.city],
                ['País', selected.country], ['Escolaridad', selected.education],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label}>
                  <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>{label}</span>
                  <p style={{ color: C.text, fontSize: 13, margin: '3px 0 0' }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Datos Básicos inline panel */}
        {activeWizard === 'datos' && (() => {
          const tokens = accentTokens(C.accent);
          const inp: React.CSSProperties = {
            width: '100%', padding: '10px 14px', borderRadius: 8,
            background: C.isDark ? 'rgba(255,255,255,0.06)' : 'white',
            border: `1px solid ${tokens.border}`,
            color: C.text, fontSize: 14, fontFamily: 'DM Sans, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          };
          const lbl: React.CSSProperties = {
            fontSize: 11, fontWeight: 600, color: tokens.lblColor,
            textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5,
          };
          return (
            <WizardAccentContext.Provider value={tokens}>
              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ color: C.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Datos del paciente</p>
                  <button onClick={() => setActiveWizard(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', padding: 4 }}>
                    <X size={16} />
                  </button>
                </div>
                <Step1Datos
                  patient={selected}
                  onSave={async (data) => { await updatePatient(selected.id, data); setSelected({ ...selected, ...data }); }}
                  inp={inp}
                  lbl={lbl}
                  accent={C.accent}
                />
              </div>
            </WizardAccentContext.Provider>
          );
        })()}

        {/* Session notes */}
        <SessionNotesFeed clientId={selected.id} accent={C.accent} isDark={C.isDark} />

        {/* Wizards */}
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
        <button onClick={() => setShowNewForm(s => !s)} style={btnPrimary}>
          <Plus size={15} /> Nuevo paciente
        </button>
      </div>

      {/* New patient form */}
      {showNewForm && (
        <div style={{
          background: C.isDark ? 'rgba(45,212,191,0.05)' : '#f0fffe',
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
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              style={{ ...btnPrimary, opacity: creating || !newName.trim() ? 0.6 : 1, cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer' }}
            >
              {creating ? 'Creando...' : 'Crear'}
            </button>
            <button onClick={() => setShowNewForm(false)} style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}>
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
                background: C.cardBg, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color .15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${C.accent}55`}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}
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
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
