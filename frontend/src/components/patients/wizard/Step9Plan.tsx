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

const toOpts = (arr: string[]) => arr.map(v => ({ value: v, label: v }));

const FREQUENCIES = toOpts(['Semanal', 'Quincenal', 'Mensual', 'Intensivo (2x semana)', 'Según evolución']);
const APPROACHES  = toOpts([
  'TCC (Cognitivo-Conductual)',
  'TBCS (Breve Centrada en Soluciones)',
  'TRE (Racional Emotiva)',
  'ACT (Aceptación y Compromiso)',
  'DBT (Dialéctico-Conductual)',
  'EMDR',
  'Psicoanálisis',
  'Psicodinámica',
  'Humanista / Centrada en el cliente',
  'Gestalt',
  'Sistémica / Familiar',
  'Narrativa',
  'Mindfulness / MBCT',
  'Terapia de Esquemas',
  'EFT (Enfocada en las Emociones)',
  'Logoterapia',
  'Psicodrama',
  'Cognitiva (Beck)',
  'Integrativa',
  'Otro',
]);

export default function Step9Plan({ inp, lbl, ta, history, onSave, saving, stepIndex, isDark = true }: StepProps) {
  const [form, setForm] = useState({
    therapeuticGoals:    history?.therapeuticGoals    ?? '',
    therapeuticApproach: history?.therapeuticApproach ?? '',
    sessionFrequency:    history?.sessionFrequency    ?? '',
    estimatedDuration:   history?.estimatedDuration   ?? '',
    referrals:           history?.referrals           ?? '',
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
        <textarea value={form.therapeuticGoals} onChange={e => set('therapeuticGoals', e.target.value)} style={ta} placeholder="Objetivos específicos, medibles y alcanzables del tratamiento..." rows={4} />
      </div>
      <div>
        <label style={lbl}>Enfoque terapéutico</label>
        <CustomSelect
          value={form.therapeuticApproach}
          onChange={v => set('therapeuticApproach', v)}
          options={APPROACHES}
          placeholder="Seleccionar enfoque"
          dark={isDark}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <label style={lbl}>Frecuencia de sesiones</label>
          <CustomSelect
            value={form.sessionFrequency}
            onChange={v => set('sessionFrequency', v)}
            options={FREQUENCIES}
            placeholder="Seleccionar"
            dark={isDark}
          />
        </div>
        <div>
          <label style={lbl}>Duración estimada</label>
          <input value={form.estimatedDuration} onChange={e => set('estimatedDuration', e.target.value)} style={inp} placeholder="Ej: 3-6 meses, 1 año..." />
        </div>
      </div>
      <div>
        <label style={lbl}>Derivaciones y trabajo en red</label>
        <textarea value={form.referrals} onChange={e => set('referrals', e.target.value)} style={ta} placeholder="Interconsultas con psiquiatría, médico de cabecera, trabajador social..." rows={2} />
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
