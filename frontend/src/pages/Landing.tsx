import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, ArrowRight, MapPin, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import './Landing.css';

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4';

interface DirectoryProfile {
  id: string; slug: string; title: string; profession: string;
  bio?: string; avatar?: string; country?: string; city?: string;
  therapeuticApproaches?: string[]; modality?: string;
  pricePerSession?: number; sessionCurrency?: string;
  isPro: boolean;
  services: { id: string; name: string; price: number; currency: string }[];
}

const FREE_FEATURES = [
  'Perfil público con cédula, enfoques y precio',
  'Apareces en búsquedas por ciudad y enfoque',
  'Agenda de citas y reservas ilimitadas',
  'Notificaciones por email al paciente y a ti',
  'Página con URL personalizada aliax.io/tu-nombre',
];

const PRO_FEATURES: { text: string; highlight: boolean }[] = [
  { text: 'Posición destacada — apareces primero en búsquedas', highlight: true },
  { text: 'Notificaciones WhatsApp al paciente y a ti', highlight: true },
  { text: 'Analytics: quién visita tu perfil y desde dónde', highlight: true },
  { text: 'Badge verificado en tu perfil', highlight: true },
  { text: 'Video de presentación en tu perfil', highlight: true },
  { text: 'Reseñas de pacientes (próximamente)', highlight: false },
  { text: 'Hasta 3 perfiles', highlight: false },
];

