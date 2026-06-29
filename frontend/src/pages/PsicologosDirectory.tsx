import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Zap, ArrowLeft, Search } from 'lucide-react';
import api from '../api/client';
import SiteFooter from '../components/landing/SiteFooter';

// ── Mapeos de slugs a valores reales ──────────────────────────────

const COUNTRY_MAP: Record<string, string> = {
  mx: 'México', co: 'Colombia', ar: 'Argentina', cl: 'Chile',
  pe: 'Perú', ec: 'Ecuador', ve: 'Venezuela', bo: 'Bolivia',
  uy: 'Uruguay', py: 'Paraguay', gt: 'Guatemala', cr: 'Costa Rica',
  es: 'España', us: 'Estados Unidos',
};

const APPROACH_MAP: Record<string, string> = {
  tcc: 'Cognitivo-conductual (TCC)',
  sistemico: 'Sistémico',
  psicoanalitico: 'Psicoanalítico',
  psicodinamico: 'Psicodinámico',
  humanista: 'Humanista',
  gestalt: 'Gestalt',
  emdr: 'EMDR',
  'mindfulness-act': 'Mindfulness / ACT',
  narrativo: 'Narrativo',
  integrativo: 'Integrativo',
  existencial: 'Existencial',
  logoterapia: 'Logoterapia',
};

const MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial', online: 'Online', hibrida: 'Híbrida',
};

