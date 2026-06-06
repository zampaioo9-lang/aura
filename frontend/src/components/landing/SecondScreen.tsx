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

      {/* Cylindrical drum */}
      <CylindricalDrum scrollProgress={scrollProgress} />

      {/* Right panel */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-[35%] md:w-[40%] flex flex-col items-start justify-center pr-6 sm:pr-12 md:pr-20 pl-6 sm:pl-0 z-40 pointer-events-auto">
        <div className="flex flex-col gap-8 w-full max-w-[280px]">
          {/* Stats */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[#2dd4bf] text-[42px] font-bold leading-none" style={{ fontFamily: 'Michroma, sans-serif' }}>+300</p>
              <p className="text-white/50 text-[13px] mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>especialistas disponibles</p>
            </div>
            <div>
              <p className="text-white text-[42px] font-bold leading-none" style={{ fontFamily: 'Michroma, sans-serif' }}>★ 4.9</p>
              <p className="text-white/50 text-[13px] mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>calificación promedio</p>
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
