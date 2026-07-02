import { useState } from 'react';
import type { ClinicalHistory } from '../../../hooks/usePatients';
import CustomSelect from '../../CustomSelect';
import { useWizardAccent } from '../WizardAccentContext';

interface StepProps {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistory | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistory>) => Promise<void>; saving: boolean;
  isDark?: boolean;
}

const toOpts = (arr: string[]) => arr.map(v => ({ value: v, label: v }));

const OPTS = {
  appearance: toOpts(['Cuidado', 'Descuidado', 'Inapropiado']),
  mood:       toOpts(['Eutímico', 'Deprimido', 'Ansioso', 'Irritable', 'Eufórico', 'Lábil']),
  affect:     toOpts(['Adecuado', 'Aplanado', 'Restringido', 'Inapropiado', 'Expansivo']),
  perception: toOpts(['Sin alteraciones', 'Alucinaciones auditivas', 'Alucinaciones visuales', 'Ilusiones']),
  memory:     toOpts(['Sin alteraciones', 'Alteración leve', 'Alteración moderada', 'Alteración grave']),
  attention:  toOpts(['Sin alteraciones', 'Levemente alterada', 'Moderadamente alterada']),
  judgment:   toOpts(['Conservado', 'Levemente alterado', 'Alterado']),
  insight:    toOpts(['Pleno', 'Parcial', 'Ausente']),
};

type SelectKey = keyof typeof OPTS;

export default function Step7ExamenMental({ lbl, ta, history, onSave, saving, stepIndex, isDark = true }: StepProps) {
  const [form, setForm] = useState({
    appearance: history?.appearance ?? '',
    mood:       history?.mood       ?? '',
    affect:     history?.affect     ?? '',
    thought:    history?.thought    ?? '',
    perception: history?.perception ?? '',
    memory:     history?.memory     ?? '',
    attention:  history?.attention  ?? '',
    judgment:   history?.judgment   ?? '',
    insight:    history?.insight    ?? '',
  });
  const [saved, setSaved] = useState(false);
  const wBtn = useWizardAccent();
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await onSave(stepIndex, form);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const renderSelect = (key: SelectKey, label: string) => (
    <div key={key}>
      <label style={lbl}>{label}</label>
      <CustomSelect
        value={form[key]}
        onChange={v => set(key, v)}
        options={OPTS[key]}
        placeholder="Seleccionar"
        dark={isDark}
      />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {renderSelect('appearance', 'Apariencia general')}
        {renderSelect('mood',       'Estado de ánimo')}
        {renderSelect('affect',     'Afecto')}
        {renderSelect('perception', 'Percepción')}
        {renderSelect('memory',     'Memoria')}
        {renderSelect('attention',  'Atención')}
        {renderSelect('judgment',   'Juicio')}
        {renderSelect('insight',    'Insight')}
      </div>
      <div>
        <label style={lbl}>Pensamiento (curso y contenido)</label>
        <textarea value={form.thought} onChange={e => set('thought', e.target.value)} style={ta} placeholder="Describe el curso del pensamiento, ideas predominantes, preocupaciones..." rows={3} />
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
