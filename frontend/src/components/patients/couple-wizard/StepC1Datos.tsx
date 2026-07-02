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
const STATUSES = toOpts(['Casados/as', 'Unión libre', 'Novios/as', 'Separados/as en proceso', 'Comprometidos/as']);
const EDUCATION = toOpts(['Primaria', 'Secundaria', 'Bachillerato', 'Técnico', 'Licenciatura', 'Posgrado']);
const TIME = toOpts(['Menos de 1 año', '1-2 años', '2-5 años', '5-10 años', '10-20 años', 'Más de 20 años']);

export default function StepC1Datos({ inp, lbl, ta, history, onSave, saving, stepIndex, isDark = true }: Props) {
  const [form, setForm] = useState({
    p1Name: history?.p1Name ?? '', p1Age: history?.p1Age ?? '',
    p1Occupation: history?.p1Occupation ?? '', p1Education: history?.p1Education ?? '',
    p2Name: history?.p2Name ?? '', p2Age: history?.p2Age ?? '',
    p2Occupation: history?.p2Occupation ?? '', p2Education: history?.p2Education ?? '',
    relationshipStatus: history?.relationshipStatus ?? '',
    timeTogether: history?.timeTogether ?? '',
    children: history?.children ?? '',
  });
  const [saved, setSaved] = useState(false);
  const wBtn = useWizardAccent();
  const accent = wBtn.savedColor; // accent RGB from context
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await onSave(stepIndex, form);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const sectionHdr: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 6,
    borderBottom: `1px solid ${wBtn.border}`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div>
        <p style={sectionHdr}>Miembro 1</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Nombre completo</label>
            <input value={form.p1Name} onChange={e => set('p1Name', e.target.value)} style={inp} placeholder="Nombre del miembro 1" />
          </div>
          <div>
            <label style={lbl}>Edad</label>
            <input value={form.p1Age} onChange={e => set('p1Age', e.target.value)} style={inp} placeholder="Ej: 34 años" />
          </div>
          <div>
            <label style={lbl}>Ocupación</label>
            <input value={form.p1Occupation} onChange={e => set('p1Occupation', e.target.value)} style={inp} placeholder="Profesión u ocupación" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Escolaridad</label>
            <CustomSelect value={form.p1Education} onChange={v => set('p1Education', v)} options={EDUCATION} placeholder="Seleccionar" dark={isDark} accent={accent} />
          </div>
        </div>
      </div>

      <div>
        <p style={sectionHdr}>Miembro 2</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Nombre completo</label>
            <input value={form.p2Name} onChange={e => set('p2Name', e.target.value)} style={inp} placeholder="Nombre del miembro 2" />
          </div>
          <div>
            <label style={lbl}>Edad</label>
            <input value={form.p2Age} onChange={e => set('p2Age', e.target.value)} style={inp} placeholder="Ej: 31 años" />
          </div>
          <div>
            <label style={lbl}>Ocupación</label>
            <input value={form.p2Occupation} onChange={e => set('p2Occupation', e.target.value)} style={inp} placeholder="Profesión u ocupación" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Escolaridad</label>
            <CustomSelect value={form.p2Education} onChange={v => set('p2Education', v)} options={EDUCATION} placeholder="Seleccionar" dark={isDark} accent={accent} />
          </div>
        </div>
      </div>

      <div>
        <p style={sectionHdr}>Datos de la relación</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div>
            <label style={lbl}>Estado de la relación</label>
            <CustomSelect value={form.relationshipStatus} onChange={v => set('relationshipStatus', v)} options={STATUSES} placeholder="Seleccionar" dark={isDark} accent={accent} />
          </div>
          <div>
            <label style={lbl}>Tiempo juntos</label>
            <CustomSelect value={form.timeTogether} onChange={v => set('timeTogether', v)} options={TIME} placeholder="Seleccionar" dark={isDark} accent={accent} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Hijos (cantidad y edades)</label>
            <textarea value={form.children} onChange={e => set('children', e.target.value)} style={ta} rows={2} placeholder="Ej: 2 hijos — Lucas (8) y Sofía (5). Sin hijos." />
          </div>
        </div>
      </div>

      <button className="btn-lift" onClick={handleSave} disabled={saving} style={{
        alignSelf: 'flex-end', padding: '10px 24px', borderRadius: 10, border: 'none',
        background: saved ? wBtn.savedBg : wBtn.bg,
        color: saved ? wBtn.savedColor : '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar datos'}
      </button>
    </div>
  );
}
