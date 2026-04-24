import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Zap } from 'lucide-react';
import api from '../api/client';

interface DirectoryProfile {
  id: string;
  slug: string;
  title: string;
  profession: string;
  bio?: string;
  avatar?: string;
  country?: string;
  specialty?: string;
  isPro: boolean;
  services: { id: string; name: string; price: number; currency: string }[];
}

const POPULAR_PROFESSIONS = [
  'Psicólogo/a', 'Barbero/a', 'Nutricionista', 'Entrenador/a Personal',
  'Médico/a General', 'Estilista', 'Coach de Vida', 'Fisioterapeuta',
];

export default function Explorar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const profession = searchParams.get('profession') || '';
  const city = searchParams.get('city') || '';
  const [searchProfession, setSearchProfession] = useState(profession);
  const [searchCity, setSearchCity] = useState(city);

  useEffect(() => {
    setSearchProfession(profession);
    setSearchCity(city);
  }, [profession, city]);

  const fetchDirectory = useCallback(async (prof: string, cit: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (prof) params.set('profession', prof);
      if (cit) params.set('city', cit);
      const res = await api.get(`/profiles/directory?${params}&limit=50`);
      setProfiles(res.data.profiles);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory(profession, city);
  }, [profession, city, fetchDirectory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      ...(searchProfession ? { profession: searchProfession } : {}),
      ...(searchCity ? { city: searchCity } : {}),
    });
  };

  const setQuickFilter = (prof: string) => {
    setSearchProfession(prof);
    setSearchParams({ profession: prof, ...(searchCity ? { city: searchCity } : {}) });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080414 0%, #0e0920 60%, #160d30 100%)',
      fontFamily: 'system-ui, sans-serif',
      padding: '0 0 60px',
    }}>
      {/* Header hero */}
      <div style={{
        padding: '48px 20px 32px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link to="/" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: 13, display: 'block', marginBottom: 16 }}>
          ← Volver a Aliax
        </Link>
        <h1 style={{ color: '#f0ebff', fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>
          Encuentra un profesional
        </h1>
        <p style={{ color: '#9d95b5', fontSize: 15, margin: '0 0 28px' }}>
          {profiles.length > 0 ? `${profiles.length} profesionales encontrados` : 'Busca por especialidad o ciudad'}
        </p>

        {/* Search form */}
        <form onSubmit={handleSearch} style={{
          display: 'flex', gap: 10, maxWidth: 600,
          margin: '0 auto 20px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 2, minWidth: 200, position: 'relative' }}>
            <Search size={16} color="#9d95b5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Profesión (ej: Psicólogo)"
              value={searchProfession}
              onChange={e => setSearchProfession(e.target.value)}
              style={{
                width: '100%', padding: '12px 12px 12px 38px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#f0ebff', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140, position: 'relative' }}>
            <MapPin size={16} color="#9d95b5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Ciudad"
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              style={{
                width: '100%', padding: '12px 12px 12px 36px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#f0ebff', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button type="submit" style={{
            padding: '12px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(90deg, #6b63ff, #9333ea)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Buscar
          </button>
        </form>

        {/* Quick filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {POPULAR_PROFESSIONS.map(p => (
            <button
              key={p}
              onClick={() => setQuickFilter(p)}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${profession === p ? 'rgba(107,99,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                background: profession === p ? 'rgba(107,99,255,0.2)' : 'transparent',
                color: profession === p ? '#a78bfa' : '#9d95b5',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9d95b5', padding: 40 }}>Buscando...</div>
        ) : profiles.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9d95b5', padding: 60 }}>
            <p style={{ fontSize: 16 }}>No encontramos profesionales con esos filtros.</p>
            <p style={{ fontSize: 13 }}>Intenta con otra profesión o ciudad.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {profiles.map(profile => (
              <Link
                key={profile.id}
                to={`/book/${profile.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${profile.isPro ? 'rgba(107,99,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 16,
                  padding: 20,
                  transition: 'border-color 0.2s, background 0.2s',
                  cursor: 'pointer',
                }}>
                  {/* Header con avatar y badge Pro */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.title}
                        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(107,99,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#a78bfa', fontSize: 18, fontWeight: 700, flexShrink: 0,
                      }}>
                        {profile.title?.[0] ?? '?'}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#f0ebff', fontWeight: 600, fontSize: 15 }}>{profile.title}</span>
                        {profile.isPro && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: 'rgba(107,99,255,0.2)',
                            border: '1px solid rgba(107,99,255,0.4)',
                            borderRadius: 20, padding: '2px 7px',
                            color: '#a78bfa', fontSize: 10, fontWeight: 700,
                          }}>
                            <Zap size={9} /> PRO
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#9d95b5', fontSize: 12, margin: '2px 0 0' }}>{profile.profession}</p>
                      {profile.country && (
                        <p style={{ color: '#6b6b80', fontSize: 11, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={10} /> {profile.country}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p style={{
                      color: '#9d95b5', fontSize: 13, margin: '0 0 10px',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {profile.bio}
                    </p>
                  )}

                  {/* Servicios preview */}
                  {profile.services.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {profile.services.slice(0, 2).map(s => (
                        <span key={s.id} style={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: 6, padding: '3px 8px',
                          color: '#cdc0e0', fontSize: 11,
                        }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
