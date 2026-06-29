import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Facebook, Instagram, Linkedin, ExternalLink, Lock, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import PhoneInput from '../components/PhoneInput';
import CountrySelect from '../components/CountrySelect';
import CitySelect from '../components/CitySelect';
import { PROBLEMATICS } from '../data/problematics';

function hexToDark(hex: string, amount = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * amount)},${Math.round(g * amount)},${Math.round(b * amount)})`;
}


const PROFESSIONS = [
  'Psicólogo/a',
  'Psicoterapeuta',
  'Psiquiatra',
  'Neuropsicólogo/a',
  'Trabajador/a Social',
];

const THERAPEUTIC_APPROACHES = [
  'Cognitivo-conductual (TCC)',
  'Mindfulness / ACT',
  'Terapia de aceptación y compromiso',
  'Terapia esquemática',
  'Psicoanalítico',
  'Psicodinámico',
  'Psicología del self',
  'Humanista',
  'Gestalt',
  'Existencial',
  'Logoterapia',
  'Psicología positiva',
  'Sistémico',
  'Narrativo',
  'Terapia breve centrada en soluciones (TBCS)',
  'Breve estratégico',
  'Constelaciones familiares',
  'Terapia de pareja',
  'Terapia familiar',
  'Terapia infantil',
  'Terapia de juego',
  'EMDR',
  'Integrativo',
  'Hipnosis ericksoniana',
  'Psicodrama',
  'Otro',
];

const SOCIAL_NETWORKS = [
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,  color: '#1877F2', placeholder: 'facebook.com/tu-página' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram, color: '#E1306C', placeholder: '@tu-usuario' },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin,  color: '#0A66C2', placeholder: 'linkedin.com/in/tu-perfil' },
] as const;

type SocialKey = 'facebook' | 'instagram' | 'linkedin';

export default function AccountSettings({ asTab = false, tabIsDark = false, accent = '#9333ea', onProfileSaved }: { asTab?: boolean; tabIsDark?: boolean; accent?: string; onProfileSaved?: () => void }) {
  const { user, updateAccount } = useAuth();

  const [name, setName]               = useState('');
  const [bio, setBio]                 = useState('');
  const [email, setEmail]             = useState('');
  const [waPhone, setWaPhone]         = useState('+52');
  const [socialLinks, setSocialLinks] = useState<Record<SocialKey, string>>({ facebook: '', instagram: '', linkedin: '' });

  const [showPassword, setShowPassword]     = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [primaryProfile, setPrimaryProfile]         = useState<any>(null);
  const [displayName, setDisplayName]               = useState('');
  const [profession, setProfession]                 = useState('');
  const [cedula, setCedula]                         = useState('');
  const [therapeuticApproaches, setTherapeuticApproaches] = useState<string[]>([]);
  const [problematics, setProblematics]             = useState<string[]>([]);
  const [yearsExperience, setYearsExperience]       = useState<string | number>('');
  const [modality, setModality]                     = useState('');
  const [country, setCountry]                       = useState('');
  const [city, setCity]                             = useState('');
  const [published, setPublished]                   = useState(false);
  const [primaryColor, setPrimaryColor]             = useState('#2dd4bf');

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState<'link' | 'msg' | null>(null);

  const [openApproaches, setOpenApproaches] = useState(false);
  const approachesRef = useRef<HTMLDivElement>(null);
  const [openProblematics, setOpenProblematics] = useState(false);
  const problematicsRef = useRef<HTMLDivElement>(null);
  const [openProfession, setOpenProfession] = useState(false);
  const professionRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600);

  const isProfessional = primaryProfile !== null;

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setBio(user.bio || '');
    setEmail(user.email || '');
    const links = (user.socialLinks || {}) as Record<string, string>;
    // Fallback: if whatsapp not saved yet, use the phone from registration
    setWaPhone(links.whatsapp || (user as any).phone || '+52');
    setSocialLinks({ facebook: links.facebook || '', instagram: links.instagram || '', linkedin: links.linkedin || '' });
  }, [user]);

  useEffect(() => {
    api.get('/profiles').then(res => {
      const p = res.data[0] || null;
      setPrimaryProfile(p);
      if (p) {
        setDisplayName(p.title || '');
        setProfession(p.profession || '');
        setCedula(p.cedula || '');
        setTherapeuticApproaches(p.therapeuticApproaches || []);
        setProblematics(p.problematics || []);
        setYearsExperience(p.yearsExperience ?? '');
        setModality(p.modality || '');
        setCountry(p.country || '');
        setCity(p.city || '');
        setPublished(p.published ?? false);
        setPrimaryColor(p.customization?.primaryColor || '#2dd4bf');
        // Fallback: if user.bio is empty but profile.bio exists, use it
        if (p.bio) setBio(prev => prev || p.bio);
        // Fallback: if whatsapp still at default but profile has phone, use it
        if (p.phone) setWaPhone(prev => (prev === '+52' || !prev) ? p.phone : prev);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (approachesRef.current && !approachesRef.current.contains(e.target as Node)) {
        setOpenApproaches(false);
      }
      if (problematicsRef.current && !problematicsRef.current.contains(e.target as Node)) {
        setOpenProblematics(false);
      }
      if (professionRef.current && !professionRef.current.contains(e.target as Node)) {
        setOpenProfession(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const toggleApproach = (a: string) =>
    setTherapeuticApproaches(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const toggleProblematic = (p: string) =>
    setProblematics(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = async () => {
    if (showPassword) {
      if (!currentPassword) return setError('Ingresá tu contraseña actual.');
      if (newPassword.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
      if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden.');
    }
    const waDigits = waPhone.replace(/\D/g, '');
    if (waDigits.length < 8) { setError('Ingresa tu número de WhatsApp completo.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSaving(true); setError(''); setSuccess('');
    try {
      const payload: Parameters<typeof updateAccount>[0] = {
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        email: email.trim() || undefined,
        socialLinks: { ...socialLinks, whatsapp: waPhone },
      };
      if (showPassword && newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }
      await updateAccount(payload);

      if (isProfessional && primaryProfile) {
        await api.put(`/profiles/${primaryProfile.id}`, {
          title: displayName.trim() || name.trim() || undefined,
          bio: bio.trim() || undefined,
          profession: profession.trim() || undefined,
          cedula: cedula.trim() || undefined,
          therapeuticApproaches,
          problematics,
          yearsExperience: typeof yearsExperience === 'number' ? yearsExperience : undefined,
          modality: modality || undefined,
          country: country.trim() || undefined,
          city: city.trim() || undefined,
          published,
          customization: { primaryColor },
        });
      }

      setSuccess('Cambios guardados correctamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setShowPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      if (published && primaryProfile && !localStorage.getItem(`aliax_share_shown_${primaryProfile.id}`)) {
        localStorage.setItem(`aliax_share_shown_${primaryProfile.id}`, '1');
        setShowShareModal(true);
      }
      onProfileSaved?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudieron guardar los cambios.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setSaving(false); }
  };

  const isDark = asTab ? tabIsDark : false;
  const _anums = accent.match(/\d+/g) ?? ['45','212','191'];
  const [_ar, _ag, _ab] = _anums.map(Number);
  const accentRgb = accent;
  const accentHex = `#${_ar.toString(16).padStart(2,'0')}${_ag.toString(16).padStart(2,'0')}${_ab.toString(16).padStart(2,'0')}`;
  const aA = (a: number) => `rgba(${_ar},${_ag},${_ab},${a})`;

  const D = {
    page:    `rgb(${Math.round(255*0.94+_ar*0.06)},${Math.round(255*0.94+_ag*0.06)},${Math.round(255*0.94+_ab*0.06)})`,
    nav:     isDark ? 'rgba(12,12,12,0.9)' : 'rgba(255,255,255,0.9)',
    navBorder: aA(isDark ? 0.12 : 0.15),
    card:    isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    shadow:  isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.06)',
    border:  aA(isDark ? 0.15 : 0.18),
    borderInput: aA(isDark ? 0.2 : 0.25),
    text:    isDark ? '#e8f0f0' : '#0a1f1e',
    muted:   isDark ? `rgb(${Math.round((_ar+120)/2)},${Math.round((_ag+120)/2)},${Math.round((_ab+120)/2)})` : `rgb(${Math.round(_ar*0.4)},${Math.round(_ag*0.5)},${Math.round(_ab*0.5)})`,
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
    inputText: isDark ? '#e8f0f0' : '#0a1f1e',
    placeholder: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
    divider: aA(0.1),
    tagBg:   isDark ? 'rgba(255,255,255,0.05)' : '#f0fafa',
    tagText: isDark ? `rgb(${Math.round((_ar+120)/2)},${Math.round((_ag+120)/2)},${Math.round((_ab+120)/2)})` : `rgb(${Math.round(_ar*0.4)},${Math.round(_ag*0.5)},${Math.round(_ab*0.5)})`,
  };

  const inputStyle: CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: `1px solid ${D.borderInput}`,
    borderRadius: 10,
    background: D.inputBg,
    backdropFilter: 'blur(8px)',
    color: D.inputText,
    fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: 'border-box' as const,
  };
  const labelStyle: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: D.text, marginBottom: 6 };

  const saveBtn = (
    <button onClick={handleSave} disabled={saving} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px',
      background: accent,
      color: 'white', fontSize: 13, fontWeight: 600, borderRadius: 999, border: 'none',
      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
      fontFamily: 'inherit',
    }}>
      <Save size={14} />
      {saving ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );

  const shareSlug = primaryProfile?.slug ?? '';
  const shareLink = shareSlug ? `https://aliax.io/${shareSlug}` : '';
  const shareMessage = `Hola 👋 Te cuento que ahora puedes agendar tus citas conmigo desde mi nuevo perfil:\n\n${shareLink}\n\nAhí encuentras mis horarios disponibles y puedes reservar directamente. ¡Nos vemos!`;

  const copyShare = (type: 'link' | 'msg') => {
    navigator.clipboard.writeText(type === 'link' ? shareLink : shareMessage).then(() => {
      setCopiedShare(type);
      setTimeout(() => setCopiedShare(null), 2000);
    });
  };

  return (
    <>
    {showShareModal && shareLink && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          background: isDark ? '#0e2633' : '#ffffff',
          border: `1.5px solid ${aA(0.35)}`,
          borderRadius: 20, padding: 28, maxWidth: 460, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <p style={{ color: isDark ? '#e8f0f0' : '#0a1f1e', fontWeight: 700, fontSize: 18, margin: 0 }}>
              ¡Tu perfil está activo!
            </p>
            <p style={{ color: isDark ? '#6aada8' : '#3d8a82', fontSize: 13, margin: '6px 0 0' }}>
              Comparte tu enlace para que tus pacientes puedan reservar contigo.
            </p>
          </div>

          {/* Link row */}
          <div style={{
            background: aA(isDark ? 0.08 : 0.06),
            border: `1px solid ${aA(0.25)}`,
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          }}>
            <span style={{ flex: 1, fontSize: 13, fontFamily: 'monospace', color: accentRgb, wordBreak: 'break-all' }}>
              {shareLink}
            </span>
            <button onClick={() => copyShare('link')} style={{
              flexShrink: 0, background: accent, color: 'white',
              border: 'none', borderRadius: 8, padding: '6px 12px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {copiedShare === 'link' ? '✓ Copiado' : 'Copiar enlace'}
            </button>
          </div>

          {/* Message template */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: isDark ? '#6aada8' : '#3d8a82', fontSize: 12, fontWeight: 600, margin: '0 0 6px' }}>
              MENSAJE PARA TUS PACIENTES
            </p>
            <div style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fffe',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 10, padding: 12,
              color: isDark ? '#b0cac8' : '#334155', fontSize: 13, lineHeight: 1.6,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {shareMessage}
            </div>
            <button onClick={() => copyShare('msg')} style={{
              marginTop: 8, width: '100%',
              background: aA(isDark ? 0.12 : 0.08),
              border: `1px solid ${aA(0.3)}`,
              color: accentRgb, borderRadius: 8, padding: '8px 0',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {copiedShare === 'msg' ? '✓ Mensaje copiado' : 'Copiar mensaje'}
            </button>
          </div>

          <button onClick={() => setShowShareModal(false)} style={{
            width: '100%', background: 'transparent',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
            color: isDark ? '#6aada8' : '#3d8a82', borderRadius: 10, padding: '9px 0',
            fontSize: 13, cursor: 'pointer',
          }}>
            Cerrar
          </button>
        </div>
      </div>
    )}
    <div style={{ ...(asTab ? {} : { minHeight: '100vh', background: D.page }), fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`select option { background-color: ${isDark ? hexToDark(accentHex, 0.45) : '#ffffff'}; color: ${isDark ? '#e8f0f0' : '#334155'}; }`}</style>
      {!asTab && (
        <nav style={{
          background: D.nav, borderBottom: `1px solid ${D.navBorder}`,
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        }}>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: D.muted, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          {saveBtn}
        </nav>
      )}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: `${asTab ? 4 : 80}px ${isMobile ? 12 : 24}px 32px`, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: D.text, margin: 0 }}>Configuración de cuenta</h1>
          {asTab && saveBtn}
        </div>

        {error   && <div style={{ padding: 12, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171', fontSize: 13, borderRadius: 10 }}>{error}</div>}
        {success && <div style={{ padding: 12, background: aA(0.1), border: `1px solid ${aA(0.3)}`, color: accentRgb, fontSize: 13, borderRadius: 10 }}>{success}</div>}

        {/* ── Información personal ── */}
        <section style={{ background: D.card, borderRadius: 14, border: `1px solid ${D.border}`, padding: isMobile ? 14 : 24, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: D.shadow, backdropFilter: 'blur(12px)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: D.text, margin: 0 }}>Información personal</h2>
          <div>
            <label style={labelStyle}>Nombre <span style={{ color: '#f87171' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Tu nombre completo"
              onFocus={e => (e.currentTarget.style.borderColor = accentRgb)}
              onBlur={e => (e.currentTarget.style.borderColor = D.borderInput)} />
          </div>
          <div>
            <label style={labelStyle}>Bio <span style={{ color: D.muted, fontWeight: 400 }}>({bio.length}/500)</span></label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3}
              style={{ ...inputStyle, resize: 'none' }} placeholder="Cuéntale a tus pacientes sobre ti..."
              onFocus={e => (e.currentTarget.style.borderColor = accentRgb)}
              onBlur={e => (e.currentTarget.style.borderColor = D.borderInput)} />
          </div>
          <div>
            <PhoneInput label="WhatsApp" required value={waPhone} onChange={setWaPhone} isDark={isDark} accent={accentRgb} />
            <p style={{ marginTop: 6, fontSize: 12, color: D.muted }}>Este número recibe las notificaciones de citas por WhatsApp.</p>
            {waPhone.length > 4 && (
              <a href={`https://wa.me/${waPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: accentRgb, textDecoration: 'none' }}>
                Abrir enlace <ExternalLink size={12} />
              </a>
            )}
          </div>
        </section>

        {/* ── Cuenta ── */}
        <section style={{ background: D.card, borderRadius: 14, border: `1px solid ${D.border}`, padding: isMobile ? 14 : 24, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: D.shadow, backdropFilter: 'blur(12px)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: D.text, margin: 0 }}>Cuenta</h2>
          <div>
            <label style={labelStyle}>Correo electrónico <span style={{ color: '#f87171' }}>*</span></label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} placeholder="tu@correo.com"
              onFocus={e => (e.currentTarget.style.borderColor = accentRgb)}
              onBlur={e => (e.currentTarget.style.borderColor = D.borderInput)} />
          </div>
          <div style={{ borderTop: `1px solid ${D.divider}`, paddingTop: 16 }}>
            <button type="button" onClick={() => setShowPassword(v => !v)}
              style={{ fontSize: 13, fontWeight: 500, color: accentRgb, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {showPassword ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
            </button>
            {showPassword && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Contraseña actual', val: currentPassword, set: setCurrentPassword, ph: '••••••••' },
                  { label: 'Nueva contraseña', val: newPassword, set: setNewPassword, ph: 'Mínimo 6 caracteres' },
                  { label: 'Confirmar nueva contraseña', val: confirmPassword, set: setConfirmPassword, ph: 'Repite la nueva contraseña' },
                ].map(({ label, val, set, ph }) => (
                  <div key={label}>
                    <label style={labelStyle}>{label}</label>
                    <input value={val} onChange={e => set(e.target.value)} type="password" style={inputStyle} placeholder={ph}
                      onFocus={e => (e.currentTarget.style.borderColor = accentRgb)}
                      onBlur={e => (e.currentTarget.style.borderColor = D.borderInput)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Perfil Profesional ── */}
        <section style={{ background: D.card, borderRadius: 14, border: `1px solid ${D.border}`, padding: isMobile ? 14 : 24, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: D.shadow, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: D.text, margin: 0 }}>Perfil Profesional</h2>
            {!isProfessional && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: D.tagText, background: D.tagBg, padding: '4px 10px', borderRadius: 999 }}>
                <Lock size={12} /> Sin perfil activo
              </span>
            )}
          </div>

          {/* Nombre profesional */}
          <div>
            <label style={labelStyle}>Nombre con el que quieres aparecer en tu perfil profesional</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              disabled={!isProfessional}
              style={{ ...inputStyle, opacity: !isProfessional ? 0.5 : 1 }}
              placeholder="Psic. Fernanda López"
              onFocus={e => (e.currentTarget.style.borderColor = accentRgb)}
              onBlur={e => (e.currentTarget.style.borderColor = D.borderInput)}
            />
            <p style={{ marginTop: 6, fontSize: 12, color: D.muted }}>
              Este nombre aparecerá en tu tarjeta del directorio y en tu página de reservas.
            </p>
          </div>

          {/* Profesión */}
          <div ref={professionRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>Profesión <span style={{ color: '#f87171' }}>*</span></label>
            <button
              type="button"
              disabled={!isProfessional}
              onClick={() => setOpenProfession(o => !o)}
              style={{
                ...inputStyle,
                cursor: !isProfessional ? 'not-allowed' : 'pointer',
                opacity: !isProfessional ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <span style={{ color: profession ? D.inputText : D.placeholder, fontSize: 14 }}>
                {profession || 'Selecciona tu profesión'}
              </span>
              <ChevronDown size={16} style={{ flexShrink: 0, color: D.muted, transform: openProfession ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {openProfession && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: isDark ? hexToDark(accentHex, 0.45) : '#ffffff',
                border: `1px solid ${D.borderInput}`,
                borderRadius: 10, overflow: 'hidden',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.1)',
                zIndex: 100,
              }}>
                {PROFESSIONS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setProfession(p); setOpenProfession(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      fontSize: 14, fontFamily: 'inherit',
                      background: profession === p ? aA(0.12) : 'transparent',
                      color: profession === p ? accentRgb : D.text,
                      borderLeft: profession === p ? `3px solid ${accentRgb}` : '3px solid transparent',
                      fontWeight: profession === p ? 600 : 400,
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { if (profession !== p) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.07)' : aA(0.04); }}
                    onMouseLeave={e => { if (profession !== p) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cédula / Matrícula */}
          <div>
            <label style={labelStyle}>
              Cédula / Matrícula Profesional / Número de Colegiado
              <span style={{ color: D.muted, fontWeight: 400, marginLeft: 6 }}>(opcional)</span>
            </label>
            <input value={cedula} onChange={e => setCedula(e.target.value)} disabled={!isProfessional}
              placeholder="Ej. 8734521" style={{ ...inputStyle, opacity: !isProfessional ? 0.5 : 1 }}
              onFocus={e => (e.currentTarget.style.borderColor = accentRgb)}
              onBlur={e => (e.currentTarget.style.borderColor = D.borderInput)} />
          </div>

          {/* Enfoque / Modelo terapéutico */}
          <div ref={approachesRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>Enfoque o Modelo terapéutico</label>
            <button
              type="button"
              disabled={!isProfessional}
              onClick={() => setOpenApproaches(o => !o)}
              style={{
                ...inputStyle,
                cursor: !isProfessional ? 'not-allowed' : 'pointer',
                opacity: !isProfessional ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <span style={{ color: therapeuticApproaches.length === 0 ? D.placeholder : D.inputText, fontSize: 14 }}>
                {therapeuticApproaches.length === 0
                  ? 'Selecciona enfoques...'
                  : therapeuticApproaches.length === 1
                    ? therapeuticApproaches[0]
                    : `${therapeuticApproaches.length} enfoques seleccionados`}
              </span>
              <ChevronDown size={16} style={{ flexShrink: 0, color: D.muted, transform: openApproaches ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {openApproaches && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: isDark ? hexToDark(accentHex, 0.45) : '#ffffff',
                border: `1px solid ${D.borderInput}`,
                borderRadius: 10, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.1)',
                maxHeight: 260, overflowY: 'auto', zIndex: 100,
              }}>
                {THERAPEUTIC_APPROACHES.map(a => {
                  const active = therapeuticApproaches.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleApproach(a)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontFamily: 'inherit',
                        background: active ? aA(0.12) : 'transparent',
                        color: active ? accentRgb : D.text,
                        borderLeft: active ? `3px solid ${accentRgb}` : '3px solid transparent',
                        fontWeight: active ? 600 : 400,
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : aA(0.04); }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${active ? accentRgb : D.borderInput}`,
                        background: active ? accentRgb : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {active && <span style={{ color: 'white', fontSize: 10, lineHeight: 1 }}>✓</span>}
                      </div>
                      {a}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Problemáticas que atiendes */}
          <div ref={problematicsRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>Problemáticas que atiendes</label>
            <button
              type="button"
              disabled={!isProfessional}
              onClick={() => setOpenProblematics(o => !o)}
              style={{
                ...inputStyle,
                cursor: !isProfessional ? 'not-allowed' : 'pointer',
                opacity: !isProfessional ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <span style={{ color: problematics.length === 0 ? D.placeholder : D.inputText, fontSize: 14 }}>
                {problematics.length === 0
                  ? 'Selecciona problemáticas...'
                  : problematics.length === 1
                    ? problematics[0]
                    : `${problematics.length} problemáticas seleccionadas`}
              </span>
              <ChevronDown size={16} style={{ flexShrink: 0, color: D.muted, transform: openProblematics ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {openProblematics && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: isDark ? hexToDark(accentHex, 0.45) : '#ffffff',
                border: `1px solid ${D.borderInput}`,
                borderRadius: 10, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.1)',
                maxHeight: 280, overflowY: 'auto', zIndex: 100,
              }}>
                {PROBLEMATICS.map(p => {
                  const active = problematics.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleProblematic(p)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontSize: 13, fontFamily: 'inherit',
                        background: active ? aA(0.12) : 'transparent',
                        color: active ? accentRgb : D.text,
                        borderLeft: active ? `3px solid ${accentRgb}` : '3px solid transparent',
                        fontWeight: active ? 600 : 400,
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : aA(0.04); }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${active ? accentRgb : D.borderInput}`,
                        background: active ? accentRgb : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {active && <span style={{ color: 'white', fontSize: 10, lineHeight: 1 }}>✓</span>}
                      </div>
                      {p}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Años de experiencia */}
          <div>
            <label style={labelStyle}>Años de experiencia</label>
            <input type="number" min={0} max={70} value={yearsExperience}
              onChange={e => setYearsExperience(e.target.value === '' ? '' : parseInt(e.target.value))}
              disabled={!isProfessional} placeholder="Ej: 8"
              style={{ ...inputStyle, opacity: !isProfessional ? 0.5 : 1 }}
              onFocus={e => (e.currentTarget.style.borderColor = accentRgb)}
              onBlur={e => (e.currentTarget.style.borderColor = D.borderInput)} />
          </div>

          {/* Modalidad de consulta */}
          {isProfessional && (
            <div>
              <label style={labelStyle}>Modalidad de consulta</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { value: 'presencial', label: 'Presencial' },
                  { value: 'online',     label: 'En línea' },
                  { value: 'hibrida',    label: 'Ambas' },
                ].map(m => (
                  <button key={m.value} type="button"
                    onClick={() => setModality(prev => prev === m.value ? '' : m.value)}
                    style={{
                      padding: '8px 18px', borderRadius: 8, fontSize: 14,
                      border: `1.5px solid ${modality === m.value ? accentRgb : D.borderInput}`,
                      background: modality === m.value ? accentRgb : D.inputBg,
                      color: modality === m.value ? '#fff' : D.inputText,
                      fontWeight: modality === m.value ? 600 : 400,
                      cursor: 'pointer', transition: 'all .15s',
                      boxShadow: modality === m.value ? `0 2px 8px ${aA(0.3)}` : 'none',
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <CountrySelect label="País" value={country} onChange={setCountry} isDark={isDark} accent={accentRgb} />
          <CitySelect country={country} value={city} onChange={setCity} isDark={isDark} />

          {isProfessional && (
            <div onClick={() => setPublished(v => !v)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${published ? accentRgb : D.border}`,
              background: published ? aA(0.08) : D.tagBg,
              transition: 'all 0.2s',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: published ? accentRgb : D.text }}>
                  {published ? '✓ Perfil publicado' : 'Perfil no publicado'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: D.muted }}>
                  {published ? 'Tu perfil aparece en el directorio de Aliax' : 'Activa esto para aparecer en el directorio'}
                </p>
              </div>
              <div style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, flexShrink: 0, background: published ? accentRgb : D.borderInput, transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', left: published ? 23 : 3, transition: 'left 0.2s' }} />
              </div>
            </div>
          )}

          {isProfessional && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: D.text, margin: '0 0 4px' }}>Color del perfil</p>
              <p style={{ fontSize: 12, color: D.muted, margin: '0 0 12px' }}>Color principal de tu página de reservas</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { hex: '#2dd4bf', label: 'Aguamarina' },
                  { hex: '#9333ea', label: 'Clásico' },
                  { hex: '#1D9E75', label: 'Saludable' },
                  { hex: '#2563eb', label: 'Confianza' },
                  { hex: '#ec4899', label: 'Rosa' },
                  { hex: '#d97706', label: 'Cálido' },
                ].map(({ hex, label }) => (
                  <button key={hex} type="button" onClick={() => setPrimaryColor(hex)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 8, borderRadius: 12, cursor: 'pointer', background: 'none', border: `2px solid ${primaryColor === hex ? D.text : 'transparent'}`, transition: 'border-color 0.15s' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: hex, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: D.muted }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Redes sociales ── */}
        <section style={{ background: D.card, borderRadius: 14, border: `1px solid ${D.border}`, padding: isMobile ? 14 : 24, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: D.shadow, backdropFilter: 'blur(12px)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: D.text, margin: 0 }}>Redes sociales</h2>
          {SOCIAL_NETWORKS.map(({ key, label, Icon, color, placeholder }) => (
            <div key={key}>
              <label style={labelStyle}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={16} style={{ color }} /> {label}
                </span>
              </label>
              <input value={socialLinks[key]} onChange={e => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                style={inputStyle} placeholder={placeholder} type="url"
                onFocus={e => (e.currentTarget.style.borderColor = accentRgb)}
                onBlur={e => (e.currentTarget.style.borderColor = D.borderInput)} />
              {socialLinks[key] && (
                <a href={socialLinks[key].startsWith('http') ? socialLinks[key] : `https://${socialLinks[key]}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: accentRgb, textDecoration: 'none' }}>
                  Abrir enlace <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
          {success && <div style={{ padding: 12, background: aA(0.1), border: `1px solid ${aA(0.3)}`, color: accentRgb, fontSize: 13, borderRadius: 10 }}>{success}</div>}
          {error && <div style={{ padding: 12, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171', fontSize: 13, borderRadius: 10 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {saveBtn}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