export default function Landing() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [searchProf, setSearchProf] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [loadingStripe, setLoadingStripe] = useState(false);


  useEffect(() => {
    api.get('/profiles/directory?profession=Psicólogo%2Fa&limit=6')
      .then(r => setProfiles(r.data.profiles || []))
      .catch(() => setProfiles([]));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchProf) params.set('profession', searchProf);
    if (searchCity) params.set('city', searchCity);
    navigate(`/explorar?${params}`);
  };

  const handleStripe = async () => {
    if (!user) { navigate('/register'); return; }
    setLoadingStripe(true);
    try {
      const res = await api.post('/subscriptions/stripe/checkout', { interval: 'MONTHLY' });
      window.location.href = res.data.url;
    } catch { setLoadingStripe(false); }
  };

  return (
    <div style={{ background: '#0c0c0c', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════
          1. HERO — fullscreen video · glass nav · centered headline
      ══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#000' }}>

        {/* SVG Noise filter for shiny headline */}
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

        {/* Video full-screen */}
        <video
          autoPlay muted loop playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>

        {/* Overlay — dark base */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(12,12,12,0.80) 0%, rgba(12,12,12,0.50) 40%, rgba(12,12,12,0.85) 100%)',
        }} />
        {/* Overlay — teal color wash */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 60%, rgba(20,94,82,0.90) 0%, rgba(13,60,53,0.60) 50%, transparent 80%)',
          mixBlendMode: 'multiply',
        } as React.CSSProperties} />

        {/* ── NAVBAR ── */}
        <header style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          height: 60,
          background: 'rgba(12,12,12,0.12)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 48px',
          display: 'flex', alignItems: 'center',
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9b87f5', boxShadow: '0 0 10px rgba(155,135,245,0.9), 0 0 20px rgba(155,135,245,0.4)', flexShrink: 0 }} />
            <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>Aliax</span>
          </Link>

          {/* Nav links — centered */}
          <nav style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 36 }}>
            {[['Explorar', '/explorar'], ['Cómo funciona', '#como-funciona'], ['Precios', '#precios']].map(([label, href]) => (
              <a
                key={label} href={href}
                style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
              >{label}</a>
            ))}
          </nav>

          {/* Right buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Link to="/login" style={{
              color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500,
              padding: '8px 16px', borderRadius: 999, textDecoration: 'none',
            }}>Entrar</Link>
            <Link to={user ? '/dashboard' : '/register'} style={{
              color: '#fff', fontSize: 13, fontWeight: 600,
              padding: '9px 20px', borderRadius: 999, textDecoration: 'none',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}>
              {user ? 'Dashboard' : 'Crear perfil gratis'}
            </Link>
          </div>
        </header>

        {/* ── HERO CONTENT — Centered ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '60px 24px 0',
        }}>
          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999, padding: '6px 14px', marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2dd4bf', boxShadow: '0 0 8px rgba(45,212,191,0.9)' }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>
              Directorio de Psicólogos · Latinoamérica
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(52px, 8vw, 88px)', fontWeight: 700,
            lineHeight: 0.95, letterSpacing: '-0.035em',
            margin: '0 0 24px',
          }}>
            <span style={{ display: 'block', color: '#fff' }}>Psicólogos que</span>
            <span style={{ display: 'block', color: '#fff' }}>ya están siendo</span>
            <span
              className="ln-shiny"
              style={{
                display: 'block',
                backgroundImage: 'linear-gradient(to right, #0a1f2e 0%, #134e5e 12.5%, #a7f3d0 32.5%, #2dd4bf 50%, #134e5e 67.5%, #0a1f2e 87.5%, #0a1f2e 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                filter: 'url(#aliax-noise)',
              } as React.CSSProperties}
            >
              encontrados
            </span>
          </h1>

          {/* Description */}
          <p style={{
            fontSize: 18, color: 'rgba(255,255,255,0.58)',
            lineHeight: 1.65, maxWidth: 460, margin: '0 0 32px',
          }}>
            El directorio gratuito para psicólogos y psicoterapeutas en Latinoamérica.
            Aparece por enfoque terapéutico, ciudad y modalidad.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to={user ? '/dashboard' : '/register'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', color: '#fff',
                fontSize: 14, fontWeight: 600,
                padding: '13px 26px', borderRadius: 999, textDecoration: 'none',
                transition: 'filter 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1)'; }}
            >
              Crear mi perfil gratis <ArrowRight size={15} />
            </Link>
            <Link
              to="/explorar"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)',
                fontSize: 14, fontWeight: 500,
                padding: '13px 26px', borderRadius: 999, textDecoration: 'none',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.14)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)'; }}
            >
              Explorar directorio
            </Link>
          </div>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 14 }}>
            Sin tarjeta. Gratis para siempre.
          </p>
        </div>

      </section>


      {/* ══════════════════════════════════════════════
          2. ANTES / CON ALIAX
      ══════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 32px' }}>
        <p style={{ fontSize: 10, color: 'rgba(45,212,191,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
          ¿Te suena familiar?
        </p>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px', lineHeight: 1.15 }}>
          Estudiaste años para hacer terapia<br />
          <span style={{ color: '#2dd4bf', fontStyle: 'italic', fontWeight: 700 }}>No para administrarla</span>
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>
          Así se ve el trabajo administrativo que nadie enseña — y cómo Aliax lo cambia.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
        }}>
          {/* ANTES */}
          <div style={{ padding: '44px 40px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{
              display: 'inline-block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.08)', borderRadius: 20, padding: '6px 16px', marginBottom: 24,
            }}>Sin Aliax · Hoy</span>

            {/* Chat window mockup */}
            <div style={{
              background: 'rgba(10,10,10,0.85)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {/* Chat header */}
              <div style={{
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>👤</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Paciente nuevo</div>
                  <div style={{ fontSize: 10, color: 'rgba(134,239,172,0.6)' }}>en línea</div>
                </div>
              </div>
              {/* Messages */}
              <div style={{ padding: '14px 14px 10px' }}>
                {[
                  { dir: 'in',  text: 'hola! tienes lugar el martes a las 5?' },
                  { dir: 'out', text: 'déjame revisar... te confirmo' },
                  { dir: 'in',  text: 'ok! y cuánto cobras? trabajas ansiedad?' },
                  { dir: 'in',  text: 'puedo ir online o solo presencial?' },
                  { dir: 'out', text: 'son 900, sí trabajo ansiedad, puedo online' },
                ].map((m, i) => (
                  <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: m.dir === 'out' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      display: 'inline-block', padding: '8px 12px',
                      borderRadius: m.dir === 'in' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      background: m.dir === 'in' ? 'rgba(255,255,255,0.08)' : 'rgba(37,211,102,0.15)',
                      color: m.dir === 'in' ? 'rgba(255,255,255,0.65)' : 'rgba(134,239,172,0.8)',
                      fontSize: 11, lineHeight: 1.5, maxWidth: 220,
                    }}>{m.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)',
              borderRadius: 8, fontSize: 11, color: 'rgba(239,68,68,0.65)', lineHeight: 1.5,
            }}>
              ⏱ Cada nuevo paciente son 20–30 minutos de coordinación antes de la primera sesión.
            </div>
          </div>

          {/* CON ALIAX */}
          <div style={{ padding: '44px 40px' }}>
            <span style={{
              display: 'inline-block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'rgba(45,212,191,0.8)', border: '1px solid rgba(45,212,191,0.25)',
              background: 'rgba(45,212,191,0.08)', borderRadius: 20, padding: '6px 16px', marginBottom: 24,
            }}>Con Aliax</span>

            <div style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(45,212,191,0.2)',
              borderRadius: 14, padding: 16, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#0d9488,#0891b2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>LM</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ede8ff' }}>Dra. Laura Mendoza</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Psicoterapeuta · Ciudad de México</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {['TCC', 'Humanista', 'Ansiedad', 'Duelo'].map(t => (
                  <span key={t} style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(45,212,191,0.10)', border: '1px solid rgba(45,212,191,0.25)',
                    color: '#2dd4bf',
                  }}>{t}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {['🖥 Híbrida', '💰 MXN 900 · 50 min', '📋 Cédula 8734521'].map(i => (
                  <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{i}</span>
                ))}
              </div>
            </div>

            <div style={{
              padding: '10px 12px', background: 'rgba(45,212,191,0.07)',
              border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8,
              fontSize: 11, color: 'rgba(45,212,191,0.75)', lineHeight: 1.5,
            }}>
              ✓ El paciente llega sabiendo tu enfoque, precio y formación. Escribe solo cuando está listo para agendar.
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. CÓMO FUNCIONA
      ══════════════════════════════════════════════ */}
      <section id="como-funciona" style={{ maxWidth: 980, margin: '0 auto', padding: '0 32px 80px' }}>
        <p style={{ fontSize: 10, color: 'rgba(45,212,191,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
          Así funciona
        </p>
        <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 40px', lineHeight: 1.15 }}>
          En 3 pasos, pacientes<br />encontrándote en Google
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { n: '01', title: 'Crea tu perfil', text: 'Completa tu enfoque terapéutico, problemáticas, precio, cédula y modalidad. Listo en 5 minutos.' },
            { n: '02', title: 'Apareces en búsquedas', text: 'Pacientes que buscan "psicólogo TCC Monterrey" o "terapeuta de duelo online" te encuentran directamente.' },
            { n: '03', title: 'Ellos agendan, tú haces terapia', text: 'El paciente llega informado. Escribe cuando está listo. Sin 30 minutos de WhatsApp previo.' },
          ].map(s => (
            <div key={s.n} style={{
              padding: '24px 20px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
            }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'rgba(45,212,191,0.2)', letterSpacing: '-0.04em', marginBottom: 12 }}>{s.n}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ede8ff', marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. DIRECTORIO PREVIEW
      ══════════════════════════════════════════════ */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '80px 0' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 10, color: 'rgba(45,212,191,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
              Directorio público
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Psicólogos que ya están<br />
              <span style={{ color: '#2dd4bf' }}>siendo encontrados</span>
            </h2>
          </div>

          <form onSubmit={handleSearch} style={{
            display: 'flex', gap: 10, maxWidth: 560, margin: '0 auto 32px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(45,212,191,0.2)',
            borderRadius: 14, padding: 10,
          }}>
            <div style={{ position: 'relative', flex: 2 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(45,212,191,0.5)' }} />
              <input
                type="text" placeholder="Enfoque o profesión"
                value={searchProf} onChange={e => setSearchProf(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(45,212,191,0.2)',
                  borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(45,212,191,0.5)' }} />
              <input
                type="text" placeholder="Ciudad"
                value={searchCity} onChange={e => setSearchCity(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(45,212,191,0.2)',
                  borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
            <button type="submit" style={{
              background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', color: '#fff',
              fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            }}>Buscar</button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {profiles.map(p => (
              <Link key={p.id} to={p.slug === '#' ? '/explorar' : `/${p.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: p.isPro ? 'rgba(45,212,191,0.06)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.isPro ? 'rgba(45,212,191,0.35)' : 'rgba(45,212,191,0.15)'}`,
                  borderRadius: 14, padding: '18px 20px',
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    {p.avatar
                      ? <img src={p.avatar} alt={p.title} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(45,212,191,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{p.title?.[0]}</div>
                    }
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ color: '#ede8ff', fontWeight: 600, fontSize: 14 }}>{p.title}</span>
                        {p.isPro && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 20, padding: '2px 7px', color: '#2dd4bf', fontSize: 9, fontWeight: 700 }}>
                            <Zap size={8} /> PRO
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(180,165,220,0.6)' }}>{p.profession}</div>
                      {(p.city || p.country) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 11, color: 'rgba(160,145,200,0.4)' }}>
                          <MapPin size={9} /> {[p.city, p.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {(p.therapeuticApproaches?.slice(0, 3) || p.services.slice(0, 3).map(s => s.name)).map(tag => (
                      <span key={tag} style={{
                        fontSize: 10, padding: '3px 9px', borderRadius: 6,
                        background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)',
                        color: 'rgba(45,212,191,0.8)',
                      }}>{tag}</span>
                    ))}
                  </div>
                  {p.pricePerSession != null && (
                    <div style={{ fontSize: 11, color: 'rgba(180,165,220,0.4)', marginTop: 8 }}>
                      desde <span style={{ color: '#2dd4bf', fontWeight: 600 }}>{p.sessionCurrency ?? 'MXN'} {Number(p.pricePerSession).toLocaleString()}</span> / sesión
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {profiles.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Sé el primero en aparecer aquí.</p>
              <Link to="/register" style={{ color: '#2dd4bf', fontSize: 14 }}>Crear mi perfil gratis →</Link>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link to="/explorar" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#2dd4bf', fontSize: 14, textDecoration: 'none',
              background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)',
              borderRadius: 10, padding: '10px 22px',
            }}>Ver directorio completo →</Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. PRECIOS
      ══════════════════════════════════════════════ */}
      <section id="precios" style={{ maxWidth: 900, margin: '0 auto', padding: '80px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 10, color: 'rgba(45,212,191,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>Planes</p>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px' }}>
            Empieza gratis<br />Crece cuando quieras
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Sin tarjeta. Sin trial de 14 días. El plan gratuito es para siempre.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* FREE */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '28px 24px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              Gratis · Siempre
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>/ mes para siempre</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {FREE_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                  <Check size={14} style={{ color: '#2dd4bf', flexShrink: 0, marginTop: 1 }} />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => user ? navigate('/dashboard') : navigate('/register')}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: 'transparent', border: '1px solid rgba(45,212,191,0.35)', color: 'rgba(45,212,191,0.9)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{user ? 'Ir al dashboard' : 'Crear cuenta gratis'}</button>
          </div>

          {/* PRO */}
          <div style={{
            background: 'linear-gradient(160deg, rgba(45,212,191,0.10), rgba(13,148,136,0.06))',
            border: '1.5px solid rgba(45,212,191,0.4)', borderRadius: 18, padding: '28px 24px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(90deg, #2dd4bf, #0d9488)', color: '#fff',
              fontSize: 10, fontWeight: 700, padding: '4px 16px', borderRadius: 20,
              textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
            }}>Recomendado</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2dd4bf', marginBottom: 8 }}>
              ⚡ Pro
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(45,212,191,0.6)', alignSelf: 'flex-start', marginTop: 8 }}>$</span>
              <span style={{ fontSize: 52, fontWeight: 900, color: '#2dd4bf', lineHeight: 1, letterSpacing: '-0.03em' }}>9</span>
              <span style={{ fontSize: 14, color: 'rgba(45,212,191,0.5)' }}>USD / mes</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>Todo lo del plan gratuito, más:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {PRO_FEATURES.map(f => (
                <div key={f.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: f.highlight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)' }}>
                  <Check size={14} style={{ color: '#2dd4bf', flexShrink: 0, marginTop: 1 }} />
                  {f.text}
                </div>
              ))}
            </div>
            {isPro ? (
              <div style={{ width: '100%', padding: 13, borderRadius: 10, fontSize: 13, fontWeight: 700, textAlign: 'center', background: 'rgba(45,212,191,0.12)', color: '#2dd4bf' }}>
                ✓ Ya tienes Pro activo
              </div>
            ) : (
              <button
                onClick={handleStripe} disabled={loadingStripe}
                style={{
                  width: '100%', padding: 13, borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 6px 24px rgba(45,212,191,0.25)', opacity: loadingStripe ? 0.6 : 1,
                }}
              >{loadingStripe ? 'Redirigiendo...' : 'Activar Pro — $9/mes'}</button>
            )}
            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>Cancela cuando quieras</p>
          </div>
        </div>

        {/* Cupón */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginTop: 20,
          background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.2)',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>🏷️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#2dd4bf', margin: '0 0 4px' }}>Descuento de lanzamiento — 20% off por 12 meses</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Solo $7.20 USD/mes el primer año. Máx. 20 canjes. Caduca 5 Jun 2026.</p>
          </div>
          <div style={{
            flexShrink: 0, padding: '8px 16px', borderRadius: 10,
            background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)',
            color: '#2dd4bf', fontWeight: 900, fontSize: 18, letterSpacing: '2px',
          }}>CONFIANZA20</div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6. CTA FINAL
      ══════════════════════════════════════════════ */}
      <section style={{ padding: '80px 32px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderRadius: 28, padding: '72px 48px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
        }}>
          {/* Radial glow top */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(600px circle at 50% 0%, rgba(45,212,191,0.12), transparent 70%)',
          }} />
          {/* Liquid-glass border shine */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
            padding: '1.4px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.18) 100%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          } as React.CSSProperties} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 10, color: 'rgba(45,212,191,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16 }}>
              Empieza hoy
            </p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 16px' }}>
              Tu próximo paciente<br />ya está buscando<br />
              <em style={{ fontStyle: 'italic', color: '#2dd4bf', fontWeight: 800 }}>¿Puede encontrarte?</em>
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 36px', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              Únete gratis en 5 minutos. Sin tarjeta. Sin compromiso.<br />Aparece en búsquedas de Google desde el día uno.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={user ? '/dashboard' : '/register'} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                padding: '15px 32px', borderRadius: 999, textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(45,212,191,0.3)',
              }}>
                {user ? 'Ir al dashboard' : 'Crear mi perfil gratis'} <ArrowRight size={16} />
              </Link>
              <Link to="/explorar" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500,
                padding: '15px 32px', borderRadius: 999, textDecoration: 'none',
              }}>
                Explorar directorio
              </Link>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
              Directorio gratuito para psicólogos y psicoterapeutas en Latinoamérica
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 32px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Top row — logo + nav */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#9b87f5', boxShadow: '0 0 8px rgba(155,135,245,0.7)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.02em' }}>Aliax</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, maxWidth: 220, margin: 0 }}>
                El directorio de psicólogos y psicoterapeutas más completo de Latinoamérica.
              </p>
            </div>

            {/* Nav columns */}
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(45,212,191,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Plataforma</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Explorar directorio', '/explorar'], ['Cómo funciona', '#como-funciona'], ['Precios', '#precios']].map(([l, h]) => (
                    <Link key={l} to={h} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                    >{l}</Link>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(45,212,191,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Cuenta</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Crear perfil', '/register'], ['Iniciar sesión', '/login'], ['Dashboard', '/dashboard']].map(([l, h]) => (
                    <Link key={l} to={h} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                    >{l}</Link>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(45,212,191,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Legal</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Privacidad', '/privacidad'], ['Términos', '/terminos']].map(([l, h]) => (
                    <Link key={l} to={h} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                    >{l}</Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row — copyright */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', margin: 0 }}>
              © {new Date().getFullYear()} Aliax.io — Directorio de psicólogos en Latinoamérica
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.12)', margin: 0 }}>
              Hecho con cuidado en México 🇲🇽
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
