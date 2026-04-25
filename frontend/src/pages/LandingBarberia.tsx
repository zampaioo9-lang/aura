import { Link } from 'react-router-dom';
import {
  Scissors, Calendar, Bell, Clock, Star, Users,
  Smartphone, CheckCircle, ArrowRight, Zap, TrendingUp, Phone, X,
} from 'lucide-react';

// ── Brand / accent tokens ──────────────────────────────────────────────────
const G1 = '#E8B84B';          // gold bright
const G2 = '#C9912A';          // gold dark
const G_DIM = 'rgba(232,184,75,0.10)';
const G_BORDER = 'rgba(232,184,75,0.22)';
const G_GLOW = 'rgba(232,184,75,0.30)';
const PURPLE = 'rgb(147,51,234)';

function AuraLogo({ className = '', color = G1 }: { className?: string; color?: string }) {
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

// ── Reusable divider ───────────────────────────────────────────────────────
function GoldDivider() {
  return (
    <div className="flex justify-center my-4">
      <div className="flex flex-col items-center gap-1">
        <div className="w-px h-10" style={{ background: `linear-gradient(to bottom, transparent, ${G1})` }} />
        <ArrowRight className="h-4 w-4 rotate-90" style={{ color: G1 }} />
      </div>
    </div>
  );
}

export default function LandingBarberia() {
  return (
    <div className="grain-overlay bg-aura-950 text-white font-body min-h-screen relative overflow-hidden">

      {/* ── Ambient background ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Gold pulse — top right */}
        <div className="absolute -top-24 -right-24 w-[560px] h-[560px] rounded-full blur-[130px] opacity-20"
          style={{ background: `radial-gradient(circle, ${G2} 0%, transparent 70%)` }} />
        {/* Purple pulse — bottom left */}
        <div className="absolute bottom-0 -left-20 w-[480px] h-[480px] rounded-full blur-[120px] opacity-15"
          style={{ background: `radial-gradient(circle, ${PURPLE} 0%, transparent 70%)` }} />
        {/* Tight grid lines */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />
        {/* Diagonal slash accent */}
        <div className="absolute top-0 right-[10%] w-px h-full opacity-10 rotate-[20deg] origin-top"
          style={{ background: `linear-gradient(to bottom, transparent 0%, ${G1} 40%, ${G1} 60%, transparent 100%)` }} />
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto animate-fade-up">
        <Link to="/" className="flex items-center gap-2.5 group">
          <AuraLogo className="h-8 w-8 transition-transform duration-500 group-hover:rotate-90" />
          <span className="text-xl font-display text-white tracking-wide">Aliax.io</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/pricing" className="text-sm font-medium text-white/40 hover:text-white transition-colors hidden md:block">Precios</Link>
          <Link to="/login" className="text-sm font-medium text-white/40 hover:text-white transition-colors hidden md:block">Iniciar sesión</Link>
          <Link
            to="/register"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded text-aura-950 transition-all duration-300 hover:brightness-110 hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${G1} 0%, ${G2} 100%)`, boxShadow: `0 0 18px ${G_GLOW}` }}>
            Comenzar gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 pt-14 pb-24 max-w-7xl mx-auto">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* ── Left: text ── */}
          <div className="relative" style={{ zIndex: 1 }}>
            {/* Niche badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm mb-8 text-[11px] font-bold tracking-[0.12em] uppercase animate-fade-up"
              style={{ background: G_DIM, border: `1px solid ${G_BORDER}`, color: G1 }}>
              <Scissors className="h-3.5 w-3.5" />
              Barberías &amp; estilistas
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-black tracking-tighter leading-[0.88] mb-7 animate-fade-up-delay-1">
              Tu barbería,
              <span className="block" style={{ WebkitTextStroke: `2px ${G1}`, color: 'transparent' }}>
                siempre llena.
              </span>
              <span className="block text-white/25">Sin llamadas.</span>
            </h1>

            <p className="text-base sm:text-lg text-white/55 max-w-lg mb-10 animate-fade-up-delay-2 leading-relaxed">
              Sistema de reservas en línea para barberías. Tus clientes agendan su cita 24/7 desde el celular — sin llamarte. Confirmaciones y recordatorios automáticos que reducen los no-shows hasta un 65%.
            </p>

            <div className="flex flex-wrap gap-3 animate-fade-up-delay-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-bold rounded text-aura-950 transition-all duration-300 hover:scale-105 hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${G1} 0%, ${G2} 100%)`, boxShadow: `0 0 36px ${G_GLOW}` }}>
                Crea tu perfil gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-medium rounded text-white/60 hover:text-white transition-colors"
                style={{ border: `1px solid rgba(255,255,255,0.13)` }}>
                Ver precios
              </Link>
            </div>

            {/* Stats strip */}
            <div className="flex flex-wrap gap-10 mt-8 pt-8 animate-fade-up-delay-4"
              style={{ borderTop: `1px solid ${G_BORDER}` }}>
              {[
                { val: '24/7', lbl: 'Reservas online' },
                { val: '−65%', lbl: 'Menos no-shows' },
                { val: '5 min', lbl: 'Para configurar' },
                { val: '$0', lbl: 'Para empezar' },
              ].map(({ val, lbl }) => (
                <div key={lbl}>
                  <div className="text-2xl sm:text-3xl font-display font-black" style={{ color: G1 }}>{val}</div>
                  <div className="text-xs text-white/35 mt-0.5 tracking-wide">{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: visual fusion ── */}
          <div className="hidden lg:flex items-end justify-center relative h-[600px] select-none" style={{ overflow: 'visible' }}>

            {/* Glow ambiental */}
            <div className="absolute bottom-[-5%] left-[20%] w-80 h-80 rounded-full blur-[100px] opacity-25 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${G2} 0%, transparent 70%)` }} />

            {/* ── Barber photo — PNG sin fondo + fade bottom ── */}
            <style>{`
              @keyframes barberFloat {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-6px); }
              }
              .barber-img {
                mask-image: linear-gradient(to bottom,
                  black 0%,
                  black 62%,
                  rgba(0,0,0,0.85) 72%,
                  rgba(0,0,0,0.4)  82%,
                  transparent 93%
                );
                -webkit-mask-image: linear-gradient(to bottom,
                  black 0%,
                  black 62%,
                  rgba(0,0,0,0.85) 72%,
                  rgba(0,0,0,0.4)  82%,
                  transparent 93%
                );
                animation: barberFloat 7s ease-in-out infinite;
              }
            `}</style>

            {/*
              Centro-derecha del hero, alineado con la mitad del mockup.
              - Sin objectFit ni height fijo → imagen a proporciones naturales, nunca recorta caras
              - width 420px (más grande que screenshot 16 ~330px)
              - top: 20% → centro de imagen queda ~20% + altura_natural/2 ≈ mitad del teléfono
              - left: 18% dentro de la columna derecha → centro-derecha del hero completo
            */}
            <div
              className="pointer-events-none"
              style={{
                position: 'absolute',
                top: '18%',
                left: '-12%',
                width: '420px',
                zIndex: 999,
                overflow: 'visible',
              }}
            >
              <img
                src="/barbero-nobg.png"
                alt="Barbero profesional usando sistema de reservas en línea para barbería"
                className="barber-img"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  filter: 'brightness(0.92) contrast(1.06) drop-shadow(0 8px 32px rgba(0,0,0,0.6))',
                }}
              />
            </div>

            {/* ── Phone mockup ── */}
            <div className="absolute bottom-6 right-[2%] z-20 animate-fade-up-delay-2"
              style={{ filter: `drop-shadow(0 24px 48px rgba(0,0,0,0.7)) drop-shadow(0 0 24px ${G_GLOW})` }}>
              {/* Phone frame */}
              <div className="relative w-[210px] rounded-[36px] overflow-hidden"
                style={{
                  background: '#0e0920',
                  border: `1.5px solid rgba(232,184,75,0.35)`,
                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.05)`,
                }}>
                {/* Notch */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-20 h-5 rounded-full" style={{ background: '#080414' }} />
                </div>

                {/* Screen content */}
                <div className="px-4 pb-5">

                  {/* Aliax header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <AuraLogo className="h-4 w-4" color={G1} />
                      <span className="text-[10px] font-display font-bold tracking-wide" style={{ color: G1 }}>aliax.io</span>
                    </div>
                    <Bell className="h-3.5 w-3.5 text-white/30" />
                  </div>

                  {/* Profile cover */}
                  <div className="rounded-xl h-16 mb-3 flex items-end px-3 pb-2 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, #1e1240 0%, #2a1858 100%)` }}>
                    <div className="absolute inset-0 opacity-20"
                      style={{ background: `radial-gradient(circle at 70% 50%, ${G2} 0%, transparent 60%)` }} />
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs text-aura-950 relative z-10"
                      style={{ borderColor: G1, background: `linear-gradient(135deg, ${G1}, ${G2})` }}>
                      CM
                    </div>
                    <div className="ml-2 relative z-10">
                      <p className="text-[11px] font-display font-bold text-white leading-tight">Carlos Mendoza</p>
                      <p className="text-[9px] text-white/50">Barbería del Norte</p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-current" style={{ color: G1 }} />
                    ))}
                    <span className="text-[9px] text-white/40 ml-1">4.9 (138 reseñas)</span>
                  </div>

                  {/* Services label */}
                  <p className="text-[9px] font-bold tracking-widest uppercase mb-2 text-white/35">Servicios</p>

                  {/* Service rows */}
                  {[
                    { name: 'Corte clásico',  time: '30 min', price: '$120' },
                    { name: 'Fade gradual',   time: '45 min', price: '$150' },
                    { name: 'Barba completa', time: '30 min', price: '$100' },
                  ].map(({ name, time, price }) => (
                    <div key={name}
                      className="flex items-center justify-between py-2"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <p className="text-[10px] font-semibold text-white/85">{name}</p>
                        <p className="text-[9px] text-white/35">{time}</p>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: G1 }}>{price}</span>
                    </div>
                  ))}

                  {/* CTA button */}
                  <button
                    className="w-full mt-4 py-2.5 rounded-lg text-[11px] font-bold text-aura-950"
                    style={{ background: `linear-gradient(135deg, ${G1} 0%, ${G2} 100%)` }}>
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

            {/* Floating notification badge — sobre la foto, arriba derecha */}
            <div className="absolute top-8 right-[3%] z-30 animate-fade-up-delay-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(14,9,32,0.92)', border: `1px solid ${G_BORDER}`, backdropFilter: 'blur(12px)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: G_DIM }}>
                  <Bell className="h-3 w-3" style={{ color: G1 }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white/90 leading-tight">Nueva reserva</p>
                  <p className="text-[9px] text-white/40">Hoy 3:30 PM · Corte</p>
                </div>
              </div>
            </div>

            {/* Floating "sin llamadas" pill — sobre la foto, zona media izquierda */}
            <div className="absolute top-[46%] left-[4%] z-30">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold"
                style={{ background: G_DIM, border: `1px solid ${G_BORDER}`, color: G1, backdropFilter: 'blur(8px)' }}>
                <CheckCircle className="h-3 w-3" />
                Sin llamadas
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pain points ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: G1 }}>El problema de siempre</p>
          <h2 className="text-3xl sm:text-4xl font-display font-black">¿Por qué tu barbería necesita una agenda online?</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-4">
          {[
            {
              icon: Phone,
              title: 'El teléfono no para',
              text: 'Estás en pleno corte y entra una llamada. Paras, contestas, pierdes el ritmo. Pasa 10 veces al día.',
            },
            {
              icon: Clock,
              title: 'No-shows sin aviso',
              text: 'Un cliente que no llega es dinero a la basura. Sin recordatorio automático, pasa más seguido de lo que crees.',
            },
            {
              icon: Users,
              title: 'La agenda en tu cabeza',
              text: 'En papel, en WhatsApp, de memoria. Un error y tienes dos clientes llegando a la misma hora.',
            },
          ].map(({ title, text }) => (
            <div key={title} className="p-6 rounded-sm"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <X className="h-3.5 w-3.5 text-red-400" />
                </div>
                <h3 className="font-display font-bold text-white/75 pt-0.5">{title}</h3>
              </div>
              <p className="text-sm text-white/38 leading-relaxed pl-10">{text}</p>
            </div>
          ))}
        </div>

        <GoldDivider />

        <div className="grid md:grid-cols-3 gap-5 mt-4">
          {[
            {
              icon: Calendar,
              title: 'Citas en línea para tu barbería, 24/7',
              text: 'Tu link de Aliax funciona siempre. Los clientes reservan desde el celular cuando quieren — incluso a las 11 de la noche.',
            },
            {
              icon: Bell,
              title: 'Recordatorios automáticos',
              text: 'Tu sistema de reservas avisa 24h antes por WhatsApp. Menos no-shows. Más ingresos. Sin que toques nada.',
            },
            {
              icon: Smartphone,
              title: 'Agenda digital para barberos',
              text: 'Toda tu agenda online en un solo lugar, en tiempo real. Siempre actualizada, siempre en tu bolsillo.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="p-6 rounded-sm"
              style={{ background: G_DIM, border: `1px solid ${G_BORDER}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(232,184,75,0.18)', border: `1px solid ${G_BORDER}` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: G1 }} />
                </div>
                <h3 className="font-display font-bold" style={{ color: G1 }}>{title}</h3>
              </div>
              <p className="text-sm text-white/55 leading-relaxed pl-10">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-20"
        style={{ background: `linear-gradient(180deg, transparent, rgba(201,145,42,0.06), transparent)` }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: G1 }}>Simple y rápido</p>
            <h2 className="text-3xl sm:text-4xl font-display font-black">Configura tu agenda online en 5 minutos</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line — desktop only */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px"
              style={{ background: `linear-gradient(to right, ${G2}, ${G1}, ${G2})`, opacity: 0.35 }} />

            {[
              { step: '01', icon: Zap, title: 'Crea tu perfil', text: 'Regístrate, agrega servicios, precios y tu horario. Toma menos de 5 minutos.' },
              { step: '02', icon: Smartphone, title: 'Comparte tu link de reservas', text: 'Tu link personal de citas en línea. Ponlo en Instagram, WhatsApp, Google Maps — donde tus clientes ya estén.' },
              { step: '03', icon: TrendingUp, title: 'Recibe reservas automáticas', text: 'Los clientes agendan solos en tu sistema de citas. Tú solo enfócate en cortar bien.' },
            ].map(({ step, icon: Icon, title, text }) => (
              <div key={step} className="flex flex-col items-center text-center gap-4">
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center z-10"
                  style={{ background: `linear-gradient(135deg, ${G2} 0%, ${G1} 100%)`, boxShadow: `0 0 32px ${G_GLOW}` }}>
                  <Icon className="h-7 w-7 text-aura-950" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center"
                    style={{ background: '#080414', color: G1, border: `1px solid ${G2}` }}>
                    {step}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg mb-1.5">{title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ──────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-3" style={{ color: G1 }}>Todo incluido</p>
          <h2 className="text-3xl sm:text-4xl font-display font-black">Software de reservas hecho para barberías</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Scissors,     title: 'Múltiples servicios',   text: 'Corte, fade, barba, tratamientos — todos con duración y precio propios.' },
            { icon: Clock,        title: 'Horarios a tu medida',  text: 'Días, horas y descansos. Tu agenda trabaja según tus reglas, sin excepciones.' },
            { icon: Bell,         title: 'Recordatorios WhatsApp', text: 'Avisos 24h antes. Tus clientes confirman o cancelan sin molestarte.' },
            { icon: Star,         title: 'Perfil profesional',    text: 'Página con foto, servicios y reseñas. Causa buena impresión desde el primer clic.' },
            { icon: Calendar,     title: 'Sin sobreagendas',      text: 'El sistema bloquea automáticamente. Imposible tener dos clientes al mismo tiempo.' },
            { icon: CheckCircle,  title: 'Confirmación al instante', text: 'Reserva → confirmación inmediata. Para ti y para el cliente. Sin WhatsApps de ida y vuelta.' },
            { icon: Users,        title: 'Historial de clientes', text: 'Quién te visita, con qué frecuencia, qué servicio pide. Conoce mejor a tu clientela.' },
            { icon: TrendingUp,   title: 'Análisis de negocio',   text: 'Citas del mes, servicios más pedidos, ingresos estimados. Todo en un vistazo.' },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="p-5 rounded-sm cursor-default transition-all duration-300 hover:scale-[1.02]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.background = G_DIM; e.currentTarget.style.borderColor = G_BORDER; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
              <Icon className="h-5 w-5 mb-3" style={{ color: G1 }} />
              <h3 className="font-display font-bold text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonial ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-20 max-w-3xl mx-auto">
        <div className="p-8 sm:p-12 rounded-sm relative overflow-hidden"
          style={{ background: G_DIM, border: `1px solid ${G_BORDER}` }}>
          {/* Top gold line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(to right, transparent, ${G1}, transparent)` }} />
          <div className="flex justify-center mb-5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-current" style={{ color: G1 }} />
            ))}
          </div>
          <blockquote className="text-base sm:text-lg text-white/75 leading-relaxed mb-7 italic text-center">
            "Antes perdía 30 minutos al día contestando llamadas para agendar. Ahora los clientes reservan solos y yo solo me enfoco en cortar. El no-show bajó como un 70%. No me arrepiento."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-aura-950"
              style={{ background: `linear-gradient(135deg, ${G1}, ${G2})` }}>
              MR
            </div>
            <div>
              <div className="font-display font-bold text-sm">Miguel R.</div>
              <div className="text-xs text-white/35">Barbería Tres Reyes, Guadalajara</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-12 py-28 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 blur-[120px] opacity-18"
            style={{ background: `radial-gradient(circle at 50% 60%, ${G2} 0%, transparent 55%)` }} />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm mb-6 text-[11px] font-bold tracking-[0.12em] uppercase"
            style={{ background: G_DIM, border: `1px solid ${G_BORDER}`, color: G1 }}>
            <Zap className="h-3.5 w-3.5" /> Gratis para empezar
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black mb-6 leading-[0.92]">
            Llena tu barbería.<br />
            <span style={{ color: G1 }}>Empieza hoy.</span>
          </h2>
          <p className="text-white/45 text-base sm:text-lg mb-10 max-w-md mx-auto">
            El sistema de reservas para barberías más fácil de configurar. Sin tarjeta de crédito. Sin contrato.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded text-aura-950 transition-all duration-300 hover:scale-105 hover:brightness-110"
            style={{ background: `linear-gradient(135deg, ${G1} 0%, ${G2} 100%)`, boxShadow: `0 0 54px ${G_GLOW}` }}>
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
            <AuraLogo className="h-6 w-6 transition-transform duration-500 group-hover:rotate-90" color="rgba(232,184,75,0.6)" />
            <span className="text-sm font-display text-white/50">Aliax.io</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/28">
            <Link to="/pricing"    className="hover:text-white/60 transition-colors">Precios</Link>
            <Link to="/privacidad" className="hover:text-white/60 transition-colors">Privacidad</Link>
            <Link to="/salon"      className="hover:text-white/60 transition-colors">Para salones</Link>
          </div>
          <p className="text-xs text-white/20">© 2025 Aliax.io</p>
        </div>
      </footer>

    </div>
  );
}
