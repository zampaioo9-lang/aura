import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema, type ProfileFormData, PROFESSIONS } from '../schemas/profileSchema';
import ImageUpload from '../components/ImageUpload';
import PhoneInput from '../components/PhoneInput';
import CountrySelect from '../components/CountrySelect';
import CitySelect from '../components/CitySelect';
import api from '../api/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFeature } from '../hooks/useFeature';

const DARK_GRADIENTS: Record<string, string> = {
  aguamarina:  'linear-gradient(160deg, #052e2a 0%, #0d2e29 100%)',
  profesional: 'linear-gradient(160deg, #1e1240 0%, #120d28 100%)',
  bold:        'linear-gradient(160deg, #3d2f00 0%, #1f1800 100%)',
  elegante:    'linear-gradient(160deg, #0c3d5e 0%, #061e30 100%)',
  creative:    'linear-gradient(160deg, #500650 0%, #280328 100%)',
  carbono:     'linear-gradient(160deg, #020808 0%, #050f0e 100%)',
  nocturno:    'linear-gradient(160deg, #1a0641 0%, #0d0320 100%)',
};
const ACCENT_COLORS: Record<string, string> = {
  aguamarina:  'rgb(45,212,191)',
  profesional: 'rgb(147,51,234)',
  bold:        'rgb(253,224,71)',
  elegante:    'rgb(62,153,201)',
  creative:    'rgb(217,72,240)',
  carbono:     'rgb(20,70,65)',
  nocturno:    'rgb(88,28,155)',
};

const TEMPLATES = ['MINIMALIST', 'BOLD', 'ELEGANT', 'CREATIVE', 'CARBONO'] as const;

const THERAPEUTIC_APPROACHES = [
  'Cognitivo-conductual (TCC)', 'Mindfulness / ACT', 'Terapia de aceptación y compromiso',
  'Terapia esquemática', 'Psicoanalítico', 'Psicodinámico', 'Psicología del self',
  'Humanista', 'Gestalt', 'Existencial', 'Logoterapia', 'Psicología positiva',
  'Sistémico', 'Narrativo', 'Terapia breve centrada en soluciones (TBCS)',
  'Breve estratégico', 'Constelaciones familiares',
  'Terapia de pareja', 'Terapia familiar', 'Terapia infantil', 'Terapia de juego',
  'EMDR', 'Integrativo', 'Hipnosis ericksoniana', 'Psicodrama', 'Otro',
];

