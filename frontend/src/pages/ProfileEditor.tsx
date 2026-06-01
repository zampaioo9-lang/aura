import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { Save, ArrowLeft, Facebook, Instagram, Linkedin } from 'lucide-react';
import CountrySelect from '../components/CountrySelect';
import CitySelect from '../components/CitySelect';
import UsernameInput from '../components/UsernameInput';
import ImageUpload from '../components/ImageUpload';
import PhoneInput from '../components/PhoneInput';
import { PROFESSION_CATEGORIES } from '../lib/professions';
import { useAuth } from '../context/AuthContext';
import ProGate from '../components/ProGate';

const MENTAL_HEALTH_PROFESSIONS = new Set(
  PROFESSION_CATEGORIES.find(c => c.category === 'Salud Mental')?.professions ?? []
);

const THERAPEUTIC_APPROACHES = [
  'Cognitivo-conductual (TCC)', 'Psicoanalítico', 'Psicodinámico', 'Sistémico',
  'Humanista', 'Gestalt', 'EMDR', 'Mindfulness / ACT', 'Narrativo',
  'Integrativo', 'Breve estratégico', 'Logoterapia', 'Existencial',
];

const PROBLEMATICS = [
  'Ansiedad', 'Depresión', 'Estrés', 'Trauma / PTSD', 'Duelo',
  'Problemas de pareja', 'Familia y crianza', 'Autoestima', 'Identidad',
  'Trastornos alimenticios', 'Fobias / TOC', 'Adicciones',
  'TDAH / Neurodivergencia', 'Orientación sexual / Diversidad',
  'Adultos mayores', 'Manejo de emociones',
];

const POPULATIONS = [
  'Niños', 'Adolescentes', 'Adultos', 'Adultos mayores',
  'Parejas', 'Familias', 'Grupos',
];

const LANGUAGES = [
  'Español', 'Inglés', 'Portugués', 'Francés', 'Italiano',
  'Alemán', 'Árabe', 'Chino', 'Japonés',
];

function ChipSelect({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt]);
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              value.includes(opt)
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-300'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

const SOCIAL_NETWORKS = [
  { key: 'facebook',  label: 'Facebook',  Icon: Facebook,      color: '#1877F2', placeholder: 'facebook.com/tu-página' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram,      color: '#E1306C', placeholder: '@tu-usuario' },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin,       color: '#0A66C2', placeholder: 'linkedin.com/in/tu-perfil' },
] as const;

const COLOR_OPTIONS: { hex: string; label: string; pro: boolean }[] = [
  { hex: '#9333ea', label: 'Clásico',   pro: false },
  { hex: '#1D9E75', label: 'Saludable', pro: false },
  { hex: '#2563eb', label: 'Confianza', pro: true },
  { hex: '#e11d48', label: 'Energía',   pro: true },
  { hex: '#d97706', label: 'Cálido',    pro: true },
];


