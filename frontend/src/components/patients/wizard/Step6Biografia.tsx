import { useState } from 'react';
import type { ClinicalHistory } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface StepProps {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistory | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistory>) => Promise<void>; saving: boolean;
}

export default function Step6Biografia({ lbl, ta, history, onSave, saving, stepIndex }: StepProps) {
  const [form, setForm] = useState({
    childhoodHistory: history?.childhoodHistory ?? '',
    schoolHistory: history?.schoolHistory ?? '',
    workHistory: history?.workHistory ?? '',
    relationshipHistory: history?.relationshipHistory ?? '',
    traumaticEvents: history?.traumaticEvents ?? '',
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
        <label style={lbl}>Historia de la infancia</label>
        <textarea value={form.childhoodHistory} onChange={e => set('childhoodHistory', e.target.value)} style={ta} placeholder="Crianza, relación con cuidadores, ambiente familiar en la infancia..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Historia escolar y académica</label>
        <textarea value={form.schoolHistory} onChange={e => set('schoolHistory', e.target.value)} style={ta} placeholder="Rendimiento, relaciones con pares, experiencias destacadas..." rows={2} />
      </div>
      <div>
        <label style={lbl}>Historia laboral</label>
        <textarea value={form.workHistory} onChange={e => set('workHistory', e.target.value)} style={ta} placeholder="Trayectoria laboral, satisfacción, conflictos..." rows={2} />
      </div>
      <div>
        <label style={lbl}>Historia de relaciones de pareja</label>
        <textarea value={form.relationshipHistory} onChange={e => set('relationshipHistory', e.target.value)} style={ta} placeholder="Relaciones significativas, patrones relacionales..." rows={2} />
      </div>
      <div>
        <label style={lbl}>Eventos traumáticos</label>
        <textarea value={form.traumaticEvents} onChange={e => set('traumaticEvents', e.target.value)} style={ta} placeholder="Situaciones de abuso, pérdidas significativas, accidentes..." rows={3} />
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
