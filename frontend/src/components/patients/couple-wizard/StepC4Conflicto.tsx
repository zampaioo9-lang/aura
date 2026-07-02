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
const COMM_STYLES = toOpts([
  'Comunicación abierta y fluida',
  'Evitación / silencio',
  'Escalada / gritos y reproches',
  'Comunicación pasivo-agresiva',
  'Un miembro expresa, el otro se cierra',
  'Comunicación intermitente (bien y mal)',
]);

export default function StepC4Conflicto({ lbl, ta, history, onSave, saving, stepIndex, isDark = true }: Props) {
  const [form, setForm] = useState({
    mainConflictTopics: history?.mainConflictTopics ?? '',
    communicationStyle: history?.communicationStyle ?? '',
    negativeCycle: history?.negativeCycle ?? '',
    conflictResolution: history?.conflictResolution ?? '',
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
        <label style={lbl}>Temas de conflicto más frecuentes</label>
        <textarea value={form.mainConflictTopics} onChange={e => set('mainConflictTopics', e.target.value)} style={ta}
          placeholder="Ej: economía, crianza de hijos, tiempo juntos, familia de origen, celos, trabajo..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Estilo de comunicación predominante</label>
        <CustomSelect value={form.communicationStyle} onChange={v => set('communicationStyle', v)} options={COMM_STYLES} placeholder="Seleccionar" dark={isDark} />
      </div>
      <div>
        <label style={lbl}>Ciclo negativo (patrón de conflicto recurrente)</label>
        <textarea value={form.negativeCycle} onChange={e => set('negativeCycle', e.target.value)} style={ta}
          placeholder="Describir el ciclo: ¿Qué detona el conflicto? ¿Cómo reacciona cada uno? ¿Cómo termina?" rows={4} />
      </div>
      <div>
        <label style={lbl}>¿Cómo resuelven (o no resuelven) los conflictos?</label>
        <textarea value={form.conflictResolution} onChange={e => set('conflictResolution', e.target.value)} style={ta}
          placeholder="¿Quién cede? ¿Se reconcilian? ¿Quedan temas sin resolver? ¿Cuánto tiempo tardan?" rows={3} />
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
