import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Zap, Bell, Image, BarChart2, Globe,
  Shield, Star, Check, ArrowRight, UserPlus, Layers, Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

// ─── Types ────────────────────────────────────────────────────────
interface DirectoryProfile {
  id: string;
  slug: string;
  title: string;
  profession: string;
  bio?: string;
  avatar?: string;
  country?: string;
  isPro: boolean;
  services: { id: string; name: string; price: number; currency: string }[];
}

// ─── Static data ──────────────────────────────────────────────────
const QUICK_PROFESSIONS = [
  'Psicólogo/a', 'Barbero/a', 'Nutricionista', 'Entrenador/a Personal',
  'Médico/a General', 'Estilista', 'Coach de Vida', 'Fisioterapeuta',
];

const SAMPLE_PROFILES: DirectoryProfile[] = [
  {
    id: 's1', slug: '#', title: 'María González', profession: 'Psicóloga Clínica',
    country: 'CDMX', isPro: true, bio: 'Especialista en ansiedad y terapia de pareja.',
    services: [{ id: '1', name: 'Terapia individual', price: 800, currency: 'MXN' },
               { id: '2', name: 'Pareja', price: 1000, currency: 'MXN' }],
  },
  {
    id: 's2', slug: '#', title: 'Rodrigo Estilo', profession: 'Barbero Profesional',
    country: 'Monterrey', isPro: true, bio: 'Cortes modernos y degradados. Portfolio de +200 trabajos.',
    services: [{ id: '3', name: 'Corte clásico', price: 180, currency: 'MXN' },
               { id: '4', name: 'Degradado', price: 220, currency: 'MXN' }],
  },
  {
    id: 's3', slug: '#', title: 'Laura Nutrición', profession: 'Nutricionista',
    country: 'Guadalajara', isPro: false, bio: 'Planes personalizados para pérdida de peso y salud.',
    services: [{ id: '5', name: 'Plan nutricional', price: 600, currency: 'MXN' }],
  },
];

const FREE_FEATURES = [
  '1 perfil profesional público',
  'Servicios y reservas ilimitados',
  'Notificaciones por email',
  'Hasta 3 fotos por servicio',
  '2 templates (Minimalist y Bold)',
  'Listado en el directorio de Aliax',
];

const PRO_FEATURES: { text: string; highlight: boolean }[] = [
  { text: 'Notificaciones WhatsApp al cliente y a ti', highlight: true },
  { text: 'Hasta 20 fotos por servicio', highlight: true },
  { text: 'Analytics completos y tendencias', highlight: true },
  { text: 'Posición destacada en el directorio', highlight: true },
  { text: 'Los 4 templates (incluye Elegant y Creative)', highlight: false },
  { text: 'Hasta 3 perfiles', highlight: false },
  { text: 'Recordatorio automático 24h por WhatsApp', highlight: false },
];

