import { Link } from 'react-router-dom';
import {
  Sparkles, Calendar, Bell, Clock, Star, Users,
  Heart, CheckCircle, ArrowRight, Zap, Scissors, Smartphone,
} from 'lucide-react';

// ── Brand / accent tokens ──────────────────────────────────────────────────
const R1 = '#E8B4B8';            // rose light
const R2 = '#C96A7A';            // rose deep
const R3 = '#9b3a4f';            // rose darker
const R_DIM = 'rgba(201,106,122,0.11)';
const R_BORDER = 'rgba(201,106,122,0.26)';
const R_GLOW = 'rgba(201,106,122,0.35)';
const PURPLE = 'rgb(147,51,234)';

function AuraLogo({ className = '', color = R1 }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" style={{ color }}>
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

export default function LandingSalon() {
  return (
    <div className="grain-overlay bg-aura-950 text-white font-body min-h-screen overflow-hidden" style={{ isolation: 'isolate' }}>

      {/* ── Ambient background ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Rose glow — top left */}
        <div className="absolute -top-32 -left-32 w-[640px] h-[640px] rounded-full blur-[140px] opacity-16"
          style={{ background: `radial-gradient(circle, ${R2} 0%, transparent 70%)` }} />
        {/* Purple glow — top right */}
        <div className="absolute -top-20 right-0 w-[520px] h-[520px] rounded-full blur-[130px] opacity-14"
          style={{ background: `radial-gradient(circle, ${PURPLE} 0%, transparent 70%)` }} />
        {/* Rose glow — bottom center */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-12"
          style={{ background: `radial-gradient(circle, ${R2} 0%, transparent 70%)` }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }} />
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto animate-fade-up">
        <Link to="/" className="flex items-center gap-2.5 group">
          <AuraLogo className="h-8 w-8 transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-xl font-display text-white tracking-wide">Aliax.io</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/pricing" className="text-sm font-medium text-white/40 hover:text-white transition-colors hidden md:block">Precios</Link>
          <Link to="/login"   className="text-sm font-medium text-white/40 hover:text-white transition-colors hidden md:block">Iniciar sesión</Link>
          <Link
            to="/register"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full text-white transition-all duration-300 hover:scale-105 hover:brightness-110"
            style={{ background: `linear-gradient(135deg, ${R2} 0%, ${R3} 100%)`, boxShadow: `0 0 18px ${R_GLOW}` }}>
            Comenzar gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 pt-14 pb-24 max-w-7xl mx-auto" style={{ overflow: 'visible' }}>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center" style={{ overflow: 'visible' }}>

          {/* ── Left: text ── */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-[11px] font-bold tracking-[0.12em] uppercase animate-fade-up"
              style={{ background: R_DIM, border: `1px solid ${R_BORDER}`, color: R1 }}>
              <Sparkles className="h-3.5 w-3.5" />
              Salones de belleza
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-black tracking-tighter leading-[0.88] mb-7 animate-fade-up-delay-1">
              Tu salón,
              <span className="block"
                style={{ background: `linear-gradient(135deg, ${R1} 0%, ${R2} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                siempre reservado.
              </span>
              <span className="block text-white/22">Sin esfuerzo.</span>
            </h1>

            <p className="text-base sm:text-lg text-white/55 max-w-lg mb-10 animate-fade-up-delay-2 leading-relaxed">
              Software de reservas para salón de belleza. Cabello, uñas, peinados, tratamientos — gestiona citas en línea, múltiples estilistas y horarios desde un solo lugar. Tus clientas agendan 24/7.
            </p>

            <div className="flex flex-wrap gap-3 animate-fade-up-delay-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-bold rounded-full text-white transition-all duration-300 hover:scale-105 hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${R2} 0%, ${R3} 100%)`, boxShadow: `0 0 38px ${R_GLOW}` }}>
                Crea tu perfil gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-medium rounded-full text-white/60 hover:text-white transition-colors"
                style={{ border: `1px solid ${R_BORDER}` }}>
                Ver precios
              </Link>
            </div>

            {/* Service chips */}
            <div className="flex flex-wrap gap-2 mt-12 animate-fade-up-delay-4">
              {['Coloración', 'Corte', 'Manicure', 'Pedicure', 'Peinados', 'Tratamientos', 'Extensiones', 'Mechas', 'Cejas'].map(s => (
                <span key={s}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: R_DIM, border: `1px solid ${R_BORDER}`, color: R1 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: phone mockup ── */}
          <div className="hidden lg:flex items-center justify-center relative h-[600px] select-none" style={{ overflow: 'visible' }}>

            {/* Glow ambiental */}
            <div className="absolute bottom-0 right-[15%] w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${R2} 0%, transparent 70%)` }} />

            {/* Floating badge — nueva reserva */}
            <div className="absolute top-8 right-[3%] z-30 animate-fade-up-delay-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(14,9,32,0.92)', border: `1px solid ${R_BORDER}`, backdropFilter: 'blur(12px)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: R_DIM }}>
                  <Bell className="h-3 w-3" style={{ color: R1 }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white/90 leading-tight">Nueva reserva</p>
                  <p className="text-[9px] text-white/40">Hoy 11:00 AM · Coloración</p>
                </div>
              </div>
            </div>

            {/* Floating pill */}
            <div className="absolute top-[44%] left-[4%] z-30">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold"
                style={{ background: R_DIM, border: `1px solid ${R_BORDER}`, color: R1, backdropFilter: 'blur(8px)' }}>
                <CheckCircle className="h-3 w-3" />
                Sin llamadas
              </div>
            </div>

            {/* ── Phone mockup ── */}
            <div className="absolute bottom-6 right-[2%] z-20 animate-fade-up-delay-2"
              style={{ filter: `drop-shadow(0 24px 48px rgba(0,0,0,0.7)) drop-shadow(0 0 24px ${R_GLOW})` }}>
              <div className="relative w-[210px] rounded-[36px] overflow-hidden"
                style={{
                  background: '#0e0920',
                  border: `1.5px solid rgba(201,106,122,0.35)`,
                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.05)`,
                }}>
                {/* Notch */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-20 h-5 rounded-full" style={{ background: '#080414' }} />
                </div>

                {/* Screen */}
                <div className="px-4 pb-5">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <AuraLogo className="h-4 w-4" color={R1} />
                      <span className="text-[10px] font-display font-bold tracking-wide" style={{ color: R1 }}>aliax.io</span>
                    </div>
                    <Bell className="h-3.5 w-3.5 text-white/30" />
                  </div>

                  {/* Profile cover */}
                  <div className="rounded-xl h-16 mb-3 flex items-end px-3 pb-2 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, #1e1240 0%, #2a1858 100%)` }}>
                    <div className="absolute inset-0 opacity-25"
                      style={{ background: `radial-gradient(circle at 70% 50%, ${R2} 0%, transparent 60%)` }} />
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs text-white relative z-10"
                      style={{ borderColor: R1, background: `linear-gradient(135deg, ${R2}, ${R3})` }}>
                      SE
                    </div>
                    <div className="ml-2 relative z-10">
                      <p className="text-[11px] font-display font-bold text-white leading-tight">Salón Éclat</p>
                      <p className="text-[9px] text-white/50">Estilistas · CDMX</p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-current" style={{ color: R1 }} />
                    ))}
                    <span className="text-[9px] text-white/40 ml-1">4.9 (214 reseñas)</span>
                  </div>

                  {/* Services label */}
                  <p className="text-[9px] font-bold tracking-widest uppercase mb-2 text-white/35">Servicios</p>

                  {/* Service rows */}
                  {[
                    { name: 'Coloración completa', time: '2 h',    price: '$650' },
                    { name: 'Manicure + Pedicure', time: '1.5 h',  price: '$380' },
                    { name: 'Corte + Brushing',    time: '1 h',    price: '$280' },
                    { name: 'Tratamiento keratina', time: '2.5 h', price: '$850' },
                  ].map(({ name, time, price }) => (
                    <div key={name}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <p className="text-[10px] font-semibold text-white/85">{name}</p>
                        <p className="text-[9px] text-white/35">{time}</p>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: R1 }}>{price}</span>
                    </div>
                  ))}

                  {/* CTA */}
                  <button
                    className="w-full mt-4 py-2.5 rounded-full text-[11px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${R2} 0%, ${R3} 100%)` }}>
                    Reservar cita
                  </button>

                  {/* Hours */}
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <Clock className="h-2.5 w-2.5 text-white/25" />
                    <span className="text-[8px] text-white/25">Lun – Sáb · 9:00 – 20:00</span>
                  </div>
                </div>

                {/* Home indicator */}
                <div className="flex justify-center pb-3">
                  <div className="w-14 h-1 rounded-full bg-white/15" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pain → Solution ────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: R1 }}>Reconócelo</p>
          <h2 className="text-3xl sm:text-4xl font-display font-black">El caos que frena a tu salón de belleza</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Pain side */}
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/25 mb-5">Antes de Aliax</p>
            {[
              {
                title: 'Llaman mientras atiendes',
                text: 'Estás aplicando color y el teléfono no para. Interrumpes, la clienta espera, el estrés sube.',
              },
              {
                title: 'Coordinar varios servicios es un caos',
                text: 'Coloración 2h, manicure 1h, peinado 45 min. Cuadrar todo a mano, con varios estilistas, es una pesadilla.',
              },
              {
                title: 'Clientas que "se les pasó"',
                text: 'Sin recordatorios automáticos los no-shows son inevitables. Silla vacía, tiempo perdido, dinero que no llega.',
              },
            ].map(({ title, text }) => (
              <div key={title}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: '#ef4444' }} />
                <div>
                  <h3 className="font-display font-bold text-sm text-white/75 mb-1">{title}</h3>
                  <p className="text-xs text-white/38 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Solution side */}
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: R1, opacity: 0.7 }}>Con Aliax</p>
            {[
              {
                icon: Calendar,
                title: 'Reservas online, siempre abiertas',
                text: 'Tu link funciona 24/7. Las clientas eligen servicio, estilista y horario sin escribirte ni un mensaje.',
              },
              {
                icon: Clock,
                title: 'Agenda inteligente por servicio',
                text: 'Cada servicio tiene su duración exacta. El sistema bloquea el tiempo correcto. Tú solo atiende.',
              },
              {
                icon: Bell,
                title: 'Recordatorios automáticos',
                text: 'WhatsApp 24h antes. La clienta confirma o cancela. Sin que hagas nada extra.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ background: R_DIM, border: `1px solid ${R_BORDER}` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201,106,122,0.22)' }}>
                  <Icon className="h-4 w-4" style={{ color: R1 }} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm mb-1" style={{ color: R1 }}>{title}</h3>
                  <p className="text-xs text-white/52 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-20"
        style={{ background: `linear-gradient(180deg, transparent, rgba(201,106,122,0.05), transparent)` }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: R1 }}>Así de fácil</p>
            <h2 className="text-3xl sm:text-4xl font-display font-black">Configura tu agenda online en 3 pasos</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01', icon: Zap,
                title: 'Crea tu salón',
                text: 'Regístrate y configura servicios, estilistas y horarios. Menos de 5 minutos.',
              },
              {
                step: '02', icon: Smartphone,
                title: 'Comparte tu link de reservas',
                text: 'Tu link de citas online con el nombre de tu salón. En Instagram, WhatsApp, Google Maps — donde ya están tus clientas.',
              },
              {
                step: '03', icon: Heart,
                title: 'Disfruta tu salón organizado',
                text: 'Las reservas llegan solas a tu agenda online. Tú y tu equipo se enfocan en lo que importa: hacer sentir especiales a sus clientas.',
              },
            ].map(({ step, icon: Icon, title, text }) => (
              <div key={step}
                className="text-center p-8 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                style={{ background: R_DIM, border: `1px solid ${R_BORDER}` }}>
                {/* Step number */}
                <div className="text-6xl font-display font-black mb-4 leading-none select-none"
                  style={{ color: R2, opacity: 0.22 }}>
                  {step}
                </div>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto -mt-10 mb-5 relative z-10"
                  style={{ background: `linear-gradient(135deg, ${R2} 0%, ${R3} 100%)`, boxShadow: `0 0 26px ${R_GLOW}` }}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-white/48 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ──────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: R1 }}>Herramientas pensadas para ti</p>
          <h2 className="text-3xl sm:text-4xl font-display font-black">Sistema de citas diseñado para salones de belleza y estéticas</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Users,
              title: 'Múltiples estilistas',
              text: 'Cada estilista tiene su agenda propia. Las clientas eligen con quién quieren su cita, sin confusiones.',
            },
            {
              icon: Scissors,
              title: 'Catálogo completo',
              text: 'Cabello, uñas, peinados, cejas — todos los servicios con foto, descripción, precio y duración.',
            },
            {
              icon: Bell,
              title: 'Recordatorios automáticos',
              text: 'WhatsApp 24h antes. Drástica reducción de no-shows sin que levantes un dedo.',
            },
            {
              icon: Calendar,
              title: 'Agenda en tiempo real',
              text: 'Ve las citas del día, por estilista, en un calendario claro. Desde tu celular, en cualquier momento.',
            },
            {
              icon: CheckCircle,
              title: 'Confirmaciones al instante',
              text: 'Clienta reserva → recibe confirmación inmediata. Sin mensajes de ida y vuelta para confirmar.',
            },
            {
              icon: Star,
              title: 'Perfil profesional',
              text: 'Una página elegante con tu salón, servicios, galería y reseñas. La imagen que tu negocio merece.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="p-6 rounded-2xl cursor-default transition-all duration-300 hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.background = R_DIM; e.currentTarget.style.borderColor = R_BORDER; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: R_DIM, border: `1px solid ${R_BORDER}` }}>
                <Icon className="h-5 w-5" style={{ color: R1 }} />
              </div>
              <h3 className="font-display font-bold mb-2">{title}</h3>
              <p className="text-sm text-white/42 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonial ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-20 max-w-3xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl relative overflow-hidden"
          style={{ background: R_DIM, border: `1px solid ${R_BORDER}` }}>
          {/* Gradient top line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(to right, transparent, ${R1}, transparent)` }} />
          <div className="flex justify-center mb-5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-current" style={{ color: R1 }} />
            ))}
          </div>
          <blockquote className="text-base sm:text-lg text-white/75 leading-relaxed mb-7 italic text-center">
            "Tengo 3 estilistas y antes la agenda era un desastre. Ahora cada quien tiene su link, las clientas reservan directo con quien quieren, y los recordatorios bajaron los no-shows a casi cero. No sé cómo vivíamos antes."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
              style={{ background: `linear-gradient(135deg, ${R2}, ${R3})` }}>
              LV
            </div>
            <div>
              <div className="font-display font-bold text-sm">Laura V.</div>
              <div className="text-xs text-white/35">Salón Éclat, Ciudad de México</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-28 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 blur-[130px] opacity-14"
            style={{ background: `radial-gradient(circle at 50% 60%, ${R2} 0%, transparent 55%)` }} />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <Sparkles className="h-8 w-8 mx-auto mb-6 opacity-55" style={{ color: R1 }} />
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black mb-6 leading-[0.92]">
            Tu salón merece<br />
            <span style={{ background: `linear-gradient(135deg, ${R1} 0%, ${R2} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              una agenda a su altura.
            </span>
          </h2>
          <p className="text-white/45 text-base sm:text-lg mb-10 max-w-md mx-auto">
            El software de reservas para salones de belleza más fácil de usar. Sin tarjeta de crédito. Sin contrato.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded-full text-white transition-all duration-300 hover:scale-105 hover:brightness-110"
            style={{ background: `linear-gradient(135deg, ${R2} 0%, ${R3} 100%)`, boxShadow: `0 0 56px ${R_GLOW}` }}>
            Crear mi perfil gratis
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 lg:px-12 py-8 max-w-7xl mx-auto"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <AuraLogo className="h-6 w-6 transition-transform duration-500 group-hover:rotate-90" color="rgba(232,180,184,0.55)" />
            <span className="text-sm font-display text-white/50">Aliax.io</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/28">
            <Link to="/pricing"    className="hover:text-white/60 transition-colors">Precios</Link>
            <Link to="/privacidad" className="hover:text-white/60 transition-colors">Privacidad</Link>
            <Link to="/barberia"   className="hover:text-white/60 transition-colors">Para barberías</Link>
          </div>
          <p className="text-xs text-white/20">© 2025 Aliax.io</p>
        </div>
      </footer>

    </div>
  );
}
