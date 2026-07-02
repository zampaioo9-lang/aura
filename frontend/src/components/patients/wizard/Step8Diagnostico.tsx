import { useState } from 'react';
import type { ClinicalHistory } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface StepProps {
  inp: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistory | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistory>) => Promise<void>; saving: boolean;
}

export default function Step8Diagnostico({ inp, lbl, ta, history, onSave, saving, stepIndex }: StepProps) {
  const [form, setForm] = useState({
    provisionalDiagnosis: history?.provisionalDiagnosis ?? '',
    diagnosticCode: history?.diagnosticCode ?? '',
    differentialDiagnosis: history?.differentialDiagnosis ?? '',
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
        <label style={lbl}>Diagnóstico provisional</label>
        <textarea value={form.provisionalDiagnosis} onChange={e => set('provisionalDiagnosis', e.target.value)} style={ta} placeholder="Ej: Trastorno de ansiedad generalizada, Episodio depresivo moderado..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Código diagnóstico (CIE-10 / DSM-5)</label>
        <input value={form.diagnosticCode} onChange={e => set('diagnosticCode', e.target.value)} style={inp} placeholder="Ej: F41.1, F32.1" />
      </div>
      <div>
        <label style={lbl}>Diagnóstico diferencial</label>
        <textarea value={form.differentialDiagnosis} onChange={e => set('differentialDiagnosis', e.target.value)} style={ta} placeholder="Otros diagnósticos a considerar o descartar..." rows={3} />
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
