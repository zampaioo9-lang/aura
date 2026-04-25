import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Bell,
  Globe,
  Zap,
  CheckCircle,
  MessageSquare,
  Clock,
  TrendingUp,
  UserCheck,
  Scissors,
  Dumbbell,
  Heart,
  Wrench,
  BookOpen,
  Smile,
  Tag,
  LogIn,
  UserPlus,
} from 'lucide-react';

function AuraLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="4" stroke="currentColor" fill="none">
        <animate attributeName="r" from="4" to="32" dur="2.8s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.9" to="0" dur="2.8s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" from="2" to="0" dur="2.8s" begin="0s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="16" r="4" stroke="currentColor" fill="none">
        <animate attributeName="r" from="4" to="32" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.9" to="0" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" from="2" to="0" dur="2.8s" begin="0.9s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="16" r="4" stroke="currentColor" fill="none">
        <animate attributeName="r" from="4" to="32" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.9" to="0" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
        <animate attributeName="stroke-width" from="2" to="0" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

const PROFESIONES = [
  { icon: Scissors, label: 'Peluqueros y barberos' },
  { icon: Heart, label: 'Psicólogos y terapeutas' },
  { icon: Dumbbell, label: 'Entrenadores personales' },
  { icon: Smile, label: 'Estética y belleza' },
  { icon: Wrench, label: 'Técnicos y oficios' },
  { icon: BookOpen, label: 'Tutores y profesores' },
];

