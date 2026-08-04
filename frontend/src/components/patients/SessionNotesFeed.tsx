import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Trash2, ChevronDown, ChevronUp, Sparkles, Loader2, Lock, Mic, X } from 'lucide-react';
import { useSessionNotes } from '../../hooks/usePatients';
import type { SessionNote } from '../../hooks/usePatients';
import CustomDatePicker from '../CustomDatePicker';
import { accentTokens } from './WizardAccentContext';
import api from '../../api/client';
import { useClinicoFeature } from '../../hooks/useClinicoFeature';
import AudioUploadBlock from './AudioUploadBlock';

interface Props { clientId: string; accent?: string; isDark?: boolean; }

type NoteType = 'LIBRE' | 'SOAP' | 'DIAMANTE' | 'NECS';
interface FieldDef { key: string; label: string; hint?: string; }

const NOTE_CONFIG: Record<NoteType, { label: string; color: string; bg: string; fields: FieldDef[] }> = {
  LIBRE: {
    label: 'Libre', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)',
    fields: [
      { key: 'summary',      label: 'Resumen de la sesión' },
      { key: 'topics',       label: 'Temas trabajados' },
      { key: 'observations', label: 'Observaciones clínicas' },
      { key: 'nextPlan',     label: 'Plan para próxima sesión' },
      { key: 'homework',     label: 'Tareas asignadas' },
    ],
  },
  SOAP: {
    label: 'SOAP', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',
    fields: [
      { key: 'summary',      label: 'S — Subjetivo',            hint: 'Lo que reporta el paciente: síntomas, cómo se sintió' },
      { key: 'observations', label: 'O — Objetivo',             hint: 'Observaciones clínicas del terapeuta' },
      { key: 'topics',       label: 'A — Assessment / Análisis', hint: 'Evaluación, diagnóstico, interpretación' },
      { key: 'nextPlan',     label: 'P — Plan',                 hint: 'Intervenciones, tareas y próximos pasos' },
    ],
  },
  DIAMANTE: {
    label: 'Diamante TBCS', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',
    fields: [
      { key: 'summary',      label: 'Mejores Esperanzas',         hint: 'Lo que el cliente espera que sea diferente. Su resultado deseado en sus propias palabras.' },
      { key: 'observations', label: 'Recursos para el Resultado',  hint: 'Habilidades, fortalezas, excepciones y red de apoyo identificados en sesión.' },
      { key: 'topics',       label: 'Historia del Resultado',      hint: 'Momentos pasados donde el resultado deseado estuvo presente. ¿Qué usó el cliente para lograrlo?' },
      { key: 'homework',     label: 'Futuro Preferido',            hint: '¿Cómo describe el cliente su vida cuando el resultado deseado esté presente? ¿Qué sería diferente?' },
    ],
  },
  NECS: {
    label: 'Nota Centrada en Soluciones', color: '#0d9488', bg: 'rgba(13,148,136,0.12)',
    fields: [
      { key: 'summary',      label: 'La esperanza que trajo hoy / Mejor esperanza',    hint: '¿Qué espera que sea diferente al salir de esta sesión?' },
      { key: 'topics',       label: 'Momentos de avance / Excepciones',                hint: '¿Qué estuvo mejor desde la última sesión? ¿En qué momento de esta semana el resultado deseado estuvo, aunque sea un poco, presente? ¿Qué hizo el cliente para que eso fuera posible?' },
      { key: 'observations', label: 'Lo que noté en sesión',                           hint: 'Recursos, fortalezas y capacidades visibles durante el encuentro' },
      { key: 'homework',     label: 'Cómo se ve el cambio / Futuro preferido',         hint: '¿Cómo describió el cliente su vida cuando el resultado deseado esté presente?' },
    ],
  },
};

const TYPE_ORDER: NoteType[] = ['LIBRE', 'SOAP', 'NECS'];

interface ScaleData { scale: number; q1: string; q2: string; }

