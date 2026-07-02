import { useState } from 'react';
import type { ClinicalHistory } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface StepProps {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistory | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistory>) => Promise<void>; saving: boolean;
}

export default function Step3Problema({ lbl, ta, history, onSave, saving, stepIndex }: StepProps) {
  const [form, setForm] = useState({
    currentProblem: history?.currentProblem ?? '',
    onsetCourse: history?.onsetCourse ?? '',
    currentSymptoms: history?.currentSymptoms ?? '',
    previousTreatments: history?.previousTreatments ?? '',
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
        <label style={lbl}>Descripción del problema actual</label>
        <textarea value={form.currentProblem} onChange={e => set('currentProblem', e.target.value)} style={ta} placeholder="Descripción detallada del problema principal..." rows={4} />
      </div>
      <div>
        <label style={lbl}>Inicio y curso del problema</label>
        <textarea value={form.onsetCourse} onChange={e => set('onsetCourse', e.target.value)} style={ta} placeholder="¿Cuándo inició? ¿Cómo ha evolucionado?" rows={3} />
      </div>
      <div>
        <label style={lbl}>Síntomas actuales</label>
        <textarea value={form.currentSymptoms} onChange={e => set('currentSymptoms', e.target.value)} style={ta} placeholder="Lista de síntomas presentes actualmente..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Tratamientos previos</label>
        <textarea value={form.previousTreatments} onChange={e => set('previousTreatments', e.target.value)} style={ta} placeholder="¿Ha recibido algún tratamiento o terapia antes? ¿Con qué resultado?" rows={3} />
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
