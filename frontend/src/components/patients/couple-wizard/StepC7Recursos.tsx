import { useState } from 'react';
import type { ClinicalHistoryCouple } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface Props {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistoryCouple | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistoryCouple>) => Promise<void>; saving: boolean;
}

export default function StepC7Recursos({ lbl, ta, history, onSave, saving, stepIndex }: Props) {
  const [form, setForm] = useState({
    previousTherapy: history?.previousTherapy ?? '',
    solutionAttempts: history?.solutionAttempts ?? '',
    coupleStrengths: history?.coupleStrengths ?? '',
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
        <label style={lbl}>Terapia de pareja previa</label>
        <textarea value={form.previousTherapy} onChange={e => set('previousTherapy', e.target.value)} style={ta}
          placeholder="¿Han ido a terapia de pareja antes? ¿Con quién? ¿Cuánto tiempo? ¿Qué fue útil y qué no?" rows={3} />
      </div>
      <div>
        <label style={lbl}>Intentos de solución que ya han probado</label>
        <textarea value={form.solutionAttempts} onChange={e => set('solutionAttempts', e.target.value)} style={ta}
          placeholder="¿Qué han intentado para resolver los problemas? ¿Conversaciones, acuerdos, separaciones temporales, libros, retiros?" rows={3} />
      </div>
      <div>
        <label style={lbl}>Fortalezas y recursos de la pareja</label>
        <textarea value={form.coupleStrengths} onChange={e => set('coupleStrengths', e.target.value)} style={ta}
          placeholder="¿Qué funciona bien? ¿Qué los ha mantenido juntos? ¿Cuáles son los momentos en que se llevan mejor?" rows={4} />
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
