// frontend/src/pages/Landing.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLandingScroll } from '../hooks/useLandingScroll';
import LandingHeader from '../components/landing/LandingHeader';
import HeroAvatar from '../components/landing/HeroAvatar';
import HeroTitle from '../components/landing/HeroTitle';
import SoapTiles from '../components/landing/SoapTiles';
import SecondScreen from '../components/landing/SecondScreen';

const c01 = (v: number) => Math.max(0, Math.min(1, v));

export default function Landing() {
  const { scrollProgress, lerpedProgress, navigateTo } = useLandingScroll();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // First screen blur as second screen rises
  const sp = c01((lerpedProgress - 1.15) / 0.50);
  const blur = Math.sin(sp * Math.PI / 2) * 64;

  // Hero copy fades out as pills appear (lerpedProgress 0.14 → 0.45)
  const copyExit = c01((lerpedProgress - 0.14) / 0.31);
  const copyOpacity = 1 - copyExit;
  const copyBlur = copyExit * 10;

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

          {/* Hero copy — fades out as pills appear */}
          <div
            className="absolute left-[5%] md:left-[11%] top-[18%] md:top-1/2 md:-translate-y-[55%] flex flex-col gap-2 md:gap-3 z-20 pointer-events-none w-[58%] md:max-w-[40%]"
            style={{
              opacity: copyOpacity,
              filter: copyBlur > 0.1 ? `blur(${copyBlur}px)` : 'none',
            }}
          >
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

          {/* Search bar — appears below pills on desktop */}
          {(() => {
            const sOp = c01((lerpedProgress - 0.32) / 0.18);
            const sTx = (1 - sOp) * -60;
            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate(`/explorar${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`);
                }}
                className="hidden md:flex absolute left-[64px] z-40 gap-2 items-center"
                style={{
                  top: 'calc(50% + 110px)',
                  opacity: sOp,
                  transform: `translateX(${sTx}px)`,
                  pointerEvents: sOp > 0.1 ? 'auto' : 'none',
                }}
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca por enfoque terapéutico o ciudad..."
                  className="w-[300px] h-[44px] bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 text-white text-[13px] placeholder:text-white/35 outline-none focus:border-[#2dd4bf] transition-colors"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
                <button
                  type="submit"
                  className="h-[44px] px-5 bg-[#2dd4bf] text-[#0f0a1a] text-[13px] font-semibold rounded-2xl hover:bg-white transition-colors whitespace-nowrap"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Buscar →
                </button>
              </form>
            );
          })()}

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
