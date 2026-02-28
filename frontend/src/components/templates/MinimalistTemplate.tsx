import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Facebook, Instagram, Linkedin, MessageCircle, Moon, Sun, ArrowLeft } from 'lucide-react';
import { formatPrice, formatDuration, formatTime } from '../../lib/utils';

interface TemplateProps {
  profile: any;
  onBook: (serviceId: string) => void;
}

const SOCIAL_CONFIG = [
  { key: 'facebook',  Icon: Facebook,       color: '#1877F2' },
  { key: 'instagram', Icon: Instagram,      color: '#E1306C' },
  { key: 'linkedin',  Icon: Linkedin,       color: '#0A66C2' },
  { key: 'whatsapp',  Icon: MessageCircle,  color: '#25D366' },
];

function buildSocialUrl(key: string, value: string): string {
  if (!value) return '';
  if (key === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
  return value.startsWith('http') ? value : `https://${value}`;
}

const DARK_C = {
  main:        '#080414',
  side:        '#0e0920',
  card:        '#160d30',
  border:      'rgba(147,51,234,0.18)',
  text:        '#e8e8f0',
  muted:       'rgb(156,140,180)',
  accent:      'rgb(147,51,234)',
  accentSoft:  'rgba(147,51,234,0.12)',
  accentBorder:'rgba(147,51,234,0.3)',
};

const LIGHT_C = {
  main:        '#faf5ff',
  side:        '#f3e8ff',
  card:        '#ffffff',
  border:      '#e9d5ff',
  text:        '#3b0764',
  muted:       '#7e22ce',
  accent:      'rgb(147,51,234)',
  accentSoft:  'rgba(147,51,234,0.08)',
  accentBorder:'rgba(147,51,234,0.25)',
};

const DAY_SHORT: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom',
};

