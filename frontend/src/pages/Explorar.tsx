import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Zap, SlidersHorizontal, X, ChevronDown, Sparkles, Loader2, Star } from 'lucide-react';
import api from '../api/client';
import './Explorar.css';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';
import { PROBLEMATICS } from '../data/problematics';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4';


interface DirectoryProfile {
  id: string;
  slug: string;
  title: string;
  profession: string;
  bio?: string;
  avatar?: string;
  country?: string;
  city?: string;
  modality?: string;
  pricePerSession?: number;
  sessionCurrency?: string;
  therapeuticApproaches?: string[];
  isPro: boolean;
  averageRating?: number | null;
  reviewCount?: number;
  services: { id: string; name: string; price: number; currency: string }[];
}

const POPULAR_PROFESSIONS = [
  'Psicólogo/a', 'Psicoterapeuta', 'Terapeuta de pareja', 'Psiquiatra', 'Neuropsicólogo/a',
];

const MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrida: 'Híbrida',
};

const PROFESSIONS = ['Psicólogo/a', 'Psiquiatra', 'Psicoterapeuta', 'Terapeuta de Parejas', 'Neuropsicólogo/a', 'Trabajador/a Social'];

function SearchSelect({ value, onChange, options, placeholder, icon }: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder: string; icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 200) });
    }
    setOpen(o => !o);
  };

  const dropdown = open ? createPortal(
    <div ref={dropRef} style={{
      position: 'fixed', top: coords.top, left: coords.left, width: coords.width,
      background: 'rgba(6,4,16,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
      zIndex: 99999, maxHeight: 300, overflowY: 'auto',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
    }}>
      {value && (
        <button type="button" onClick={() => { onChange(''); setOpen(false); }} style={{
          width: '100%', textAlign: 'left', padding: '10px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'inherit',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          Limpiar selección
        </button>
      )}
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }} style={{
          width: '100%', textAlign: 'left', padding: '11px 16px',
          background: opt === value ? 'rgba(45,212,191,0.12)' : 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
          color: opt === value ? '#2dd4bf' : 'rgba(255,255,255,0.8)',
          borderLeft: `3px solid ${opt === value ? '#2dd4bf' : 'transparent'}`,
          display: 'block',
        }}
        onMouseEnter={e => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
        onMouseLeave={e => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {opt}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={handleOpen} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '20px 16px', background: 'transparent', border: 'none',
        color: value ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 15,
        fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
      }}>
        {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {dropdown}
    </div>
  );
}

