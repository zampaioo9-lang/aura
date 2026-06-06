// frontend/src/pages/Landing.tsx
import { useLandingScroll } from '../hooks/useLandingScroll';
import LandingHeader from '../components/landing/LandingHeader';
import HeroAvatar from '../components/landing/HeroAvatar';
import HeroTitle from '../components/landing/HeroTitle';
import SoapTiles from '../components/landing/SoapTiles';
import SecondScreen from '../components/landing/SecondScreen';

const c01 = (v: number) => Math.max(0, Math.min(1, v));

export default function Landing() {
  const { scrollProgress, lerpedProgress, navigateTo } = useLandingScroll();

  // First screen blur as second screen rises
  const sp = c01((lerpedProgress - 1.15) / 0.50);
  const blur = Math.sin(sp * Math.PI / 2) * 64;

  return (
    <main className="relative w-screen h-screen overflow-hidden text-white">
      <div className="relative w-full h-full overflow-hidden">

        {/* FIRST SCREEN */}
        <div
          className="absolute inset-0 w-full h-full z-10"
          style={{ filter: sp > 0 ? `blur(${blur}px)` : 'none' }}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1040] via-[#0e2633] to-[#0a1a1a]" />

          {/* Teal glow top-right */}
          <div
            className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #2dd4bf 0%, transparent 70%)' }}
          />
          {/* Purple glow bottom-left */}
          <div
            className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
          />

          {/* SVG noise filter for shiny headline */}
          <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
            <defs>
              <filter id="aliax-noise">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
                <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
                <feComposite in2="SourceGraphic" operator="in" result="noise" />
                <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
              </filter>
            </defs>
          </svg>

          {/* Hero copy */}
          <div className="absolute left-[5%] md:left-[11%] top-[18%] md:top-1/2 md:-translate-y-[55%] flex flex-col gap-2 md:gap-3 z-20 pointer-events-none w-[58%] md:max-w-[40%]">
            <p
              className="text-[#2dd4bf] text-[9px] md:text-[11px] uppercase tracking-[0.2em] font-medium whitespace-nowrap"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Directorio · México &amp; LATAM
            </p>
            <h1
              className="text-white font-bold"
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 'clamp(40px, 5.4vw, 72px)',
                letterSpacing: '-0.035em',
                lineHeight: 1.0,
                margin: '0 0 8px',
              }}
            >
              <span style={{ display: 'block' }}>Psicólogos que</span>
              <span style={{ display: 'block' }}>ya están siendo</span>
              <span className="text-shimmer-teal">
                encontrados
              </span>
            </h1>
            <p
              className="text-white/60 text-[11px] md:text-[15px] leading-relaxed hidden sm:block"
              style={{ fontFamily: 'Manrope, sans-serif', maxWidth: 360 }}
            >
              El directorio gratuito para psicólogos y psicoterapeutas en Latinoamérica.
              Aparece por enfoque terapéutico, ciudad y modalidad.
            </p>
          </div>

          <HeroAvatar scrollProgress={Math.min(1, lerpedProgress)} />
          <SoapTiles scrollProgress={lerpedProgress} />
          <HeroTitle scrollProgress={Math.min(1, lerpedProgress)} />
        </div>

        {/* Header always on top */}
        <LandingHeader onNavigate={navigateTo} />

        {/* SECOND SCREEN */}
        <SecondScreen scrollProgress={scrollProgress} lerpedProgress={lerpedProgress} />
      </div>
    </main>
  );
}
