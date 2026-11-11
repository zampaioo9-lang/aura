// frontend/src/pages/Landing.tsx
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';

export default function Landing() {
  return (
    <>
      <Helmet>
        <title>Aliax — Psicólogos y terapia en México y LATAM</title>
        <meta name="description" content="Aliax conecta a psicólogos con las personas que buscan terapia. Encuentra tu psicólogo ideal o crea tu perfil profesional gratis." />
        <meta property="og:title" content="Aliax — Psicólogos y terapia en México y LATAM" />
        <meta property="og:description" content="Aliax conecta a psicólogos con las personas que buscan terapia." />
        <link rel="canonical" href="https://www.aliax.io/" />
      </Helmet>

      <div className="relative min-h-screen text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)' }}>
        <LandingHeader />

        {/* Teal glow top-right */}
        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.15) 0%, transparent 70%)' }} />
        {/* Purple glow bottom-left */}
        <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

        <main className="relative z-10 max-w-[720px] mx-auto text-center px-6" style={{ paddingTop: 180, paddingBottom: 120 }}>
          <p className="text-[#2dd4bf] text-[12px] uppercase tracking-[0.2em] font-medium" style={{ fontFamily: 'Manrope, sans-serif', marginBottom: 16 }}>
            Salud mental en México y LATAM
          </p>
          <h1 className="font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px' }}>
            Terapia y psicólogos, en un solo lugar
          </h1>
          <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 48px' }}>
            Aliax conecta a psicólogos con las personas que buscan terapia. Elige tu camino para continuar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch max-w-[420px] mx-auto">
            <Link
              to="/para-psicologos"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:brightness-110"
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', boxShadow: '0 8px 24px rgba(45,212,191,0.3)' }}
            >
              Soy psicólogo <ArrowRight size={16} />
            </Link>
            <Link
              to="/busco-terapia"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold border border-white/20 bg-white/5 hover:border-[#2dd4bf] transition-all duration-300"
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15 }}
            >
              Busco terapia <ArrowRight size={16} />
            </Link>
          </div>
        </main>

        <div className="relative z-10">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
