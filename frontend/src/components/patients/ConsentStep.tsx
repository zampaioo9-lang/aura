import { useState } from 'react';
import type { Patient } from '../../hooks/usePatients';
import CustomSelect from '../CustomSelect';
import { useWizardAccent } from './WizardAccentContext';

interface Props {
  patient: Patient;
  onSave: (data: Partial<Patient>) => Promise<void>;
  inp: React.CSSProperties;
  lbl: React.CSSProperties;
  accent?: string;
  isDark?: boolean;
}

const METHODS = [
  { value: 'escrito', label: 'Firma en papel' },
  { value: 'verbal', label: 'Consentimiento verbal' },
  { value: 'otro', label: 'Otro' },
];

const CONSENT_TEXT = `Este documento informa que ${'{{NOMBRE}}'} registrará datos de salud (motivo de consulta, antecedentes, notas de sesión) en la plataforma Aliax.io, tratados como datos personales sensibles conforme al Art. 9 de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).

Si el profesional utiliza la función de notas clínicas con inteligencia artificial, el texto de la sesión se envía anonimizado (sin nombre) a nuestro proveedor de IA (Anthropic) para generar la nota estructurada.

El paciente tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (derechos ARCO) al tratamiento de sus datos, contactando directamente a su profesional o escribiendo a privacidad@aliax.io.

Al confirmar más abajo, el profesional declara haber obtenido el consentimiento expreso del paciente para el tratamiento descrito, por el medio indicado.`;

export default function ConsentStep({ patient, onSave, inp, lbl, accent, isDark = true }: Props) {
  const [method, setMethod] = useState(patient.consentMethod ?? '');
  const [notes, setNotes] = useState(patient.consentNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const wBtn = useWizardAccent();

  const alreadyGiven = !!patient.consentGivenAt;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        consentGivenAt: new Date().toISOString(),
        consentMethod: method || 'otro',
        consentNotes: notes,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const documentText = CONSENT_TEXT.replace('{{NOMBRE}}', patient.name || 'el/la paciente');

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<pre style="font-family: sans-serif; white-space: pre-wrap; max-width: 640px; margin: 40px auto; line-height: 1.6;">${documentText}</pre>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: 14, borderRadius: 10, background: wBtn.noteBg,
        border: `1px solid ${wBtn.border}`, whiteSpace: 'pre-wrap',
        fontSize: 13, lineHeight: 1.6, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
      }}>
        {documentText}
      </div>

      <div>
        <label style={lbl}>Método de consentimiento</label>
        <CustomSelect
          value={method}
          onChange={setMethod}
          options={METHODS}
          placeholder="Seleccionar"
          dark={isDark}
          accent={accent}
        />
      </div>

      <div>
        <label style={lbl}>Notas (opcional)</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={inp}
          placeholder="Ej. firmado en papel, archivo en expediente físico"
        />
      </div>

      {alreadyGiven && (
        <p style={{ fontSize: 12, color: wBtn.savedColor, margin: 0 }}>
          ✓ Consentimiento registrado el {new Date(patient.consentGivenAt!).toLocaleDateString('es-MX')}
          {patient.consentMethod ? ` (${METHODS.find(m => m.value === patient.consentMethod)?.label ?? patient.consentMethod})` : ''}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          className="btn-lift"
          onClick={handlePrint}
          style={{
            padding: '10px 18px', borderRadius: 10, border: `1px solid ${wBtn.border}`,
            background: 'transparent', color: wBtn.lblColor, fontSize: 14, cursor: 'pointer',
          }}
        >
          Descargar documento de consentimiento
        </button>
        <button
          className="btn-lift"
          onClick={handleSave}
          disabled={saving || !method}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: saved ? wBtn.savedBg : wBtn.bg,
            color: saved ? wBtn.savedColor : '#fff', fontSize: 14, fontWeight: 600,
            cursor: (saving || !method) ? 'not-allowed' : 'pointer',
            opacity: !method ? 0.5 : 1,
          }}
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Confirmar consentimiento'}
        </button>
      </div>
    </div>
  );
}
