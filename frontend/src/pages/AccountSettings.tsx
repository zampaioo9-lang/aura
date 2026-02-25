import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Facebook, Instagram, Linkedin, MessageCircle, ExternalLink, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import PhoneInput from '../components/PhoneInput';

const SOCIAL_NETWORKS = [
  { key: 'facebook',  label: 'Facebook',   Icon: Facebook,       color: '#1877F2', placeholder: 'facebook.com/tu-página' },
  { key: 'instagram', label: 'Instagram',  Icon: Instagram,      color: '#E1306C', placeholder: '@tu-usuario' },
  { key: 'linkedin',  label: 'LinkedIn',   Icon: Linkedin,       color: '#0A66C2', placeholder: 'linkedin.com/in/tu-perfil' },
  { key: 'whatsapp',  label: 'WhatsApp',   Icon: MessageCircle,  color: '#25D366', placeholder: '+54 11 1234-5678' },
] as const;

type SocialKey = 'facebook' | 'instagram' | 'linkedin' | 'whatsapp';


export default function AccountSettings() {
  const { user, updateAccount } = useAuth();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<SocialKey, string>>({
    facebook: '', instagram: '', linkedin: '', whatsapp: '',
  });
  const [waPhone, setWaPhone] = useState('+54');

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [primaryProfile, setPrimaryProfile] = useState<any>(null);
  const [specialty, setSpecialty] = useState('');
  const [yearsExperience, setYearsExperience] = useState<string | number>('');

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
    setWaPhone(stored || '+54');
    setSocialLinks({
      facebook:  links.facebook  || '',
      instagram: links.instagram || '',
      linkedin:  links.linkedin  || '',
      whatsapp:  stored,
    });

    api.get('/profiles').then(res => {
      const profile = res.data[0] || null;
      setPrimaryProfile(profile);
      if (profile) {
        setSpecialty(profile.specialty || '');
        setYearsExperience(profile.yearsExperience ?? '');
      }
    }).catch(() => {});
  }, [user]);

  const handleSave = async () => {
    if (showPassword) {
      if (!currentPassword) return setError('Ingresá tu contraseña actual.');
      if (newPassword.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.');
      if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden.');
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const whatsapp = waPhone.length > 4 ? waPhone : '';
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
          specialty: specialty.trim() || undefined,
          yearsExperience: typeof yearsExperience === 'number' ? yearsExperience : undefined,
        });
      }

      setSuccess('Cambios guardados correctamente.');
      setShowPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración de cuenta</h1>

        {error   && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{success}</div>}

        {/* ── Información personal ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Información personal</h2>
          <div>
            <label className={labelClass}>Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Tu nombre" />
          </div>
          <div>
            <label className={labelClass}>
              Bio <span className="text-slate-400 font-normal">({bio.length}/500)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Contá algo sobre vos..."
            />
          </div>
        </section>

        {/* ── Cuenta ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Cuenta</h2>
          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputClass} placeholder="tu@correo.com" />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              {showPassword ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
            </button>

            {showPassword && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className={labelClass}>Contraseña actual</label>
                  <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" className={inputClass} placeholder="••••••••" />
                </div>
                <div>
                  <label className={labelClass}>Nueva contraseña</label>
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" className={inputClass} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label className={labelClass}>Confirmar nueva contraseña</label>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" className={inputClass} placeholder="Repetí la nueva contraseña" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Perfil Profesional ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Perfil Profesional</h2>
            {!isProfessional && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                <Lock className="h-3 w-3" /> Requiere plan Pro
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Especialidad</label>
              <input
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                disabled={!isProfessional}
                placeholder="Ej: Dermatología clínica"
                className={`${inputClass} ${!isProfessional ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
              />
            </div>
            <div>
              <label className={labelClass}>Años de experiencia</label>
              <input
                type="number" min={0} max={70}
                value={yearsExperience}
                onChange={e => setYearsExperience(e.target.value === '' ? '' : parseInt(e.target.value))}
                disabled={!isProfessional}
                placeholder="Ej: 8"
                className={`${inputClass} ${!isProfessional ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
              />
            </div>
          </div>
          {!isProfessional && (
            <p className="text-xs text-slate-400">
              Activa tu perfil profesional para completar estos campos.
            </p>
          )}
        </section>

        {/* ── Redes sociales ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Redes sociales</h2>
          {SOCIAL_NETWORKS.map(({ key, label, Icon, color, placeholder }) => (
            <div key={key}>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color }} />
                  {label}
                </span>
              </label>
              {key === 'whatsapp' ? (
                <PhoneInput
                  value={waPhone}
                  onChange={setWaPhone}
                />
              ) : (
                <input
                  value={socialLinks[key]}
                  onChange={e => setSocialLinks(prev => ({ ...prev, [key]: e.target.value }))}
                  className={inputClass}
                  placeholder={placeholder}
                  type="url"
                />
              )}
              {/* Preview link if value exists */}
              {(key === 'whatsapp' ? waPhone.length > 4 : socialLinks[key]) && (
                <a
                  href={
                    key === 'whatsapp'
                      ? `https://wa.me/${waPhone.replace(/\D/g, '')}`
                      : socialLinks[key].startsWith('http') ? socialLinks[key] : `https://${socialLinks[key]}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-500 hover:text-indigo-700"
                >
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