// ─── Component ────────────────────────────────────────────────────
export default function Landing() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [searchProf, setSearchProf] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [loadingStripe, setLoadingStripe] = useState(false);

  useEffect(() => {
    api.get('/profiles/directory?limit=6')
      .then(r => {
        setProfiles(r.data.profiles?.length > 0 ? r.data.profiles : SAMPLE_PROFILES);
      })
      .catch(() => setProfiles(SAMPLE_PROFILES));
  }, []);

  const handleDirectorySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchProf) params.set('profession', searchProf);
    if (searchCity) params.set('city', searchCity);
    navigate(`/explorar?${params}`);
  };

  const handleStripe = async () => {
    if (!user) { navigate('/register'); return; }
    setLoadingStripe(true);
    try {
      const res = await api.post('/subscriptions/stripe/checkout', { interval: 'MONTHLY' });
      window.location.href = res.data.url;
    } catch {
      setLoadingStripe(false);
    }
  };

  return (
    <div className="bg-aura-950 text-white font-body min-h-screen overflow-x-hidden">

      {/* ─── Ambient background ─── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(99,51,234,0.6) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* ─── 1. Nav ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5">
          {/* Pulsing dot */}
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 rounded-full bg-amber-glow animate-ping opacity-60" />
            <div className="relative w-3 h-3 rounded-full bg-amber-glow shadow-[0_0_8px_rgba(147,51,234,0.8)]" />
          </div>
          <span className="text-lg font-semibold text-white tracking-wide" style={{ fontFamily: 'Urbanist, sans-serif' }}>
            Aliax.io
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/explorar" className="hidden sm:inline text-sm text-white/40 hover:text-white/70 transition-colors px-3 py-2">
            Explorar profesionales
          </Link>
          <Link to="/pricing" className="text-sm text-white/40 hover:text-white/70 transition-colors px-3 py-2">
            Precios
          </Link>
          <Link to="/login" className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2">
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="ml-2 px-4 py-2 text-sm font-semibold text-amber-soft bg-amber-wash border border-amber-glow/20 rounded-full hover:bg-amber-wash-strong hover:border-amber-glow/40 transition-all"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </nav>

      {/* ─── 2. Hero ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">

        {/* Left col */}
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-wash border border-amber-glow/20 text-amber-soft text-xs font-medium mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-glow shadow-[0_0_6px_rgba(147,51,234,0.9)]" />
            Gratis para siempre · Sin tarjeta
          </div>

          <h1
            className="text-white mb-6 leading-none"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(52px, 7vw, 80px)', letterSpacing: '2px' }}
          >
            TU AGENDA<br />
            <span style={{ background: 'linear-gradient(95deg, #a855f7 0%, #818cf8 50%, #6ee7b7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PROFESIONAL,
            </span><br />
            SIN CAOS
          </h1>

          <p className="text-white/45 text-lg leading-relaxed mb-10 max-w-md">
            Crea tu perfil, publica tus servicios y recibe reservas automáticas.
            Tus clientes reservan, tú te concentras en tu trabajo.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-white rounded-xl transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 6px 28px rgba(99,51,234,0.45)', fontFamily: 'Urbanist, sans-serif', fontSize: '15px' }}
            >
              Crear mi perfil gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/explorar"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-white/50 font-medium text-sm rounded-xl hover:text-white/80 transition-colors border border-white/10 bg-white/[0.03]"
            >
              Explorar directorio
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/25">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>

        {/* Right col — glass card */}
        <div className="relative h-72 md:h-80 hidden md:block">
          {/* Stats pill */}
          <div
            className="absolute -top-2 -left-6 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 z-10"
            style={{ background: 'rgba(22,20,40,0.9)', backdropFilter: 'blur(10px)' }}
          >
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
            <span className="text-sm text-white/60"><span className="text-white font-semibold">48</span> reservas este mes</span>
          </div>

          {/* Main glass profile card */}
          <div
            className="absolute inset-x-0 top-8 rounded-2xl border border-white/10 p-5"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 border-2 border-white/10"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(99,102,241,0.5))' }}
              >
                M
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">María González</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-soft border border-amber-glow/40 bg-amber-wash">
                    <Zap className="h-2.5 w-2.5" /> PRO
                  </span>
                </div>
                <p className="text-white/40 text-xs mt-0.5">Psicóloga · CDMX</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['Terapia individual', 'Ansiedad', 'Parejas'].map(s => (
                <span key={s} className="px-2 py-1 rounded-md text-xs text-white/40 border border-white/8 bg-white/[0.04]">{s}</span>
              ))}
            </div>
            <div
              className="w-full py-2.5 rounded-xl text-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 16px rgba(99,51,234,0.4)' }}
            >
              Reservar cita
            </div>
          </div>

          {/* Floating notification */}
          <div
            className="absolute -bottom-2 -right-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 min-w-[210px] z-10"
            style={{ background: 'rgba(22,20,40,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base border border-green-500/30 bg-green-500/10">✓</div>
            <div>
              <p className="text-white text-xs font-semibold">Nueva reserva confirmada</p>
              <p className="text-white/35 text-[11px]">Lun 28, 10:00 AM · WhatsApp enviado</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Stats strip ─── */}
      <div className="relative z-10 border-t border-b border-white/[0.05] bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-wrap justify-center gap-x-12 gap-y-4">
          {[
            { value: '∞', label: 'Reservas activas' },
            { value: '$0', label: 'Para siempre' },
            { value: '4', label: 'Templates únicos' },
            { value: '24/7', label: 'Tu perfil disponible' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div
                className="text-3xl text-amber-glow"
                style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '1px' }}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-white/25 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. Cómo funciona ─── */}
      <section id="como-funciona" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Proceso</p>
          <h2
            className="text-white mb-4"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px, 5vw, 52px)', letterSpacing: '2px' }}
          >
            TRES PASOS. LISTO.
          </h2>
          <p className="text-white/40 max-w-md mx-auto">De cero a recibir reservas en minutos.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              step: '01', icon: UserPlus,
              title: 'Crea tu cuenta',
              desc: 'Regístrate en segundos. Sin tarjeta, sin compromisos. Tu espacio profesional te espera.',
            },
            {
              step: '02', icon: Layers,
              title: 'Arma tu perfil',
              desc: 'Elige un template, agrega tus servicios, precios y configura tu disponibilidad semanal.',
            },
            {
              step: '03', icon: Send,
              title: 'Comparte tu link',
              desc: 'Publica tu perfil y comparte el link. Tus clientes reservan y reciben confirmación al instante.',
            },
          ].map(({ step, icon: Icon, title, desc }, i) => (
            <div key={step} className="relative text-center md:text-left group">
              {i < 2 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/10 to-transparent" />
              )}
              <div className="inline-flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-amber-wash-strong border border-amber-glow/10 flex items-center justify-center group-hover:border-amber-glow/30 transition-all duration-500">
                    <Icon className="h-7 w-7 text-amber-glow" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-mono text-amber-glow/40 font-bold">{step}</span>
                </div>
              </div>
              <h3 className="text-white font-semibold text-lg mb-3" style={{ fontFamily: 'Urbanist, sans-serif' }}>{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto md:mx-0">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PLACEHOLDER SECTIONS — se completan en tasks siguientes ─── */}
      <div className="h-10" />

      {/* ─── 10. Footer (mínimo temporal) ─── */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 text-center">
        <p className="text-xs text-white/15">&copy; {new Date().getFullYear()} Aliax.io. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}