function slugToCity(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Tipos ─────────────────────────────────────────────────────────

interface DirectoryProfile {
  id: string; slug: string; title: string; profession: string;
  bio?: string; avatar?: string; city?: string; country?: string;
  modality?: string; pricePerSession?: number; sessionCurrency?: string;
  therapeuticApproaches?: string[]; isPro: boolean;
  services: { id: string; name: string; price: number; currency: string }[];
}

// ── Componente ────────────────────────────────────────────────────

export default function PsicologosDirectory() {
  const { countryCode, citySlug, approach } = useParams<{
    countryCode?: string; citySlug?: string; approach?: string;
  }>();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const countryName   = countryCode ? COUNTRY_MAP[countryCode] ?? countryCode : undefined;
  const cityName      = citySlug ? slugToCity(citySlug) : undefined;
  const approachName  = approach ? APPROACH_MAP[approach] ?? approach : undefined;

  // ── Meta texts ───────────────────────────────────────────────────
  const parts = ['Psicólogos'];
  if (approachName) parts.push(approachName);
  if (cityName)     parts.push(`en ${cityName}`);
  if (countryName && !cityName) parts.push(`en ${countryName}`);

  const pageTitle       = `${parts.join(' ')} | Aliax`;
  const pageDescription = [
    `Encuentra psicólogos${approachName ? ` con enfoque ${approachName}` : ''}`,
    cityName ? `en ${cityName}` : countryName ? `en ${countryName}` : 'en Latinoamérica',
    '— directorio gratuito, agenda tu cita fácilmente.',
  ].join(' ');

  const h1 = [
    'Psicólogos',
    approachName ? `· ${approachName}` : '',
    cityName ? `en ${cityName}` : countryName ? `en ${countryName}` : '',
  ].filter(Boolean).join(' ');

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ profession: 'Psicólogo/a', limit: '50' });
      if (countryName)  params.set('country', countryName);
      if (cityName)     params.set('city', cityName);
      if (approachName) params.set('therapeuticApproach', approachName);
      const res = await api.get(`/profiles/directory?${params}`);
      setProfiles(res.data.profiles);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [countryName, cityName, approachName]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // ── Breadcrumb ───────────────────────────────────────────────────
  const crumbs: { label: string; to: string }[] = [
    { label: 'Explorar', to: '/explorar' },
    { label: 'Psicólogos', to: '/psicologos' },
  ];
  if (countryCode && countryName) crumbs.push({ label: countryName, to: `/psicologos/${countryCode}` });
  if (citySlug && cityName)       crumbs.push({ label: cityName, to: `/psicologos/${countryCode}/${citySlug}` });
  if (approach && approachName)   crumbs.push({ label: approachName, to: '#' });

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <link rel="canonical" href={`https://www.aliax.io${window.location.pathname}`} />
      </Helmet>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)', color: '#e8e0f8', fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>

        {/* Nav */}
        <nav style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          maxWidth: 980, margin: '0 auto',
        }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
          }}>
            <ArrowLeft size={15} /> Volver
          </button>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: 13, letterSpacing: '0.08em' }}>
            ALIAX.IO
          </Link>
          <Link to="/explorar" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(107,99,255,0.2)', border: '1px solid rgba(107,99,255,0.35)',
            borderRadius: 8, padding: '6px 14px',
            color: '#a78bfa', fontSize: 12, fontWeight: 600, textDecoration: 'none',
          }}>
            <Search size={13} /> Búsqueda avanzada
          </Link>
        </nav>

        <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 100px' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {crumbs.map((c, i) => (
              <span key={c.to} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>/</span>}
                {i < crumbs.length - 1 ? (
                  <Link to={c.to} style={{ color: 'rgba(180,165,220,0.55)', fontSize: 12, textDecoration: 'none' }}>
                    {c.label}
                  </Link>
                ) : (
                  <span style={{ color: 'rgba(180,165,220,0.85)', fontSize: 12 }}>{c.label}</span>
                )}
              </span>
            ))}
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700,
            color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 8px',
          }}>
            {h1}
          </h1>
          <p style={{ color: 'rgba(180,165,220,0.55)', fontSize: 14, margin: '0 0 40px' }}>
            {loading ? 'Buscando...' : `${profiles.length} profesionales disponibles`}
          </p>

          {/* Filtros rápidos por enfoque — solo si no hay approach ya */}
          {!approach && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 36 }}>
              {Object.entries(APPROACH_MAP).slice(0, 8).map(([slug, label]) => (
                <Link
                  key={slug}
                  to={citySlug
                    ? `/psicologos/${countryCode}/${citySlug}/${slug}`
                    : countryCode
                      ? `/psicologos/${countryCode}/${slug}`
                      : `/psicologos/${slug}`
                  }
                  style={{
                    padding: '6px 14px', borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 12,
                    textDecoration: 'none',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Grid de resultados */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <div style={{
                width: 34, height: 34, margin: '0 auto 16px',
                border: '3px solid rgba(107,99,255,0.15)',
                borderTopColor: '#9b87f5', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ color: 'rgba(167,139,250,0.45)', fontSize: 14 }}>Buscando psicólogos...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <p style={{ color: 'rgba(210,195,240,0.5)', fontSize: 16, margin: '0 0 8px' }}>
                No encontramos psicólogos con esos filtros.
              </p>
              <Link to="/explorar" style={{ color: '#a78bfa', fontSize: 14 }}>
                Ver todos los profesionales →
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {profiles.map(profile => (
                <Link key={profile.id} to={`/book/${profile.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: profile.isPro ? 'rgba(107,99,255,0.08)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${profile.isPro ? 'rgba(139,115,255,0.35)' : 'rgba(255,255,255,0.11)'}`,
                    borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    height: '100%',
                  }}>
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
                          <span style={{ color: '#ede8ff', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile.title}
                          </span>
                          {profile.isPro && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              background: 'rgba(107,99,255,0.18)', border: '1px solid rgba(107,99,255,0.38)',
                              borderRadius: 20, padding: '2px 7px',
                              color: '#a78bfa', fontSize: 9, fontWeight: 700,
                            }}>
                              <Zap size={8} /> PRO
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'rgba(180,165,220,0.65)', fontSize: 12, margin: '3px 0 0' }}>
                          {profile.profession}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          {profile.city && (
                            <span style={{ color: 'rgba(160,145,200,0.45)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
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

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
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

          {/* Schema.org structured data */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: h1,
            description: pageDescription,
            numberOfItems: profiles.length,
            itemListElement: profiles.slice(0, 10).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Person',
                name: p.title,
                jobTitle: p.profession,
                url: `https://www.aliax.io/book/${p.slug}`,
              },
            })),
          })}} />
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
