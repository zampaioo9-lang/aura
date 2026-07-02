import { useState } from 'react';
import type { ClinicalHistory } from '../../../hooks/usePatients';
import CustomSelect from '../../CustomSelect';
import { useWizardAccent } from '../WizardAccentContext';

interface StepProps {
  inp: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistory | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistory>) => Promise<void>; saving: boolean;
  isDark?: boolean;
}

const DURATIONS = [
  { value: 'Menos de 1 mes',  label: 'Menos de 1 mes' },
  { value: '1-3 meses',       label: '1-3 meses' },
  { value: '3-6 meses',       label: '3-6 meses' },
  { value: '6-12 meses',      label: '6-12 meses' },
  { value: '1-2 años',        label: '1-2 años' },
  { value: 'Más de 2 años',   label: 'Más de 2 años' },
];

export default function Step2Motivo({ lbl, ta, history, onSave, saving, stepIndex, isDark = true }: StepProps) {
  const [form, setForm] = useState({
    chiefComplaint:  history?.chiefComplaint  ?? '',
    symptomDuration: history?.symptomDuration ?? '',
    triggerFactors:  history?.triggerFactors  ?? '',
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
        <label style={lbl}>Motivo de consulta (en palabras del paciente)</label>
        <textarea value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} style={ta} placeholder="¿Por qué viene a consulta? ¿Qué le pasa?" rows={4} />
      </div>
      <div>
        <label style={lbl}>Tiempo de evolución</label>
        <CustomSelect
          value={form.symptomDuration}
          onChange={v => set('symptomDuration', v)}
          options={DURATIONS}
          placeholder="Seleccionar"
          dark={isDark}
        />
      </div>
      <div>
        <label style={lbl}>Factores desencadenantes</label>
        <textarea value={form.triggerFactors} onChange={e => set('triggerFactors', e.target.value)} style={ta} placeholder="¿Qué situaciones o eventos precipitaron el problema?" rows={3} />
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
