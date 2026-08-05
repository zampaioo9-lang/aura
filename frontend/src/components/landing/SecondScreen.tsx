import { Link } from 'react-router-dom';
import CylindricalDrum from './CylindricalDrum';

interface Props {
  scrollProgress: number;
  lerpedProgress: number;
}

const c01 = (v: number) => Math.max(0, Math.min(1, v));

const SPECIALTIES = [
  'Psicólogos', 'Terapeutas de Pareja', 'Neuropsicólogos',
  'Terapeutas Infantiles', 'Ansiedad y Estrés',
  'Terapia Cognitivo-Conductual', 'Mindfulness',
];

export default function SecondScreen({ scrollProgress, lerpedProgress }: Props) {
  const sp    = c01((lerpedProgress - 0.65) / 0.25);
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

      {/* Drum — mobile: top 50%, desktop: left 60% full height */}
      <CylindricalDrum scrollProgress={scrollProgress} />

      {/* Divider line — mobile only, separates drum from stats */}
      <div className="sm:hidden absolute left-4 right-4 border-t border-white/10 z-30 pointer-events-none" style={{ top: 'calc(50% + 40px)' }} />

      {/* Right panel
          mobile:   bottom 48% of the panel (below the drum)
          desktop:  right 35-40%, full height, vertically centered  */}
      <div className="absolute bottom-0 left-0 right-0 h-[48%] sm:h-auto sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[35%] md:w-[40%] flex flex-col items-start justify-center pr-6 sm:pr-12 md:pr-20 pl-6 sm:pl-0 z-40 pointer-events-auto overflow-hidden sm:overflow-visible pt-4 sm:pt-0 pb-4 sm:pb-0">
        <div className="flex flex-col gap-3 sm:gap-8 w-full max-w-full sm:max-w-[360px]">

          {/* Stats + features */}
          <div className="flex flex-col gap-3 sm:gap-5">
            {/* Gratis */}
            <div>
              <p className="text-[#2dd4bf] text-[28px] sm:text-[42px] font-bold leading-none" style={{ fontFamily: 'Manrope, sans-serif' }}>Gratis</p>
              <p className="text-white/50 text-[12px] sm:text-[13px] mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>Crea tu perfil de psicólogo sin costo</p>
            </div>

            {/* Feature: Posición destacada */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: '#2dd4bf', fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>◆</span>
              <div>
                <p className="text-white font-bold leading-snug" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(13px,1.4vw,18px)', margin: 0 }}>
                  Posición destacada en el directorio
                </p>
                <p className="text-white/45 text-[11px] sm:text-[12px] mt-[2px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Aparece primero en búsquedas por especialidad
                </p>
              </div>
            </div>

            {/* Feature: Historia Clínica */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: '#2dd4bf', fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>◆</span>
              <div>
                <p className="text-white font-bold leading-snug" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(13px,1.4vw,18px)', margin: 0 }}>
                  Historia Clínica Individual y de Pareja
                </p>
                <p className="text-white/45 text-[11px] sm:text-[12px] mt-[2px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Expediente digital completo incluido
                </p>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <Link
              to="/explorar"
              className="w-full text-center py-3 sm:py-3.5 px-6 rounded-2xl font-semibold text-[13px] sm:text-[14px] text-[#0f0a1a] bg-[#2dd4bf] hover:bg-white transition-colors duration-300"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Ver terapeutas →
            </Link>
            <Link
              to="/pricing"
              className="w-full text-center py-3 sm:py-3.5 px-6 rounded-2xl font-semibold text-[13px] sm:text-[14px] text-white border border-white/20 hover:border-[#2dd4bf] hover:text-[#2dd4bf] transition-colors duration-300"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Ver planes
            </Link>
          </div>
        </div>
      </div>

      {/* Specialty marquee — desktop/tablet only */}
      <div className="hidden sm:block absolute bottom-8 left-0 w-[65%] md:w-[60%] pl-12 md:pl-20 pr-6 z-50 pointer-events-none">
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
