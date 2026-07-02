import { useState } from 'react';
import type { ClinicalHistoryCouple } from '../../../hooks/usePatients';
import CustomSelect from '../../CustomSelect';
import { useWizardAccent } from '../WizardAccentContext';

interface Props {
  inp: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistoryCouple | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistoryCouple>) => Promise<void>; saving: boolean;
  isDark?: boolean;
}

const toOpts = (arr: string[]) => arr.map(v => ({ value: v, label: v }));
const INITIATED = toOpts(['Ambos de acuerdo', 'Miembro 1', 'Miembro 2', 'Por indicación de un profesional', 'Por presión externa']);
const DURATIONS = toOpts(['Menos de 3 meses', '3-6 meses', '6-12 meses', '1-2 años', '2-5 años', 'Más de 5 años']);

export default function StepC2Motivo({ lbl, ta, history, onSave, saving, stepIndex, isDark = true }: Props) {
  const [form, setForm] = useState({
    chiefComplaint: history?.chiefComplaint ?? '',
    whoInitiated: history?.whoInitiated ?? '',
    problemDuration: history?.problemDuration ?? '',
    therapyExpectations: history?.therapyExpectations ?? '',
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
        <label style={lbl}>Motivo de consulta (perspectiva de la pareja)</label>
        <textarea value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} style={ta}
          placeholder="¿Por qué vienen a terapia? ¿Cuál es el problema principal que los trae?" rows={4} />
      </div>
      <div>
        <label style={lbl}>¿Quién tomó la iniciativa de buscar terapia?</label>
        <CustomSelect value={form.whoInitiated} onChange={v => set('whoInitiated', v)} options={INITIATED} placeholder="Seleccionar" dark={isDark} />
      </div>
      <div>
        <label style={lbl}>Tiempo de evolución del problema</label>
        <CustomSelect value={form.problemDuration} onChange={v => set('problemDuration', v)} options={DURATIONS} placeholder="Seleccionar" dark={isDark} />
      </div>
      <div>
        <label style={lbl}>Expectativas de la terapia</label>
        <textarea value={form.therapyExpectations} onChange={e => set('therapyExpectations', e.target.value)} style={ta}
          placeholder="¿Qué esperan lograr con la terapia? ¿Cómo sabrán que fue exitosa?" rows={3} />
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