const PAIN_POINTS = [
  {
    icon: MessageSquare,
    problem: '¿Gestionas tus citas por Email?',
    detail: 'Los mensajes se pierden, los turnos se confunden y terminas trabajando de más solo para coordinar.',
    accent: 'from-red-500/10 to-rose-500/10',
    border: 'border-red-500/10',
    iconColor: 'text-red-400',
  },
  {
    icon: Globe,
    problem: '¿Tus clientes no te pueden encontrar online?',
    detail: 'Sin presencia digital, dependes 100% del boca a boca. Cada nuevo cliente tiene que buscarte por otro.',
    accent: 'from-orange-500/10 to-amber-500/10',
    border: 'border-orange-500/10',
    iconColor: 'text-orange-400',
  },
  {
    icon: Clock,
    problem: '¿Pierdes horas coordinando horarios?',
    detail: 'Confirmar, reprogramar, recordar citas manualmente te quita tiempo que podrías usar trabajando.',
    accent: 'from-yellow-500/10 to-amber-500/10',
    border: 'border-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
];

const BENEFICIOS = [
  {
    icon: Globe,
    title: 'Perfil profesional con link único',
    desc: 'aliax.io/tunombre — compártelo en Instagram, WhatsApp, donde sea. Tus clientes ven tus servicios y reservan al instante.',
    accent: 'from-violet-500/20 to-fuchsia-500/20',
    border: 'border-violet-500/10 hover:border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    icon: Calendar,
    title: 'Reservas automáticas 24/7',
    desc: 'Configuras tu disponibilidad una vez. Tus clientes reservan solos, sin llamadas, sin mensajes.',
    accent: 'from-[#9333ea]/20 to-purple-400/20',
    border: 'border-[#9333ea]/10 hover:border-[#9333ea]/30',
    iconColor: 'text-[#c084fc]',
  },
  {
    icon: Bell,
    title: 'Recordatorios automáticos',
    desc: 'Tu cliente recibe confirmación y recordatorio 24 horas antes. Menos ausencias, más puntualidad.',
    accent: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/10 hover:border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    icon: TrendingUp,
    title: 'Crece sin depender de nadie',
    desc: 'Sin pagar publicidad, sin intermediarios, sin comisiones por reserva. Tu perfil trabaja por ti mientras atiendes.',
    accent: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/10 hover:border-blue-500/30',
    iconColor: 'text-blue-400',
  },
];

const PASOS = [
  {
    step: '01',
    icon: UserCheck,
    title: 'Crea tu cuenta gratis',
    desc: 'Registro en menos de 2 minutos. Sin tarjeta de crédito. 14 días para probarlo todo.',
  },
  {
    step: '02',
    icon: Globe,
    title: 'Arma tu perfil',
    desc: 'Agrega tus servicios, precios y horarios disponibles. Elige el diseño que mejor te representa.',
  },
  {
    step: '03',
    icon: TrendingUp,
    title: 'Comparte y recibe reservas',
    desc: 'Publica tu link en redes sociales o WhatsApp. Tus clientes reservan solos y ambos reciben confirmación.',
  },
];

export default function Unete() {
  useEffect(() => {
    document.title = 'Únete a Aliax.io — Plataforma para profesionales independientes';
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('description', 'Crea tu perfil profesional, acepta reservas online y haz crecer tu negocio. Plataforma para barberos, estilistas, entrenadores y más. Prueba gratis 14 días.');
    setMeta('keywords', 'plataforma para profesionales independientes, agenda citas online, barbero agenda digital, reservas online México, perfil profesional online');
    setMeta('og:title', 'Únete a Aliax.io — Plataforma para profesionales', true);
    setMeta('og:description', 'Crea tu perfil, acepta reservas 24/7 y haz crecer tu negocio. Para barberos, estilistas, entrenadores y más.', true);
    setMeta('og:url', 'https://www.aliax.io/unete', true);
    setMeta('og:type', 'website', true);
    return () => { document.title = 'Aliax.io — Tu presencia profesional'; };
  }, []);

  return (
    <div className="grain-overlay bg-aura-950 text-white font-body min-h-screen overflow-hidden" style={{ isolation: 'isolate' }}>

      {/* ─── Ambient Background ─── */}
      <div className="absolute sm:fixed inset-0 pointer-events-none" aria-hidden>
        <div className="sm:hidden absolute inset-0 bg-gradient-to-b from-aura-800/20 via-transparent to-aura-900/30" />
        <div className="hidden sm:block absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-amber-glow/[0.07] blur-[140px] animate-pulse-glow" />
        <div className="hidden sm:block absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full bg-aura-600/40 blur-[120px]" />
        <div className="hidden sm:block absolute top-[10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-amber-glow/[0.05] blur-[100px]" />
      </div>

      {/* ─── Navigation ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto animate-fade-up">
        <Link to="/" className="flex items-center gap-2.5 group">
          <AuraLogo className="h-8 w-8 text-amber-glow transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-xl font-display text-white tracking-wide">Aliax.io</span>
        </Link>
        <div className="flex items-center gap-1 md:gap-2">
          <Link
            to="/pricing"
            title="Precios"
            className="flex items-center justify-center gap-1.5 p-2 md:px-3 md:py-2 text-sm font-medium text-white/50 hover:text-white transition-colors duration-300"
          >
            <Tag className="h-5 w-5 md:hidden" />
            <span className="hidden md:inline">Precios</span>
          </Link>
          <Link
            to="/login"
            title="Iniciar sesión"
            className="flex items-center justify-center gap-1.5 p-2 md:px-4 md:py-2 text-sm font-medium text-white/50 hover:text-white transition-colors duration-300 rounded-full md:rounded-none"
          >
            <LogIn className="h-5 w-5 md:hidden" />
            <span className="hidden md:inline">Iniciar sesión</span>
          </Link>
          <Link
            to="/register"
            title="Crear cuenta gratis"
            className="flex items-center justify-center gap-1.5 p-2 md:px-5 md:py-2.5 text-sm font-medium text-white/50 md:bg-amber-glow/10 md:text-amber-glow md:border md:border-amber-glow/20 rounded-full hover:text-white md:hover:bg-amber-glow/20 md:hover:border-amber-glow/40 transition-all duration-300"
          >
            <UserPlus className="h-5 w-5 md:hidden" />
            <span className="hidden md:inline">Crear cuenta gratis</span>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative z-10 max-w-5xl mx-auto text-center px-6 pt-24 md:pt-36 pb-20">
        {/* Badge */}
        <div className="animate-fade-up-delay-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-wash border border-amber-glow/10 text-amber-soft text-xs font-medium tracking-wide uppercase mb-8">
          <Zap className="h-3.5 w-3.5" />
          Para profesionales independientes
        </div>

        <h1 className="animate-fade-up-delay-2 font-hero text-4xl md:text-6xl lg:text-7xl font-bold text-white text-center mb-8 leading-[1.05] tracking-tight">
          Consigue más clientes.<br />
          <span className="text-amber-glow">Sin publicidad pagada.</span>
        </h1>

        <p className="animate-fade-up-delay-3 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed" style={{ color: 'var(--color-body-text)' }}>
          Crea tu perfil profesional online en minutos. Tus clientes reservan citas solos,
          reciben recordatorios automáticos y tú trabajas sin interrupciones.
        </p>

        <div className="animate-fade-up-delay-4 flex flex-col items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group relative inline-flex items-center gap-2 px-8 py-3.5 bg-amber-glow text-white font-semibold rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(147,51,234,0.4)] hover:scale-105"
            >
              Crear mi perfil gratis
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-white/50 font-medium hover:text-white/80 transition-colors duration-300"
            >
              Ver cómo funciona
            </a>
          </div>
          <p className="text-xs text-white/30">14 días gratis · Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>

        {/* Stats */}
        <div className="animate-fade-up-delay-5 mt-20 flex flex-wrap justify-center gap-x-12 gap-y-4">
          {[
            { value: '14 días', label: 'Prueba gratuita' },
            { value: '∞', label: 'Servicios que puedes ofrecer' },
            { value: '24/7', label: 'Tu agenda trabaja sola' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-display text-amber-glow">{s.value}</div>
              <div className="text-xs text-white/30 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ─── ¿Te identificas? (Pain Points) ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="animate-fade-up text-sm uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">¿Te suena familiar?</p>
          <h2 className="animate-fade-up-delay-1 font-display text-3xl md:text-5xl text-white mb-4">
            El problema de crecer sin herramientas
          </h2>
          <p className="animate-fade-up-delay-2 max-w-lg mx-auto" style={{ color: 'var(--color-body-text)' }}>
            Miles de profesionales talentosos pierden clientes todos los días por no tener un sistema simple que funcione.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PAIN_POINTS.map(({ icon: Icon, problem, detail, accent, border, iconColor }, i) => (
            <div
              key={problem}
              className={`group relative rounded-2xl border ${border} bg-white/[0.02] sm:backdrop-blur-sm p-8 transition-all duration-500 hover:bg-white/[0.04] hover:translate-y-[-4px] ${
                i === 0 ? 'animate-fade-up-delay-3' : i === 1 ? 'animate-fade-up-delay-4' : 'animate-fade-up-delay-5'
              }`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-white/5 ${iconColor} mb-5`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg text-white mb-3">{problem}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text)' }}>{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ─── Para quién es Aliax ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Hecho para ti</p>
          <h2 className="font-display text-3xl md:text-5xl text-white mb-4">
            ¿En qué trabajas?
          </h2>
          <p className="max-w-lg mx-auto" style={{ color: 'var(--color-body-text)' }}>
            Aliax funciona para cualquier profesional independiente que ofrezca servicios con cita previa.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {PROFESIONES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm text-white/60 hover:text-white hover:border-amber-glow/20 hover:bg-amber-wash transition-all duration-300 cursor-default"
            >
              <Icon className="h-5 w-5 text-amber-glow/60 shrink-0" />
              {label}
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-white/30">
          Y muchos más — si ofreces servicios con turno, Aliax es para ti.
        </p>
      </section>

      {/* ─── Divider ─── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ─── Beneficios ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Lo que obtienes</p>
          <h2 className="font-display text-3xl md:text-5xl text-white mb-4">
            Tu negocio, en piloto automático
          </h2>
          <p className="max-w-lg mx-auto" style={{ color: 'var(--color-body-text)' }}>
            Herramientas pensadas para que pases más tiempo trabajando y menos tiempo administrando.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {BENEFICIOS.map(({ icon: Icon, title, desc, accent, border, iconColor }, i) => (
            <div
              key={title}
              className={`group relative rounded-2xl border ${border} bg-white/[0.02] sm:backdrop-blur-sm p-8 transition-all duration-500 hover:bg-white/[0.04] hover:translate-y-[-4px] ${
                i < 2 ? 'animate-fade-up-delay-3' : 'animate-fade-up-delay-4'
              }`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10 flex gap-5">
                <div className={`shrink-0 inline-flex p-3 rounded-xl bg-white/5 ${iconColor} h-fit`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl text-white mb-3">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text)' }}>{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Cómo funciona ─── */}
      <section id="como-funciona" className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6 mb-20">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Proceso</p>
            <h2 className="font-display text-3xl md:text-5xl text-white mb-4">
              Listo en 3 pasos
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: 'var(--color-body-text)' }}>
              De cero a recibir reservas en menos de 10 minutos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {PASOS.map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} className="relative text-center md:text-left group">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-amber-wash-strong border border-amber-glow/10 flex items-center justify-center transition-all duration-500 group-hover:border-amber-glow/30 group-hover:shadow-[0_0_30px_rgba(240,168,48,0.1)]">
                      <Icon className="h-7 w-7 text-amber-glow" />
                    </div>
                    <span className="absolute -top-2 -right-2 text-[10px] font-mono text-amber-glow/40 font-bold">
                      {step}
                    </span>
                  </div>
                </div>
                <h3 className="font-display text-xl text-white mb-3">{title}</h3>
                <p className="text-sm leading-relaxed max-w-xs mx-auto md:mx-0" style={{ color: 'var(--color-body-text)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Incluye todo ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
          <h3 className="font-display text-xl text-white mb-6 text-center">Tu perfil incluye todo esto</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Link único aliax.io/tunombre',
              'Servicios y precios sin límite',
              'Calendario de disponibilidad',
              'Reservas online automáticas',
              'Confirmaciones por email',
              'Recordatorios 24h antes',
              '4 diseños de perfil',
              'Sin comisión por reserva',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/70">
                <CheckCircle className="h-4 w-4 text-amber-glow shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Precio ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-28">
        <div className="flex items-center gap-4 rounded-2xl border border-amber-glow/10 bg-amber-wash px-6 py-5">
          <div className="shrink-0 px-2.5 py-1 rounded-full bg-amber-glow/15 border border-amber-glow/20 text-amber-soft text-[10px] font-bold tracking-widest uppercase">
            Oferta lanzamiento
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text)' }}>
            <span className="text-white font-semibold">$15/mes los primeros 12 meses</span>
            {' '}con el código <span className="text-amber-glow font-mono font-bold">ESPECIAL15</span>. Luego $19/mes. Cancela cuando quieras.{' '}
            <Link to="/pricing" className="text-amber-glow underline underline-offset-2 hover:text-amber-soft transition-colors">
              Ver planes →
            </Link>
          </p>
        </div>
      </section>

      {/* ─── CTA Final ─── */}
      <section className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-20" />
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative">
            <div className="hidden sm:block absolute inset-0 -top-20 mx-auto w-96 h-96 bg-amber-glow/[0.06] rounded-full blur-[80px] pointer-events-none" />

            <h2 className="relative font-display text-4xl md:text-6xl text-white mb-6">
              Tu próximo cliente<br />
              <span className="text-amber-glow">está buscándote</span>
            </h2>
            <p className="relative max-w-md mx-auto mb-10 text-lg font-light" style={{ color: 'var(--color-body-text)' }}>
              Crea tu perfil profesional hoy. Gratis por 14 días, sin tarjeta de crédito.
            </p>
            <Link
              to="/register"
              className="relative group inline-flex items-center gap-2 px-6 py-3.5 sm:px-10 sm:py-4 bg-amber-glow text-white font-semibold text-sm sm:text-lg rounded-full whitespace-nowrap transition-all duration-300 hover:shadow-[0_0_60px_rgba(147,51,234,0.45)] hover:scale-105"
            >
              Crear mi perfil gratis
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <p className="relative mt-4 text-xs text-white/30">Sin tarjeta de crédito · Cancela cuando quieras</p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <AuraLogo className="h-6 w-6 text-amber-glow/50" />
            <span className="text-sm text-white/20 font-display">Aliax.io</span>
          </div>
          <div className="flex gap-8 text-xs text-white/20">
            <Link to="/" className="hover:text-white/50 transition-colors">Inicio</Link>
            <Link to="/pricing" className="hover:text-white/50 transition-colors">Precios</Link>
            <Link to="/login" className="hover:text-white/50 transition-colors">Iniciar sesión</Link>
            <Link to="/register" className="hover:text-white/50 transition-colors">Registrarse</Link>
          </div>
          <p className="text-xs text-white/15">
            &copy; {new Date().getFullYear()} Aliax.io. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
