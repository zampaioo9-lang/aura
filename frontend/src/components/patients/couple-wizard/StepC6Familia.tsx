import { useState } from 'react';
import type { ClinicalHistoryCouple } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface Props {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistoryCouple | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistoryCouple>) => Promise<void>; saving: boolean;
}

export default function StepC6Familia({ lbl, ta, history, onSave, saving, stepIndex }: Props) {
  const [form, setForm] = useState({
    p1FamilyModel: history?.p1FamilyModel ?? '',
    p2FamilyModel: history?.p2FamilyModel ?? '',
    transgenerational: history?.transgenerational ?? '',
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
        <label style={lbl}>Modelo de pareja en la familia de origen — Miembro 1</label>
        <textarea value={form.p1FamilyModel} onChange={e => set('p1FamilyModel', e.target.value)} style={ta}
          placeholder="¿Cómo era la relación de los padres? ¿Qué aprendió sobre el amor y el conflicto en su familia?" rows={3} />
      </div>
      <div>
        <label style={lbl}>Modelo de pareja en la familia de origen — Miembro 2</label>
        <textarea value={form.p2FamilyModel} onChange={e => set('p2FamilyModel', e.target.value)} style={ta}
          placeholder="¿Cómo era la relación de los padres? ¿Qué aprendió sobre el amor y el conflicto en su familia?" rows={3} />
      </div>
      <div>
        <label style={lbl}>Patrones transgeneracionales identificados</label>
        <textarea value={form.transgenerational} onChange={e => set('transgenerational', e.target.value)} style={ta}
          placeholder="¿Qué patrones de sus familias de origen se repiten en la relación actual? Lealtades, mandatos, heridas no resueltas..." rows={4} />
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
