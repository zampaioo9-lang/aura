import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Facebook, Instagram, Linkedin, MessageCircle, Moon, Sun, ArrowLeft, MapPin, Star, Banknote, GraduationCap, Shield, BookOpen, Globe, ShieldCheck } from 'lucide-react';
import { formatPrice, formatDuration, formatTime } from '../../lib/utils';
import api from '../../api/client';

interface TemplateProps {
  profile: any;
  onBook: (serviceId: string) => void;
}

const LANDING_BG = 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)';
const LIGHT_BG   = 'linear-gradient(135deg, #f5f0ff 0%, #e6f7f4 50%, #f0fffe 100%)';

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
  const parsed = hex ? hexToRgb(hex) : null;
  const [r, g, b] = parsed ?? [45, 212, 191];
  const accent       = `rgb(${r},${g},${b})`;
  const accentSoft   = `rgba(${r},${g},${b},0.12)`;
  const accentBorder = `rgba(${r},${g},${b},0.28)`;
  const accentFaint  = `rgba(${r},${g},${b},0.16)`;

  return {
    dark: {
      card: `rgba(${Math.round(r*0.14)},${Math.round(g*0.08)},${Math.round(b*0.21)},0.85)`,
      border: accentFaint,
      text: '#e8f0f0', muted: 'rgb(110,165,160)',
      accent, accentSoft, accentBorder,
    },
    light: {
      card: 'rgba(255,255,255,0.88)',
      border: accentFaint,
      text: '#0a1f1e', muted: `rgb(${Math.round(r*0.5)},${Math.round(g*0.5)},${Math.round(b*0.5)})`,
      accent, accentSoft: `rgba(${r},${g},${b},0.08)`, accentBorder: `rgba(${r},${g},${b},0.25)`,
    },
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

function ReviewsSection({
  reviews, averageRating, reviewCount, C,
}: {
  reviews: { id: string; rating: number; comment: string | null; clientName: string; createdAt: string }[];
  averageRating: number;
  reviewCount: number;
  C: ReturnType<typeof buildTheme>['dark'];
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? reviews : reviews.slice(0, 5);

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Star fill={C.accent} color={C.accent} size={16} />
        <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{averageRating}</span>
        <span style={{ fontSize: 13, color: C.muted }}>({reviewCount} reseña{reviewCount !== 1 ? 's' : ''})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(r => (
          <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={12} fill={n <= r.rating ? C.accent : 'none'} color={n <= r.rating ? C.accent : C.muted} strokeWidth={1.5} />
              ))}
            </div>
            {r.comment && <p style={{ fontSize: 13, color: C.text, margin: '0 0 6px', lineHeight: 1.6 }}>{r.comment}</p>}
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{r.clientName}</p>
          </div>
        ))}
      </div>
      {reviews.length > 5 && (
        <button onClick={() => setShowAll(v => !v)} style={{ marginTop: 10, background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: C.muted, borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer', width: '100%' }}>
          {showAll ? 'Ver menos' : `Ver ${reviews.length - 5} más`}
        </button>
      )}
    </div>
  );
}