function parseScale(raw: string | undefined): ScaleData | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (typeof p.scale === 'number') return { scale: p.scale, q1: p.q1 ?? '', q2: p.q2 ?? '' };
  } catch {}
  return null;
}

function ScaleMiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
      {Array.from({ length: 11 }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 5, borderRadius: 3,
          background: i < value ? color : i === value ? color : 'rgba(255,255,255,0.1)',
          opacity: i < value ? 0.45 : i === value ? 1 : 0.18,
          boxShadow: i === value ? `0 0 6px ${color}88` : 'none',
        }} />
      ))}
    </div>
  );
}

function ScaleFormField({
  data, onChange, isDark, ta, lbl, hintColor, labelOverride,
}: {
  data: ScaleData;
  onChange: (d: ScaleData) => void;
  isDark: boolean;
  ta: React.CSSProperties;
  lbl: React.CSSProperties;
  hintColor: string;
  labelOverride?: string;
}) {
  const color = '#22c55e';
  const cardBg = isDark ? 'rgba(34,197,94,0.07)' : 'rgba(34,197,94,0.05)';
  const cardBorder = 'rgba(34,197,94,0.22)';
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  const adj = (delta: number) =>
    onChange({ ...data, scale: Math.max(0, Math.min(10, data.scale + delta)) });

  return (
    <div>
      <label style={lbl}>{labelOverride ?? 'P — Escalas y próximo nivel'}</label>
      <p style={{ fontSize: 13, color: hintColor, marginBottom: 8, lineHeight: 1.5 }}>
        {labelOverride ? '¿En qué punto del camino se encuentra? ¿Cómo sabrá que avanzó?' : 'Nivel actual del paciente (0–10) y descripción del siguiente paso'}
      </p>

      {/* Scale card */}
      <div style={{
        background: cardBg, border: `1px solid ${cardBorder}`,
        borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center',
        gap: 16, marginBottom: 12,
      }}>
        {/* Number + buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => adj(1)}
            style={{
              width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${cardBorder}`, background: 'rgba(34,197,94,0.12)',
              color, fontSize: 16, fontWeight: 700, display: 'flex',
              alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
          >+</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 42, fontWeight: 800, color,
              lineHeight: 1, textShadow: `0 0 20px ${color}55`,
            }}>
              {data.scale}
            </div>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 500 }}>/&nbsp;10</div>
          </div>
          <button
            onClick={() => adj(-1)}
            style={{
              width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${cardBorder}`, background: 'rgba(34,197,94,0.12)',
              color, fontSize: 16, fontWeight: 700, display: 'flex',
              alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
          >−</button>
        </div>

        {/* Bar + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ScaleMiniBar value={data.scale} color={color} />
          <p style={{ fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
            Paciente en nivel <strong style={{ color }}>{data.scale}</strong> de 10.
            {data.scale < 10 && <> Próximo objetivo: <strong style={{ color }}>nivel {data.scale + 1}</strong>.</>}
            {data.scale === 10 && <> <strong style={{ color }}>¡Futuro preferido alcanzado!</strong></>}
          </p>
        </div>
      </div>

      {/* Q1 */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lbl, marginBottom: 4 }}>
          ¿Qué te tiene en el nivel {data.scale} y no en uno menor?
        </label>
        <textarea
          value={data.q1}
          onChange={e => onChange({ ...data, q1: e.target.value })}
          style={ta} rows={2}
          placeholder="Reconocer lo que ya está funcionando..."
        />
      </div>

      {/* Q2 */}
      <div>
        <label style={{ ...lbl, marginBottom: 4 }}>
          ¿Cómo sabrías que has avanzado un nivel más?
        </label>
        <textarea
          value={data.q2}
          onChange={e => onChange({ ...data, q2: e.target.value })}
          style={ta} rows={2}
          placeholder="¿Qué sería diferente en tu vida?"
        />
      </div>
    </div>
  );
}

