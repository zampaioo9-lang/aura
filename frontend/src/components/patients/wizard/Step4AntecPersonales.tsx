import { useState } from 'react';
import type { ClinicalHistory } from '../../../hooks/usePatients';
import { useWizardAccent } from '../WizardAccentContext';

interface StepProps {
  inp?: React.CSSProperties; lbl: React.CSSProperties; ta: React.CSSProperties;
  history: ClinicalHistory | null; stepIndex: number;
  onSave: (i: number, data: Partial<ClinicalHistory>) => Promise<void>; saving: boolean;
}

export default function Step4AntecPersonales({ lbl, ta, history, onSave, saving, stepIndex }: StepProps) {
  const [form, setForm] = useState({
    medicalHistory: history?.medicalHistory ?? '',
    psychiatricHistory: history?.psychiatricHistory ?? '',
    currentMedication: history?.currentMedication ?? '',
    hospitalizations: history?.hospitalizations ?? '',
    substanceUse: history?.substanceUse ?? '',
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
        <label style={lbl}>Historia médica</label>
        <textarea value={form.medicalHistory} onChange={e => set('medicalHistory', e.target.value)} style={ta} placeholder="Enfermedades crónicas, cirugías, lesiones relevantes..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Historia psiquiátrica</label>
        <textarea value={form.psychiatricHistory} onChange={e => set('psychiatricHistory', e.target.value)} style={ta} placeholder="Diagnósticos anteriores, hospitalizaciones psiquiátricas..." rows={3} />
      </div>
      <div>
        <label style={lbl}>Medicación actual</label>
        <textarea value={form.currentMedication} onChange={e => set('currentMedication', e.target.value)} style={ta} placeholder="Medicamentos actuales, dosis, responsable de la prescripción..." rows={2} />
      </div>
      <div>
        <label style={lbl}>Hospitalizaciones</label>
        <textarea value={form.hospitalizations} onChange={e => set('hospitalizations', e.target.value)} style={ta} placeholder="Hospitalizaciones relevantes (causa, duración)..." rows={2} />
      </div>
      <div>
        <label style={lbl}>Uso de sustancias</label>
        <textarea value={form.substanceUse} onChange={e => set('substanceUse', e.target.value)} style={ta} placeholder="Alcohol, tabaco, otras sustancias. Frecuencia y cantidad..." rows={2} />
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
