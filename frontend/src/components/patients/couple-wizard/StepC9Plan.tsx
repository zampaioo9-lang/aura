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
const APPROACHES = toOpts([
  'EFT (Enfocada en las Emociones)',
  'TBCS (Breve Centrada en Soluciones)',
  'Sistémica / Familiar',
  'TCC de pareja (Gottman)',
  'Psicodinámica de pareja',
  'Narrativa',
  'ACT para parejas',
  'Imago Relationship Therapy',
  'Integrativa',
  'Otro',
]);
const MODALITIES = toOpts([
  'Sesiones conjuntas únicamente',
  'Sesiones conjuntas + sesiones individuales',
  'Inicio individual, luego conjunto',
  'Sesiones conjuntas + trabajo con familia de origen',
]);
const FREQUENCIES = toOpts(['Semanal', 'Quincenal', 'Mensual', 'Intensivo (2x semana)', 'Según evolución']);

export default function StepC9Plan({ inp, lbl, ta, history, onSave, saving, stepIndex, isDark = true }: Props) {
  const [form, setForm] = useState({
    therapeuticGoals: history?.therapeuticGoals ?? '',
    therapeuticApproach: history?.therapeuticApproach ?? '',
    sessionModality: history?.sessionModality ?? '',
    sessionFrequency: history?.sessionFrequency ?? '',
    estimatedDuration: history?.estimatedDuration ?? '',
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
        <label style={lbl}>Objetivos terapéuticos</label>
        <textarea value={form.therapeuticGoals} onChange={e => set('therapeuticGoals', e.target.value)} style={ta}
          placeholder="Objetivos específicos y medibles para la pareja. ¿Qué cambios concretos se esperan?" rows={4} />
      </div>
      <div>
        <label style={lbl}>Enfoque terapéutico</label>
        <CustomSelect value={form.therapeuticApproach} onChange={v => set('therapeuticApproach', v)} options={APPROACHES} placeholder="Seleccionar enfoque" dark={isDark} />
      </div>
      <div>
        <label style={lbl}>Modalidad de sesiones</label>
        <CustomSelect value={form.sessionModality} onChange={v => set('sessionModality', v)} options={MODALITIES} placeholder="Seleccionar modalidad" dark={isDark} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <label style={lbl}>Frecuencia</label>
          <CustomSelect value={form.sessionFrequency} onChange={v => set('sessionFrequency', v)} options={FREQUENCIES} placeholder="Seleccionar" dark={isDark} />
        </div>
        <div>
          <label style={lbl}>Duración estimada</label>
          <input value={form.estimatedDuration} onChange={e => set('estimatedDuration', e.target.value)} style={inp} placeholder="Ej: 3-6 meses" />
        </div>
      </div>
      <button className="btn-lift" onClick={handleSave} disabled={saving} style={{
        alignSelf: 'flex-end', padding: '10px 24px', borderRadius: 10, border: 'none',
        background: saved ? wBtn.savedBg : wBtn.bg,
        color: saved ? wBtn.savedColor : '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar plan'}
      </button>
    </div>
  );
}