export default function MinimalistTemplate({ profile, onBook }: TemplateProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const navigate = useNavigate();
  const C = darkMode ? DARK_C : LIGHT_C;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const heroGradient = darkMode
    ? 'linear-gradient(160deg, #1e1240 0%, #6b21a8 100%)'
    : 'linear-gradient(160deg, #9333ea 0%, #c084fc 100%)';

  const activeServices = (profile.services || []).filter((s: any) => s.isActive !== false);
  const visibleServices = activeServices.slice(0, 6);
  const hasMore = activeServices.length > 6;

  const socialLinks = profile.socialLinks || {};
  const activeSocials = SOCIAL_CONFIG.filter(s => socialLinks[s.key]);

  // Availability grouped by day
  const slots: any[] = profile.availabilitySlots || [];
  const byDay: Record<number, { startTime: string; endTime: string }[]> = {};
  for (const slot of slots) {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  }
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const activeDays = DAY_ORDER.filter(d => byDay[d]?.length);

  return (
    <div style={{ minHeight: '100vh', background: C.main, color: C.text, fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>

      {/* ── Mobile top bar ────────────────────────────────── */}
      {isMobile && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: 8, padding: '12px 16px 0', background: C.main,
        }}>
          <button
            onClick={() => navigate(-1)}
            title="Salir"
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: C.card, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: C.muted,
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: C.card, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: C.muted,
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────── */}
      <div style={{ padding: '8px 16px 0', background: C.main }}>
        <div style={{
          maxWidth: 640, margin: '0 auto',
          background: heroGradient,
          borderRadius: 24,
        }}>
          <div style={{ padding: '52px 28px 44px', textAlign: 'center' }}>

            {/* Avatar */}
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.title}
                style={{
                  width: 128, height: 128, borderRadius: '50%', objectFit: 'cover',
                  margin: '0 auto 24px',
                  border: '3px solid rgba(255,255,255,0.45)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              />
            ) : (
              <div style={{
                width: 128, height: 128, borderRadius: '50%', margin: '0 auto 24px',
                background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40, fontWeight: 700, color: 'white',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {(profile.title || '?').charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name */}
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 32, fontWeight: 700, letterSpacing: -0.5,
              color: 'white', margin: '0 0 6px',
            }}>
              {profile.title}
            </h1>

            {/* Profession */}
            {profile.profession && (
              <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.85)', margin: '0 0 8px' }}>
                {profile.profession}
              </p>
            )}

            {/* Specialty + Years of experience */}
            {(profile.specialty || profile.yearsExperience) && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {profile.specialty && (
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: 'rgba(255,255,255,0.9)',
                    borderRadius: 20, padding: '4px 14px',
                  }}>
                    {profile.specialty}
                  </span>
                )}
                {profile.yearsExperience != null && profile.yearsExperience !== '' && (
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: 'rgba(255,255,255,0.9)',
                    borderRadius: 20, padding: '4px 14px',
                  }}>
                    {profile.yearsExperience} años de experiencia
                  </span>
                )}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p style={{
                fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7,
                maxWidth: 480, margin: '0 auto 20px',
              }}>
                {profile.bio}
              </p>
            )}

            {/* Social links */}
            {activeSocials.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                {activeSocials.map(({ key, Icon }) => {
                  const url = buildSocialUrl(key, socialLinks[key]);
                  if (!url) return null;
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', transition: 'opacity .15s', textDecoration: 'none',
                      }}
                    >
                      <Icon size={18} />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Video */}
            {profile.videoUrl && (
              <div style={{ marginTop: 28, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                <video
                  src={profile.videoUrl}
                  controls
                  style={{ width: '100%', borderRadius: 16, border: '1px solid rgba(255,255,255,0.2)' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ── Services ─────────────────────────────────── */}
        {visibleServices.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: C.muted, marginBottom: 20,
            }}>
              Servicios
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {visibleServices.map((s: any) => (
                <div
                  key={s.id}
                  style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 20, overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {s.image && (
                    <img src={s.image} alt={s.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '20px 20px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: C.text, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {s.name}
                      </h4>
                      <span style={{ fontSize: 18, fontWeight: 700, color: C.accent, marginLeft: 12, flexShrink: 0 }}>
                        {formatPrice(s.price, s.currency)}
                      </span>
                    </div>
                    {s.description && (
                      <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                        {s.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.muted }}>
                        <Clock size={14} /> {formatDuration(s.durationMinutes)}
                      </span>
                      <button
                        onClick={() => onBook(s.id)}
                        style={{
                          background: C.accent, color: 'white', border: 'none',
                          borderRadius: 10, padding: '8px 20px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          transition: 'opacity .15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        Reservar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <p style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 16 }}>
                Y {activeServices.length - 6} servicios más...
              </p>
            )}
          </section>
        )}

        {/* ── Availability ─────────────────────────────── */}
        {activeDays.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: C.muted, marginBottom: 20, textAlign: 'center',
            }}>
              Horarios de atención
            </h2>
            <div
              style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 20, padding: '24px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activeDays.map((day, i) => (
                  <div
                    key={day}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: i < activeDays.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}
                  >
                    <span style={{
                      fontSize: 14, fontWeight: 600, color: C.text, minWidth: 48,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                      {DAY_SHORT[day]}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                      {byDay[day]
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((s, si) => (
                          <span
                            key={si}
                            style={{
                              fontSize: 13, color: C.accent, fontWeight: 500,
                              background: C.accentSoft, border: `1px solid ${C.accentBorder}`,
                              borderRadius: 8, padding: '3px 10px',
                            }}
                          >
                            {formatTime(s.startTime)} – {formatTime(s.endTime)}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingBottom: 32 }}>
        <span style={{ fontSize: 12, color: C.muted }}>
          Powered by <span style={{ color: C.accent, fontWeight: 600 }}>Aliax.io</span>
        </span>
      </div>

      {/* Floating controls — desktop only */}
      {!isMobile && <div style={{
        position: 'fixed', bottom: 24, right: 16,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 100,
      }}>
        <button
          onClick={() => navigate(-1)}
          title="Salir"
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: C.card, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.muted,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            transition: 'opacity .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => setDarkMode(d => !d)}
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: C.card, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: C.muted,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            transition: 'opacity .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>}

    </div>
  );
}
