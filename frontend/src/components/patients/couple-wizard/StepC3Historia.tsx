import { useState } from 'react';
import type { ClinicalHistoryCouple } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface Props {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistoryCouple | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistoryCouple>) => Promise<void>; saving: boolean;
}

export default function StepC3Historia({ lbl, ta, history, onSave, saving, stepIndex }: Props) {
  const [form, setForm] = useState({
    howTheyMet: history?.howTheyMet ?? '',
    courtshipHistory: history?.courtshipHistory ?? '',
    significantEvents: history?.significantEvents ?? '',
    crisisPoints: history?.crisisPoints ?? '',
  });
  const [saved, setSaved] = useState(false);
  const wBtn = useWizardAccent();
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await onSave(stepIndex, form);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={lbl}>¿Cómo se conocieron?</label>
        <textarea value={form.howTheyMet} onChange={e => set('howTheyMet', e.target.value)} style={ta}
          placeholder="Circunstancias del encuentro, dónde, cuándo, qué los atrajo..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Historia del noviazgo / inicio de la relación</label>
        <textarea value={form.courtshipHistory} onChange={e => set('courtshipHistory', e.target.value)} style={ta}
          placeholder="¿Cómo fue el noviazgo? ¿Cuándo formalizaron? ¿Vivieron juntos desde cuándo?" rows={3} />
      </div>
      <div>
        <label style={lbl}>Eventos significativos de la relación</label>
        <textarea value={form.significantEvents} onChange={e => set('significantEvents', e.target.value)} style={ta}
          placeholder="Mudanzas, pérdidas, logros, cambios de trabajo, nacimientos, enfermedades..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Momentos de crisis o quiebre anteriores</label>
        <textarea value={form.crisisPoints} onChange={e => set('crisisPoints', e.target.value)} style={ta}
          placeholder="¿Han tenido crisis antes? ¿Cómo las resolvieron? ¿Hubo separaciones previas?" rows={3} />
      </div>
      <button className="btn-lift" onClick={handleSave} disabled={saving} style={{
        alignSelf: 'flex-end', padding: '10px 24px', borderRadius: 10, border: 'none',
        background: saved ? wBtn.savedBg : wBtn.bg,
        color: saved ? wBtn.savedColor : '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar sección'}
      </button>
    </div>
  );
}
