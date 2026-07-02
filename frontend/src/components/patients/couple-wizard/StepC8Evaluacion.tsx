import { useState } from 'react';
import type { ClinicalHistoryCouple } from '../../../hooks/usePatients';
import CustomSelect from '../../CustomSelect';
import { useWizardAccent } from '../WizardAccentContext';

interface Props {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistoryCouple | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistoryCouple>) => Promise<void>; saving: boolean;
  isDark?: boolean;
}

const toOpts = (arr: string[]) => arr.map(v => ({ value: v, label: v }));
const COMMITMENT = toOpts(['Muy alto — comprometido/a al 100%', 'Alto — quiere seguir con trabajo', 'Medio — ambivalente', 'Bajo — dudando de la relación', 'Muy bajo — ya considera terminar']);
const RISK = toOpts(['Sin indicadores', 'Violencia verbal / emocional', 'Violencia física leve', 'Violencia física grave', 'Requiere evaluación urgente']);

export default function StepC8Evaluacion({ lbl, ta, history, onSave, saving, stepIndex, isDark = true }: Props) {
  const [form, setForm] = useState({
    p1Commitment: history?.p1Commitment ?? '',
    p2Commitment: history?.p2Commitment ?? '',
    violenceRisk: history?.violenceRisk ?? '',
    infidelityHistory: history?.infidelityHistory ?? '',
    substanceUse: history?.substanceUse ?? '',
    individualMH: history?.individualMH ?? '',
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
        <label style={lbl}>Nivel de compromiso — Miembro 1</label>
        <CustomSelect value={form.p1Commitment} onChange={v => set('p1Commitment', v)} options={COMMITMENT} placeholder="Seleccionar" dark={isDark} />
      </div>
      <div>
        <label style={lbl}>Nivel de compromiso — Miembro 2</label>
        <CustomSelect value={form.p2Commitment} onChange={v => set('p2Commitment', v)} options={COMMITMENT} placeholder="Seleccionar" dark={isDark} />
      </div>
      <div>
        <label style={lbl}>Indicadores de violencia o riesgo</label>
        <CustomSelect value={form.violenceRisk} onChange={v => set('violenceRisk', v)} options={RISK} placeholder="Seleccionar" dark={isDark} />
      </div>
      <div>
        <label style={lbl}>Historia de infidelidad</label>
        <textarea value={form.infidelityHistory} onChange={e => set('infidelityHistory', e.target.value)} style={ta}
          placeholder="¿Ha habido infidelidades? ¿Física o emocional? ¿Fue revelada? ¿Está resuelta o sigue activa?" rows={2} />
      </div>
      <div>
        <label style={lbl}>Uso de sustancias (alguno de los miembros)</label>
        <textarea value={form.substanceUse} onChange={e => set('substanceUse', e.target.value)} style={ta}
          placeholder="Alcohol, drogas, medicamentos. ¿Afecta la dinámica de pareja?" rows={2} />
      </div>
      <div>
        <label style={lbl}>Salud mental individual relevante</label>
        <textarea value={form.individualMH} onChange={e => set('individualMH', e.target.value)} style={ta}
          placeholder="Diagnósticos individuales, medicación, terapia individual actual de alguno de los miembros..." rows={2} />
      </div>
      <button className="btn-lift" onClick={handleSave} disabled={saving} style={{
        alignSelf: 'flex-end', padding: '10px 24px', borderRadius: 10, border: 'none',
        background: saved ? wBtn.savedBg : wBtn.bg,
        color: saved ? wBtn.savedColor : '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar evaluación'}
      </button>
    </div>
  );
}