export default function MinimalistTemplate({ profile, onBook }: TemplateProps) {
  const [darkMode, setDarkMode] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const navigate = useNavigate();
  const theme = buildTheme(profile.customization?.primaryColor);
  const C = darkMode ? theme.dark : theme.light;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [reviewData, setReviewData] = useState<{
    reviews: { id: string; rating: number; comment: string | null; clientName: string; createdAt: string }[];
    averageRating: number | null;
    reviewCount: number;
  }>({ reviews: [], averageRating: null, reviewCount: 0 });
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  useEffect(() => {
    if (!profile.id) return;
    api.get(`/reviews/profile/${profile.id}`)
      .then(res => setReviewData(res.data))
      .catch(() => {})
      .finally(() => setReviewsLoaded(true));
  }, [profile.id]);

  const glassCard: React.CSSProperties = {
    background: darkMode ? 'rgba(15,22,36,0.92)' : 'rgba(255,255,255,0.88)',
    border: darkMode ? '1px solid rgba(255,255,255,0.09)' : 'none',
    borderRadius: 20,
    boxShadow: darkMode ? '0 2px 16px rgba(0,0,0,0.4)' : '0 4px 20px rgba(45,212,191,0.10), 0 1px 6px rgba(0,0,0,0.06)',
  };

  const sectionCard: React.CSSProperties = {
    ...glassCard,
    borderRadius: 16,
    padding: '22px 24px',
  };

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

  const displayName = profile.title || profile.user?.name || '';
  const bio         = profile.bio || profile.user?.bio || '';
  const initials    = displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const countryCode = profile.country ? COUNTRY_CODES[profile.country] : null;
  const whatsappUrl = profile.phone ? `https://wa.me/${profile.phone.replace(/\D/g, '')}` : null;
  const hasPills    = !!(profile.specialty || (profile.yearsExperience != null && profile.yearsExperience !== ''));

  /* ── MOBILE ─────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: darkMode ? LANDING_BG : LIGHT_BG, color: C.text, fontFamily: "'Inter','Plus Jakarta Sans',system-ui,sans-serif", padding: '24px 18px 80px', position: 'relative' }}>

        {/* Floating controls */}
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8, zIndex: 20 }}>
          <CtrlBtn onClick={() => navigate(-1)}><ArrowLeft size={16} /></CtrlBtn>
          <CtrlBtn onClick={() => setDarkMode(d => !d)}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </CtrlBtn>
        </div>

        {/* Profile card */}
        <div style={{ ...glassCard, padding: '52px 20px 24px', marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {profile.avatar ? (
            <img src={profile.avatar} alt={displayName} style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.accent}`, boxShadow: `0 0 0 4px ${C.accentSoft}`, marginBottom: 14 }} />
          ) : (
            <div style={{ width: 110, height: 110, borderRadius: '50%', background: C.accentSoft, border: `3px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, color: C.accent, marginBottom: 14 }}>
              {initials || '?'}
            </div>
          )}
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 6px', lineHeight: 1.2 }}>{displayName}</p>
          {profile.profession && (
            <span style={{ fontSize: 12, fontWeight: 600, background: C.accentSoft, color: C.accent, borderRadius: 7, padding: '4px 12px', marginBottom: 8, display: 'inline-block' }}>{profile.profession}</span>
          )}
          {profile.cedula && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(45,212,191,0.10)', border: '1px solid rgba(45,212,191,0.30)', borderRadius: 20, padding: '4px 11px', marginBottom: 10 }}>
              <ShieldCheck size={12} color="#2dd4bf" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#2dd4bf', letterSpacing: '0.02em' }}>Profesional Verificado</span>
            </div>
          )}

          {hasPills && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
              {profile.specialty && <Pill>{profile.specialty}</Pill>}
              {profile.yearsExperience != null && profile.yearsExperience !== '' && (
                <Pill>{profile.yearsExperience} años de exp.</Pill>
              )}
            </div>
          )}

          {(profile.city || profile.country) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              {countryCode && <img src={`https://circle-flags.cdn.skk.moe/flags/${countryCode}.svg`} alt={profile.country} style={{ width: 18, height: 18 }} />}
              <span style={{ fontSize: 13, color: C.muted }}>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
            </div>
          )}

          {bio && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, maxWidth: 340, margin: '0 0 14px' }}>{bio}</p>}

          {activeSocials.filter(s => s.key !== 'whatsapp').length > 0 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              {activeSocials.filter(s => s.key !== 'whatsapp').map(({ key, Icon, color }) => {
                const url = buildSocialUrl(key, socialLinks[key]);
                if (!url) return null;
                return (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ width: 36, height: 36, borderRadius: 10, background: C.accentSoft, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, textDecoration: 'none' }}>
                    <Icon size={15} />
                  </a>
                );
              })}
            </div>
          )}

          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#25D366', color: 'white', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <MessageCircle size={14} /> WhatsApp Business
            </a>
          )}
        </div>

        {/* Content section cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {(profile.degree || profile.university || profile.cedula) && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Formación</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {profile.degree && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={13} color={C.muted} />
                    <span style={{ fontSize: 13, color: C.muted }}>{DEGREE_LABEL[profile.degree] ?? profile.degree}</span>
                  </div>
                )}
                {profile.university && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BookOpen size={13} color={C.muted} />
                    <span style={{ fontSize: 13, color: C.muted }}>{profile.university}</span>
                  </div>
                )}
                {profile.cedula && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={13} color={C.accent} />
                    <span style={{ fontSize: 13, color: C.muted }}>Céd. Prof. <span style={{ color: C.text, fontWeight: 600 }}>{profile.cedula}</span></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {profile.therapeuticApproaches?.length > 0 && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Enfoques terapéuticos</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {profile.therapeuticApproaches.map((a: string) => (
                  <span key={a} style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '5px 14px', color: C.accent, fontSize: 12, fontWeight: 500 }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          {(profile.modality || profile.pricePerSession != null) && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Sesión</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
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
            </div>
          )}

          {profile.problematics?.length > 0 && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Trabajo con</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {profile.problematics.map((p: string) => (
                  <span key={p} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 14px', color: C.text, fontSize: 12, fontWeight: 500 }}>{p}</span>
                ))}
              </div>
            </div>
          )}

          {profile.workingStyle && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Mi forma de trabajar</SectionLabel>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{profile.workingStyle}</p>
            </div>
          )}

          {activeServices.length > 0 && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Servicios</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
                {activeServices.map((s: any) => (
                  <BoardServiceCard key={s.id} service={s} onBook={onBook} C={C} mobile />
                ))}
              </div>
            </div>
          )}

          {activeDays.length > 0 && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Horarios de atención</SectionLabel>
              <div style={{ marginTop: 12 }}>
                <AvailabilityWidget activeDays={activeDays} byDay={byDay} C={C} />
              </div>
            </div>
          )}

          {reviewsLoaded && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Reseñas</SectionLabel>
              {reviewData.reviewCount > 0 && reviewData.averageRating !== null ? (
                <ReviewsSection reviews={reviewData.reviews} averageRating={reviewData.averageRating} reviewCount={reviewData.reviewCount} C={C} />
              ) : (
                <p style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>Aún no se han registrado reseñas.</p>
              )}
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, opacity: 0.4, marginTop: 36 }}>
          Powered by <span style={{ fontWeight: 600 }}>Aliax.io</span>
        </p>
      </div>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────── */
  const ASIDE_W  = 300;
  const COL_GAP  = 24;

  return (
    <div style={{
      minHeight: '100vh', background: darkMode ? LANDING_BG : LIGHT_BG,
      color: C.text, fontFamily: "'Inter','Plus Jakarta Sans',system-ui,sans-serif",
      display: 'flex', gap: COL_GAP, padding: '24px',
      alignItems: 'flex-start', position: 'relative', overflowX: 'clip',
    }}>

      {/* Glow orbs — igual que la landing */}
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', opacity: darkMode ? 0.18 : 0.12, pointerEvents: 'none', background: 'radial-gradient(circle, #2dd4bf 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40vw', height: '40vw', borderRadius: '50%', opacity: darkMode ? 0.13 : 0.08, pointerEvents: 'none', background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />

      {/* Floating controls */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 100 }}>
        <CtrlBtn onClick={() => navigate(-1)} shadow><ArrowLeft size={18} /></CtrlBtn>
        <CtrlBtn onClick={() => setDarkMode(d => !d)} shadow>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </CtrlBtn>
      </div>

      {/* ── LEFT: floating profile card — STICKY ── */}
      <aside style={{
        position: 'sticky', top: 24,
        alignSelf: 'flex-start',
        width: ASIDE_W, flexShrink: 0,
        height: 'calc(100vh - 48px)', overflowY: 'auto',
        scrollbarWidth: 'none',
        zIndex: 20,
        ...glassCard,
        padding: '36px 28px 28px',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 22 }}>
          {profile.avatar ? (
            <img src={profile.avatar} alt={displayName} style={{
              width: 132, height: 132, borderRadius: '50%', objectFit: 'cover',
              border: `3px solid ${C.accent}`,
              boxShadow: `0 0 0 5px ${C.accentSoft}, 0 10px 32px rgba(0,0,0,0.3)`,
              marginBottom: 16,
            }} />
          ) : (
            <div style={{
              width: 132, height: 132, borderRadius: '50%',
              background: C.accentSoft, border: `3px solid ${C.accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: 700, color: C.accent, marginBottom: 16,
            }}>
              {initials || '?'}
            </div>
          )}
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 700, color: C.text, margin: '0 0 8px', lineHeight: 1.2 }}>
            {displayName}
          </p>
          {profile.profession && (
            <span style={{ fontSize: 12, fontWeight: 600, background: C.accentSoft, color: C.accent, borderRadius: 7, padding: '4px 12px' }}>
              {profile.profession}
            </span>
          )}
          {profile.cedula && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(45,212,191,0.10)', border: '1px solid rgba(45,212,191,0.30)', borderRadius: 20, padding: '4px 11px', marginTop: 8 }}>
              <ShieldCheck size={12} color="#2dd4bf" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#2dd4bf', letterSpacing: '0.02em' }}>Profesional Verificado</span>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 18px' }} />

        {/* Info */}
        {(profile.specialty || profile.cedula || (profile.yearsExperience != null && profile.yearsExperience !== '') || profile.city || profile.country) && (
          <SideSection label="Información">
            {profile.specialty && <SideRow icon={<Star size={13} />} C={C}>{profile.specialty}</SideRow>}
            {profile.cedula && <SideRow icon={<ShieldCheck size={13} />} C={C}>Céd. Prof. {profile.cedula}</SideRow>}
            {profile.yearsExperience != null && profile.yearsExperience !== '' && (
              <SideRow icon={<Clock size={13} />} C={C}>{profile.yearsExperience} años de experiencia</SideRow>
            )}
            {(profile.city || profile.country) && (
              <SideRow
                icon={countryCode
                  ? <img src={`https://circle-flags.cdn.skk.moe/flags/${countryCode}.svg`} alt="" style={{ width: 13, height: 13, borderRadius: '50%' }} />
                  : <MapPin size={13} />}
                C={C}
              >
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </SideRow>
            )}
          </SideSection>
        )}

        {bio && (
          <SideSection label="Bio">
            <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.68, margin: 0, padding: '2px 6px' }}>{bio}</p>
          </SideSection>
        )}

        {(profile.modality || profile.pricePerSession != null) && (
          <SideSection label="Sesión">
            {profile.modality && (
              <SideRow icon={<MapPin size={13} />} C={C}>{MODALITY_LABEL[profile.modality] ?? profile.modality}</SideRow>
            )}
            {profile.pricePerSession != null && (
              <SideRow icon={<Banknote size={13} />} C={C}>
                {profile.sessionCurrency ?? 'MXN'} {Number(profile.pricePerSession).toLocaleString()}
                {profile.sessionDurationMinutes ? ` · ${profile.sessionDurationMinutes} min` : ''}
              </SideRow>
            )}
            {profile.acceptsInvoice && <SideRow icon={<Shield size={13} />} C={C}>Emite factura</SideRow>}
          </SideSection>
        )}

        {(profile.degree || profile.university) && (
          <SideSection label="Formación">
            {profile.degree && <SideRow icon={<GraduationCap size={13} />} C={C}>{DEGREE_LABEL[profile.degree] ?? profile.degree}</SideRow>}
            {profile.university && <SideRow icon={<BookOpen size={13} />} C={C}>{profile.university}</SideRow>}
          </SideSection>
        )}

        {profile.languages?.length > 0 && (
          <SideSection label="Idiomas">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 6px' }}>
              {profile.languages.map((l: string) => (
                <span key={l} style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, borderRadius: 6, padding: '3px 9px', color: C.accent, fontSize: 11, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={10} /> {l}
                </span>
              ))}
            </div>
          </SideSection>
        )}

        {(whatsappUrl || activeSocials.filter(s => s.key !== 'whatsapp').length > 0) && (
          <SideSection label="Contacto">
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 22px', background: '#25D366', borderRadius: 20, textDecoration: 'none', marginBottom: 6, alignSelf: 'flex-start', transition: 'opacity .15s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <MessageCircle size={13} color="white" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>WhatsApp Business</span>
              </a>
            )}
            {activeSocials.filter(s => s.key !== 'whatsapp').length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 6px' }}>
                {activeSocials.filter(s => s.key !== 'whatsapp').map(({ key, Icon, color }) => {
                  const url = buildSocialUrl(key, socialLinks[key]);
                  if (!url) return null;
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ width: 36, height: 36, borderRadius: 10, background: C.accentSoft, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, textDecoration: 'none', transition: 'opacity .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <Icon size={15} />
                    </a>
                  );
                })}
              </div>
            )}
          </SideSection>
        )}

        <p style={{ fontSize: 11, color: C.muted, opacity: 0.4, marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          Powered by <span style={{ fontWeight: 600 }}>Aliax.io</span>
        </p>
      </aside>

      {/* ── RIGHT: section cards, scroll natural ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {profile.therapeuticApproaches?.length > 0 && (
          <div style={sectionCard}>
            <SectionLabel>Enfoques terapéuticos</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {profile.therapeuticApproaches.map((a: string) => (
                <span key={a} style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '5px 14px', color: C.accent, fontSize: 12, fontWeight: 500 }}>{a}</span>
              ))}
            </div>
          </div>
        )}

        {profile.problematics?.length > 0 && (
          <div style={sectionCard}>
            <SectionLabel>Trabajo con</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {profile.problematics.map((p: string) => (
                <span key={p} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 14px', color: C.text, fontSize: 12, fontWeight: 500 }}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {profile.populations?.length > 0 && (
          <div style={sectionCard}>
            <SectionLabel>Atiendo a</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {profile.populations.map((p: string) => (
                <span key={p} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 14px', color: C.text, fontSize: 12, fontWeight: 500 }}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {profile.workingStyle && (
          <div style={sectionCard}>
            <SectionLabel>Mi forma de trabajar</SectionLabel>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>{profile.workingStyle}</p>
          </div>
        )}

        {activeServices.length > 0 && (
          <div style={sectionCard}>
            <SectionLabel>Servicios</SectionLabel>
            <div style={{
              display: 'grid',
              gridTemplateColumns: activeServices.length === 1
                ? 'minmax(200px, 320px)'
                : 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 14,
              marginTop: 14,
            }}>
              {activeServices.map((s: any) => (
                <BoardServiceCard key={s.id} service={s} onBook={onBook} C={C} />
              ))}
            </div>
          </div>
        )}

        {activeDays.length > 0 && (
          <div style={sectionCard}>
            <SectionLabel>Horarios de atención</SectionLabel>
            <div style={{ marginTop: 14 }}>
              <AvailabilityWidget activeDays={activeDays} byDay={byDay} C={C} />
            </div>
          </div>
        )}

        {activeServices.length === 0 && activeDays.length === 0 && (
          <div style={{ ...sectionCard, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 15, minHeight: 180 }}>
            No hay servicios disponibles aún.
          </div>
        )}

        {reviewsLoaded && (
          <div style={sectionCard}>
            <SectionLabel>Reseñas</SectionLabel>
            {reviewData.reviewCount > 0 && reviewData.averageRating !== null ? (
              <ReviewsSection reviews={reviewData.reviews} averageRating={reviewData.averageRating} reviewCount={reviewData.reviewCount} C={C} />
            ) : (
              <p style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>Aún no se han registrado reseñas.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.45, margin: 0 }}>
      {children}
    </p>
  );
}

function SideSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(148,132,170,0.55)', margin: '0 0 6px 6px' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 9 }}>
      <span style={{ color: C.accent, flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: C.text, lineHeight: 1.3 }}>{children}</span>
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
    <button onClick={onClick} style={{ width: shadow ? 44 : 38, height: shadow ? 44 : 38, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(8px)', boxShadow: shadow ? '0 4px 20px rgba(0,0,0,0.35)' : 'none', transition: 'opacity .15s' }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
}

function BoardServiceCard({ service: s, onBook, C, mobile = false }: { service: any; onBook: (id: string) => void; C: any; mobile?: boolean }) {
  void mobile;
  return (
    <div
      style={{
        borderRadius: 14, overflow: 'hidden',
        background: C.card,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 4px 18px rgba(0,0,0,0.38)',
        transition: 'transform .18s, box-shadow .18s',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.42)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = '0 2px 14px rgba(0,0,0,0.28)'; }}
    >
      {/* Imagen fija 150px — object-fit: cover */}
      <div style={{ height: 150, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
        {s.image ? (
          <img src={s.image} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: s.imagePosition || '50% 50%', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 800, color: C.accent, opacity: 0.55 }}>
            {s.name[0]?.toUpperCase()}
          </div>
        )}
      </div>
      {/* Contenido */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1, background: C.accentSoft }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {s.name}
        </p>
        {s.sessionModality && (
          <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 600, color: C.accent, background: C.accentSoft2 ?? 'rgba(45,212,191,0.15)', borderRadius: 6, padding: '2px 8px', letterSpacing: '0.3px' }}>
            {MODALITY_LABEL[s.sessionModality] ?? s.sessionModality}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.accent, margin: 0, lineHeight: 1.1 }}>{formatPrice(s.price, s.currency)}</p>
            <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
              <Clock size={10} /> {formatDuration(s.durationMinutes)}
            </span>
          </div>
          <button
            onClick={() => onBook(s.id)}
            style={{ flexShrink: 0, background: C.accent, color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s', whiteSpace: 'nowrap' }}
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
      <div ref={scrollRef} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {activeDays.map((day, i) => (
            <div key={day} style={{ width: 90, flexShrink: 0, padding: '14px 10px', borderRight: i < activeDays.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, borderRadius: 8, padding: '3px 10px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: '0.04em' }}>{DAY_SHORT[day]}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', alignItems: 'center' }}>
                {byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((s, si) => (
                  <span key={si} style={{ fontSize: 10, fontWeight: 600, color: C.text, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 6px', whiteSpace: 'nowrap', width: '100%', textAlign: 'center', lineHeight: 1.3 }}>
                    {formatTime(s.startTime)}<br />{formatTime(s.endTime)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {showFade && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 52, borderRadius: '0 12px 12px 0', background: 'linear-gradient(to right, transparent, rgba(14,38,51,0.9))', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, pointerEvents: 'none' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.accentSoft, border: `1px solid ${C.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M4 2l4 4-4 4" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
