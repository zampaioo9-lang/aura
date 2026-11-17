// frontend/src/pages/BuscoTerapia.tsx
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Search, BookOpen, Sparkles, MessageSquareText, CalendarCheck, AlertTriangle } from 'lucide-react';
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

const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Cuéntanos qué te trae a terapia',
    text: 'Respondes 5 preguntas: tu situación, si prefieres sesiones en línea o presenciales, para quién es la terapia, tu ciudad y el enfoque que prefieras.',
  },
  {
    icon: Sparkles,
    title: 'La IA te sugiere con quién',
    text: 'Analiza lo que escribiste y te muestra los psicólogos que mejor encajan contigo, con la razón de cada recomendación. Para mostrarte los resultados te pedimos tu nombre y tu WhatsApp.',
  },
  {
    icon: CalendarCheck,
    title: 'Eliges y agendas',
    text: 'Revisas sus perfiles, eliges a la persona que más te convenza y reservas tu cita directo con el psicólogo, sin intermediarios.',
  },
];

const CARD: React.CSSProperties = {
  padding: 24,
  borderRadius: 18,
  background: 'rgba(255,255,255,0.04)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
};

const PRIMARY_BTN: React.CSSProperties = {
  fontFamily: 'Manrope, sans-serif',
  fontSize: 15,
  background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
  boxShadow: '0 8px 24px rgba(45,212,191,0.3)',
};

export default function BuscoTerapia() {
  return (
    <>
      <Helmet>
        <title>Busco terapia: encuentra tu psicólogo ideal | Aliax</title>
        <meta name="description" content="Cuéntanos qué te trae a terapia y la IA te sugiere psicólogos verificados en México y LATAM. Filtra por enfoque terapéutico, modalidad y ciudad, y agenda tu sesión directamente." />
        <meta property="og:title" content="Busco terapia: encuentra tu psicólogo ideal | Aliax" />
        <meta property="og:description" content="Responde 5 preguntas y descubre qué psicólogo encaja contigo. Perfiles verificados en México y LATAM." />
        <link rel="canonical" href="https://www.aliax.io/busco-terapia" />
      </Helmet>

      <div className="relative min-h-screen text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)' }}>
        <LandingHeader />

        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.15) 0%, transparent 70%)' }} />

        <main className="relative z-10 max-w-[900px] mx-auto px-6" style={{ paddingTop: 160, paddingBottom: 100 }}>
          {/* Hero */}
          <section className="text-center" style={{ marginBottom: 72 }}>
            <p className="text-[#2dd4bf] text-[12px] uppercase tracking-[0.2em] font-medium" style={{ fontFamily: 'Manrope, sans-serif', marginBottom: 16 }}>
              Busco terapia
            </p>
            <h1 className="font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px' }}>
              Encuentra tu psicólogo ideal
            </h1>
            <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, lineHeight: 1.6, maxWidth: 540, margin: '0 auto 36px' }}>
              Cuéntanos qué te trae a terapia y te orientamos, o explora perfiles verificados por enfoque, modalidad y ciudad. Agenda directo con el psicólogo, sin intermediarios.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/explorar"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:brightness-110"
                style={PRIMARY_BTN}
              >
                <Sparkles size={16} /> Encuentra tu match con IA
              </Link>
              <Link
                to="/explorar"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white/80 font-semibold transition-all duration-300 hover:text-white"
                style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, background: 'rgba(255,255,255,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}
              >
                Explorar el directorio <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          {/* Cómo funciona */}
          <section style={{ marginBottom: 72 }}>
            <h2 className="font-semibold text-center" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, margin: '0 0 8px' }}>Cómo funciona</h2>
            <p className="text-white/50 text-center" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, margin: '0 0 28px' }}>
              Tres pasos para encontrar a la persona indicada.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <div key={title} style={CARD}>
                  <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                    <span
                      className="flex items-center justify-center font-bold"
                      style={{ width: 28, height: 28, borderRadius: 999, background: 'rgba(45,212,191,0.18)', color: '#2dd4bf', fontSize: 13, fontFamily: 'Manrope, sans-serif' }}
                    >
                      {i + 1}
                    </span>
                    <Icon size={20} className="text-[#2dd4bf]" />
                  </div>
                  <h3 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, margin: '0 0 8px' }}>{title}</h3>
                  <p className="text-white/55" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Encuentra tu psicólogo */}
          <section className="grid md:grid-cols-[auto_1fr] gap-4 items-start" style={{ ...CARD, marginBottom: 72, padding: 28, borderRadius: 20 }}>
            <Search size={28} className="text-[#2dd4bf]" />
            <div>
              <h2 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, margin: '0 0 8px' }}>Prefiero explorar por mi cuenta</h2>
              <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                En el directorio de Aliax puedes filtrar por enfoque terapéutico (cognitivo-conductual, sistémico, psicoanalítico y más), modalidad (en línea o presencial) y ciudad, y revisar el perfil de cada psicólogo antes de decidir. Algunos también comparten talleres, cursos y webinars en su perfil.
              </p>
              <Link to="/explorar" className="text-[#2dd4bf] font-medium inline-flex items-center gap-1" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14 }}>
                Ver directorio <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* Lee antes de empezar */}
          <section style={{ marginBottom: 72 }}>
            <h2 className="font-semibold text-center" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, margin: '0 0 24px' }}>Lee antes de empezar</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {ARTICLES.map(a => (
                <a key={a.href} href={a.href} className="block transition-all duration-300 hover:brightness-110" style={{ ...CARD, borderRadius: 16 }}>
                  <BookOpen size={20} className="text-[#2dd4bf]" style={{ marginBottom: 12 }} />
                  <h3 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, margin: '0 0 8px', color: '#fff' }}>{a.title}</h3>
                  <p className="text-white/50" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{a.excerpt}</p>
                </a>
              ))}
            </div>
          </section>

          {/* CTA final */}
          <section className="text-center" style={{ marginBottom: 40 }}>
            <Link
              to="/explorar"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:brightness-110"
              style={PRIMARY_BTN}
            >
              Buscar psicólogo <ArrowRight size={16} />
            </Link>
          </section>

          {/* Aviso de crisis */}
          <section
            className="flex items-start gap-3"
            style={{ padding: 16, borderRadius: 14, background: 'rgba(251,191,36,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
          >
            <AlertTriangle size={16} className="flex-shrink-0" style={{ color: '#fbbf24', marginTop: 2 }} />
            <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
              Aliax es una plataforma de directorio, no un servicio de emergencia. Si tú o alguien que conoces está en crisis o en riesgo, comunícate a la Línea de la Vida en México (800&nbsp;911&nbsp;2000, 24/7) o a los servicios de emergencia de tu localidad.
            </p>
          </section>
        </main>

        <div className="relative z-10">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
