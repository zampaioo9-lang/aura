import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema, type ProfileFormData, PROFESSIONS } from '../schemas/profileSchema';
import UsernameInput from '../components/UsernameInput';
import ImageUpload from '../components/ImageUpload';
import VideoUpload from '../components/VideoUpload';
import api from '../api/client';
import { ArrowLeft, Loader2 } from 'lucide-react';

const TEMPLATES = ['MINIMALIST', 'BOLD', 'ELEGANT', 'CREATIVE'] as const;

export default function ProfileCreate() {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bioLength, setBioLength] = useState(0);
  const [professionSuggestions, setProfessionSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      slug: '',
      title: '',
      profession: '',
      bio: '',
      phone: '',
      template: 'MINIMALIST',
      published: true,
    },
  });

  const slugValue = watch('slug');
  const templateValue = watch('template');

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    setError('');
    try {
      await api.post('/profiles', {
        ...data,
        avatar: avatar || undefined,
        videoUrl: videoUrl || undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleProfessionChange = (value: string) => {
    setValue('profession', value);
    if (value.length >= 2) {
      const filtered = PROFESSIONS.filter((p) =>
        p.toLowerCase().includes(value.toLowerCase())
      );
      setProfessionSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="text-sm font-semibold text-slate-900">Crear Perfil</h1>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {error && <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Avatar + Video */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Media</h3>
            <div className="flex flex-wrap gap-6">
              <ImageUpload value={avatar} onChange={setAvatar} />
              <VideoUpload value={videoUrl} onChange={setVideoUrl} />
            </div>
          </section>

          {/* Basic Info */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Informacion Basica</h3>
            <div className="space-y-4">
              <UsernameInput
                value={slugValue}
                onChange={(v) => setValue('slug', v, { shouldValidate: true })}
                error={errors.slug?.message}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                <input
                  {...register('title')}
                  placeholder="Dr. Martin Lopez"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Profesion</label>
                <input
                  {...register('profession')}
                  onChange={(e) => handleProfessionChange(e.target.value)}
                  onFocus={() => {
                    const val = watch('profession');
                    if (val.length >= 2) setShowSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Cardiologo"
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                {showSuggestions && professionSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {professionSuggestions.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                        onMouseDown={() => {
                          setValue('profession', p, { shouldValidate: true });
                          setShowSuggestions(false);
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                {errors.profession && <p className="text-xs text-red-500 mt-1">{errors.profession.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Biografia <span className="text-slate-400 font-normal">({bioLength}/500)</span>
                </label>
                <textarea
                  {...register('bio')}
                  onChange={(e) => {
                    setValue('bio', e.target.value, { shouldValidate: true });
                    setBioLength(e.target.value.length);
                  }}
                  rows={3}
                  maxLength={500}
                  placeholder="Cuentale al mundo sobre ti..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
                {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono WhatsApp</label>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="+54 11 1234-5678"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Template */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Template</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('template', t)}
                  className={`p-4 rounded-xl border-2 text-center text-sm font-medium transition-colors ${
                    templateValue === t
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </section>

          {/* Publish + Submit */}
          <section className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" {...register('published')} className="rounded border-slate-300" />
                Publicar perfil inmediatamente
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Creando...' : 'Crear Perfil'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
