// frontend/src/pages/Landing.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { useLandingScroll } from '../hooks/useLandingScroll';
import LandingHeader from '../components/landing/LandingHeader';
import HeroAvatar from '../components/landing/HeroAvatar';
import HeroTitle from '../components/landing/HeroTitle';
import SoapTiles from '../components/landing/SoapTiles';
import SecondScreen from '../components/landing/SecondScreen';

const c01 = (v: number) => Math.max(0, Math.min(1, v));

export default function Landing() {
  const { scrollProgress, lerpedProgress, navigateTo } = useLandingScroll();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // First screen blur as second screen rises
  const sp   = c01((lerpedProgress - 0.65) / 0.25);
  const blur = Math.sin(sp * Math.PI / 2) * 64;

  // Hero copy fades out as pills appear
  const copyExit    = c01((lerpedProgress - 0.07) / 0.31);
  const copyOpacity = 1 - copyExit;
  const copyBlur    = copyExit * 10;

  // CTA block appears after pills are fully visible
  const ctaOp = c01((lerpedProgress - 0.35) / 0.20);
  const ctaTx = (1 - ctaOp) * -50;

  return (
    <main className="relative w-screen h-dvh overflow-hidden text-white">
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

          {/* SVG noise filter */}
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
          <div
            className="absolute left-[5%] md:left-[11%] top-[14%] md:top-1/2 md:-translate-y-[55%] flex flex-col gap-2 md:gap-3 z-20 pointer-events-none w-[58%] md:max-w-[40%]"
            style={{ opacity: copyOpacity, filter: copyBlur > 0.1 ? `blur(${copyBlur}px)` : 'none' }}
          >
            <p
              className="text-[#2dd4bf] text-[9px] md:text-[11px] uppercase tracking-[0.2em] font-medium whitespace-nowrap"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Automatización clínica con IA
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
              <span style={{ display: 'block' }}>Automatiza</span>
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>tu nota <span className="text-shimmer-teal" style={{ display: 'inline' }}>clínica</span></span>
            </h1>
            <p
              className="text-white/60 text-[11px] md:text-[15px] leading-relaxed hidden sm:block"
              style={{ fontFamily: 'Manrope, sans-serif', maxWidth: 360 }}
            >
              Grabas el audio de la sesión y la IA transcribe y genera tu nota clínica automáticamente.
              <br />
              Tu perfil, agenda y reservas son siempre gratis.
            </p>
          </div>

          <HeroAvatar scrollProgress={Math.min(1, lerpedProgress)} />

          {/* Pills + CTA — centered on mobile, left-aligned on desktop */}
          <div
            className="absolute z-40 flex flex-col gap-[10px] md:gap-[12px] w-[74vw] md:w-auto"
            style={{
              top: '50%',
              left: isMobile ? '50%' : '80px',
              transform: isMobile ? 'translate(-50%, -50%)' : 'translateY(-50%)',
            }}
          >
            <SoapTiles scrollProgress={lerpedProgress} />
            <div
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center"
              style={{
                opacity: ctaOp,
                transform: `translateX(${ctaTx}px)`,
                transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
                pointerEvents: ctaOp > 0.1 ? 'auto' : 'none',
              }}
            >
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-[15px] font-semibold text-white transition-all duration-300 hover:brightness-110 w-full sm:w-auto"
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                  boxShadow: '0 6px 20px rgba(45,212,191,0.35)',
                }}
              >
                Crear mi perfil gratis <ArrowRight size={14} />
              </Link>
              <Link
                to="/explorar"
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl text-[15px] font-medium text-white/80 border border-white/20 hover:border-[#2dd4bf] hover:text-white transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                Ver directorio
              </Link>
              <a
                href="https://www.aliax.io/demo"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-[15px] font-medium text-[#2dd4bf] border border-[#2dd4bf]/40 hover:bg-[#2dd4bf]/10 hover:border-[#2dd4bf] transition-all duration-300 w-full sm:w-auto"
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  background: 'rgba(45,212,191,0.05)',
                }}
              >
                <CalendarClock size={15} />
                Reservar demo
              </a>
            </div>
          </div>

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
