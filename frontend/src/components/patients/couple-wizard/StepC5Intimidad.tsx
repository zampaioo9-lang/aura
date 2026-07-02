import { useState } from 'react';
import type { ClinicalHistoryCouple } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface Props {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistoryCouple | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistoryCouple>) => Promise<void>; saving: boolean;
}

export default function StepC5Intimidad({ lbl, ta, history, onSave, saving, stepIndex }: Props) {
  const [form, setForm] = useState({
    emotionalIntimacy: history?.emotionalIntimacy ?? '',
    sexualLife: history?.sexualLife ?? '',
    positiveConnection: history?.positiveConnection ?? '',
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
        <label style={lbl}>Intimidad emocional</label>
        <textarea value={form.emotionalIntimacy} onChange={e => set('emotionalIntimacy', e.target.value)} style={ta}
          placeholder="¿Se sienten cercanos emocionalmente? ¿Se sienten vistos y comprendidos por el otro? ¿Han sentido distancia emocional?" rows={4} />
      </div>
      <div>
        <label style={lbl}>Vida sexual y afectiva</label>
        <textarea value={form.sexualLife} onChange={e => set('sexualLife', e.target.value)} style={ta}
          placeholder="Satisfacción con la vida sexual, cambios en la frecuencia, dificultades, discrepancias de deseo..." rows={4} />
      </div>
      <div>
        <label style={lbl}>Momentos de conexión positiva</label>
        <textarea value={form.positiveConnection} onChange={e => set('positiveConnection', e.target.value)} style={ta}
          placeholder="¿Cuándo se sienten bien juntos? ¿Qué actividades disfrutan? ¿Qué valoran del otro?" rows={3} />
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