export default function ProfileCreate() {
  const navigate = useNavigate();
  const { isPro } = useAuth();
  const canTemplates = useFeature('templates_premium');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bioLength, setBioLength] = useState(0);
  const [showProfessionList, setShowProfessionList] = useState(false);
  const [therapeuticApproaches, setTherapeuticApproaches] = useState<string[]>([]);
  const [openApproaches, setOpenApproaches] = useState(false);
  const professionRef = useRef<HTMLDivElement>(null);
  const approachesRef = useRef<HTMLDivElement>(null);

  const accentId = localStorage.getItem('aliax_accent') ?? 'aguamarina';
  const isDark = (localStorage.getItem('aliax_theme') ?? 'dark') === 'dark';
  const accent = ACCENT_COLORS[accentId] ?? ACCENT_COLORS.aguamarina;
  const am = accent.match(/rgb\((\d+),(\d+),(\d+)\)/);
  const [ar, ag, ab] = am ? [am[1], am[2], am[3]] : ['45', '212', '191'];

  // Read data pre-filled from Register form
  const prefill = (() => {
    try { return JSON.parse(localStorage.getItem('aliax_register_prefill') || '{}'); }
    catch { return {}; }
  })();

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
      profession: prefill.profession || '',
      cedula: prefill.cedula || '',
      specialty: '',
      yearsExperience: '',
      country: '',
      city: '',
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
        specialty: data.specialty || undefined,
        yearsExperience: data.yearsExperience !== '' ? Number(data.yearsExperience) : undefined,
        country: data.country || undefined,
        avatar: avatar || undefined,
        therapeuticApproaches: therapeuticApproaches.length > 0 ? therapeuticApproaches : undefined,
      });
      localStorage.removeItem('aliax_register_prefill');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear perfil');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (professionRef.current && !professionRef.current.contains(e.target as Node)) {
        setShowProfessionList(false);
      }
      if (approachesRef.current && !approachesRef.current.contains(e.target as Node)) {
        setOpenApproaches(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleApproach = (a: string) => {
    setTherapeuticApproaches(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const S = {
    page: {
      minHeight: '100vh',
      background: isDark ? (DARK_GRADIENTS[accentId] ?? DARK_GRADIENTS.aguamarina) : '#f8fafc',
      color: isDark ? '#fff' : '#1e293b',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      position: 'relative' as const,
    },
    glow: {
      position: 'absolute' as const, top: '-10%', left: '50%', transform: 'translateX(-50%)',
      width: 600, height: 500,
      background: `radial-gradient(ellipse, rgba(${ar},${ag},${ab},${isDark ? '0.12' : '0.06'}) 0%, transparent 65%)`,
      pointerEvents: 'none' as const,
    },
    nav: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px',
      borderBottom: `1px solid rgba(${ar},${ag},${ab},${isDark ? '0.12' : '0.15'})`,
      background: isDark ? 'transparent' : 'rgba(255,255,255,0.8)',
      backdropFilter: isDark ? 'none' : 'blur(8px)',
      position: 'relative' as const, zIndex: 10,
    },
    card: {
      background: isDark ? `rgba(${ar},${ag},${ab},0.05)` : '#ffffff',
      border: `1px solid rgba(${ar},${ag},${ab},${isDark ? '0.18' : '0.20'})`,
      borderRadius: 16, padding: '24px', marginBottom: 16,
      boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
    },
    label: {
      display: 'block', fontSize: 12, fontWeight: 600,
      color: isDark ? 'rgba(255,255,255,0.55)' : '#64748b',
      textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: 6,
    },
    inp: {
      width: '100%', padding: '11px 14px',
      background: isDark ? `rgba(${ar},${ag},${ab},0.06)` : '#f8fafc',
      border: `1px solid rgba(${ar},${ag},${ab},${isDark ? '0.15' : '0.25'})`,
      borderRadius: 10,
      color: isDark ? '#fff' : '#1e293b',
      fontSize: 14, fontFamily: 'inherit', outline: 'none',
      boxSizing: 'border-box' as const, transition: 'border-color 0.2s',
    },
    inpFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = `rgba(${ar},${ag},${ab},0.6)`;
    },
    inpBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = `rgba(${ar},${ag},${ab},${isDark ? '0.15' : '0.25'})`;
    },
    sectionTitle: { fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#1e293b', margin: '0 0 6px' },
    sectionSub: { fontSize: 12, color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8', margin: '0 0 18px' },
    error: { fontSize: 11, color: '#f87171', marginTop: 4 },
  };

  return (
    <div style={S.page}>
      <div style={S.glow} />
      <nav style={S.nav}>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>Crear perfil</span>
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 48px', position: 'relative', zIndex: 10 }}>
        {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, color: '#f87171' }}>{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Media */}
          <div style={S.card}>
            <p style={S.sectionTitle}>Foto de perfil</p>
            <p style={S.sectionSub}>Esta imagen aparecerá en tu página pública</p>
            <ImageUpload value={avatar} onChange={setAvatar} />
          </div>

          {/* Información básica */}
          <div style={S.card}>
            <p style={S.sectionTitle}>Información básica</p>
            <p style={S.sectionSub}>Datos que aparecerán en tu perfil público</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* URL del perfil */}
              <div>
                <label style={S.label}>URL de tu perfil *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: accent, fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}>aliax.io/</span>
                  <input
                    type="text"
                    value={slugValue}
                    onChange={e => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
                      setValue('slug', v, { shouldValidate: true });
                    }}
                    placeholder="mi-nombre"
                    style={{ ...S.inp, paddingLeft: 90 }}
                    onFocus={S.inpFocus} onBlur={S.inpBlur}
                  />
                </div>
                {errors.slug && <p style={S.error}>{errors.slug.message}</p>}
              </div>

              {/* Nombre */}
              <div>
                <label style={S.label}>Nombre completo *</label>
                <input {...register('title')} placeholder="Dra. Laura Mendoza" style={S.inp} onFocus={S.inpFocus} onBlur={S.inpBlur} />
                {errors.title && <p style={S.error}>{errors.title.message}</p>}
              </div>

              {/* Profesión */}
              <div ref={professionRef} style={{ position: 'relative' }}>
                <label style={S.label}>Profesión *</label>
                <button
                  type="button"
                  onClick={() => setShowProfessionList(o => !o)}
                  style={{
                    ...S.inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ color: watch('profession') ? (isDark ? '#fff' : '#1e293b') : (isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8') }}>
                    {watch('profession') || 'Selecciona tu profesión'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: showProfessionList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showProfessionList && (
                  <div style={{
                    position: 'absolute', zIndex: 200, width: '100%', marginTop: 4,
                    background: isDark ? `rgb(${Math.round(+ar*0.12)},${Math.round(+ag*0.12)},${Math.round(+ab*0.12)})` : '#ffffff',
                    border: `1px solid rgba(${ar},${ag},${ab},0.3)`,
                    borderRadius: 10, boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.7)' : '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: 200, overflowY: 'auto',
                    scrollbarWidth: 'thin', scrollbarColor: `rgba(${ar},${ag},${ab},0.4) transparent`,
                  }}>
                    {PROFESSIONS.map(p => {
                      const isSelected = watch('profession') === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          style={{
                            width: '100%', textAlign: 'left', padding: '10px 14px',
                            background: isSelected ? `rgba(${ar},${ag},${ab},0.15)` : 'transparent',
                            border: 'none',
                            borderLeft: isSelected ? `3px solid rgb(${ar},${ag},${ab})` : '3px solid transparent',
                            color: isSelected ? `rgb(${ar},${ag},${ab})` : (isDark ? '#e8f0f0' : '#1e293b'),
                            fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: isSelected ? 600 : 400,
                          }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = `rgba(${ar},${ag},${ab},0.08)`; }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                          onClick={() => { setValue('profession', p, { shouldValidate: true }); setShowProfessionList(false); }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.profession && <p style={S.error}>{errors.profession.message}</p>}
              </div>

              {/* Enfoque Terapéutico */}
              <div ref={approachesRef} style={{ position: 'relative' }}>
                <label style={S.label}>Enfoque o Modelo terapéutico</label>
                <button
                  type="button"
                  onClick={() => setOpenApproaches(o => !o)}
                  style={{ ...S.inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ color: therapeuticApproaches.length === 0 ? (isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8') : (isDark ? '#fff' : '#1e293b'), fontSize: 14 }}>
                    {therapeuticApproaches.length === 0
                      ? 'Selecciona enfoques...'
                      : therapeuticApproaches.length === 1
                        ? therapeuticApproaches[0]
                        : `${therapeuticApproaches.length} enfoques seleccionados`}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: openApproaches ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openApproaches && (
                  <div style={{
                    position: 'absolute', zIndex: 200, width: '100%', marginTop: 4,
                    background: isDark ? `rgb(${Math.round(+ar*0.12)},${Math.round(+ag*0.12)},${Math.round(+ab*0.12)})` : '#ffffff',
                    border: `1px solid rgba(${ar},${ag},${ab},0.3)`,
                    borderRadius: 10, boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.7)' : '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: 240, overflowY: 'auto',
                    scrollbarWidth: 'thin', scrollbarColor: `rgba(${ar},${ag},${ab},0.4) transparent`,
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
                            background: active ? `rgba(${ar},${ag},${ab},0.15)` : 'transparent',
                            color: active ? `rgb(${ar},${ag},${ab})` : (isDark ? '#e8f0f0' : '#334155'),
                            borderLeft: active ? `3px solid rgb(${ar},${ag},${ab})` : '3px solid transparent',
                            fontWeight: active ? 600 : 400, transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : `rgba(${ar},${ag},${ab},0.06)`; }}
                          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <div style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: `2px solid ${active ? `rgb(${ar},${ag},${ab})` : (isDark ? 'rgba(255,255,255,0.25)' : '#cbd5e1')}`,
                            background: active ? `rgb(${ar},${ag},${ab})` : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
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

              {/* Especialidad + Experiencia */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={S.label}>Especialidad</label>
                  <input {...register('specialty')} placeholder="Ej: Terapia de pareja" style={S.inp} onFocus={S.inpFocus} onBlur={S.inpBlur} />
                </div>
                <div>
                  <label style={S.label}>Años de experiencia</label>
                  <input type="number" min={0} max={100} {...register('yearsExperience')} placeholder="Ej: 8" style={S.inp} onFocus={S.inpFocus} onBlur={S.inpBlur} />
                </div>
              </div>

              {/* País / Ciudad */}
              <CountrySelect label="País" value={watch('country') || ''} onChange={v => setValue('country', v)} isDark={isDark} accent={accent} />
              <CitySelect country={watch('country') || ''} value={watch('city') || ''} onChange={v => setValue('city', v)} isDark={isDark} accent={accent} />

              {/* Biografía */}
              <div>
                <label style={S.label}>Biografía <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({bioLength}/500)</span></label>
                <textarea
                  {...register('bio')}
                  onChange={e => { setValue('bio', e.target.value, { shouldValidate: true }); setBioLength(e.target.value.length); }}
                  rows={3} maxLength={500}
                  placeholder="Cuéntale a tus pacientes sobre tu enfoque y experiencia..."
                  style={{ ...S.inp, resize: 'vertical', minHeight: 80 }}
                  onFocus={S.inpFocus} onBlur={S.inpBlur}
                />
                {errors.bio && <p style={S.error}>{errors.bio.message}</p>}
              </div>

              {/* Teléfono */}
              <div>
                <PhoneInput label="WhatsApp / Teléfono" optional value={watch('phone') || ''} onChange={v => setValue('phone', v)} isDark={isDark} accent={accent} />
              </div>
            </div>
          </div>

          {/* Template */}
          <div style={S.card}>
            <p style={S.sectionTitle}>Template de perfil</p>
            <p style={S.sectionSub}>{isPro ? 'Elige el diseño visual de tu página pública.' : 'Minimalist incluido. Desbloquea más con Pro.'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {TEMPLATES.map(t => {
                const isProTemplate = t !== 'MINIMALIST';
                const isSelected = templateValue === t;
                return (
                  <div key={t} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => (isPro || canTemplates || !isProTemplate) && setValue('template', t)}
                      style={{
                        width: '100%', padding: '12px 6px', borderRadius: 10,
                        border: `2px solid ${isSelected ? `rgb(${ar},${ag},${ab})` : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                        background: isSelected ? `rgba(${ar},${ag},${ab},0.12)` : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        color: isSelected ? `rgb(${ar},${ag},${ab})` : isDark ? 'rgba(255,255,255,0.5)' : '#64748b',
                        fontSize: 12, fontWeight: isSelected ? 700 : 400, cursor: (isPro || canTemplates || !isProTemplate) ? 'pointer' : 'default',
                        fontFamily: 'inherit', opacity: (isProTemplate && !isPro && !canTemplates) ? 0.55 : 1,
                      }}
                    >
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </button>
                    {isProTemplate && !isPro && !canTemplates && (
                      <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 10 }}>🔒</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Publicar + Crear */}
          <div style={S.card}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" {...register('published')} style={{ width: 16, height: 16, accentColor: accent }} />
              <span style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.7)' : '#475569' }}>Publicar perfil inmediatamente</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%', padding: '13px',
                background: `linear-gradient(135deg, rgba(${ar},${ag},${ab},1), rgba(${ar},${ag},${ab},0.75))`,
                color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 10,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit',
              }}
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Creando perfil...' : 'Crear perfil'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
