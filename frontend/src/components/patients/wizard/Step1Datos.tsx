import { useState } from 'react';
import type { Patient } from '../../../hooks/usePatients';
import CustomDatePicker from '../../CustomDatePicker';
import CustomSelect from '../../CustomSelect';
import PhoneInput from '../../PhoneInput';
import { useWizardAccent } from '../WizardAccentContext';

interface Props {
  patient: Patient;
  onSave: (data: Partial<Patient>) => Promise<void>;
  inp: React.CSSProperties;
  lbl: React.CSSProperties;
  accent?: string;
  isDark?: boolean;
}

const GENDERS = [
  { value: 'Femenino', label: 'Femenino' },
  { value: 'Masculino', label: 'Masculino' },
  { value: 'No binario', label: 'No binario' },
  { value: 'Prefiero no decir', label: 'Prefiero no decir' },
];
const MARITAL = [
  { value: 'Soltero/a', label: 'Soltero/a' },
  { value: 'Casado/a', label: 'Casado/a' },
  { value: 'Unión libre', label: 'Unión libre' },
  { value: 'Divorciado/a', label: 'Divorciado/a' },
  { value: 'Viudo/a', label: 'Viudo/a' },
  { value: 'Separado/a', label: 'Separado/a' },
];
const EDUCATION = [
  { value: 'Primaria', label: 'Primaria' },
  { value: 'Secundaria', label: 'Secundaria' },
  { value: 'Bachillerato', label: 'Bachillerato' },
  { value: 'Técnico', label: 'Técnico' },
  { value: 'Licenciatura', label: 'Licenciatura' },
  { value: 'Posgrado', label: 'Posgrado' },
];

// Zona horaria del paciente: sus recordatorios y avisos de cita le llegan en su horario local.
// Vacío = la misma zona del profesional (sin conversión).
const TIMEZONES = [
  { value: '', label: 'Igual que mi zona horaria' },
  { value: 'Europe/Paris', label: 'Francia (París)' },
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
  { value: 'Europe/London', label: 'Reino Unido (Londres)' },
  { value: 'Europe/Berlin', label: 'Alemania (Berlín)' },
  { value: 'Europe/Rome', label: 'Italia (Roma)' },
  { value: 'Europe/Lisbon', label: 'Portugal (Lisboa)' },
  { value: 'America/New_York', label: 'EE. UU. (Nueva York)' },
  { value: 'America/Chicago', label: 'EE. UU. (Chicago)' },
  { value: 'America/Los_Angeles', label: 'EE. UU. (Los Ángeles)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'America/Cancun', label: 'México (Cancún)' },
  { value: 'America/Tijuana', label: 'México (Tijuana)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { value: 'America/Lima', label: 'Perú (Lima)' },
  { value: 'America/Santiago', label: 'Chile (Santiago)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
];

export default function Step1Datos({ patient, onSave, inp, lbl, accent, isDark = true }: Props) {
  const [form, setForm] = useState({
    name: patient.name ?? '',
    email: patient.email ?? '',
    phone: patient.phone ?? '',
    birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
    gender: patient.gender ?? '',
    maritalStatus: patient.maritalStatus ?? '',
    education: patient.education ?? '',
    occupation: patient.occupation ?? '',
    city: patient.city ?? '',
    country: patient.country ?? '',
    timezone: patient.timezone ?? '',
    emergencyContact: patient.emergencyContact ?? '',
    referralSource: patient.referralSource ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const wBtn = useWizardAccent();

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Nombre completo *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} placeholder="María García López" />
        </div>

        <div>
          <label style={lbl}>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} placeholder="paciente@email.com" />
        </div>

        <div>
          <PhoneInput
            label="Teléfono"
            value={form.phone}
            onChange={v => set('phone', v)}
            isDark={isDark}
            accent={accent}
          />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Fecha de nacimiento</label>
          <CustomDatePicker
            value={form.birthDate}
            onChange={v => set('birthDate', v)}
            placeholder="Seleccionar fecha"
            accent={accent}
            allowYearPicker
            isDark={isDark}
          />
        </div>

        <div>
          <label style={lbl}>Género</label>
          <CustomSelect
            value={form.gender}
            onChange={v => set('gender', v)}
            options={GENDERS}
            placeholder="Seleccionar"
            dark={isDark}
            accent={accent}
          />
        </div>

        <div>
          <label style={lbl}>Estado civil</label>
          <CustomSelect
            value={form.maritalStatus}
            onChange={v => set('maritalStatus', v)}
            options={MARITAL}
            placeholder="Seleccionar"
            dark={isDark}
            accent={accent}
          />
        </div>

        <div>
          <label style={lbl}>Escolaridad</label>
          <CustomSelect
            value={form.education}
            onChange={v => set('education', v)}
            options={EDUCATION}
            placeholder="Seleccionar"
            dark={isDark}
            accent={accent}
          />
        </div>

        <div>
          <label style={lbl}>Ocupación</label>
          <input value={form.occupation} onChange={e => set('occupation', e.target.value)} style={inp} placeholder="Maestra, Contador..." />
        </div>

        <div>
          <label style={lbl}>Ciudad</label>
          <input value={form.city} onChange={e => set('city', e.target.value)} style={inp} placeholder="Ciudad de México" />
        </div>

        <div>
          <label style={lbl}>País</label>
          <input value={form.country} onChange={e => set('country', e.target.value)} style={inp} placeholder="México" />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Zona horaria del paciente</label>
          <CustomSelect
            value={form.timezone}
            onChange={v => set('timezone', v)}
            options={TIMEZONES}
            placeholder="Igual que mi zona horaria"
            dark={isDark}
            accent={accent}
          />
          <p style={{ fontSize: 11, margin: '5px 0 0', opacity: 0.7 }}>
            Si vive en otro país, sus recordatorios, confirmaciones y cancelaciones le llegarán en su horario local, con la ciudad indicada (por ejemplo "17:00 hora de París").
          </p>
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Contacto de emergencia</label>
          <input value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} style={inp} placeholder="Nombre y teléfono" />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>¿Cómo llegó a ti?</label>
          <input value={form.referralSource} onChange={e => set('referralSource', e.target.value)} style={inp} placeholder="Recomendación, redes sociales, Google..." />
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
