import { Link } from 'react-router-dom';
import {
  Calendar,
  Bell,
  Palette,
  ArrowRight,
  UserPlus,
  LogIn,
  Layers,
  Send,
  Star,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';

function AuraLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      {/* Ondas expansivas */}
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
      {/* Anillos estáticos */}
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="grain-overlay bg-aura-950 text-white font-body min-h-screen overflow-hidden" style={{ isolation: 'isolate' }}>

      {/* ─── Ambient Background ─── */}
      {/* Mobile: static, no blur (performance). Desktop: fixed + animated glows */}
      <div className="absolute sm:fixed inset-0 pointer-events-none" aria-hidden>
        {/* Mobile-only: simple static gradient, zero GPU cost */}
        <div className="sm:hidden absolute inset-0 bg-gradient-to-b from-aura-800/20 via-transparent to-aura-900/30" />

        {/* Desktop-only: heavy blur glows */}
        <div className="hidden sm:block absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-amber-glow/[0.07] blur-[140px] animate-pulse-glow" />
        <div className="hidden sm:block absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full bg-aura-600/40 blur-[120px]" />
        <div className="hidden sm:block absolute top-[10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-amber-glow/[0.05] blur-[100px]" />

        {/* Desktop-only: animated particles */}
        <div className="hidden sm:block absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-orbit">
            <div className="w-5 h-5 rounded-full bg-amber-glow/70 blur-[3px]" />
          </div>
        </div>
        <div className="hidden sm:block absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-orbit-reverse">
            <div className="w-3.5 h-3.5 rounded-full bg-white/40 blur-[2px]" />
          </div>
        </div>
        <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-float-slow">
            <div className="w-4 h-4 rounded-full bg-amber-glow/50 blur-[2px]" style={{ transform: 'translate(220px, -80px)' }} />
          </div>
        </div>
        <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-float-slower">
            <div className="w-3 h-3 rounded-full bg-white/25 blur-[1px]" style={{ transform: 'translate(-200px, 60px)' }} />
          </div>
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto animate-fade-up">
        <Link to="/" className="flex items-center gap-2.5 group">
          <AuraLogo className="h-8 w-8 text-amber-glow transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-xl font-display text-white tracking-wide">Aliax.io</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            title="Iniciar sesión"
            className="flex items-center justify-center gap-1.5 p-2 sm:px-5 sm:py-2 text-sm font-medium text-white/60 hover:text-white transition-colors duration-300 rounded-full sm:rounded-none"
          >
            <LogIn className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline">Iniciar sesión</span>
          </Link>
          <Link
            to="/register"
            title="Crear cuenta"
            className="flex items-center justify-center gap-1.5 p-2 sm:px-5 sm:py-2.5 text-sm font-medium bg-amber-glow/10 text-amber-glow border border-amber-glow/20 rounded-full hover:bg-amber-glow/20 hover:border-amber-glow/40 transition-all duration-300"
          >
            <UserPlus className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline">Crear cuenta</span>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative z-10 max-w-5xl mx-auto text-center px-6 pt-24 md:pt-36 pb-20">
        {/* Badge */}
        <div className="animate-fade-up-delay-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-wash border border-amber-glow/10 text-amber-soft text-xs font-medium tracking-wide uppercase mb-8">
          <Zap className="h-3.5 w-3.5" />
          14 días gratis · Sin tarjeta de crédito
        </div>

        <h1 className="animate-fade-up-delay-2 font-hero text-4xl md:text-6xl lg:text-7xl font-bold text-white text-center mb-8 leading-[1.05] tracking-tight">
          Tu presencia profesional<br className="hidden sm:block" /> <span className="text-amber-glow">comienza aqui</span>
        </h1>

        <p className="animate-fade-up-delay-3 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed" style={{ color: 'var(--color-body-text)' }}>
          Crea un perfil unico, publica tus servicios y deja que tus clientes
          reserven citas al instante. Con notificaciones automaticas por WhatsApp.
        </p>

        <div className="animate-fade-up-delay-4 flex flex-col items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group relative inline-flex items-center gap-2 px-8 py-3.5 bg-amber-glow text-white font-semibold rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(147,51,234,0.4)] hover:scale-105"
            >
              Probar gratis 14 días
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-white/50 font-medium hover:text-white/80 transition-colors duration-300"
            >
              Como funciona
            </a>
          </div>
          <p className="text-xs text-white/30">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>

        {/* Stats bar */}
        <div className="animate-fade-up-delay-5 mt-20 flex flex-wrap justify-center gap-x-12 gap-y-4">
          {[
            { value: '4', label: 'Templates unicos' },
            { value: '∞', label: 'Perfiles y servicios' },
            { value: '24/7', label: 'Reservas activas' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-display text-amber-glow">{s.value}</div>
              <div className="text-xs text-white/30 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider Line ─── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ─── Features ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="animate-fade-up text-sm uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Caracteristicas</p>
          <h2 className="animate-fade-up-delay-1 font-display text-3xl md:text-5xl text-white mb-4">
            Todo lo que necesitas
          </h2>
          <p className="animate-fade-up-delay-2 max-w-lg mx-auto" style={{ color: 'var(--color-body-text)' }}>
            Herramientas pensadas para profesionales independientes que quieren destacar.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: Palette,
              title: '4 Templates',
              desc: 'Minimalist, Bold, Elegant o Creative. Cada template refleja un estilo diferente para tu marca personal.',
              accent: 'from-violet-500/20 to-fuchsia-500/20',
              border: 'border-violet-500/10 hover:border-violet-500/30',
              iconColor: 'text-violet-400',
            },
            {
              icon: Calendar,
              title: 'Reservas inteligentes',
              desc: 'Configura tu disponibilidad por dia y hora. El sistema previene conflictos automaticamente.',
              accent: 'from-[#9333ea]/20 to-purple-400/20',
              border: 'border-[#9333ea]/10 hover:border-[#9333ea]/30',
              iconColor: 'text-[#c084fc]',
            },
            {
              icon: Bell,
              title: 'WhatsApp al instante',
              desc: 'Notificaciones automaticas para ti y tus clientes cuando se crea, confirma o cancela una cita.',
              accent: 'from-emerald-500/20 to-teal-500/20',
              border: 'border-emerald-500/10 hover:border-emerald-500/30',
              iconColor: 'text-emerald-400',
            },
          ].map(({ icon: Icon, title, desc, accent, border, iconColor }, i) => (
            <div
              key={title}
              className={`group relative rounded-2xl border ${border} bg-white/[0.02] sm:backdrop-blur-sm p-8 transition-all duration-500 hover:bg-white/[0.04] hover:translate-y-[-4px] ${
                i === 0 ? 'animate-fade-up-delay-3' : i === 1 ? 'animate-fade-up-delay-4' : 'animate-fade-up-delay-5'
              }`}
            >
              {/* Glow on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-white/5 ${iconColor} mb-5`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl text-white mb-3">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Extra features row */}
        <div className="grid sm:grid-cols-3 gap-5 mt-5">
          {[
            { icon: Shield, label: 'Datos seguros' },
            { icon: Globe, label: 'Perfil publico con link unico' },
            { icon: Star, label: 'Sin limites de servicios' },
          ].map(({ icon: Icon, label }, i) => (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm text-white/40 ${
                i === 0 ? 'animate-fade-up-delay-5' : i === 1 ? 'animate-fade-up-delay-6' : 'animate-fade-up-delay-7'
              }`}
            >
              <Icon className="h-4 w-4 text-amber-glow/50 shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section id="como-funciona" className="relative z-10 py-28">
        {/* Top divider */}
        <div className="max-w-5xl mx-auto px-6 mb-20">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Proceso</p>
            <h2 className="font-display text-3xl md:text-5xl text-white mb-4">
              Tres pasos. Listo.
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: 'var(--color-body-text)' }}>
              De cero a recibir reservas en minutos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                step: '01',
                icon: UserPlus,
                title: 'Crea tu cuenta',
                desc: 'Registrate en segundos. Sin tarjeta, sin compromisos. Tu espacio profesional te espera.',
              },
              {
                step: '02',
                icon: Layers,
                title: 'Arma tu perfil',
                desc: 'Elige un template, agrega tus servicios, precios y configura tu disponibilidad semanal.',
              },
              {
                step: '03',
                icon: Send,
                title: 'Comparte tu link',
                desc: 'Publica tu perfil y comparte el link. Tus clientes reservan y ambos reciben notificacion por WhatsApp.',
              },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} className="relative text-center md:text-left group">
                {/* Connector line (desktop) */}
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

      {/* ─── Appearance Showcase ─── */}
      <section className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6 mb-16">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-20" />
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Apariencia</p>
            <h2 className="font-display text-3xl md:text-5xl text-white mb-4">
              Tu color. Tu identidad.
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: 'var(--color-body-text)' }}>
              Elige el color de tu perfil con un clic. Cuatro paletas diseñadas para destacar.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: 'Profesional',
              gradient: 'linear-gradient(160deg, #2d2b6e 0%, #4c46a8 100%)',
              accent: 'rgb(107,99,255)',
              dot: 'rgb(107,99,255)',
            },
            {
              name: 'Bold',
              gradient: 'linear-gradient(160deg, #3d2f00 0%, #7a5f00 100%)',
              accent: 'rgb(222,182,7)',
              dot: 'rgb(222,182,7)',
            },
            {
              name: 'Elegante',
              gradient: 'linear-gradient(160deg, #0c3d5e 0%, #1b6fa8 100%)',
              accent: 'rgb(62,153,201)',
              dot: 'rgb(62,153,201)',
            },
            {
              name: 'Creative',
              gradient: 'linear-gradient(160deg, #500650 0%, #9d1fa8 100%)',
              accent: 'rgb(217,72,240)',
              dot: 'rgb(217,72,240)',
            },
          ].map((t) => (
            <div
              key={t.name}
              className="group rounded-2xl border border-white/5 overflow-hidden hover:border-white/15 transition-all duration-500 hover:translate-y-[-4px]"
            >
              {/* Mini profile card preview */}
              <div style={{ background: t.gradient }} className="p-5 h-44 flex flex-col items-center justify-between">
                <div className="flex flex-col items-center gap-2 pt-2">
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40" />
                  <div className="text-white text-xs font-semibold opacity-90">Profesional</div>
                  <div className="text-white/60 text-[10px]">Especialidad</div>
                </div>
                {/* Reservar button */}
                <div
                  className="h-7 w-24 rounded-lg text-white text-[10px] font-semibold flex items-center justify-center"
                  style={{ background: t.accent }}
                >
                  Reservar
                </div>
              </div>
              <div className="bg-white/[0.03] px-5 py-4 flex items-center justify-between">
                <div className="text-white text-sm font-medium">{t.name}</div>
                <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ background: t.dot }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-20" />
        </div>

        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative">
            {/* Ambient glow behind CTA */}
            <div className="hidden sm:block absolute inset-0 -top-20 mx-auto w-96 h-96 bg-amber-glow/[0.06] rounded-full blur-[80px] pointer-events-none" />

            <h2 className="relative font-display text-4xl md:text-6xl text-white mb-6">
              Tu proximo cliente<br />
              <span className="text-amber-glow">esta buscandote</span>
            </h2>
            <p className="relative max-w-md mx-auto mb-10 text-lg font-light" style={{ color: 'var(--color-body-text)' }}>
              Crea tu perfil profesional hoy y empieza a recibir reservas manana.
            </p>
            <Link
              to="/register"
              className="relative group inline-flex items-center gap-2 px-6 py-3.5 sm:px-10 sm:py-4 bg-amber-glow text-white font-semibold text-sm sm:text-lg rounded-full whitespace-nowrap transition-all duration-300 hover:shadow-[0_0_60px_rgba(147,51,234,0.45)] hover:scale-105"
            >
              Empezar prueba gratis · 14 días
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
            <Link to="/login" className="hover:text-white/50 transition-colors">Iniciar sesion</Link>
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
