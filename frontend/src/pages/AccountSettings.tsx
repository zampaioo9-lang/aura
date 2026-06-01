import { useState, useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Facebook, Instagram, Linkedin, ExternalLink, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import PhoneInput from '../components/PhoneInput';
import CountrySelect from '../components/CountrySelect';
import CitySelect from '../components/CitySelect';
import { PROFESSION_CATEGORIES } from '../lib/professions';

const SOCIAL_NETWORKS = [
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,  color: '#1877F2', placeholder: 'facebook.com/tu-página' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram, color: '#E1306C', placeholder: '@tu-usuario' },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin,  color: '#0A66C2', placeholder: 'linkedin.com/in/tu-perfil' },
] as const;

type SocialKey = 'facebook' | 'instagram' | 'linkedin';


export default function AccountSettings() {
  const { user, updateAccount } = useAuth();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<SocialKey, string>>({
    facebook: '', instagram: '', linkedin: '',
  });
  const [waPhone, setWaPhone] = useState('+52');

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [primaryProfile, setPrimaryProfile] = useState<any>(null);
  const [profession, setProfession] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [yearsExperience, setYearsExperience] = useState<string | number>('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [published, setPublished] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#9333ea');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isProfessional = primaryProfile !== null;

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setBio(user.bio || '');
    setEmail(user.email || '');

    const links = (user.socialLinks || {}) as Record<string, string>;
    const stored = links.whatsapp || '';
    setWaPhone(stored || '+52');
    setSocialLinks({
      facebook:  links.facebook  || '',
      instagram: links.instagram || '',
      linkedin:  links.linkedin  || '',
    });

  }, [user]);

  useEffect(() => {
    api.get('/profiles').then(res => {
      const profile = res.data[0] || null;
      setPrimaryProfile(profile);
      if (profile) {
        setProfession(profile.profession || '');
        setSpecialty(profile.specialty || '');
        setYearsExperience(profile.yearsExperience ?? '');
        setCountry(profile.country || '');
        setCity(profile.city || '');
        setPublished(profile.published ?? false);
        setPrimaryColor(profile.customization?.primaryColor || '#9333ea');
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (showPassword) {
      if (!currentPassword) return setError('Ingresá tu contraseña actual.');
      if (newPassword.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
      if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden.');
    }

    // Validar que el número de WhatsApp tenga al menos 8 dígitos en total
    // (código de país 1-4 dígitos + número local mínimo 6 dígitos)
    const waDigits = waPhone.replace(/\D/g, '');
    if (waDigits.length < 8) {
      setError('Ingresa tu número de WhatsApp completo, incluyendo el código de país (ej. +1 para EE.UU., +52 para México).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const whatsapp = waPhone;
      const payload: Parameters<typeof updateAccount>[0] = {
        name:        name.trim()  || undefined,
        bio:         bio.trim()   || undefined,
        email:       email.trim() || undefined,
        socialLinks: { ...socialLinks, whatsapp },
      };
      if (showPassword && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword     = newPassword;
      }
      await updateAccount(payload);

      if (isProfessional && primaryProfile) {
        await api.put(`/profiles/${primaryProfile.id}`, {
          title: name.trim() || undefined,
          profession: profession.trim() || undefined,
          specialty: specialty.trim() || undefined,
          yearsExperience: typeof yearsExperience === 'number' ? yearsExperience : undefined,
          country: country.trim() || undefined,
          city: city.trim() || undefined,
          published,
          customization: { primaryColor },
        });
      }

      setSuccess('Cambios guardados correctamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setShowPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudieron guardar los cambios.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const isDark = localStorage.getItem('aliax_theme') === 'dark';

  const D = {
    page:    isDark ? '#13111c' : '#f8fafc',
    nav:     isDark ? '#1a1825' : '#ffffff',
    navBorder: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    card:    isDark ? '#1e1b2e' : '#ffffff',
    shadow:  isDark ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.08)',
    border:  isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    borderInput: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
    text:    isDark ? '#f1f0f5' : '#0f172a',
    muted:   isDark ? '#9ca3af' : '#64748b',
    inputBg: isDark ? '#2a2640' : '#ffffff',
    inputText: isDark ? '#f1f0f5' : '#0f172a',
    placeholder: isDark ? '#6b7280' : '#94a3b8',
    divider: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    tagBg:   isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
    tagText: isDark ? '#9ca3af' : '#64748b',
  };

  const inputStyle: CSSProperties = {
    width: '100%', padding: '8px 12px',
    border: `1px solid ${D.borderInput}`,
    borderRadius: 8,
    background: D.inputBg,
    color: D.inputText,
    fontSize: 14,
    outline: 'none',
  };
  const labelStyle: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: D.text, marginBottom: 4 };

  return (
    <div style={{ minHeight: '100vh', background: D.page }}>
      <nav style={{ background: D.nav, borderBottom: `1px solid ${D.navBorder}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: D.muted, textDecoration: 'none' }}>
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#6c63ff', color: 'white', fontSize: 14, fontWeight: 500, borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px', paddingTop: 80, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: D.text, margin: 0 }}>Configuración de cuenta</h1>

        {error   && <div style={{ padding: 12, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171', fontSize: 13, borderRadius: 8 }}>{error}</div>}
        {success && <div style={{ padding: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: 13, borderRadius: 8 }}>{success}</div>}

        {/* ── Información personal ── */}
        <section style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: D.shadow }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: D.text, margin: 0 }}>Información personal</h2>
          <div>
            <label style={labelStyle}>Nombre <span style={{ color: '#f87171' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Tu nombre" />
          </div>
          <div>
            <label style={labelStyle}>Bio <span style={{ color: D.placeholder, fontWeight: 400 }}>({bio.length}/500)</span></label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
              placeholder="Contá algo sobre vos..."
            />
          </div>
          <div>
            <PhoneInput label="WhatsApp" required value={waPhone} onChange={setWaPhone} isDark={isDark} />
            <p style={{ marginTop: 6, fontSize: 12, color: D.placeholder }}>
              Este número recibe las notificaciones de citas por WhatsApp.
            </p>
            {waPhone.length > 4 && (
              <a href={`https://wa.me/${waPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: '#818cf8', textDecoration: 'none' }}>
                Abrir enlace <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </section>

        {/* ── Cuenta ── */}
        <section style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: D.shadow }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: D.text, margin: 0 }}>Cuenta</h2>
          <div>
            <label style={labelStyle}>Correo electrónico <span style={{ color: '#f87171' }}>*</span></label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} placeholder="tu@correo.com" />
          </div>
          <div style={{ borderTop: `1px solid ${D.divider}`, paddingTop: 16 }}>
            <button type="button" onClick={() => setShowPassword(v => !v)}
              style={{ fontSize: 13, fontWeight: 500, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {showPassword ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
            </button>
            {showPassword && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Contraseña actual</label>
                  <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" style={inputStyle} placeholder="••••••••" />
                </div>
                <div>
                  <label style={labelStyle}>Nueva contraseña</label>
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" style={inputStyle} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label style={labelStyle}>Confirmar nueva contraseña</label>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" style={inputStyle} placeholder="Repetí la nueva contraseña" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Perfil Profesional ── */}
        <section style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: D.shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: D.text, margin: 0 }}>Perfil Profesional</h2>
            {!isProfessional && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: D.tagText, background: D.tagBg, padding: '4px 10px', borderRadius: 999 }}>
                <Lock className="h-3 w-3" /> Requiere plan Pro
              </span>
            )}
          </div>
          <div>
            <label style={labelStyle}>Profesión <span style={{ color: '#f87171' }}>*</span></label>
            <select value={profession} onChange={e => setProfession(e.target.value)} disabled={!isProfessional}
              style={{ ...inputStyle, opacity: !isProfessional ? 0.5 : 1, cursor: !isProfessional ? 'not-allowed' : 'pointer' }}>
              <option value="">Selecciona una profesión</option>
              {PROFESSION_CATEGORIES.map(cat => (
                <optgroup key={cat.category} label={cat.category}>
                  {cat.professions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Especialidad</label>
              <input value={specialty} onChange={e => setSpecialty(e.target.value)} disabled={!isProfessional}
                placeholder="Ej: Dermatología clínica"
                style={{ ...inputStyle, opacity: !isProfessional ? 0.5 : 1, cursor: !isProfessional ? 'not-allowed' : 'text' }} />
            </div>
            <div>
              <label style={labelStyle}>Años de experiencia</label>
              <input type="number" min={0} max={70} value={yearsExperience}
                onChange={e => setYearsExperience(e.target.value === '' ? '' : parseInt(e.target.value))}
                disabled={!isProfessional} placeholder="Ej: 8"
                style={{ ...inputStyle, opacity: !isProfessional ? 0.5 : 1, cursor: !isProfessional ? 'not-allowed' : 'text' }} />
            </div>
          </div>
          <div>
            <CountrySelect label="País de origen" value={country} onChange={setCountry} isDark={isDark} />
          </div>
          <CitySelect
            country={country}
            value={city}
            onChange={setCity}
            isDark={isDark}
          />
          {isProfessional && (
            <div
              onClick={() => setPublished(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${published ? '#22c55e' : D.border}`,
                background: published ? 'rgba(34,197,94,0.08)' : D.tagBg,
                transition: 'all 0.2s',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: published ? '#22c55e' : D.text }}>
                  {published ? '✓ Perfil publicado' : 'Perfil no publicado'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: D.muted }}>
                  {published
                    ? 'Tu perfil aparece en el directorio y es visible para todos'
                    : 'Activa esto para aparecer en el directorio de Aliax'}
                </p>
              </div>
              <div style={{
                position: 'relative', width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                background: published ? '#22c55e' : D.borderInput, transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                  background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  left: published ? 23 : 3, transition: 'left 0.2s',
                }} />
              </div>
            </div>
          )}
          {isProfessional && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: D.text, margin: '0 0 4px' }}>Color del perfil</p>
              <p style={{ fontSize: 12, color: D.muted, margin: '0 0 12px' }}>Color principal de tu página de reservas</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { hex: '#9333ea', label: 'Clásico' },
                  { hex: '#1D9E75', label: 'Saludable' },
                  { hex: '#2563eb', label: 'Confianza' },
                  { hex: '#e11d48', label: 'Energía' },
                  { hex: '#d97706', label: 'Cálido' },
                ].map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setPrimaryColor(hex)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: 8, borderRadius: 12, cursor: 'pointer', background: 'none',
                      border: `2px solid ${primaryColor === hex ? D.text : 'transparent'}`,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: hex, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: D.muted }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isProfessional && (
            <p style={{ fontSize: 12, color: D.placeholder, margin: 0 }}>
              Activa tu perfil profesional para completar estos campos.
            </p>
          )}
        </section>

        {/* ── Redes sociales ── */}
        <section style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: D.shadow }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: D.text, margin: 0 }}>Redes sociales</h2>
          {SOCIAL_NETWORKS.map(({ key, label, Icon, color, placeholder }) => (
            <div key={key}>
              <label style={labelStyle}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                  {label}
                </span>
              </label>
              <input value={socialLinks[key]} onChange={e => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                style={inputStyle} placeholder={placeholder} type="url" />
              {socialLinks[key] && (
                <a href={socialLinks[key].startsWith('http') ? socialLinks[key] : `https://${socialLinks[key]}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: '#818cf8', textDecoration: 'none' }}>
                  Abrir enlace <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
