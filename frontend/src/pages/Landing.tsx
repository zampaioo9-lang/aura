import { Link } from 'react-router-dom';
import {
  Calendar,
  Bell,
  Palette,
  ArrowRight,
  UserPlus,
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
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="grain-overlay bg-aura-950 text-white font-body min-h-screen overflow-hidden">

      {/* ─── Ambient Background ─── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        {/* Central radial glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-amber-glow/[0.04] blur-[120px] animate-pulse-glow" />
        {/* Secondary glow */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-aura-600/30 blur-[100px]" />
        {/* Orbiting particles */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-orbit">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-glow/60" />
          </div>
        </div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-orbit-reverse">
            <div className="w-1 h-1 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto animate-fade-up">
        <Link to="/" className="flex items-center gap-2.5 group">
          <AuraLogo className="h-8 w-8 text-amber-glow transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-xl font-display text-white tracking-wide">Aura</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="px-5 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors duration-300"
          >
            Iniciar sesion
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 text-sm font-medium bg-amber-glow/10 text-amber-glow border border-amber-glow/20 rounded-full hover:bg-amber-glow/20 hover:border-amber-glow/40 transition-all duration-300"
          >
            Crear cuenta
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative z-10 max-w-5xl mx-auto text-center px-6 pt-24 md:pt-36 pb-20">
        {/* Badge */}
        <div className="animate-fade-up-delay-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-wash border border-amber-glow/10 text-amber-soft text-xs font-medium tracking-wide uppercase mb-8">
          <Zap className="h-3.5 w-3.5" />
          Plataforma profesional todo-en-uno
        </div>

        <h1 className="animate-fade-up-delay-2 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight mb-8">
          <span className="text-white">Tu presencia</span>
          <br />
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-amber-glow via-amber-soft to-amber-glow bg-clip-text text-transparent">
              profesional
            </span>
            {/* Underline glow */}
            <span className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-glow/50 to-transparent" />
          </span>
          <br />
          <span className="text-white/40 italic font-display">empieza aqui.</span>
        </h1>

        <p className="animate-fade-up-delay-3 text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
          Crea un perfil unico, publica tus servicios y deja que tus clientes
          reserven citas al instante. Con notificaciones automaticas por WhatsApp.
        </p>

        <div className="animate-fade-up-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="group relative inline-flex items-center gap-2 px-8 py-3.5 bg-amber-glow text-aura-950 font-semibold rounded-full transition-all duration-300 hover:shadow-[0_0_40px_rgba(240,168,48,0.3)] hover:scale-105"
          >
            Comenzar gratis
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-white/50 font-medium hover:text-white/80 transition-colors duration-300"
          >
            Como funciona
          </a>
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
          <p className="animate-fade-up text-xs uppercase tracking-[0.25em] text-amber-glow/60 font-medium mb-4">Caracteristicas</p>
          <h2 className="animate-fade-up-delay-1 font-display text-3xl md:text-5xl text-white mb-4">
            Todo lo que necesitas
          </h2>
          <p className="animate-fade-up-delay-2 text-white/30 max-w-lg mx-auto">
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
              accent: 'from-amber-500/20 to-orange-500/20',
              border: 'border-amber-500/10 hover:border-amber-500/30',
              iconColor: 'text-amber-400',
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
              className={`group relative rounded-2xl border ${border} bg-white/[0.02] backdrop-blur-sm p-8 transition-all duration-500 hover:bg-white/[0.04] hover:translate-y-[-4px] ${
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
                <p className="text-white/35 text-sm leading-relaxed">{desc}</p>
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
            <p className="text-xs uppercase tracking-[0.25em] text-amber-glow/60 font-medium mb-4">Proceso</p>
            <h2 className="font-display text-3xl md:text-5xl text-white mb-4">
              Tres pasos. Listo.
            </h2>
            <p className="text-white/30 max-w-lg mx-auto">
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
                <p className="text-white/30 text-sm leading-relaxed max-w-xs mx-auto md:mx-0">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Templates Showcase ─── */}
      <section className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6 mb-16">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-20" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-glow/60 font-medium mb-4">Diseno</p>
            <h2 className="font-display text-3xl md:text-5xl text-white mb-4">
              Cuatro estilos. Tu esencia.
            </h2>
            <p className="text-white/30 max-w-lg mx-auto">
              Cada template esta disenado para transmitir una personalidad unica.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: 'Minimalist',
              desc: 'Limpio y directo',
              bg: 'bg-white',
              text: 'text-slate-900',
              accent: 'bg-slate-900',
              accentText: 'text-white',
            },
            {
              name: 'Bold',
              desc: 'Impacto visual',
              bg: 'bg-slate-900',
              text: 'text-white',
              accent: 'bg-yellow-400',
              accentText: 'text-slate-900',
            },
            {
              name: 'Elegant',
              desc: 'Sofisticado y clasico',
              bg: 'bg-stone-100',
              text: 'text-stone-800',
              accent: 'bg-amber-700',
              accentText: 'text-white',
            },
            {
              name: 'Creative',
              desc: 'Colorido y libre',
              bg: 'bg-gradient-to-br from-purple-100 to-pink-100',
              text: 'text-purple-900',
              accent: 'bg-gradient-to-r from-purple-500 to-pink-500',
              accentText: 'text-white',
            },
          ].map((t) => (
            <div
              key={t.name}
              className="group rounded-2xl border border-white/5 overflow-hidden hover:border-white/15 transition-all duration-500 hover:translate-y-[-4px]"
            >
              {/* Mini preview card */}
              <div className={`${t.bg} p-5 h-44 flex flex-col justify-between`}>
                <div>
                  <div className={`w-10 h-10 rounded-full ${t.accent} mb-3`} />
                  <div className={`text-sm font-semibold ${t.text}`}>{t.name}</div>
                  <div className={`${t.text} opacity-40 text-xs mt-1`}>Profesional</div>
                </div>
                <div className={`h-6 w-20 rounded-md ${t.accent} ${t.accentText} text-[9px] font-semibold flex items-center justify-center`}>
                  Reservar
                </div>
              </div>
              <div className="bg-white/[0.03] px-5 py-4">
                <div className="text-white text-sm font-medium">{t.name}</div>
                <div className="text-white/30 text-xs">{t.desc}</div>
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
            <div className="absolute inset-0 -top-20 mx-auto w-96 h-96 bg-amber-glow/[0.06] rounded-full blur-[80px] pointer-events-none" />

            <h2 className="relative font-display text-4xl md:text-6xl text-white mb-6">
              Tu proximo cliente<br />
              <span className="text-amber-glow italic">esta buscandote</span>
            </h2>
            <p className="relative text-white/35 max-w-md mx-auto mb-10 text-lg font-light">
              Crea tu perfil profesional hoy y empieza a recibir reservas manana.
            </p>
            <Link
              to="/register"
              className="relative group inline-flex items-center gap-2 px-10 py-4 bg-amber-glow text-aura-950 font-semibold text-lg rounded-full transition-all duration-300 hover:shadow-[0_0_60px_rgba(240,168,48,0.35)] hover:scale-105"
            >
              Crear mi perfil gratis
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <AuraLogo className="h-6 w-6 text-amber-glow/50" />
            <span className="text-sm text-white/20 font-display">Aura</span>
          </div>
          <div className="flex gap-8 text-xs text-white/20">
            <Link to="/login" className="hover:text-white/50 transition-colors">Iniciar sesion</Link>
            <Link to="/register" className="hover:text-white/50 transition-colors">Registrarse</Link>
          </div>
          <p className="text-xs text-white/15">
            &copy; {new Date().getFullYear()} Aura. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