const COUNTRIES_CITIES: Record<string, string[]> = {
  'México':            ['Ciudad de México', 'CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Ciudad Juárez', 'Mérida', 'Querétaro', 'San Luis Potosí', 'Cancún', 'Aguascalientes', 'Morelia', 'Hermosillo', 'Chihuahua', 'Saltillo', 'Culiacán', 'Torreón', 'Mexicali', 'Oaxaca', 'Toluca', 'Veracruz', 'Acapulco', 'Tuxtla Gutiérrez', 'Xalapa', 'Tepic', 'Durango', 'Zacatecas', 'Colima', 'Villahermosa', 'Campeche', 'Chetumal', 'La Paz', 'Los Cabos', 'Pachuca', 'Cuernavaca', 'Tlaxcala', 'Celaya', 'Irapuato', 'Mazatlán', 'Tampico', 'Reynosa', 'Matamoros', 'Nuevo Laredo', 'Ciudad Obregón', 'Los Mochis', 'Ensenada', 'Nogales', 'Monclova', 'Piedras Negras', 'Tapachula', 'San Cristóbal de las Casas', 'Coatzacoalcos', 'Poza Rica', 'Uruapan', 'Ecatepec', 'Nezahualcóyotl', 'Tlalnepantla', 'Naucalpan', 'Zapopan', 'San Nicolás de los Garza', 'Apodaca'],
  'España':            ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Zaragoza', 'Málaga', 'Murcia', 'Alicante', 'Valladolid', 'Córdoba', 'Vigo', 'Granada', 'Pamplona', 'Santander'],
  'Argentina':         ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Tucumán', 'La Plata', 'Mar del Plata', 'Salta', 'Santa Fe', 'Neuquén'],
  'Colombia':          ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Ibagué'],
  'Chile':             ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Arica', 'Puerto Montt', 'Viña del Mar'],
  'Perú':              ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Cusco', 'Piura', 'Iquitos', 'Huancayo', 'Tacna'],
  'Ecuador':           ['Quito', 'Guayaquil', 'Cuenca', 'Manta', 'Ambato', 'Portoviejo', 'Loja', 'Ibarra'],
  'Venezuela':         ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maturín', 'Barcelona', 'Mérida'],
  'Uruguay':           ['Montevideo', 'Punta del Este', 'Salto', 'Colonia del Sacramento', 'Maldonado'],
  'Costa Rica':        ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Liberia', 'Pérez Zeledón'],
  'Guatemala':         ['Ciudad de Guatemala', 'Quetzaltenango', 'Escuintla', 'Cobán', 'Antigua Guatemala'],
  'Bolivia':           ['La Paz', 'Santa Cruz', 'Cochabamba', 'Oruro', 'Sucre', 'Potosí', 'Tarija'],
  'Paraguay':          ['Asunción', 'Ciudad del Este', 'Encarnación', 'San Lorenzo', 'Luque'],
  'Rep. Dominicana':   ['Santo Domingo', 'Santiago', 'La Romana', 'San Pedro de Macorís', 'Puerto Plata'],
  'Panamá':            ['Ciudad de Panamá', 'Colón', 'David', 'Santiago', 'La Chorrera'],
  'Honduras':          ['Tegucigalpa', 'San Pedro Sula', 'La Ceiba', 'Comayagua', 'Choluteca'],
  'El Salvador':       ['San Salvador', 'Santa Ana', 'San Miguel', 'Soyapango', 'Usulután'],
  'Nicaragua':         ['Managua', 'León', 'Masaya', 'Matagalpa', 'Granada'],
  'Estados Unidos':    ['Nueva York', 'Los Ángeles', 'Chicago', 'Houston', 'Miami', 'Dallas', 'Phoenix', 'San Antonio', 'San Diego', 'Austin', 'Denver', 'Seattle', 'Boston', 'Las Vegas'],
};

const MATCH_QUESTIONS = [
  { key: 'q1', label: '¿Qué te motiva a buscar terapia?', type: 'textarea', placeholder: 'Cuéntanos brevemente lo que te trajo aquí...' },
  { key: 'q2', label: '¿Cómo prefieres las sesiones?', type: 'options', options: ['Presencial', 'En línea', 'Me da igual'] },
  { key: 'q3', label: '¿La terapia es para ti, tu pareja, para ambos, tu familia o alguien más?', type: 'options', options: ['Para mí', 'Para mi pareja', 'Para ambos', 'Para mi familia', 'Para alguien más'] },
  { key: 'q4', label: '¿Tienes preferencia de enfoque terapéutico?', type: 'textarea', placeholder: 'Ej: cognitivo-conductual, sistémico, humanista... o escribe "no sé"' },
  { key: 'q5', label: '¿Algo más que sea importante para ti en un terapeuta?', type: 'textarea', placeholder: 'Ej: que hable inglés, experiencia con ansiedad, precio, horarios...' },
] as const;

type MatchAnswers = { q1: string; q2: string; q3: string; q4: string; q5: string };
type MatchResult = { profileId: string; score: number; reason: string; profile: { id: string; slug: string; title: string; bio?: string; avatar?: string; city?: string; country?: string; modality?: string; therapeuticApproaches: string[] } };