function ScaleReadOnly({
  raw, isDark, lblColor, textMid,
}: {
  raw: string; isDark: boolean; lblColor: string; textMid: string;
}) {
  const data = parseScale(raw);
  if (!data) {
    return (
      <p style={{ color: textMid, fontSize: 13, margin: '4px 0 0', lineHeight: 1.6 }}>{raw}</p>
    );
  }

  const color = '#22c55e';
  const cardBg = isDark ? 'rgba(34,197,94,0.07)' : 'rgba(34,197,94,0.05)';
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';

  return (
    <div>
      <div style={{
        background: cardBg, border: '1px solid rgba(34,197,94,0.22)',
        borderRadius: 12, padding: '12px 16px', display: 'flex',
        alignItems: 'center', gap: 16, marginBottom: 10,
      }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 38, fontWeight: 800, color, lineHeight: 1, textShadow: `0 0 16px ${color}44` }}>
            {data.scale}
          </div>
          <div style={{ fontSize: 11, color: textMuted }}>/ 10</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ScaleMiniBar value={data.scale} color={color} />
          <p style={{ fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
            Nivel <strong style={{ color }}>{data.scale}</strong> de 10
            {data.scale < 10 && <> · Próximo objetivo: <strong style={{ color }}>nivel {data.scale + 1}</strong></>}
            {data.scale === 10 && <> · <strong style={{ color }}>¡Futuro preferido alcanzado!</strong></>}
          </p>
        </div>
      </div>

      {data.q1 && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: lblColor, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
            ¿Qué te tiene en el nivel {data.scale}?
          </span>
          <p style={{ color: textMid, fontSize: 13, margin: '3px 0 0', lineHeight: 1.6 }}>{data.q1}</p>
        </div>
      )}
      {data.q2 && (
        <div>
          <span style={{ fontSize: 10, color: lblColor, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
            ¿Cómo sabrías que has avanzado un nivel más?
          </span>
          <p style={{ color: textMid, fontSize: 13, margin: '3px 0 0', lineHeight: 1.6 }}>{data.q2}</p>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type, small = false }: { type: string; small?: boolean }) {
  const cfg = NOTE_CONFIG[(type as NoteType)] ?? NOTE_CONFIG.LIBRE;
  if (type === 'LIBRE') return null;
  return (
    <span style={{
      fontSize: small ? 10 : 11, fontWeight: 700,
      padding: small ? '2px 6px' : '3px 8px', borderRadius: 6,
      background: cfg.bg, color: cfg.color, letterSpacing: '0.3px', flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

const EMPTY_SCALE: ScaleData = { scale: 0, q1: '', q2: '' };

export default function SessionNotesFeed({ clientId, accent = 'rgb(45,212,191)', isDark = false }: Props) {
  const { notes, loading, addNote, updateNote, deleteNote } = useSessionNotes(clientId);
  const canUseAI = useClinicoFeature('aiNotes');
  const canUseAudioNotes = useClinicoFeature('audio_notes');
  const [audioBusy, setAudioBusy] = useState(false);
  const [showClinicoDialog, setShowClinicoDialog] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scaleData, setScaleData]   = useState<ScaleData>(EMPTY_SCALE);
  const [aiDraft, setAiDraft]       = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [form, setForm] = useState({
    sessionDate: new Date().toISOString().split('T')[0],
    noteType: 'LIBRE' as NoteType,
    summary: '', topics: '', homework: '', observations: '', nextPlan: '',
  });

  const t = accentTokens(accent);
  const _am = accent.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const [_ar, _ag, _ab] = _am ? [_am[1], _am[2], _am[3]] : ['139', '92', '246'];
  const aiContainerBg = isDark
    ? `linear-gradient(160deg, rgba(${_ar},${_ag},${_ab},0.28) 0%, rgba(6,4,14,0.88) 100%)`
    : `linear-gradient(160deg, rgba(${_ar},${_ag},${_ab},0.12) 0%, rgba(245,243,255,0.9) 100%)`;

  const textStrong  = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)';
  const textMid     = isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.78)';
  const textMuted   = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.4)';
  const textFaint   = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const cardBg      = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.82)';
  const formBg      = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)';
  const inpBg       = isDark ? 'rgba(255,255,255,0.11)' : 'white';
  const cancelColor = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.4)';
  const cancelBdr   = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)';
  const cardBdr     = isDark ? t.borderFocus : 'rgba(0,0,0,0.1)';
  const hintColor   = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.35)';

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: inpBg, border: `1px solid ${isDark ? t.borderFocus : 'rgba(0,0,0,0.12)'}`,
    color: textStrong, fontSize: 13, fontFamily: 'DM Sans, sans-serif',
    outline: 'none', boxSizing: 'border-box',
  };
  const ta: React.CSSProperties = { ...inp, resize: 'vertical', minHeight: 72 };
  const lbl: React.CSSProperties = {
    fontSize: 11, color: isDark ? 'rgba(255,255,255,0.82)' : t.lblColor, fontWeight: 700,
    letterSpacing: '0.7px', textTransform: 'uppercase', display: 'block', marginBottom: 4,
  };

  const lastScale = (): ScaleData => {
    const last = [...notes]
      .filter(n => (n.noteType === 'DIAMANTE' || n.noteType === 'NECS') && n.nextPlan)
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())[0];
    if (!last) return EMPTY_SCALE;
    const parsed = parseScale(last.nextPlan);
    return parsed ? { scale: parsed.scale, q1: '', q2: '' } : EMPTY_SCALE;
  };

  const resetForm = () => {
    setForm({ sessionDate: new Date().toISOString().split('T')[0], noteType: 'LIBRE', summary: '', topics: '', homework: '', observations: '', nextPlan: '' });
    setScaleData(lastScale());
    setAiDraft('');
  };

  const handleGenerateAI = async () => {
    if (!aiDraft.trim()) return;
    setIsGenerating(true);
    try {
      const { data: generated } = await api.post('/ai-notes/generate', {
        description: aiDraft,
        noteType: form.noteType,
        clientId,
      });
      setForm(f => ({
        ...f,
        summary:      generated.summary      ?? f.summary,
        topics:       generated.topics        ?? f.topics,
        observations: generated.observations  ?? f.observations,
        nextPlan:     generated.nextPlan      ?? f.nextPlan,
        homework:     generated.homework      ?? f.homework,
      }));
      if ((form.noteType === 'DIAMANTE' || form.noteType === 'NECS') && generated.nextPlan) {
        const np = generated.nextPlan;
        if (typeof np === 'object' && typeof np.scale === 'number') {
          setScaleData({ scale: np.scale, q1: np.q1 ?? '', q2: np.q2 ?? '' });
        }
      }
    } catch {
      alert('No se pudo generar la nota. Verifica tu conexión.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    const submitData = { ...form };
    if (form.noteType === 'DIAMANTE' || form.noteType === 'NECS') {
      submitData.nextPlan = JSON.stringify(scaleData);
    }
    if (editingId) { await updateNote(editingId, submitData); setEditingId(null); }
    else { await addNote(submitData); }
    resetForm();
    setShowForm(false);
  };

  const startEdit = (note: SessionNote) => {
    const noteType = (note.noteType as NoteType) ?? 'LIBRE';
    setForm({
      sessionDate:  note.sessionDate.split('T')[0],
      noteType,
      summary:      note.summary ?? '',
      topics:       note.topics ?? '',
      homework:     note.homework ?? '',
      observations: note.observations ?? '',
      nextPlan:     note.nextPlan ?? '',
    });
    if (noteType === 'DIAMANTE' || noteType === 'NECS') {
      setScaleData(parseScale(note.nextPlan) ?? EMPTY_SCALE);
    }
    setEditingId(note.id);
    setShowForm(true);
  };

  const currentConfig = NOTE_CONFIG[form.noteType];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: textStrong, fontSize: 16, fontWeight: 600, margin: 0 }}>Notas de evolución</h3>
        <button
          className="btn-lift"
          onClick={() => { setShowForm(s => !s); setEditingId(null); resetForm(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: accent, border: 'none',
            borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 7px rgba(0,0,0,0.22)',
          }}
        >
          <Plus size={14} /> Nueva nota
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: formBg, border: `1px dashed ${t.border}`, borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Type selector */}
          <div>
            <label style={lbl}>Tipo de nota</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {TYPE_ORDER.map(type => {
                const cfg = NOTE_CONFIG[type];
                const active = form.noteType === type;
                return (
                  <button className="btn-lift" key={type} onClick={() => setForm(f => ({ ...f, noteType: type }))} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? `rgba(${_ar},${_ag},${_ab},0.15)` : 'transparent',
                    color: active ? accent : textMuted,
                    border: `1.5px solid ${active ? accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
                    backdropFilter: active ? 'blur(4px)' : 'none',
                  }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI draft */}
          <div style={{
            background: aiContainerBg,
            border: `1.5px solid rgba(${_ar},${_ag},${_ab},${isDark ? 0.45 : 0.30})`,
            borderRadius: 14,
            padding: '16px 18px',
            boxShadow: isDark ? `0 4px 24px rgba(${_ar},${_ag},${_ab},0.18)` : `0 2px 12px rgba(${_ar},${_ag},${_ab},0.10)`,
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: isDark ? '#ddd6fe' : '#7c3aed' }}>
                <Sparkles size={16} style={{ color: '#c4b5fd' }} />
                Generar con IA
              </span>
              {!canUseAI && (
                <span style={{ fontSize: 11, fontWeight: 700, background: `linear-gradient(135deg,#8b5cf6,${accent})`, color: '#fff', borderRadius: 20, padding: '3px 10px', letterSpacing: 0.6 }}>
                  CLÍNICO
                </span>
              )}
            </div>
            {canUseAI ? (
              <>
                <p style={{ fontSize: 12.5, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(109,40,217,0.75)', marginBottom: 10, lineHeight: 1.55 }}>
                  Escribe una breve descripción de la sesión, o sube hasta 1 hora de audio — la IA transcribe y genera tu nota clínica completa, automáticamente.
                </p>
                {canUseAudioNotes && (
                  <AudioUploadBlock
                    clientId={clientId}
                    onTranscriptReady={text => setAiDraft(text)}
                    onBusyChange={setAudioBusy}
                    isDark={isDark}
                  />
                )}
                <textarea
                  value={aiDraft}
                  onChange={e => setAiDraft(e.target.value)}
                  disabled={audioBusy}
                  style={{ ...ta, minHeight: 72, borderColor: `rgba(${_ar},${_ag},${_ab},0.3)`, background: isDark ? `rgba(${_ar},${_ag},${_ab},0.08)` : 'rgba(255,255,255,0.85)', color: textStrong }}
                  rows={3}
                  placeholder="Ej: El paciente llegó ansioso por conflicto laboral. Trabajamos técnicas de regulación emocional. Logró identificar sus patrones de pensamiento. Tarea: diario de emociones..."
                />
                <button
                  className="btn-lift"
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !aiDraft.trim()}
                  style={{
                    marginTop: 10, display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px', borderRadius: 10, border: 'none',
                    cursor: isGenerating || !aiDraft.trim() ? 'not-allowed' : 'pointer',
                    background: isGenerating || !aiDraft.trim()
                      ? 'rgba(124,58,237,0.25)'
                      : 'linear-gradient(135deg,#7c3aed,#4338ca)',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    boxShadow: isGenerating || !aiDraft.trim() ? 'none' : '0 2px 7px rgba(0,0,0,0.22)',
                  }}
                >
                  {isGenerating
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</>
                    : <><Sparkles size={14} /> Generar nota</>}
                </button>
              </>
            ) : (
              <div onClick={() => setShowClinicoDialog(true)} style={{ position: 'relative', cursor: 'pointer' }}>
                <div style={{ opacity: 0.4, pointerEvents: 'none' }}>
                  <p style={{ fontSize: 12.5, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(109,40,217,0.75)', marginBottom: 10, lineHeight: 1.55 }}>
                    Escribe una breve descripción de la sesión, o sube hasta 1 hora de audio — la IA transcribe y genera tu nota clínica completa, automáticamente.
                  </p>
                  <button disabled style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '12px 18px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
                    color: '#fff', fontSize: 13.5, fontWeight: 700,
                  }}>
                    <Mic size={16} /> Subir audio de la sesión
                  </button>
                  <textarea
                    readOnly
                    disabled
                    rows={3}
                    style={{ ...ta, minHeight: 72, marginTop: 10, borderColor: `rgba(${_ar},${_ag},${_ab},0.3)`, background: isDark ? `rgba(${_ar},${_ag},${_ab},0.08)` : 'rgba(255,255,255,0.85)', color: textStrong }}
                    placeholder="Ej: El paciente llegó ansioso por conflicto laboral. Trabajamos técnicas de regulación emocional..."
                  />
                  <button disabled style={{
                    marginTop: 10, display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px', borderRadius: 10, border: 'none',
                    background: 'rgba(124,58,237,0.25)', color: '#fff', fontSize: 13, fontWeight: 600,
                  }}>
                    <Sparkles size={14} /> Generar nota
                  </button>
                </div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 20,
                    background: isDark ? 'rgba(20,10,40,0.92)' : 'rgba(255,255,255,0.95)',
                    border: `1px solid rgba(${_ar},${_ag},${_ab},0.4)`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  }}>
                    <Lock size={15} style={{ color: isDark ? '#c4b5fd' : '#7c3aed' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#e9d5ff' : '#5b21b6' }}>
                      Disponible en plan Clínico
                    </span>
                  </div>
                </div>
              </div>
            )}

            {showClinicoDialog && createPortal(
              <div
                onClick={() => setShowClinicoDialog(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: isDark ? '#1a1030' : '#ffffff', borderRadius: 18, padding: 28,
                    maxWidth: 380, width: '100%', textAlign: 'center', position: 'relative',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                  }}
                >
                  <button
                    onClick={() => setShowClinicoDialog(false)}
                    style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
                  >
                    <X size={18} />
                  </button>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', margin: '0 auto 14px',
                    background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Sparkles size={22} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: isDark ? '#fff' : '#1a1030', margin: '0 0 8px' }}>
                    Disponible en plan Clínico
                  </h3>
                  <p style={{ fontSize: 13.5, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Describe la sesión en tus palabras o sube hasta 1 hora de audio, y la IA genera tu nota clínica completa por ti. Disponible en el plan Clínico.
                  </p>
                  <Link
                    to="/pricing"
                    onClick={() => setShowClinicoDialog(false)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', padding: '11px 20px', borderRadius: 10, textDecoration: 'none',
                      background: 'linear-gradient(135deg,#7c3aed,#4338ca)', color: '#fff',
                      fontSize: 14, fontWeight: 700, boxShadow: '0 2px 10px rgba(124,58,237,0.35)',
                    }}
                  >
                    Ver planes
                  </Link>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* Date */}
          <div>
            <label style={lbl}>Fecha de sesión</label>
            <CustomDatePicker
              value={form.sessionDate}
              onChange={v => setForm(f => ({ ...f, sessionDate: v || new Date().toISOString().split('T')[0] }))}
              accent={accent}
              isDark={isDark}
              triggerStyle={isDark ? undefined : { ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            />
          </div>

          {/* Dynamic fields (excludes nextPlan for DIAMANTE) */}
          {currentConfig.fields.map(({ key, label, hint }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              {hint && <p style={{ fontSize: 13, color: hintColor, marginBottom: 6, lineHeight: 1.5 }}>{hint}</p>}
              <textarea
                value={(form as Record<string, string>)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={ta} rows={2}
              />
            </div>
          ))}

          {/* Scale field for DIAMANTE and NECS */}
          {(form.noteType === 'DIAMANTE' || form.noteType === 'NECS') && (
            <ScaleFormField
              data={scaleData}
              onChange={setScaleData}
              isDark={isDark}
              ta={ta}
              lbl={lbl}
              hintColor={hintColor}
              labelOverride={
                form.noteType === 'NECS'     ? '¿Dónde se siente en el camino?' :
                form.noteType === 'DIAMANTE' ? 'Y respecto a este futuro preferido, ¿en qué nivel te encuentras hoy?' :
                undefined
              }
            />
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn-lift"
              onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
              style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${cancelBdr}`, background: 'transparent', color: cancelColor, cursor: 'pointer', fontSize: 13 }}
            >
              Cancelar
            </button>
            <button
              className="btn-lift"
              onClick={handleSubmit}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, boxShadow: '0 2px 7px rgba(0,0,0,0.22)' }}
            >
              {editingId ? 'Actualizar' : 'Guardar nota'}
            </button>
          </div>
        </div>
      )}

      {loading && <p style={{ color: textMuted, textAlign: 'center' }}>Cargando...</p>}
      {!loading && notes.length === 0 && (
        <p style={{ color: textFaint, textAlign: 'center', padding: 24, fontSize: 14 }}>Sin notas de evolución aún.</p>
      )}

      {/* Notes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notes.map(note => {
          const noteType = (note.noteType as NoteType) ?? 'LIBRE';
          const cfg = NOTE_CONFIG[noteType];
          const isExpanded = expandedId === note.id;

          return (
            <div key={note.id} style={{ background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 12, overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : note.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ background: t.chipBg, color: t.savedColor, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>
                    #{note.sessionNumber}
                  </span>
                  <TypeBadge type={noteType} small />
                  {/* Show scale badge on card header for Diamante and NECS */}
                  {(noteType === 'DIAMANTE' || noteType === 'NECS') && (() => {
                    const sd = parseScale(note.nextPlan);
                    return sd ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#22c55e', flexShrink: 0 }}>
                        Escala {sd.scale}/10
                      </span>
                    ) : null;
                  })()}
                  <span style={{ color: textStrong, fontSize: 14, flexShrink: 0 }}>
                    {new Date(note.sessionDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  {note.summary && (
                    <span style={{ color: textMuted, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {note.summary}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); startEdit(note); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: 4 }}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar nota?')) deleteNote(note.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6584', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} color={textMuted} /> : <ChevronDown size={14} color={textMuted} />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${cardBdr}` }}>
                  {/* Regular fields */}
                  {cfg.fields.map(({ key, label }) => {
                    const value = (note as unknown as Record<string, string | undefined>)[key];
                    if (!value) return null;
                    return (
                      <div key={key} style={{ paddingTop: 8 }}>
                        <span style={{ fontSize: 10, color: t.lblColor, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                          {label}
                        </span>
                        <p style={{ color: textMid, fontSize: 13, margin: '4px 0 0', lineHeight: 1.6 }}>{value}</p>
                      </div>
                    );
                  })}

                  {/* Scale read-only for DIAMANTE and NECS */}
                  {(noteType === 'DIAMANTE' || noteType === 'NECS') && note.nextPlan && (
                    <div style={{ paddingTop: 8 }}>
                      <span style={{ fontSize: 10, color: t.lblColor, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                        {noteType === 'NECS'     ? '¿Dónde se siente en el camino?' :
                         noteType === 'DIAMANTE' ? 'Y respecto a este futuro preferido, ¿en qué nivel te encuentras hoy?' :
                         'P — Escalas y próximo nivel'}
                      </span>
                      <ScaleReadOnly raw={note.nextPlan} isDark={isDark} lblColor={t.lblColor} textMid={textMid} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
