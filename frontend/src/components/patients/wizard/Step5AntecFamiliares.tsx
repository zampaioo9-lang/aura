import { useState } from 'react';
import type { ClinicalHistory } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface StepProps {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistory | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistory>) => Promise<void>; saving: boolean;
}

export default function Step5AntecFamiliares({ lbl, ta, history, onSave, saving, stepIndex }: StepProps) {
  const [form, setForm] = useState({
    familyComposition: history?.familyComposition ?? '',
    familyRelations: history?.familyRelations ?? '',
    familyPsychHistory: history?.familyPsychHistory ?? '',
    familyEvents: history?.familyEvents ?? '',
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
        <label style={lbl}>Composición familiar</label>
        <textarea value={form.familyComposition} onChange={e => set('familyComposition', e.target.value)} style={ta} placeholder="¿Con quién vive? Descripción de los miembros de la familia..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Relaciones familiares</label>
        <textarea value={form.familyRelations} onChange={e => set('familyRelations', e.target.value)} style={ta} placeholder="Calidad de las relaciones con padres, hermanos, pareja, hijos..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Historia psiquiátrica familiar</label>
        <textarea value={form.familyPsychHistory} onChange={e => set('familyPsychHistory', e.target.value)} style={ta} placeholder="Diagnósticos de salud mental en familiares cercanos..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Eventos familiares relevantes</label>
        <textarea value={form.familyEvents} onChange={e => set('familyEvents', e.target.value)} style={ta} placeholder="Pérdidas, separaciones, violencia, migraciones, etc." rows={3} />
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
