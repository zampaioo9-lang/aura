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

          {/* Hero copy — left side */}
          <div className="absolute left-6 md:left-[64px] top-1/2 -translate-y-[55%] flex flex-col gap-3 z-20 pointer-events-none max-w-[48%] md:max-w-[38%]">
            <p
              className="text-[#2dd4bf] text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-medium"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Salud Mental · México &amp; LATAM
            </p>
            <h2
              className="text-white text-[24px] sm:text-[32px] md:text-[40px] font-bold leading-[1.1]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Tu bienestar,<br />
              <span style={{ color: '#2dd4bf' }}>en buenas manos.</span>
            </h2>
            <p
              className="text-white/60 text-[12px] md:text-[14px] leading-relaxed hidden sm:block"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Encuentra al especialista en salud mental<br className="hidden md:block" /> ideal para ti.
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