export default function ProfileEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPro } = useAuth();
  const isNew = !id;
  const [originalSlug, setOriginalSlug] = useState('');

  const [form, setForm] = useState({
    slug: '',
    title: '',
    bio: '',
    profession: '',
    specialty: '',
    yearsExperience: '' as string | number,
    country: '',
    city: '',
    phone: '',
    template: 'MINIMALIST' as string,
    avatar: '',
    coverImage: '',
    published: false,
    socialLinks: {} as Record<string, string>,
    customization: { primaryColor: '#9333ea' } as { primaryColor: string },
    // Salud mental
    therapeuticApproaches: [] as string[],
    problematics: [] as string[],
    populations: [] as string[],
    modality: '',
    pricePerSession: '' as string | number,
    sessionCurrency: 'MXN',
    sessionDurationMinutes: 50 as string | number,
    cedula: '',
    university: '',
    degree: '',
    languages: [] as string[],
    acceptsInvoice: false,
    workingStyle: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isMentalHealth = MENTAL_HEALTH_PROFESSIONS.has(form.profession);

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
            country: profile.country || '',
            city: profile.city || '',
            phone: profile.phone || '',
            template: profile.template,
            avatar: profile.avatar || '',
            coverImage: profile.coverImage || '',
            published: profile.published,
            socialLinks: profile.socialLinks || {},
            customization: { primaryColor: profile.customization?.primaryColor || '#9333ea' },
            therapeuticApproaches: profile.therapeuticApproaches || [],
            problematics: profile.problematics || [],
            populations: profile.populations || [],
            modality: profile.modality || '',
            pricePerSession: profile.pricePerSession ?? '',
            sessionCurrency: profile.sessionCurrency || 'MXN',
            sessionDurationMinutes: profile.sessionDurationMinutes ?? 50,
            cedula: profile.cedula || '',
            university: profile.university || '',
            degree: profile.degree || '',
            languages: profile.languages || [],
            acceptsInvoice: profile.acceptsInvoice || false,
            workingStyle: profile.workingStyle || '',
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Profesión <span className="text-red-500">*</span></label>
                <select
                  value={form.profession}
                  onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                >
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
            <CountrySelect
              label="País de origen"
              value={form.country}
              onChange={v => setForm(f => ({ ...f, country: v }))}
            />
            <CitySelect
              country={form.country}
              value={form.city || ''}
              onChange={v => setForm(f => ({ ...f, city: v }))}
            />
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
            <div
              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                form.published
                  ? 'border-green-400 bg-green-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
              onClick={() => setForm(f => ({ ...f, published: !f.published }))}
            >
              <div>
                <p className={`font-semibold text-sm ${form.published ? 'text-green-700' : 'text-slate-600'}`}>
                  {form.published ? '✓ Perfil publicado' : 'Perfil no publicado'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {form.published
                    ? 'Tu perfil aparece en el directorio y es visible para todos'
                    : 'Activa esto para aparecer en el directorio de Aliax'}
                </p>
              </div>
              <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.published ? 'bg-green-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.published ? 'translate-x-7' : 'translate-x-1'}`} />
              </div>
            </div>
          </div>
        </section>

        {/* Color del perfil */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Color del perfil</h3>
          <p className="text-sm text-slate-500 mb-4">Elige el color principal de tu página de reservas</p>
          <div className="flex flex-wrap gap-3">
            {COLOR_OPTIONS.map(({ hex, label, pro }) => {
              const selected = form.customization.primaryColor === hex;
              const btn = (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, customization: { primaryColor: hex } }))}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                    selected ? 'border-slate-700 shadow-md' : 'border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full shadow-sm" style={{ background: hex }} />
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                </button>
              );
              return pro ? (
                <ProGate key={hex} isPro={isPro ?? false} display="inline-flex" compact>
                  {btn}
                </ProGate>
              ) : (
                <div key={hex}>{btn}</div>
              );
            })}
          </div>
        </section>

        {/* Perfil terapéutico — solo salud mental */}
        {isMentalHealth && (
          <section className="bg-white rounded-xl border border-indigo-100 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Perfil terapéutico</h3>
            <p className="text-sm text-slate-500 mb-6">Esta información ayuda a los pacientes a encontrarte según sus necesidades</p>
            <div className="space-y-6">

              <ChipSelect label="Enfoques terapéuticos" options={THERAPEUTIC_APPROACHES}
                value={form.therapeuticApproaches}
                onChange={v => setForm(f => ({ ...f, therapeuticApproaches: v }))} />

              <ChipSelect label="Problemáticas que trabajas" options={PROBLEMATICS}
                value={form.problematics}
                onChange={v => setForm(f => ({ ...f, problematics: v }))} />

              <ChipSelect label="Con quién trabajas" options={POPULATIONS}
                value={form.populations}
                onChange={v => setForm(f => ({ ...f, populations: v }))} />

              {/* Modalidad */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Modalidad</label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { value: 'presencial', label: 'Presencial' },
                    { value: 'online',     label: 'Online' },
                    { value: 'hibrida',    label: 'Híbrida' },
                  ].map(m => (
                    <button key={m.value} type="button"
                      onClick={() => setForm(f => ({ ...f, modality: m.value }))}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                        form.modality === m.value
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-300'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Precio y moneda */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio por sesión</label>
                  <input type="number" min={0} value={form.pricePerSession}
                    onChange={e => setForm(f => ({ ...f, pricePerSession: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                    placeholder="Ej: 800"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                  <select value={form.sessionCurrency}
                    onChange={e => setForm(f => ({ ...f, sessionCurrency: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                    {['MXN', 'USD', 'ARS', 'COP', 'CLP', 'PEN', 'EUR'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duración */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duración de sesión</label>
                <select value={form.sessionDurationMinutes}
                  onChange={e => setForm(f => ({ ...f, sessionDurationMinutes: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                  <option value={45}>45 minutos</option>
                  <option value={50}>50 minutos</option>
                  <option value={60}>60 minutos</option>
                  <option value={90}>90 minutos</option>
                </select>
              </div>

              {/* Cédula y grado */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cédula profesional</label>
                  <input value={form.cedula}
                    onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))}
                    placeholder="Ej: 12345678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Grado académico</label>
                  <select value={form.degree}
                    onChange={e => setForm(f => ({ ...f, degree: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                    <option value="">Selecciona</option>
                    <option value="licenciatura">Licenciatura</option>
                    <option value="especializacion">Especialización</option>
                    <option value="maestria">Maestría</option>
                    <option value="doctorado">Doctorado</option>
                  </select>
                </div>
              </div>

              {/* Universidad */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Universidad de formación</label>
                <input value={form.university}
                  onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
                  placeholder="Ej: UNAM, UAG, UdeG..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>

              <ChipSelect label="Idiomas en que atiende" options={LANGUAGES}
                value={form.languages}
                onChange={v => setForm(f => ({ ...f, languages: v }))} />

              {/* Mi forma de trabajar */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mi forma de trabajar <span className="text-slate-400 font-normal">({(form.workingStyle || '').length}/1000)</span>
                </label>
                <textarea value={form.workingStyle}
                  onChange={e => setForm(f => ({ ...f, workingStyle: e.target.value }))}
                  rows={4} maxLength={1000}
                  placeholder="Describe tu estilo terapéutico, cómo es una primera sesión, qué pueden esperar tus pacientes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
              </div>

              {/* Acepta factura */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.acceptsInvoice}
                  onChange={e => setForm(f => ({ ...f, acceptsInvoice: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Emito factura / comprobante fiscal</span>
              </label>

            </div>
          </section>
        )}

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
