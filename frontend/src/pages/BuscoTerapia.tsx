// frontend/src/pages/BuscoTerapia.tsx
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Search, BookOpen } from 'lucide-react';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';

const ARTICLES = [
  {
    title: 'Cómo elegir psicólogo: 7 pasos para encontrar al indicado',
    excerpt: 'Decidir ir a terapia ya es un paso grande. Y justo después aparece la segunda pregunta: ¿con quién?',
    href: '/revista/como-elegir-psicologo-7-pasos-para-encontrar-al-indicado',
  },
  {
    title: 'Autoestima y límites en pareja: cómo cuidarte sin perder la relación',
    excerpt: 'Poner límites no es alejar a tu pareja, es decirle quién eres y qué necesitas.',
    href: '/revista/autoestima-y-limites-en-pareja-como-cuidarte-sin-perder-la-relacion',
  },
];

export default function BuscoTerapia() {
  return (
    <>
      <Helmet>
        <title>Busco terapia: encuentra tu psicólogo ideal | Aliax</title>
        <meta name="description" content="Encuentra un psicólogo verificado en México y LATAM. Filtra por enfoque terapéutico, modalidad online o presencial, y agenda tu sesión directamente." />
        <meta property="og:title" content="Busco terapia: encuentra tu psicólogo ideal | Aliax" />
        <meta property="og:description" content="Encuentra un psicólogo verificado en México y LATAM. Filtra por enfoque terapéutico, modalidad y ciudad." />
        <link rel="canonical" href="https://www.aliax.io/busco-terapia" />
      </Helmet>

      <div className="relative min-h-screen text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)' }}>
        <LandingHeader />

        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.15) 0%, transparent 70%)' }} />

        <main className="relative z-10 max-w-[900px] mx-auto px-6" style={{ paddingTop: 160, paddingBottom: 100 }}>
          {/* Hero */}
          <section className="text-center" style={{ marginBottom: 80 }}>
            <p className="text-[#2dd4bf] text-[12px] uppercase tracking-[0.2em] font-medium" style={{ fontFamily: 'Manrope, sans-serif', marginBottom: 16 }}>
              Busco terapia
            </p>
            <h1 className="font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px' }}>
              Encuentra tu psicólogo ideal
            </h1>
            <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 40px' }}>
              Perfiles verificados, filtra por enfoque terapéutico, modalidad y ciudad. Agenda directo con el psicólogo, sin intermediarios.
            </p>
            <Link
              to="/explorar"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:brightness-110"
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', boxShadow: '0 8px 24px rgba(45,212,191,0.3)' }}
            >
              Buscar psicólogo <ArrowRight size={16} />
            </Link>
          </section>

          {/* Encuentra tu psicólogo */}
          <section className="grid md:grid-cols-[auto_1fr] gap-4 items-start" style={{ marginBottom: 64, padding: 28, borderRadius: 20, background: 'rgba(255,255,255,0.04)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
            <Search size={28} className="text-[#2dd4bf]" />
            <div>
              <h2 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, margin: '0 0 8px' }}>Encuentra tu psicólogo</h2>
              <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                En el directorio de Aliax puedes filtrar por enfoque terapéutico (cognitivo-conductual, sistémico, psicoanalítico y más), modalidad (online o presencial) y ciudad, para encontrar al psicólogo que mejor encaja contigo.
              </p>
              <Link to="/explorar" className="text-[#2dd4bf] font-medium inline-flex items-center gap-1" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14 }}>
                Ver directorio <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* Lee antes de empezar */}
          <section style={{ marginBottom: 64 }}>
            <h2 className="font-semibold text-center" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, margin: '0 0 24px' }}>Lee antes de empezar</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {ARTICLES.map(a => (
                <a key={a.href} href={a.href} className="block transition-all duration-300 hover:brightness-110" style={{ padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.04)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', textDecoration: 'none', color: 'inherit' }}>
                  <BookOpen size={20} className="text-[#2dd4bf]" style={{ marginBottom: 12 }} />
                  <h3 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, margin: '0 0 8px', color: '#fff' }}>{a.title}</h3>
                  <p className="text-white/50" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{a.excerpt}</p>
                </a>
              ))}
            </div>
          </section>

          {/* CTA final */}
          <section className="text-center">
            <Link
              to="/explorar"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:brightness-110"
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', boxShadow: '0 8px 24px rgba(45,212,191,0.3)' }}
            >
              Buscar psicólogo <ArrowRight size={16} />
            </Link>
          </section>
        </main>

        <div className="relative z-10">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