export default function Explorar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Matching IA
  const [showMatch, setShowMatch]       = useState(false);
  const [matchStep, setMatchStep]       = useState(0);
  const [matchAnswers, setMatchAnswers] = useState<MatchAnswers>({ q1: '', q2: '', q3: '', q4: '', q5: '' });
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);

  const openMatch = () => { setShowMatch(true); setMatchStep(0); setMatchAnswers({ q1: '', q2: '', q3: '', q4: '', q5: '' }); setMatchResults(null); };
  const closeMatch = () => setShowMatch(false);

  const handleMatchSubmit = async () => {
    setMatchStep(5);
    try {
      const { data } = await api.post('/ai-matching/match', { answers: matchAnswers });
      setMatchResults(data.matches);
      setMatchStep(6);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudo procesar el matching. Intenta de nuevo.';
      alert(msg);
      setMatchStep(4);
    }
  };

  const currentQ = MATCH_QUESTIONS[matchStep] as typeof MATCH_QUESTIONS[number] | undefined;
  const currentAnswer = currentQ ? matchAnswers[currentQ.key as keyof MatchAnswers] : '';

  const profession         = searchParams.get('profession')         || '';
  const city               = searchParams.get('city')               || '';
  const activeCountry      = searchParams.get('country')            || '';
  const activeTApproach    = searchParams.get('therapeuticApproach') || '';
  const activeProblematic  = searchParams.get('problematic')        || '';
  const activeModality     = searchParams.get('modality')           || '';

  const [searchProfession,   setSearchProfession]   = useState(profession);
  const [searchCountry,      setSearchCountry]      = useState(activeCountry);
  const [searchCity,         setSearchCity]         = useState(city);
  const [therapeuticApproach, setTherapeuticApproach] = useState(activeTApproach);
  const [problematic,        setProblematic]        = useState(activeProblematic);
  const [modality,           setModality]           = useState(activeModality);

  useEffect(() => {
    setSearchProfession(profession);
    setSearchCountry(activeCountry);
    setSearchCity(city);
    setTherapeuticApproach(activeTApproach);
    setProblematic(activeProblematic);
    setModality(activeModality);
  }, [profession, activeCountry, city, activeTApproach, activeProblematic, activeModality]);

  const fetchDirectory = useCallback(async (params: Record<string, string>) => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) urlParams.set(k, v); });
      urlParams.set('limit', '50');
      const res = await api.get(`/profiles/directory?${urlParams}`);
      setProfiles(res.data.profiles);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory({ profession, country: activeCountry, city, therapeuticApproach: activeTApproach, problematic: activeProblematic, modality: activeModality });
  }, [profession, activeCountry, city, activeTApproach, activeProblematic, activeModality, fetchDirectory]);

  const buildParams = (overrides: Record<string, string> = {}) => {
    const base: Record<string, string> = {};
    if (searchProfession)    base.profession           = searchProfession;
    if (searchCountry)       base.country              = searchCountry;
    if (searchCity)          base.city                 = searchCity;
    if (therapeuticApproach) base.therapeuticApproach  = therapeuticApproach;
    if (problematic)         base.problematic          = problematic;
    if (modality)            base.modality             = modality;
    return { ...base, ...overrides };
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(buildParams());
  };

  const setQuickFilter = (prof: string) => {
    setSearchProfession(prof);
    setSearchParams({ profession: prof, ...(searchCity ? { city: searchCity } : {}) });
  };

  const clearFilter = (key: string) => {
    const params = Object.fromEntries(searchParams.entries());
    delete params[key];
    setSearchParams(params);
    if (key === 'therapeuticApproach') setTherapeuticApproach('');
    if (key === 'problematic')         setProblematic('');
    if (key === 'modality')            setModality('');
  };

  const activeFilterCount = [activeTApproach, activeProblematic, activeModality].filter(Boolean).length;

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
    border: `1px solid ${active ? 'rgba(45,212,191,0.65)' : 'rgba(255,255,255,0.15)'}`,
    background: active ? 'rgba(45,212,191,0.18)' : 'rgba(0,0,0,0.3)',
    color: active ? '#2dd4bf' : 'rgba(255,255,255,0.5)',
    fontFamily: 'inherit', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.15s',
  });

  return (
    <div className="explorar-root" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)', position: 'relative' }}>
      <LandingHeader />

      {/* ══ HERO ══ */}
      <section style={{
        position: 'relative', height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <video autoPlay loop muted playsInline style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 0,
        }}>
          <source src={VIDEO_URL} type="video/mp4" />
        </video>

        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(12,12,12,0.65) 0%, rgba(12,12,12,0.30) 40%, rgba(12,12,12,0.80) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 60%, rgba(20,94,82,0.75) 0%, rgba(13,60,53,0.45) 50%, transparent 75%)',
          mixBlendMode: 'multiply',
        } as React.CSSProperties} />

        <div style={{
          position: 'relative', zIndex: 2, width: '100%', maxWidth: 860,
          padding: '0 24px', textAlign: 'center', marginBottom: '8vh',
        }}>
          <Link to="/" className="ex-a1" style={{
            display: 'inline-block', marginBottom: 28,
            color: 'rgba(255,255,255,0.68)', textDecoration: 'none',
            fontSize: 14, letterSpacing: '0.08em',
          }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>←</span> ALIAX.IO
          </Link>

          <p className="ex-a2" style={{
            color: 'rgba(255,255,255,0.55)', fontSize: 11,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 16, fontWeight: 500,
          }}>
            {profiles.length > 0 ? `${profiles.length} psicólogos disponibles` : 'Directorio de psicólogos verificados'}
          </p>

          <h1 className="ex-a3" style={{
            color: '#ffffff', fontSize: 'clamp(2.4rem, 7vw, 5rem)',
            fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 32px',
          }}>
            Encuentra al psicólogo<br />
            <span style={{
              background: 'linear-gradient(90deg, #2dd4bf 0%, #a7f3d0 40%, #2dd4bf 80%, #0d9488 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              que necesitas
            </span>
          </h1>

          {/* ── Matching IA — protagonista ── */}
          <div className="ex-a4" style={{ maxWidth: 720, margin: '0 auto 16px' }}>
            <button onClick={openMatch} className="ex-match-btn" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              padding: '24px 32px', borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.38) 0%, rgba(45,212,191,0.30) 100%)',
              border: '1px solid rgba(139,92,246,0.55)',
              color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 12px 40px rgba(139,92,246,0.28), 0 6px 16px rgba(0,0,0,0.35)',
              transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s, border-color 0.25s',
            }}>
              <Sparkles size={24} color="#c4b5fd" style={{ flexShrink: 0 }} />
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>Encuentra tu match ideal con IA</span>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                  Responde 5 preguntas y te decimos qué psicólogo encaja contigo
                </span>
              </span>
            </button>
          </div>

          {/* ── Barra de búsqueda manual (secundaria) ── */}
          <p style={{
            color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.1em', textAlign: 'center', margin: '0 0 10px',
          }}>
            o busca manualmente
          </p>
          <form className="ex-a4" onSubmit={handleSearch} style={{ maxWidth: 720, margin: '0 auto 12px' }}>
            <div className="ex-search-bar" style={{
              display: 'flex', overflow: 'hidden', borderRadius: 14,
              background: 'rgba(8,5,20,0.55)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            }}>
              <div className="ex-sf-profession" style={{ flex: 2, minWidth: 0, overflow: 'visible' }}>
                <SearchSelect
                  value={searchProfession}
                  onChange={setSearchProfession}
                  options={PROFESSIONS}
                  placeholder="Profesión"
                  icon={<Zap size={14} color="rgba(255,255,255,0.35)" />}
                />
              </div>

              <div className="ex-sf-sep" style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0', flexShrink: 0 }} />

              <div className="ex-sf-city" style={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
                <SearchSelect
                  value={searchCountry}
                  onChange={v => { setSearchCountry(v); setSearchCity(''); }}
                  options={Object.keys(COUNTRIES_CITIES)}
                  placeholder="País"
                  icon={<MapPin size={14} color="rgba(255,255,255,0.35)" />}
                />
              </div>

              <div className="ex-sf-sep" style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0', flexShrink: 0 }} />

              <div className="ex-sf-city" style={{ flex: 1, minWidth: 0, overflow: 'visible', opacity: searchCountry ? 1 : 0.45, pointerEvents: searchCountry ? 'auto' : 'none' }}>
                <SearchSelect
                  value={searchCity}
                  onChange={setSearchCity}
                  options={searchCountry ? COUNTRIES_CITIES[searchCountry] : []}
                  placeholder="Ciudad"
                />
              </div>

              <div className="ex-sf-sep" style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0', flexShrink: 0 }} />

              {/* Filtros toggle */}
              <button type="button" onClick={() => setShowFilters(s => !s)}
                className="ex-sf-city"
                style={{
                  padding: '0 18px', border: 'none', background: 'transparent',
                  color: activeFilterCount > 0 ? '#2dd4bf' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                <SlidersHorizontal size={14} />
                <span className="ex-btn-search-label">
                  Problemática{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </span>
              </button>

              <button type="submit" className="ex-btn-search" style={{
                padding: '0 28px', border: 'none', flexShrink: 0,
                background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Search size={15} />
                <span className="ex-btn-search-label">Buscar</span>
              </button>
            </div>
          </form>

          {/* ── Panel de filtros ── */}
          {showFilters && (
            <div style={{
              maxWidth: 720, margin: '0 auto 12px',
              background: 'rgba(8,5,20,0.88)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '20px 24px',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              textAlign: 'left',
              maxHeight: '55vh', overflowY: 'auto',
            }}>
              {/* Problemática */}
              <div>
                <p style={{ color: 'rgba(45,212,191,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  ¿Qué estás viviendo?
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PROBLEMATICS.map(p => (
                    <button key={p} type="button"
                      onClick={() => setProblematic(problematic === p ? '' : p)}
                      style={pillStyle(problematic === p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aplicar */}
              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setSearchParams(buildParams()); setShowFilters(false); }}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
                    color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  }}>
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}

          {/* ── Filtros activos como chips ── */}
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
              {activeProblematic && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.35)',
                  borderRadius: 20, padding: '4px 10px',
                  color: '#2dd4bf', fontSize: 11,
                }}>
                  {activeProblematic}
                  <button onClick={() => clearFilter('problematic')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2dd4bf', padding: 0, display: 'flex' }}>
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* ── Quick filters ── */}
          <div className="ex-a5" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {POPULAR_PROFESSIONS.map(p => (
              <button key={p} onClick={() => setQuickFilter(p)}
                className="ex-pill" style={pillStyle(profession === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GRID DE RESULTADOS ══ */}
      <div style={{
        background: 'transparent',
        paddingBottom: 100,
      }}>
        <div className="ex-a6" style={{ maxWidth: 980, margin: '0 auto', padding: '52px 24px 0' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(45,212,191,0.12)' }} />
            <p style={{
              color: 'rgba(180,165,220,0.5)', fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>
              {loading ? 'Buscando...' : `${profiles.length} profesionales`}
            </p>
            <div style={{ flex: 1, height: 1, background: 'rgba(45,212,191,0.12)' }} />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <div className="ex-spinner" style={{
                width: 34, height: 34, margin: '0 auto 16px',
                border: '3px solid rgba(45,212,191,0.15)',
                borderTopColor: '#2dd4bf', borderRadius: '50%',
              }} />
              <p style={{ color: 'rgba(45,212,191,0.45)', fontSize: 14 }}>Buscando profesionales...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <p style={{ color: 'rgba(210,195,240,0.5)', fontSize: 16, margin: '0 0 8px' }}>
                No encontramos profesionales con esos filtros.
              </p>
              <p style={{ color: 'rgba(210,195,240,0.3)', fontSize: 13 }}>
                Intenta con otra profesión, ciudad o ajusta los filtros.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16, alignItems: 'stretch',
            }}>
              {profiles.map(profile => (
                <Link key={profile.id} to={`/book/${profile.slug}`}
                  style={{ textDecoration: 'none', display: 'flex' }}>
                  <div
                    className={`ex-card${profile.isPro ? ' ex-card-pro' : ''}`}
                    style={{
                      flex: 1, minWidth: 0,
                      background: profile.isPro ? 'rgba(45,212,191,0.06)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${profile.isPro ? 'rgba(45,212,191,0.35)' : 'rgba(45,212,191,0.12)'}`,
                      borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14,
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    }}>

                    {/* Avatar + info */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.title}
                          style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 46, height: 46, borderRadius: '50%',
                          background: 'rgba(45,212,191,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#2dd4bf', fontSize: 17, fontWeight: 600, flexShrink: 0,
                        }}>
                          {profile.title?.[0] ?? '?'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                          <span style={{
                            color: '#ede8ff', fontWeight: 600, fontSize: 14,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            minWidth: 0,
                          }}>
                            {profile.title}
                          </span>
                          {profile.isPro && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.35)',
                              borderRadius: 20, padding: '2px 7px',
                              color: '#2dd4bf', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                              flexShrink: 0,
                            }}>
                              <Zap size={8} /> PRO
                            </span>
                          )}
                        </div>
                        {(profile.reviewCount ?? 0) > 0 && profile.averageRating != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#2dd4bf" stroke="#2dd4bf" strokeWidth="1.5">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#2dd4bf' }}>{profile.averageRating}</span>
                            <span style={{ fontSize: 11, color: 'rgba(180,165,220,0.65)' }}>({profile.reviewCount})</span>
                          </div>
                        )}
                        <p style={{ color: 'rgba(180,165,220,0.65)', fontSize: 12, margin: '3px 0 0' }}>
                          {profile.profession}
                        </p>

                        {/* Ciudad + modalidad */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          {profile.city && (
                            <span style={{
                              color: 'rgba(160,145,200,0.45)', fontSize: 11,
                              display: 'flex', alignItems: 'center', gap: 3,
                            }}>
                              <MapPin size={9} /> {profile.city}{profile.country ? `, ${profile.country}` : ''}
                            </span>
                          )}
                          {profile.modality && (
                            <span style={{
                              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 4, padding: '1px 6px',
                              color: 'rgba(200,185,240,0.55)', fontSize: 10,
                            }}>
                              {MODALITY_LABEL[profile.modality] ?? profile.modality}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags: enfoques o servicios */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minHeight: 24 }}>
                      {profile.therapeuticApproaches && profile.therapeuticApproaches.length > 0
                        ? profile.therapeuticApproaches.slice(0, 3).map(a => (
                          <span key={a} style={{
                            background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.20)',
                            borderRadius: 6, padding: '3px 9px',
                            color: 'rgba(45,212,191,0.8)', fontSize: 11,
                          }}>
                            {a}
                          </span>
                        ))
                        : profile.services.slice(0, 3).map(s => (
                          <span key={s.id} style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 6, padding: '3px 9px',
                            color: 'rgba(210,195,240,0.6)', fontSize: 11,
                          }}>
                            {s.name}
                          </span>
                        ))
                      }
                    </div>

                    {/* Precio */}
                    {profile.pricePerSession != null && (
                      <p style={{ color: 'rgba(180,165,220,0.5)', fontSize: 12, margin: 0 }}>
                        desde <span style={{ color: '#2dd4bf', fontWeight: 600 }}>
                          {profile.sessionCurrency ?? 'MXN'} {Number(profile.pricePerSession).toLocaleString()}
                        </span> / sesión
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />

      {/* ══ MODAL MATCHING IA ══ */}
      {showMatch && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) closeMatch(); }} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            width: '100%', maxWidth: 560, background: 'rgb(12,28,26)',
            border: '1px solid rgba(139,92,246,0.35)', borderRadius: 20,
            padding: 32, position: 'relative', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <button onClick={closeMatch} style={{
              position: 'absolute', top: 16, right: 16, background: 'none',
              border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: 4,
            }}><X size={20} /></button>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Sparkles size={18} color="#c4b5fd" />
                <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>Matching inteligente</h2>
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
                Responde 5 preguntas y la IA encontrará los terapeutas más compatibles contigo.
              </p>
            </div>

            {/* Step: pregunta */}
            {matchStep < 5 && currentQ && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                  {MATCH_QUESTIONS.map((_, i) => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 4,
                      background: i <= matchStep ? '#c4b5fd' : 'rgba(255,255,255,0.12)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>

                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                  Pregunta {matchStep + 1} de 5
                </p>
                <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 600, margin: '0 0 20px', lineHeight: 1.4 }}>
                  {currentQ.label}
                </h3>

                {currentQ.type === 'textarea' && (
                  <textarea
                    value={currentAnswer}
                    onChange={e => setMatchAnswers(a => ({ ...a, [currentQ.key]: e.target.value }))}
                    rows={3}
                    placeholder={(currentQ as { placeholder?: string }).placeholder}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(139,92,246,0.4)',
                      color: '#fff', fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                )}

                {currentQ.type === 'options' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(currentQ as { options: readonly string[] }).options.map(opt => (
                      <button key={opt} onClick={() => setMatchAnswers(a => ({ ...a, [currentQ.key]: opt }))} style={{
                        padding: '12px 16px', borderRadius: 10, textAlign: 'left',
                        background: currentAnswer === opt ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.07)',
                        border: `1.5px solid ${currentAnswer === opt ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.15)'}`,
                        color: currentAnswer === opt ? '#c4b5fd' : 'rgba(255,255,255,0.75)',
                        fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button onClick={() => setMatchStep(s => Math.max(0, s - 1))} disabled={matchStep === 0} style={{
                    padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent', color: matchStep === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
                    fontSize: 14, fontFamily: 'inherit', cursor: matchStep === 0 ? 'not-allowed' : 'pointer',
                  }}>← Anterior</button>

                  {matchStep < 4 ? (
                    <button onClick={() => setMatchStep(s => s + 1)} disabled={!currentAnswer.trim()} style={{
                      padding: '10px 24px', borderRadius: 10, border: 'none',
                      background: currentAnswer.trim() ? 'linear-gradient(135deg, #8b5cf6, #2dd4bf)' : 'rgba(255,255,255,0.1)',
                      color: currentAnswer.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                      cursor: currentAnswer.trim() ? 'pointer' : 'not-allowed',
                    }}>Siguiente →</button>
                  ) : (
                    <button onClick={() => {
                      if (!matchAnswers.q5.trim()) setMatchAnswers(a => ({ ...a, q5: 'Sin preferencias adicionales' }));
                      handleMatchSubmit();
                    }} style={{
                      padding: '10px 24px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6, #2dd4bf)',
                      color: '#fff',
                      fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}><Sparkles size={14} /> Encontrar mi match</button>
                  )}
                </div>
              </div>
            )}

            {/* Step: cargando */}
            {matchStep === 5 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Loader2 size={40} color="#c4b5fd" style={{ animation: 'spin 1s linear infinite', marginBottom: 20 }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>Analizando compatibilidad...</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>La IA está revisando todos los perfiles</p>
              </div>
            )}

            {/* Step: resultados */}
            {matchStep === 6 && matchResults && (
              <div>
                <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>
                  {matchResults.length > 0 ? `${matchResults.length} terapeutas compatibles encontrados` : 'Sin resultados por ahora'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 20px' }}>
                  Ordenados por compatibilidad con tus respuestas
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {matchResults.map((m, i) => (
                    <Link key={m.profileId} to={`/${m.profile.slug}`} onClick={closeMatch} style={{ textDecoration: 'none' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 14, padding: '14px 16px', transition: 'border-color 0.2s',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                      }}>
                        {m.profile.avatar
                          ? <img src={m.profile.avatar} alt={m.profile.title} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#c4b5fd', fontSize: 18, fontWeight: 700 }}>
                              {m.profile.title.charAt(0)}
                            </div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                            <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{m.profile.title}</span>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                              background: i === 0 ? 'rgba(139,92,246,0.3)' : 'rgba(45,212,191,0.15)',
                              border: `1px solid ${i === 0 ? 'rgba(139,92,246,0.6)' : 'rgba(45,212,191,0.3)'}`,
                              borderRadius: 20, padding: '3px 10px',
                            }}>
                              <Star size={11} color={i === 0 ? '#c4b5fd' : '#2dd4bf'} fill={i === 0 ? '#c4b5fd' : '#2dd4bf'} />
                              <span style={{ color: i === 0 ? '#c4b5fd' : '#2dd4bf', fontSize: 12, fontWeight: 700 }}>{m.score}%</span>
                            </div>
                          </div>
                          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{m.reason}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <button onClick={() => { setMatchStep(0); setMatchResults(null); setMatchAnswers({ q1: '', q2: '', q3: '', q4: '', q5: '' }); }} style={{
                  marginTop: 20, width: '100%', padding: '11px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
                  color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                }}>
                  Volver a responder
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
