import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Zap, SlidersHorizontal, X } from 'lucide-react';
import api from '../api/client';
import './Explorar.css';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4';

const THERAPEUTIC_APPROACHES = [
  'Cognitivo-conductual (TCC)', 'Psicoanalítico', 'Psicodinámico', 'Sistémico',
  'Humanista', 'Gestalt', 'EMDR', 'Mindfulness / ACT', 'Narrativo',
  'Integrativo', 'Breve estratégico', 'Logoterapia', 'Existencial',
];

const PROBLEMATICS = [
  'Ansiedad', 'Depresión', 'Estrés', 'Trauma / PTSD', 'Duelo',
  'Problemas de pareja', 'Familia y crianza', 'Autoestima',
  'Trastornos alimenticios', 'Fobias / TOC', 'Adicciones',
  'TDAH / Neurodivergencia', 'Orientación sexual / Diversidad',
];

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
  services: { id: string; name: string; price: number; currency: string }[];
}

const POPULAR_PROFESSIONS = [
  'Psicólogo/a', 'Psicoterapeuta', 'Barbero/a', 'Nutricionista',
  'Entrenador/a Personal', 'Estilista', 'Coach de Vida', 'Fisioterapeuta',
];

const MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrida: 'Híbrida',
};

export default function Explorar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const profession         = searchParams.get('profession')         || '';
  const city               = searchParams.get('city')               || '';
  const activeTApproach    = searchParams.get('therapeuticApproach') || '';
  const activeProblematic  = searchParams.get('problematic')        || '';
  const activeModality     = searchParams.get('modality')           || '';

  const [searchProfession,   setSearchProfession]   = useState(profession);
  const [searchCity,         setSearchCity]         = useState(city);
  const [therapeuticApproach, setTherapeuticApproach] = useState(activeTApproach);
  const [problematic,        setProblematic]        = useState(activeProblematic);
  const [modality,           setModality]           = useState(activeModality);

  useEffect(() => {
    setSearchProfession(profession);
    setSearchCity(city);
    setTherapeuticApproach(activeTApproach);
    setProblematic(activeProblematic);
    setModality(activeModality);
  }, [profession, city, activeTApproach, activeProblematic, activeModality]);

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
    fetchDirectory({ profession, city, therapeuticApproach: activeTApproach, problematic: activeProblematic, modality: activeModality });
  }, [profession, city, activeTApproach, activeProblematic, activeModality, fetchDirectory]);

  const buildParams = (overrides: Record<string, string> = {}) => {
    const base: Record<string, string> = {};
    if (searchProfession)   base.profession          = searchProfession;
    if (searchCity)         base.city                = searchCity;
    if (therapeuticApproach) base.therapeuticApproach = therapeuticApproach;
    if (problematic)        base.problematic         = problematic;
    if (modality)           base.modality            = modality;
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
    border: `1px solid ${active ? 'rgba(167,139,250,0.65)' : 'rgba(255,255,255,0.15)'}`,
    background: active ? 'rgba(107,99,255,0.28)' : 'rgba(0,0,0,0.3)',
    color: active ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
    fontFamily: 'inherit', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.15s',
  });

  return (
    <div className="explorar-root" style={{ minHeight: '100vh', background: '#06030f' }}>

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
          background: 'linear-gradient(to bottom, rgba(6,3,15,0.55) 0%, rgba(6,3,15,0.35) 40%, rgba(6,3,15,0.75) 100%)',
        }} />

        <div style={{
          position: 'relative', zIndex: 2, width: '100%', maxWidth: 860,
          padding: '0 24px', textAlign: 'center', marginBottom: '8vh',
        }}>
          <Link to="/" className="ex-a1" style={{
            display: 'inline-block', marginBottom: 28,
            color: 'rgba(255,255,255,0.68)', textDecoration: 'none',
            fontSize: 14, letterSpacing: '0.08em',
          }}>
            ← ALIAX.IO
          </Link>

          <p className="ex-a2" style={{
            color: 'rgba(255,255,255,0.55)', fontSize: 11,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 16, fontWeight: 500,
          }}>
            {profiles.length > 0 ? `${profiles.length} profesionales disponibles` : 'Directorio de profesionales verificados'}
          </p>

          <h1 className="ex-a3" style={{
            color: '#ffffff', fontSize: 'clamp(2.4rem, 7vw, 5rem)',
            fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 32px',
          }}>
            Encuentra al profesional<br />
            <span style={{
              background: 'linear-gradient(90deg, #a78bfa 0%, #c084fc 40%, #818cf8 80%, #a78bfa 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              que necesitas.
            </span>
          </h1>

          {/* ── Barra de búsqueda ── */}
          <form className="ex-a4" onSubmit={handleSearch} style={{ maxWidth: 720, margin: '0 auto 12px' }}>
            <div className="ex-search-bar" style={{
              display: 'flex', overflow: 'hidden', borderRadius: 14,
              background: 'rgba(8,5,20,0.75)',
              border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            }}>
              <div className="ex-sf-profession" style={{ flex: 2, display: 'flex', alignItems: 'center' }}>
                <input type="text" placeholder="Profesión"
                  value={searchProfession} onChange={e => setSearchProfession(e.target.value)}
                  style={{
                    width: '100%', padding: '20px 16px 20px 20px',
                    background: 'transparent', border: 'none',
                    color: '#ffffff', fontSize: 15, fontFamily: 'inherit',
                  }} />
              </div>

              <div className="ex-sf-sep" style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0', flexShrink: 0 }} />

              <div className="ex-sf-city" style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 160, position: 'relative' }}>
                <MapPin size={15} color="rgba(255,255,255,0.35)"
                  style={{ position: 'absolute', left: 18, pointerEvents: 'none', flexShrink: 0 }} />
                <input type="text" placeholder="Ciudad"
                  value={searchCity} onChange={e => setSearchCity(e.target.value)}
                  style={{
                    width: '100%', padding: '20px 16px 20px 44px',
                    background: 'transparent', border: 'none',
                    color: '#ffffff', fontSize: 15, fontFamily: 'inherit',
                  }} />
              </div>

              <div className="ex-sf-sep" style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0', flexShrink: 0 }} />

              {/* Filtros toggle */}
              <button type="button" onClick={() => setShowFilters(s => !s)}
                className="ex-sf-city"
                style={{
                  padding: '0 18px', border: 'none', background: 'transparent',
                  color: activeFilterCount > 0 ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                <SlidersHorizontal size={14} />
                <span className="ex-btn-search-label">
                  Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </span>
              </button>

              <button type="submit" className="ex-btn-search" style={{
                padding: '0 28px', border: 'none', flexShrink: 0,
                background: 'linear-gradient(135deg, #6b63ff 0%, #9333ea 100%)',
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
            }}>
              {/* Modalidad */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ color: 'rgba(180,165,220,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  Modalidad
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['presencial', 'online', 'hibrida'] as const).map(m => (
                    <button key={m} type="button"
                      onClick={() => setModality(modality === m ? '' : m)}
                      style={pillStyle(modality === m)}>
                      {MODALITY_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enfoque terapéutico */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ color: 'rgba(180,165,220,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  Enfoque terapéutico
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {THERAPEUTIC_APPROACHES.map(a => (
                    <button key={a} type="button"
                      onClick={() => setTherapeuticApproach(therapeuticApproach === a ? '' : a)}
                      style={pillStyle(therapeuticApproach === a)}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Problemática */}
              <div>
                <p style={{ color: 'rgba(180,165,220,0.55)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
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
                    background: 'linear-gradient(135deg, #6b63ff 0%, #9333ea 100%)',
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
              {activeTApproach && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(107,99,255,0.22)', border: '1px solid rgba(139,115,255,0.4)',
                  borderRadius: 20, padding: '4px 10px',
                  color: '#c4b5fd', fontSize: 11,
                }}>
                  {activeTApproach}
                  <button onClick={() => clearFilter('therapeuticApproach')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', padding: 0, display: 'flex' }}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {activeProblematic && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(107,99,255,0.22)', border: '1px solid rgba(139,115,255,0.4)',
                  borderRadius: 20, padding: '4px 10px',
                  color: '#c4b5fd', fontSize: 11,
                }}>
                  {activeProblematic}
                  <button onClick={() => clearFilter('problematic')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', padding: 0, display: 'flex' }}>
                    <X size={11} />
                  </button>
                </span>
              )}
              {activeModality && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(107,99,255,0.22)', border: '1px solid rgba(139,115,255,0.4)',
                  borderRadius: 20, padding: '4px 10px',
                  color: '#c4b5fd', fontSize: 11,
                }}>
                  {MODALITY_LABEL[activeModality]}
                  <button onClick={() => clearFilter('modality')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c4b5fd', padding: 0, display: 'flex' }}>
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
        background: 'linear-gradient(to bottom, rgba(6,3,15,0) 0%, rgba(10,6,22,0.98) 6%, rgba(10,6,22,1) 100%)',
        paddingBottom: 100,
      }}>
        <div className="ex-a6" style={{ maxWidth: 980, margin: '0 auto', padding: '52px 24px 0' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(167,139,250,0.12)' }} />
            <p style={{
              color: 'rgba(180,165,220,0.5)', fontSize: 11,
              letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>
              {loading ? 'Buscando...' : `${profiles.length} profesionales`}
            </p>
            <div style={{ flex: 1, height: 1, background: 'rgba(167,139,250,0.12)' }} />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <div className="ex-spinner" style={{
                width: 34, height: 34, margin: '0 auto 16px',
                border: '3px solid rgba(107,99,255,0.15)',
                borderTopColor: '#9b87f5', borderRadius: '50%',
              }} />
              <p style={{ color: 'rgba(167,139,250,0.45)', fontSize: 14 }}>Buscando profesionales...</p>
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
                      flex: 1,
                      background: profile.isPro ? 'rgba(107,99,255,0.08)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${profile.isPro ? 'rgba(139,115,255,0.35)' : 'rgba(255,255,255,0.11)'}`,
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
                          background: 'rgba(107,99,255,0.22)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#a78bfa', fontSize: 17, fontWeight: 600, flexShrink: 0,
                        }}>
                          {profile.title?.[0] ?? '?'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            color: '#ede8ff', fontWeight: 600, fontSize: 14,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {profile.title}
                          </span>
                          {profile.isPro && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              background: 'rgba(107,99,255,0.18)', border: '1px solid rgba(107,99,255,0.38)',
                              borderRadius: 20, padding: '2px 7px',
                              color: '#a78bfa', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                            }}>
                              <Zap size={8} /> PRO
                            </span>
                          )}
                        </div>
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
                            background: 'rgba(107,99,255,0.1)', border: '1px solid rgba(107,99,255,0.2)',
                            borderRadius: 6, padding: '3px 9px',
                            color: 'rgba(196,181,253,0.7)', fontSize: 11,
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
                        desde <span style={{ color: '#c4b5fd', fontWeight: 600 }}>
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
    </div>
  );
}
