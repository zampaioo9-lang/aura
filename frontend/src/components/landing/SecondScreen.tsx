// frontend/src/components/landing/SecondScreen.tsx
import { Link } from 'react-router-dom';
import CylindricalDrum from './CylindricalDrum';

interface Props {
  scrollProgress: number;
  lerpedProgress: number;
}

const c01 = (v: number) => Math.max(0, Math.min(1, v));

const SPECIALTIES = [
  'Psicólogos', 'Terapeutas de Pareja', 'Neuropsicólogos',
  'Coaches de Vida', 'Terapeutas Infantiles', 'Ansiedad y Estrés',
  'Terapia Cognitivo-Conductual', 'Mindfulness',
];

// Mobile preview cards — keep in sync with CylindricalDrum professionals
const MOBILE_PROS = [
  { name: 'Dra. Sofía Ramírez',    specialty: 'Ansiedad · TCC',     location: 'Ciudad de México', rating: 4.9, initials: 'SR', color: '#2dd4bf' },
  { name: 'Psic. Marcos López',    specialty: 'Terapia de Pareja',  location: 'Monterrey',        rating: 4.8, initials: 'ML', color: '#7c3aed' },
  { name: 'Dra. Valentina Castro', specialty: 'Trauma · EMDR',      location: 'Bogotá',           rating: 5.0, initials: 'VC', color: '#0d9488' },
  { name: 'Psic. Alejandro Ríos',  specialty: 'Estrés · Burnout',   location: 'Buenos Aires',     rating: 4.7, initials: 'AR', color: '#6366f1' },
];

export default function SecondScreen({ scrollProgress, lerpedProgress }: Props) {
  const sp = c01((lerpedProgress - 0.65) / 0.25);
  const eased = 1 - Math.pow(1 - sp, 3);

  return (
    <div
      className="absolute bottom-0 left-0 w-full h-full rounded-t-[48px] overflow-hidden z-40"
      style={{
        background: 'linear-gradient(160deg, #0f0a1a 0%, #1a0830 100%)',
        transform: `translateY(${(1 - eased) * 100}%)`,
        visibility: sp > 0 ? 'visible' : 'hidden',
        willChange: 'transform',
      }}
    >
      {/* Grab handle */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-16 h-[5px] bg-white/20 rounded-full z-50 pointer-events-none" />

      {/* Teal glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2dd4bf 0%, transparent 70%)' }} />

      {/* Drum — desktop/tablet only */}
      <CylindricalDrum scrollProgress={scrollProgress} />

      {/* Right panel */}
      <div className="absolute inset-0 sm:inset-y-0 sm:left-auto sm:right-0 w-full sm:w-[35%] md:w-[40%] flex flex-col items-start justify-start sm:justify-center pr-6 sm:pr-12 md:pr-20 pl-6 sm:pl-0 z-40 pointer-events-auto overflow-y-auto sm:overflow-visible pt-12 sm:pt-0 pb-20 sm:pb-0">
        <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-full sm:max-w-[280px]">

          {/* Mobile-only: professional cards preview */}
          <div className="sm:hidden flex flex-col gap-[10px] w-full">
            {MOBILE_PROS.map(pro => (
              <div
                key={pro.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '10px 14px',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', background: pro.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13, color: '#0a1f2e',
                  flexShrink: 0, position: 'relative',
                }}>
                  {pro.initials}
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '2px solid #0f0a1a' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pro.name} <span style={{ color: '#2dd4bf', fontSize: 11 }}>✓</span>
                  </p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: '#2dd4bf', margin: '2px 0 0' }}>{pro.specialty}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0, whiteSpace: 'nowrap' }}>{pro.location}</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#fff', fontWeight: 600, margin: '2px 0 0' }}>★ {pro.rating}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[#2dd4bf] text-[34px] sm:text-[42px] font-bold leading-none" style={{ fontFamily: 'Michroma, sans-serif' }}>
                Gratis
              </p>
              <p className="text-white/50 text-[13px] mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Crea tu perfil de psicólogo sin costo
              </p>
            </div>
            <div>
              <p className="text-white text-[34px] sm:text-[42px] font-bold leading-none" style={{ fontFamily: 'Michroma, sans-serif' }}>
                Sin esperas
              </p>
              <p className="text-white/50 text-[13px] mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Conecta con tu terapeuta desde hoy
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link
              to="/explorar"
              className="w-full text-center py-3.5 px-6 rounded-2xl font-semibold text-[14px] text-[#0f0a1a] bg-[#2dd4bf] hover:bg-white transition-colors duration-300"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Ver terapeutas →
            </Link>
            <Link
              to="/pricing"
              className="w-full text-center py-3.5 px-6 rounded-2xl font-semibold text-[14px] text-white border border-white/20 hover:border-[#2dd4bf] hover:text-[#2dd4bf] transition-colors duration-300"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Ver planes
            </Link>
          </div>
        </div>
      </div>

      {/* Specialty marquee */}
      <div className="absolute bottom-8 left-0 w-full sm:w-[65%] md:w-[60%] pl-6 sm:pl-12 md:pl-20 pr-6 z-50 pointer-events-none">
        <div className="border-t border-white/[0.08] pt-5">
          <div className="marquee-container" style={{
            maskImage: 'linear-gradient(to right, transparent, white 15%, white 85%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 15%, white 85%, transparent)',
          }}>
            <div className="marquee-track" style={{ gap: '60px', animationDuration: '22s' }}>
              {[...SPECIALTIES, ...SPECIALTIES].map((s, i) => (
                <span key={i} className="text-white/40 text-[11px] uppercase tracking-[0.2em] whitespace-nowrap"
                  style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
