import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { Save, ArrowLeft, Facebook, Instagram, Linkedin } from 'lucide-react';
import UsernameInput from '../components/UsernameInput';
import ImageUpload from '../components/ImageUpload';
import PhoneInput from '../components/PhoneInput';

const SOCIAL_NETWORKS = [
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,      color: '#1877F2', placeholder: 'facebook.com/tu-página' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram,      color: '#E1306C', placeholder: '@tu-usuario' },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin,       color: '#0A66C2', placeholder: 'linkedin.com/in/tu-perfil' },
] as const;


export default function ProfileEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [originalSlug, setOriginalSlug] = useState('');

  const [form, setForm] = useState({
    slug: '',
    title: '',
    bio: '',
    profession: '',
    specialty: '',
    yearsExperience: '' as string | number,
    phone: '',
    template: 'MINIMALIST' as string,
    avatar: '',
    coverImage: '',
    published: false,
    socialLinks: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) {
      api.get('/profiles').then(res => {
        const profile = res.data.find((p: any) => p.id === id);
        if (profile) {
          setOriginalSlug(profile.slug);
          setForm({
            slug: profile.slug,
            title: profile.title,
            bio: profile.bio || '',
            profession: profile.profession,
            specialty: profile.specialty || '',
            yearsExperience: profile.yearsExperience ?? '',
            phone: profile.phone || '',
            template: profile.template,
            avatar: profile.avatar || '',
            coverImage: profile.coverImage || '',
            published: profile.published,
            socialLinks: profile.socialLinks || {},
          });
          // services are now managed at /dashboard/services
        }
      });
    }
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let profileId = id;
      if (isNew) {
        const res = await api.post('/profiles', form);
        profileId = res.data.id;
      } else {
        await api.put(`/profiles/${id}`, form);
      }

      setSuccess('Perfil guardado!');
      if (isNew) navigate(`/profile/edit/${profileId}`, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard?tab=profesional" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>}

        {/* Media */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Media</h3>
          <div className="flex flex-wrap gap-6">
            <ImageUpload value={form.avatar} onChange={(url) => setForm(f => ({ ...f, avatar: url }))} />
          </div>
        </section>

        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Informacion Basica</h3>
          <div className="space-y-4">
            <UsernameInput
              value={form.slug}
              onChange={(v) => setForm(f => ({ ...f, slug: v }))}
              currentSlug={originalSlug}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Titulo <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Profesion <span className="text-red-500">*</span></label>
                <input value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label>
                <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  placeholder="Ej: Dermatología clínica"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Años de experiencia</label>
                <input
                  type="number" min={0} max={70}
                  value={form.yearsExperience}
                  onChange={e => setForm(f => ({ ...f, yearsExperience: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                  placeholder="Ej: 8"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
            </div>
            <div>
              <PhoneInput
                label="WhatsApp Business"
                value={form.phone}
                onChange={v => setForm(f => ({ ...f, phone: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bio <span className="text-slate-400 font-normal">({form.bio.length}/500)</span>
              </label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} maxLength={500}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="published" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                className="rounded border-slate-300" />
              <label htmlFor="published" className="text-sm text-slate-700">Perfil publicado</label>
            </div>
          </div>
        </section>

        {/* Social Links */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Redes Sociales</h3>
          <div className="space-y-4">
            {SOCIAL_NETWORKS.map(({ key, label, Icon, color, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color }} />
                    {label}
                  </span>
                </label>
                <input
                  value={(form.socialLinks as Record<string, string>)[key] || ''}
                  onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, [key]: e.target.value } }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                  placeholder={placeholder}
                  type="url"
                />
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
