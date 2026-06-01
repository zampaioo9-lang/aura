import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Facebook, Instagram, Linkedin, MessageCircle, Moon, Sun, ArrowLeft, MapPin, Star, Banknote, GraduationCap, Shield, BookOpen, Globe } from 'lucide-react';
import { formatPrice, formatDuration, formatTime } from '../../lib/utils';

interface TemplateProps {
  profile: any;
  onBook: (serviceId: string) => void;
}

const SOCIAL_CONFIG = [
  { key: 'facebook',  Icon: Facebook,      color: '#1877F2' },
  { key: 'instagram', Icon: Instagram,     color: '#E1306C' },
  { key: 'linkedin',  Icon: Linkedin,      color: '#0A66C2' },
  { key: 'whatsapp',  Icon: MessageCircle, color: '#25D366' },
];

function buildSocialUrl(key: string, value: string): string {
  if (!value) return '';
  if (key === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
  return value.startsWith('http') ? value : `https://${value}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function buildTheme(hex: string | undefined) {
  const rgb = hex ? hexToRgb(hex) : null;
  const [r, g, b] = rgb ?? [147, 51, 234];
  const accent       = `rgb(${r},${g},${b})`;
  const accentSoft   = `rgba(${r},${g},${b},0.12)`;
  const accentBorder = `rgba(${r},${g},${b},0.28)`;
  const accentFaint  = `rgba(${r},${g},${b},0.16)`;
  const ds = `rgb(${Math.round(r * 0.18)},${Math.round(g * 0.12)},${Math.round(b * 0.28)})`;
  const de = `rgb(${Math.round(r * 0.7)},${Math.round(g * 0.55)},${Math.round(b * 0.85)})`;
  const ll = `rgb(${Math.min(255, r + 55)},${Math.min(255, g + 45)},${Math.min(255, b + 30)})`;

  // Radial glow background — 3 orbs at different positions
  const glowBg = (base: string) =>
    `radial-gradient(ellipse 55% 55% at 12% 75%, rgba(${r},${g},${b},0.22) 0%, transparent 65%),` +
    `radial-gradient(ellipse 45% 45% at 88% 18%, rgba(${r},${g},${b},0.15) 0%, transparent 65%),` +
    `radial-gradient(ellipse 30% 35% at 58% 92%, rgba(${r},${g},${b},0.10) 0%, transparent 60%),` +
    base;

  return {
    dark: {
      main: glowBg('#080414'),
      mainFlat: '#080414',
      card: 'rgba(20,12,40,0.85)',
      border: accentFaint,
      text: '#e8e8f0', muted: 'rgb(148,132,170)',
      accent, accentSoft, accentBorder,
    },
    light: {
      main: glowBg('#f2eeff'),
      mainFlat: '#f2eeff',
      card: 'rgba(255,255,255,0.88)',
      border: '#e9d5ff',
      text: '#1e0a3c', muted: '#6d28d9',
      accent, accentSoft: `rgba(${r},${g},${b},0.08)`, accentBorder: `rgba(${r},${g},${b},0.25)`,
    },
    sideGradientDark:  `linear-gradient(160deg, ${ds} 0%, ${de} 100%)`,
    sideGradientLight: `linear-gradient(160deg, ${accent} 0%, ${ll} 100%)`,
  };
}

const DAY_SHORT: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 0: 'Dom',
};

const COUNTRY_CODES: Record<string, string> = {
  'Alemania': 'de', 'Argentina': 'ar', 'Australia': 'au', 'Bolivia': 'bo',
  'Brasil': 'br', 'Canadá': 'ca', 'Chile': 'cl', 'China': 'cn',
  'Colombia': 'co', 'Costa Rica': 'cr', 'Cuba': 'cu', 'Rep. Dominicana': 'do',
  'Ecuador': 'ec', 'El Salvador': 'sv', 'España': 'es', 'Estados Unidos': 'us',
  'Francia': 'fr', 'Guatemala': 'gt', 'Honduras': 'hn', 'India': 'in',
  'Italia': 'it', 'Japón': 'jp', 'México': 'mx', 'Nicaragua': 'ni',
  'Panamá': 'pa', 'Paraguay': 'py', 'Perú': 'pe', 'Portugal': 'pt',
  'Puerto Rico': 'pr', 'Reino Unido': 'gb', 'Uruguay': 'uy', 'Venezuela': 've',
};

const MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrida: 'Híbrida',
};

const DEGREE_LABEL: Record<string, string> = {
  licenciatura: 'Licenciatura',
  especializacion: 'Especialización',
  maestria: 'Maestría',
  doctorado: 'Doctorado',
};

export default function MinimalistTemplate({ profile, onBook }: TemplateProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const navigate = useNavigate();
  const theme = buildTheme(profile.customization?.primaryColor);
  const C = darkMode ? theme.dark : theme.light;
  const sideGradient = darkMode ? theme.sideGradientDark : theme.sideGradientLight;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const activeServices = (profile.services || []).filter((s: any) => s.isActive !== false);
  const socialLinks = (profile.user?.socialLinks || profile.socialLinks || {}) as Record<string, string>;
  const activeSocials = SOCIAL_CONFIG.filter(s => socialLinks[s.key]);

  const slots: any[] = profile.availabilitySlots || [];
  const byDay: Record<number, { startTime: string; endTime: string }[]> = {};
  for (const slot of slots) {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
  }
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const activeDays = DAY_ORDER.filter(d => byDay[d]?.length);

  const displayName = profile.user?.name || profile.title || '';
  const bio         = profile.bio || profile.user?.bio || '';
  const initials    = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const countryCode = profile.country ? COUNTRY_CODES[profile.country] : null;
  const whatsappUrl = profile.phone ? `https://wa.me/${profile.phone.replace(/\D/g, '')}` : null;
  const hasPills    = !!(profile.specialty || (profile.yearsExperience != null && profile.yearsExperience !== ''));

  /* ── MOBILE ─────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: C.main, color: C.text, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", paddingTop: 16 }}>
        {/* Floating controls */}
        <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', gap: 8, zIndex: 20 }}>
          <CtrlBtn onClick={() => navigate(-1)}><ArrowLeft size={16} /></CtrlBtn>
          <CtrlBtn onClick={() => setDarkMode(d => !d)}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </CtrlBtn>
        </div>

        {/* Profile header */}
        <div style={{ background: sideGradient, padding: '52px 28px 36px', margin: '0 12px', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {profile.avatar ? (
            <img src={profile.avatar} alt={displayName} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.45)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', marginBottom: 16 }} />
          ) : (
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, color: 'white', marginBottom: 16 }}>
              {initials || '?'}
            </div>
          )}
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: 'white', margin: '0 0 4px', lineHeight: 1.2 }}>{displayName}</p>
          {profile.profession && <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)', margin: '0 0 12px' }}>{profile.profession}</p>}

          {hasPills && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
              {profile.specialty && <Pill>{profile.specialty}</Pill>}
              {profile.yearsExperience != null && profile.yearsExperience !== '' && (
                <Pill>{profile.yearsExperience} años de exp.</Pill>
              )}
            </div>
          )}

          {(profile.city || profile.country) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              {countryCode && <img src={`https://circle-flags.cdn.skk.moe/flags/${countryCode}.svg`} alt={profile.country} style={{ width: 20, height: 20 }} />}
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {bio && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, maxWidth: 340, margin: '0 0 16px' }}>{bio}</p>}

          {activeSocials.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: whatsappUrl ? 14 : 0 }}>
              {activeSocials.map(({ key, Icon }) => {
                const url = buildSocialUrl(key, socialLinks[key]);
                if (!url) return null;
                return (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}>
                    <Icon size={15} />
                  </a>
                );
              })}
            </div>
          )}

          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(37,211,102,0.88)', color: 'white', padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
        </div>

        {/* Mobile content */}
        <div style={{ padding: '24px 16px 64px' }}>

          {/* Sesión info mobile */}
          {(profile.modality || profile.pricePerSession != null) && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel>Sesión</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {profile.modality && (
                  <span style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '5px 14px', color: C.accent, fontSize: 12, fontWeight: 500 }}>
                    {MODALITY_LABEL[profile.modality] ?? profile.modality}
                  </span>
                )}
                {profile.pricePerSession != null && (
                  <span style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '5px 14px', color: C.accent, fontSize: 12, fontWeight: 500 }}>
                    {profile.sessionCurrency ?? 'MXN'} {Number(profile.pricePerSession).toLocaleString()}
                    {profile.sessionDurationMinutes ? ` · ${profile.sessionDurationMinutes} min` : ''}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Enfoques mobile */}
          {profile.therapeuticApproaches?.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel>Enfoques terapéuticos</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {profile.therapeuticApproaches.map((a: string) => (
                  <span key={a} style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '5px 14px', color: C.accent, fontSize: 12, fontWeight: 500 }}>
                    {a}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Problemáticas mobile */}
          {profile.problematics?.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel>Trabajo con</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {profile.problematics.map((p: string) => (
                  <span key={p} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 14px', color: C.text, fontSize: 12, fontWeight: 500 }}>
                    {p}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Forma de trabajar mobile */}
          {profile.workingStyle && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel>Mi forma de trabajar</SectionLabel>
              <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.7, margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>
                {profile.workingStyle}
              </p>
            </section>
          )}

          {activeServices.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <SectionLabel>Servicios</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                {activeServices.map((s: any) => (
                  <BoardServiceCard key={s.id} service={s} onBook={onBook} C={C} mobile />
                ))}
              </div>
            </section>
          )}

          {activeDays.length > 0 && (
            <section>
              <SectionLabel>Horarios de atención</SectionLabel>
              <div style={{ marginTop: 14 }}>
                <AvailabilityWidget activeDays={activeDays} byDay={byDay} C={C} />
              </div>
            </section>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 48 }}>
            Powered by <span style={{ color: C.accent, fontWeight: 600 }}>Aliax.io</span>
          </p>
        </div>
      </div>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.main, color: C.text, fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>

      {/* Floating controls */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 100 }}>
        <CtrlBtn onClick={() => navigate(-1)} shadow><ArrowLeft size={18} /></CtrlBtn>
        <CtrlBtn onClick={() => setDarkMode(d => !d)} shadow>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </CtrlBtn>
      </div>

      {/* ── Sidebar — dashboard nav style ── */}
      <aside style={{
        width: 290, flexShrink: 0,
        background: darkMode ? 'rgba(9,5,22,0.98)' : 'rgba(246,242,255,0.98)',
        backdropFilter: 'blur(24px)',
        borderRight: `1px solid ${C.border}`,
        overflowY: 'auto', scrollbarWidth: 'none',
        display: 'flex', flexDirection: 'column',
        padding: '36px 18px 28px',
      }}>

        {/* Profile header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 6px', marginBottom: 28 }}>
          {profile.avatar ? (
            <img src={profile.avatar} alt={displayName} style={{
              width: 120, height: 120, borderRadius: '50%', objectFit: 'cover',
              border: `3px solid ${C.accentBorder}`,
              boxShadow: `0 0 0 6px ${C.accentSoft}, 0 10px 32px rgba(0,0,0,0.45)`,
              marginBottom: 16,
            }} />
          ) : (
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: C.accentSoft, border: `3px solid ${C.accentBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 700, color: C.accent, marginBottom: 16,
            }}>
              {initials || '?'}
            </div>
          )}
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px', lineHeight: 1.2 }}>
            {displayName}
          </p>
          {profile.profession && (
            <span style={{ fontSize: 13, fontWeight: 600, background: C.accentSoft, color: C.accent, borderRadius: 7, padding: '4px 12px' }}>
              {profile.profession}
            </span>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, margin: '0 6px 24px' }} />

        {/* "Información" section */}
        {(profile.specialty || (profile.yearsExperience != null && profile.yearsExperience !== '') || profile.city || profile.country) && (
          <SideSection label="Información">
            {profile.specialty && (
              <SideRow icon={<Star size={14} />} C={C}>{profile.specialty}</SideRow>
            )}
            {profile.yearsExperience != null && profile.yearsExperience !== '' && (
              <SideRow icon={<Clock size={14} />} C={C}>{profile.yearsExperience} años de experiencia</SideRow>
            )}
            {(profile.city || profile.country) && (
              <SideRow
                icon={countryCode
                  ? <img src={`https://circle-flags.cdn.skk.moe/flags/${countryCode}.svg`} alt="" style={{ width: 14, height: 14, borderRadius: '50%' }} />
                  : <MapPin size={14} />}
                C={C}
              >
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </SideRow>
            )}
          </SideSection>
        )}

        {/* "Bio" section */}
        {bio && (
          <SideSection label="Bio">
            <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.68, margin: 0, padding: '2px 6px' }}>
              {bio}
            </p>
          </SideSection>
        )}

        {/* Sesión — precio y modalidad */}
        {(profile.modality || profile.pricePerSession != null) && (
          <SideSection label="Sesión">
            {profile.modality && (
              <SideRow icon={<MapPin size={14} />} C={C}>
                {MODALITY_LABEL[profile.modality] ?? profile.modality}
              </SideRow>
            )}
            {profile.pricePerSession != null && (
              <SideRow icon={<Banknote size={14} />} C={C}>
                {profile.sessionCurrency ?? 'MXN'} {Number(profile.pricePerSession).toLocaleString()}
                {profile.sessionDurationMinutes ? ` · ${profile.sessionDurationMinutes} min` : ''}
              </SideRow>
            )}
            {profile.acceptsInvoice && (
              <SideRow icon={<Shield size={14} />} C={C}>Emite factura</SideRow>
            )}
          </SideSection>
        )}

        {/* Formación */}
        {(profile.degree || profile.university || profile.cedula) && (
          <SideSection label="Formación">
            {profile.degree && (
              <SideRow icon={<GraduationCap size={14} />} C={C}>
                {DEGREE_LABEL[profile.degree] ?? profile.degree}
              </SideRow>
            )}
            {profile.university && (
              <SideRow icon={<BookOpen size={14} />} C={C}>{profile.university}</SideRow>
            )}
            {profile.cedula && (
              <SideRow icon={<Shield size={14} />} C={C}>Cédula {profile.cedula}</SideRow>
            )}
          </SideSection>
        )}

        {/* Idiomas */}
        {profile.languages?.length > 0 && (
          <SideSection label="Idiomas">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 6px' }}>
              {profile.languages.map((l: string) => (
                <span key={l} style={{
                  background: C.accentSoft, border: `1px solid ${C.accentBorder}`,
                  borderRadius: 6, padding: '3px 9px',
                  color: C.accent, fontSize: 11, fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <Globe size={10} /> {l}
                </span>
              ))}
            </div>
          </SideSection>
        )}

        {/* "Contacto" section */}
        {(whatsappUrl || activeSocials.filter(s => s.key !== 'whatsapp').length > 0) && (
          <SideSection label="Contacto">
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                  background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.32)',
                  borderRadius: 10, textDecoration: 'none', marginBottom: 6, transition: 'opacity .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <MessageCircle size={15} color="#25D366" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#25D366' }}>WhatsApp Business</span>
              </a>
            )}
            {activeSocials.filter(s => s.key !== 'whatsapp').length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 6px' }}>
                {activeSocials.filter(s => s.key !== 'whatsapp').map(({ key, Icon, color }) => {
                  const url = buildSocialUrl(key, socialLinks[key]);
                  if (!url) return null;
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: C.accentSoft, border: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color, textDecoration: 'none', transition: 'opacity .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </SideSection>
        )}

        <div style={{ flex: 1 }} />
        <p style={{ fontSize: 11, color: C.muted, opacity: 0.45, marginTop: 24, padding: '0 6px' }}>
          Powered by <span style={{ fontWeight: 600 }}>Aliax.io</span>
        </p>
      </aside>

      {/* ── Board: services top, availability horizontal bottom ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '52px 64px 72px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Enfoques terapéuticos */}
          {profile.therapeuticApproaches?.length > 0 && (
            <div>
              <SectionLabel>Enfoques terapéuticos</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {profile.therapeuticApproaches.map((a: string) => (
                  <span key={a} style={{
                    background: C.accentSoft, border: `1px solid ${C.accentBorder}`,
                    borderRadius: 8, padding: '5px 14px',
                    color: C.accent, fontSize: 12, fontWeight: 500,
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Problemáticas */}
          {profile.problematics?.length > 0 && (
            <div>
              <SectionLabel>Trabajo con</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {profile.problematics.map((p: string) => (
                  <span key={p} style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '5px 14px',
                    color: C.text, fontSize: 12, fontWeight: 500,
                  }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Población */}
          {profile.populations?.length > 0 && (
            <div>
              <SectionLabel>Atiendo a</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {profile.populations.map((p: string) => (
                  <span key={p} style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: '5px 14px',
                    color: C.text, fontSize: 12, fontWeight: 500,
                  }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mi forma de trabajar */}
          {profile.workingStyle && (
            <div>
              <SectionLabel>Mi forma de trabajar</SectionLabel>
              <p style={{
                fontSize: 14, color: C.muted, lineHeight: 1.7,
                margin: '12px 0 0', whiteSpace: 'pre-wrap',
              }}>
                {profile.workingStyle}
              </p>
            </div>
          )}

          {/* Services — 2-column square grid */}
          {activeServices.length > 0 && (
            <div>
              <SectionLabel>Servicios</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                {activeServices.map((s: any) => (
                  <BoardServiceCard key={s.id} service={s} onBook={onBook} C={C} />
                ))}
              </div>
            </div>
          )}

          {/* Availability — horizontal strip below services */}
          {activeDays.length > 0 && (
            <div>
              <SectionLabel>Horarios de atención</SectionLabel>
              <div style={{ marginTop: 14 }}>
                <AvailabilityWidget activeDays={activeDays} byDay={byDay} C={C} />
              </div>
            </div>
          )}

          {activeServices.length === 0 && activeDays.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 15, minHeight: 200 }}>
              No hay servicios disponibles aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5, margin: 0 }}>
      {children}
    </p>
  );
}

function SideSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(148,132,170,0.55)', margin: '0 0 8px 6px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </div>
    </div>
  );
}

function SideRow({ icon, children, C }: { icon: React.ReactNode; children: React.ReactNode; C: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10 }}>
      <span style={{ color: C.accent, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.text, lineHeight: 1.3 }}>{children}</span>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '4px 12px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function CtrlBtn({ onClick, children, shadow }: { onClick: () => void; children: React.ReactNode; shadow?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: shadow ? 44 : 38, height: shadow ? 44 : 38, borderRadius: '50%', background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(8px)', boxShadow: shadow ? '0 4px 20px rgba(0,0,0,0.35)' : 'none', transition: 'opacity .15s' }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
}

/* Service card — square with image fill and overlay */
function BoardServiceCard({ service: s, onBook, C, mobile = false }: { service: any; onBook: (id: string) => void; C: any; mobile?: boolean }) {
  void mobile;
  return (
    <div
      style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.35)', border: `1px solid ${C.border}`, cursor: 'default', transition: 'transform .18s, box-shadow .18s' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'scale(1.025)'; el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)'; }}
    >
      {/* Background: image or accent placeholder */}
      {s.image ? (
        <img src={s.image} alt={s.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 800, color: C.accent, opacity: 0.6 }}>
          {s.name[0]?.toUpperCase()}
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)' }} />

      {/* Content pinned to bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {s.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.accent, margin: 0, lineHeight: 1.1 }}>
              {formatPrice(s.price, s.currency)}
            </p>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Clock size={9} /> {formatDuration(s.durationMinutes)}
            </span>
          </div>
          <button
            onClick={() => onBook(s.id)}
            style={{ flexShrink: 0, background: C.accent, color: 'white', border: 'none', borderRadius: 8, padding: '6px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}

/* Availability — horizontal day columns */
function AvailabilityWidget({ activeDays, byDay, C }: { activeDays: number[]; byDay: Record<number, { startTime: string; endTime: string }[]>; C: any }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setShowFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    check();
    el.addEventListener('scroll', check, { passive: true });
    return () => el.removeEventListener('scroll', check);
  }, [activeDays]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={scrollRef} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)', overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' }}>
      <div style={{ display: 'flex', minWidth: 'max-content' }}>
      {activeDays.map((day, i) => (
        <div
          key={day}
          style={{
            width: 90, flexShrink: 0,
            padding: '16px 12px',
            borderRight: i < activeDays.length - 1 ? `1px solid ${C.border}` : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}
        >
          {/* Day header pill */}
          <div style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '3px 10px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: '0.04em' }}>
              {DAY_SHORT[day]}
            </span>
          </div>

          {/* Time slot pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', alignItems: 'center' }}>
            {byDay[day]
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((s, si) => (
                <span
                  key={si}
                  style={{
                    fontSize: 10, fontWeight: 600, color: C.text,
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: '4px 6px',
                    whiteSpace: 'nowrap', width: '100%', textAlign: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  {formatTime(s.startTime)}<br />{formatTime(s.endTime)}
                </span>
              ))}
          </div>
        </div>
      ))}
      </div>
      </div>
      {/* Right fade + arrow hint */}
      {showFade && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 56,
          borderRadius: '0 16px 16px 0',
          background: `linear-gradient(to right, transparent, ${C.card})`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 10, pointerEvents: 'none',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: C.accentSoft, border: `1px solid ${C.accentBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2l4 4-4 4" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
