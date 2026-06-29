import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeature } from '../hooks/useFeature';
import api from '../api/client';
import {
  Plus, LogOut, Calendar, Clock,
  CalendarDays, Facebook, Instagram, Linkedin, MessageCircle,
  Home, Star, Briefcase, Pencil, Camera,
  Sun, Moon, Copy, ExternalLink, Users,
} from 'lucide-react';
import { SchedulingPanel } from './SchedulingConfig';
import AccountSettings from './AccountSettings';
import ProGate from '../components/ProGate';
import Pacientes from './Pacientes';
import { useUpload } from '../hooks/useUpload';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../lib/utils';
import ProfessionalCalendar from '../components/dashboard/ProfessionalCalendar';
import NewBookingModal from '../components/dashboard/NewBookingModal';

const SOCIAL_ICONS = [
  { key: 'facebook',  Icon: Facebook,      color: '#1877F2' },
  { key: 'instagram', Icon: Instagram,      color: '#E1306C' },
  { key: 'linkedin',  Icon: Linkedin,       color: '#0A66C2' },
  { key: 'whatsapp',  Icon: MessageCircle,  color: '#25D366' },
] as const;

function buildSocialUrl(key: string, value: string) {
  const v = value.trim();
  if (!v) return null;
  if (key === 'whatsapp') return `https://wa.me/${v.replace(/\D/g, '')}`;
  if (key === 'instagram') {
    const user = v.startsWith('@') ? v.slice(1) : v;
    return user.startsWith('http') ? user : `https://instagram.com/${user}`;
  }
  return v.startsWith('http') ? v : `https://${v}`;
}

interface Profile {
  id: string;
  slug: string;
  title: string;
  profession: string;
  template: string;
  published: boolean;
  avatar?: string;
  services: any[];
  _count: { bookings: number };
}

interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; price: number; currency: string };
  profile: { title: string; slug: string };
}


type Tab = 'inicio' | 'citas' | 'resenas' | 'agenda' | 'cuenta' | 'pacientes';
type MobileSection = 'perfil' | Tab;

interface Colors {
  sideBg: string;
  navBg: string;
  mainBg: string;
  tabsBg: string;
  border: string;
  cardBg: string;
  cardShadow: string;
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  isDark: boolean;
}

const ACCENT_THEMES = [
  // ── Free ──
  {
    id: 'aguamarina', label: 'Aguamarina', pro: false,
    accent: 'rgb(45,212,191)',
    accentDark:  'rgba(45,212,191,0.15)',
    accentLight: 'rgba(45,212,191,0.08)',
    darkGradient:  'linear-gradient(160deg, #052e2a 0%, #0d9488 100%)',
    lightGradient: 'linear-gradient(160deg, #2dd4bf 0%, #5eead4 100%)',
  },
  {
    id: 'profesional', label: 'Profesional', pro: false,
    accent: 'rgb(147,51,234)',
    accentDark:  'rgba(147,51,234,0.15)',
    accentLight: 'rgba(147,51,234,0.08)',
    darkGradient:  'linear-gradient(160deg, #1e1240 0%, #6b21a8 100%)',
    lightGradient: 'linear-gradient(160deg, #9333ea 0%, #c084fc 100%)',
  },
  {
    id: 'creative', label: 'Creative', pro: false,
    accent: 'rgb(217,72,240)',
    accentDark:  'rgba(217,72,240,0.15)',
    accentLight: 'rgba(217,72,240,0.08)',
    darkGradient:  'linear-gradient(160deg, #500650 0%, #9d1fa8 100%)',
    lightGradient: 'linear-gradient(160deg, #d948f0 0%, #f472b6 100%)',
  },
  // ── Pro ──
  {
    id: 'bold', label: 'Bold', pro: true,
    accent: 'rgb(253,224,71)',
    accentDark:  'rgba(253,224,71,0.15)',
    accentLight: 'rgba(253,224,71,0.08)',
    darkGradient:  'linear-gradient(160deg, #3d2f00 0%, #a37510 100%)',
    lightGradient: 'linear-gradient(160deg, #fde047 0%, #fef08a 100%)',
  },
  {
    id: 'elegante', label: 'Elegante', pro: true,
    accent: 'rgb(62,153,201)',
    accentDark:  'rgba(62,153,201,0.15)',
    accentLight: 'rgba(62,153,201,0.08)',
    darkGradient:  'linear-gradient(160deg, #0c3d5e 0%, #1b6fa8 100%)',
    lightGradient: 'linear-gradient(160deg, #3e99c9 0%, #60c4f0 100%)',
  },
  {
    id: 'carbono', label: 'Carbono', pro: true,
    accent: 'rgb(20,70,65)',
    accentDark:  'rgba(20,70,65,0.25)',
    accentLight: 'rgba(20,70,65,0.12)',
    darkGradient:  'linear-gradient(160deg, #020808 0%, #050f0e 100%)',
    lightGradient: 'linear-gradient(160deg, #0a2420 0%, #0f3530 100%)',
  },
  {
    id: 'nocturno', label: 'Nocturno', pro: true,
    accent: 'rgb(88,28,155)',
    accentDark:  'rgba(88,28,155,0.18)',
    accentLight: 'rgba(88,28,155,0.10)',
    darkGradient:  'linear-gradient(160deg, #1a0641 0%, #3c0e80 100%)',
    lightGradient: 'linear-gradient(160deg, #5b21b6 0%, #7c3aed 100%)',
  },
];

const DARK: Colors = {
  sideBg: 'transparent',
  navBg: 'transparent',
  mainBg: '#0c0c0c',
  tabsBg: '#071412',
  border: 'rgba(45,212,191,0.15)',
  cardBg: 'rgba(10,25,22,0.85)',
  cardShadow: 'none',
  text: '#e8f0f0',
  muted: '#6aada8',
  accent: 'rgb(45,212,191)',
  accentLight: 'rgba(45,212,191,0.12)',
  isDark: true,
};

const LIGHT: Colors = {
  sideBg: 'white',
  navBg: 'white',
  mainBg: 'white',
  tabsBg: '#e6faf8',
  border: 'rgba(13,148,136,0.15)',
  cardBg: 'white',
  cardShadow: '0 2px 8px rgba(0,0,0,0.06)',
  text: '#0a1f1e',
  muted: '#3d8a82',
  accent: 'rgb(13,148,136)',
  accentLight: 'rgba(45,212,191,0.08)',
  isDark: false,
};

export default function Dashboard() {
  const { user, logout, isPro, refreshUser } = useAuth();
  const { toast } = useToast();
  const canColoresPremium = useFeature('colores_premium');
  const canPacientes = useFeature('pacientes');
  const navigate = useNavigate();
  const { uploadImage, uploading: uploadingAvatar } = useUpload();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    () => (searchParams.get('tab') as Tab) || 'inicio'
  );
  const [mobileSection, setMobileSection] = useState<MobileSection>(() => {
    const tab = searchParams.get('tab') as Tab;
    return (tab && ['inicio', 'citas', 'resenas', 'agenda', 'cuenta'].includes(tab)) ? tab : 'perfil';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('aliax_theme') as 'dark' | 'light') || 'dark'
  );
  const [accentId, setAccentId] = useState<string>(
    () => localStorage.getItem('aliax_accent') || 'aguamarina'
  );

  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsError, setAnalyticsError] = useState(false);

  // Visited-tab sets: once mounted, tabs stay alive (hidden with display:none)
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab | 'cuenta'>>(() => new Set([activeTab]));
  const [visitedMobile, setVisitedMobile] = useState<Set<MobileSection>>(() => new Set([mobileSection]));

  const goTab = useCallback((tab: Tab | 'cuenta') => {
    setActiveTab(tab as Tab);
    setVisitedTabs(prev => { const s = new Set(prev); s.add(tab); return s; });
  }, []);

  const goMobile = useCallback((section: MobileSection) => {
    setMobileSection(section);
    setVisitedMobile(prev => { const s = new Set(prev); s.add(section); return s; });
  }, []);

  useEffect(() => { localStorage.setItem('aliax_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('aliax_accent', accentId); }, [accentId]);

  // Si no es Pro y tiene un color Pro seleccionado, resetear al primero gratis
  useEffect(() => {
    const current = ACCENT_THEMES.find(t => t.id === accentId);
    if (current?.pro && !isPro && !canColoresPremium) setAccentId('aguamarina');
  }, [isPro, accentId]);

  const accentTheme = useMemo(
    () => ACCENT_THEMES.find(t => t.id === accentId) ?? ACCENT_THEMES[0],
    [accentId]
  );
  const C = useMemo(() => {
    const base = theme === 'dark' ? DARK : LIGHT;
    const m = accentTheme.accent.match(/\d+/g) ?? ['45','212','191'];
    const [r, g, b] = m.map(Number);
    const muted = theme === 'dark'
      ? `rgb(${Math.round((r+120)/2)},${Math.round((g+120)/2)},${Math.round((b+120)/2)})`
      : `rgb(${Math.round(r*0.4)},${Math.round(g*0.5)},${Math.round(b*0.5)})`;
    return {
      ...base,
      accent:      accentTheme.accent,
      accentLight: theme === 'dark' ? accentTheme.accentDark : accentTheme.accentLight,
      muted,
      border: `rgba(${r},${g},${b},0.15)`,
    };
  }, [theme, accentTheme]);

  useEffect(() => {
    Promise.all([
      api.get('/profiles').then(r => setProfiles(r.data)),
      api.get('/bookings').then(r => setBookings(r.data)),
    ]).finally(() => setLoading(false));
  }, [user?.email]);

  useEffect(() => {
    api.get('/bookings/analytics')
      .then(res => setAnalytics(res.data))
      .catch(() => setAnalyticsError(true));
  }, []);

  const updateBookingStatus = async (id: string, status: string) => {
    if (status === 'CANCELLED') {
      const confirmed = window.confirm('¿Estas seguro de que quieres cancelar esta reserva?');
      if (!confirmed) return;
    }
    await api.patch(`/bookings/${id}/status`, { status });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const result = await uploadImage(file);
      if (!result) { toast('Error al subir la imagen', 'error'); return; }
      await api.patch('/auth/me', { avatar: result.url });
      await refreshUser();
      const primary = profiles[0];
      if (primary) {
        await api.put(`/profiles/${primary.id}`, { avatar: result.url });
        setProfiles(prev => prev.map((p, i) => i === 0 ? { ...p, avatar: result.url } : p));
      }
      toast('Foto actualizada', 'success');
    } catch {
      toast('Error al guardar la foto', 'error');
    }
  };

  const pendingBookings   = useMemo(() => bookings.filter(b => b.status === 'PENDING'),   [bookings]);
  const confirmedBookings = useMemo(() => bookings.filter(b => b.status === 'CONFIRMED'), [bookings]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: C.mainBg }}>
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  const initials = (user?.name ?? '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const sidebarAvatar = profiles.find(p => p.avatar)?.avatar ?? user?.avatar ?? null;
  const socialLinks   = (user?.socialLinks || {}) as Record<string, string>;
  const hasSocial     = SOCIAL_ICONS.some(({ key }) => !!socialLinks[key]);
  const isProfessional = profiles.length > 0;
  const isPairTherapist = profiles.some(p => p.profession === 'Terapeuta de Parejas');

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'inicio',     label: 'Inicio',           icon: <Home className="h-4 w-4" /> },
    { id: 'agenda',     label: 'Configurar Agenda', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'pacientes',  label: 'Pacientes',          icon: <Users className="h-4 w-4" /> },
    { id: 'citas',      label: 'Mis Citas',         icon: <Calendar className="h-4 w-4" /> },
    { id: 'resenas',    label: 'Reseñas',            icon: <Star className="h-4 w-4" /> },
  ];

  /* gradient for mobile profile card and dark shell */
  const profileGradient = theme === 'dark'
    ? accentTheme.darkGradient
    : accentTheme.lightGradient;

  const _am = accentTheme.accent.match(/rgb\((\d+),(\d+),(\d+)\)/);
  const [_r, _g, _b] = _am ? [_am[1], _am[2], _am[3]] : ['147', '51', '234'];

  const shellBg = theme === 'dark'
    ? `linear-gradient(rgba(0,0,0,0.28), rgba(0,0,0,0.28)), ${accentTheme.darkGradient}`
    : `linear-gradient(160deg, rgba(${_r},${_g},${_b},0.09) 0%, rgba(${_r},${_g},${_b},0.19) 100%), #ffffff`;

  // Inner content panel background
  const boardBg = theme === 'dark' ? accentTheme.darkGradient : 'white';

  return (
    <div className="h-dvh flex flex-col overflow-hidden" style={{ background: shellBg }}>

      {/* ── Navbar ── */}
      <nav
        className="px-5 py-3 flex items-center justify-between shrink-0"
        style={{ background: 'transparent' }}
      >
        <Link to="/" className="font-bold text-lg" style={{ color: C.isDark ? 'white' : C.text }}>Aliax.io</Link>
        <div className="flex items-center gap-2">
          {/* Actualizar plan — desktop only */}
          <Link
            to="/pricing"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: C.isDark ? 'rgba(255,255,255,0.12)' : C.accentLight, color: C.isDark ? 'white' : C.accent, border: `1px solid ${C.isDark ? 'rgba(255,255,255,0.2)' : C.accent + '44'}` }}
          >
            Actualizar plan
          </Link>
          {/* Theme toggle — all sizes */}
          <button
            className="p-2 rounded-lg transition-colors"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{ color: C.isDark ? 'rgba(255,255,255,0.7)' : C.accent }}
            onMouseEnter={e => (e.currentTarget.style.color = C.isDark ? 'white' : C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.isDark ? 'rgba(255,255,255,0.7)' : C.accent)}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-1.5 text-sm transition-colors px-2 py-1.5"
            style={{ color: C.isDark ? 'rgba(255,255,255,0.7)' : C.accent }}
            onMouseEnter={e => (e.currentTarget.style.color = C.isDark ? 'white' : C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.isDark ? 'rgba(255,255,255,0.7)' : C.accent)}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </nav>

      {/* ── Trial banner ── */}
      {(() => {
        if (!user?.trialEndsAt) return null;
        if (user?.isAdmin) return null;
        if (user?.plan === 'FREE') return null;
        if (user?.plan === 'PRO' && user?.planInterval === 'LIFETIME') return null;
        if (user?.plan === 'PRO' && user?.planExpiresAt && new Date(user.planExpiresAt).getTime() > Date.now()) return null;

        const endsAt = new Date(user.trialEndsAt);
        const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (daysLeft > 7) return null;

        const expired = daysLeft <= 0;
        const urgent  = !expired && daysLeft <= 3;

        const bg      = expired ? '#7f1d1d' : urgent ? '#78350f' : C.isDark ? '#1e293b' : '#eff6ff';
        const border  = expired ? '#991b1b' : urgent ? '#92400e' : C.isDark ? '#334155' : '#bfdbfe';
        const color   = expired || urgent ? '#fef2f2' : C.isDark ? '#cbd5e1' : '#1e40af';
        const label   = expired
          ? 'Tu período de prueba ha finalizado.'
          : daysLeft === 0
          ? 'Tu prueba vence hoy.'
          : `Tu prueba gratuita vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}.`;

        return (
          <div
            className="shrink-0 flex items-center justify-between gap-3 px-5 py-2 text-sm"
            style={{ background: bg, borderBottom: `1px solid ${border}`, color }}
          >
            <span>{label}</span>
            <Link
              to="/pricing"
              className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color }}
            >
              {expired ? 'Activar plan' : 'Ver detalles'}
            </Link>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════
          MOBILE LAYOUT
          Profile card always fills background.
          Tab bar animates from bottom → top when
          any non-Perfil tab is selected, and back
          to bottom when Perfil is selected.
          ════════════════════════════════════════ */}
      <div
        className="md:hidden flex-1 relative overflow-hidden"
        style={{ minHeight: 0 }}
      >

        {/* ── LAYER 1: Profile card (always behind, fills full screen, no scroll) ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: profileGradient,
            overflow: 'hidden',
          }}
        >
          {/* Gradient section — flex:1 to fill remaining height, content centered */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '28px 32px 24px',
            }}
          >
            {/* Avatar */}
            <div className="relative mb-5" style={{ flexShrink: 0 }}>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold focus:outline-none"
                style={{
                  width: 150, height: 150,
                  background: 'rgba(255,255,255,0.18)',
                  color: 'white',
                  border: '3px solid rgba(255,255,255,0.45)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                }}
              >
                {sidebarAvatar
                  ? <img src={sidebarAvatar} alt={user?.name} className="w-full h-full object-cover" />
                  : initials}
              </button>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: C.accent, border: '2px solid rgba(255,255,255,0.3)' }}
              >
                {uploadingAvatar
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="h-3.5 w-3.5 text-white" />}
              </button>
            </div>

            {/* Name */}
            <p className="font-bold text-2xl leading-tight" style={{ color: 'white' }}>
              {user?.name}
            </p>

            {/* Social links */}
            {hasSocial && (
              <div className="flex justify-center gap-3 mt-4">
                {SOCIAL_ICONS.map(({ key, Icon }) => {
                  const url = buildSocialUrl(key, socialLinks[key] || '');
                  if (!url) return null;
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
                      style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.38)', color: 'white' }}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Divider */}
            <div style={{ width: '70%', margin: '20px auto 0', height: 1, background: 'rgba(255,255,255,0.35)' }} />

            {/* Info list */}
            <div className="flex flex-col gap-3" style={{ width: 'fit-content', marginLeft: 'auto', marginRight: 'auto', marginTop: 40 }}>

              {/* Professional fields (paid plan = has profile) */}
              {isProfessional && (
                <>
                  {profiles[0]?.profession && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.65)' }} />
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>{profiles[0].profession}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Edit + apariencia + logout — centered, fixed bottom strip */}
          <div className="flex flex-col items-center gap-3 px-6 pt-4 pb-24" style={{ flexShrink: 0 }}>
            <div className="flex justify-center w-full">
              <button
                onClick={() => goMobile('cuenta')}
                className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-full text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: 'white' }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar perfil
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Apariencia
              </span>
              <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                {ACCENT_THEMES.map(t => {
                  const isLocked = t.pro && !canColoresPremium;
                  return isLocked ? (
                    <div key={t.id} title={`${t.label} (Pro)`} style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: t.accent, opacity: 0.38,
                        border: '3px solid rgba(255,255,255,0.2)',
                      }} />
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: 'white',
                      }}>🔒</div>
                    </div>
                  ) : (
                    <button
                      key={t.id}
                      title={t.label}
                      onClick={() => setAccentId(t.id)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: t.accent,
                        border: `3px solid ${accentId === t.id ? 'white' : 'rgba(255,255,255,0.35)'}`,
                        outline: accentId === t.id ? `2px solid ${t.accent}` : 'none',
                        outlineOffset: '2px', cursor: 'pointer',
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="flex items-center justify-center gap-2 text-sm py-2 transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* ── LAYER 2: Content ── */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 72,
            zIndex: 2,
            overflowY: 'auto',
            background: shellBg,
            transition: 'opacity 0.25s ease',
            opacity: mobileSection === 'perfil' ? 0 : 1,
            pointerEvents: mobileSection === 'perfil' ? 'none' : 'auto',
          }}
        >
          <div className="p-4 pb-8">
            {visitedMobile.has('inicio') && (
              <div style={{ display: mobileSection === 'inicio' ? undefined : 'none' }}>
                <TabInicio profiles={profiles} bookings={bookings} userName={user?.name} C={C} analytics={analytics} analyticsError={analyticsError} isPro={isPro ?? false} onGoToAccount={() => goMobile('cuenta')} onGoToAgenda={() => goMobile('agenda')} />
              </div>
            )}
            {visitedMobile.has('citas') && (
              <div style={{ display: mobileSection === 'citas' ? undefined : 'none' }}>
                <TabCitas
                  pendingBookings={pendingBookings}
                  confirmedBookings={confirmedBookings}
                  totalBookings={bookings.length}
                  updateBookingStatus={updateBookingStatus}
                  profiles={profiles}
                  C={C}
                  onGoToAgenda={() => goMobile('agenda')}
                />
              </div>
            )}
            {visitedMobile.has('resenas') && (
              <div style={{ display: mobileSection === 'resenas' ? undefined : 'none' }}>
                <TabResenas C={C} isPro={isPro ?? false} />
              </div>
            )}
            {visitedMobile.has('agenda') && (
              <div style={{ display: mobileSection === 'agenda' ? undefined : 'none' }}>
                <TabAgenda theme={theme} profiles={profiles} C={C} isPro={isPro ?? false} />
              </div>
            )}
            {visitedMobile.has('cuenta') && (
              <div style={{ display: mobileSection === 'cuenta' ? undefined : 'none' }}>
                <AccountSettings asTab tabIsDark={C.isDark} accent={C.accent} onProfileSaved={() => api.get('/profiles').then(r => setProfiles(r.data))} />
              </div>
            )}
            {visitedMobile.has('pacientes') && (
              <div style={{ display: mobileSection === 'pacientes' ? undefined : 'none' }}>
                <Pacientes C={C} isPairTherapist={isPairTherapist} isPro={(isPro ?? false) || canPacientes} isActive={mobileSection === 'pacientes'} />
              </div>
            )}
            <div className="mt-10 text-center" style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <Link to="/pricing" className="text-xs" style={{ color: C.muted }}>Ver planes</Link>
              {user?.isAdmin && (
                <a href="https://github.com/zampaioo9-lang/aura/tree/master/docs/manual" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: C.muted }}>Manual</a>
              )}
            </div>
          </div>
        </div>

        {/* ── LAYER 3: Tab bar — fijo en la parte inferior ── */}
        <div
          style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            height: 72,
            zIndex: 20,
            display: 'flex',
            background: C.isDark
              ? 'rgba(24, 24, 31, 0.75)'
              : 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderTop: `1px solid ${C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          {/* Perfil tab */}
          <button
            onClick={() => goMobile('perfil')}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors"
            style={{ color: mobileSection === 'perfil' ? C.accent : C.muted }}
          >
            <div style={{
              position: 'absolute', top: 0, left: '20%', right: '20%',
              height: 2, borderRadius: '0 0 3px 3px',
              background: mobileSection === 'perfil' ? C.accent : 'transparent',
              transition: 'background 0.25s',
            }} />
            <div
              className="rounded-full overflow-hidden flex items-center justify-center font-bold"
              style={{
                width: 22, height: 22, fontSize: 8,
                background: mobileSection === 'perfil' ? C.accent : C.accentLight,
                color: mobileSection === 'perfil' ? 'white' : C.accent,
                border: mobileSection === 'perfil' ? 'none' : `1.5px solid ${C.accent}55`,
                transition: 'background 0.25s',
              }}
            >
              {sidebarAvatar
                ? <img src={sidebarAvatar} className="w-full h-full object-cover" alt="" />
                : <span>{initials}</span>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>Perfil</span>
          </button>

          {/* Other tabs */}
          {([
            { section: 'inicio'    as const, label: 'Inicio',    icon: <Home className="h-6 w-6" /> },
            { section: 'citas'     as const, label: 'Citas',     icon: <Calendar className="h-6 w-6" /> },
            { section: 'agenda'    as const, label: 'Agenda',    icon: <CalendarDays className="h-6 w-6" /> },
            { section: 'pacientes' as const, label: 'Pacientes', icon: <Users className="h-6 w-6" /> },
          ]).map(({ section, label, icon }) => {
            const isActive = mobileSection === section;
            return (
              <button
                key={section}
                onClick={() => goMobile(section)}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors"
                style={{ color: isActive ? C.accent : C.muted }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%',
                  height: 2, borderRadius: '0 0 3px 3px',
                  background: isActive ? C.accent : 'transparent',
                  transition: 'background 0.25s',
                }} />
                {icon}
                <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>{label}</span>
              </button>
            );
          })}

          {/* +Crear Perfil — solo si no tiene ninguno */}
          {profiles.length === 0 && (
            <Link
              to="/profile/new"
              className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors"
              style={{ color: C.accent, textDecoration: 'none' }}
            >
              <Plus className="h-6 w-6" />
              <span style={{ fontSize: 10, fontWeight: 500, lineHeight: 1 }}>+Perfil</span>
            </Link>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          DESKTOP LAYOUT — unified shell + content board
          ════════════════════════════════════════ */}
      <div className="hidden md:flex flex-1 overflow-hidden" style={{ padding: '28px 28px 28px 28px' }}>

        {/* Nav Sidebar — transparent, part of the outer shell */}
        <aside style={{
          width: 240, flexShrink: 0,
          background: 'transparent',
          display: 'flex', flexDirection: 'column',
          padding: '18px 10px 18px 18px',
          overflowY: 'auto', scrollbarWidth: 'none',
        }}>

          {/* Profile header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px', marginBottom: 22 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{
                  width: 66, height: 66, borderRadius: '50%', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: C.accent,
                  background: C.accentLight, border: `2px solid ${C.border}`,
                  outline: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                {sidebarAvatar
                  ? <img src={sidebarAvatar} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </button>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{
                  position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%',
                  background: C.accent, border: `2px solid ${C.isDark ? '#09051a' : 'white'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                {uploadingAvatar
                  ? <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="h-2.5 w-2.5 text-white" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </p>
              <span style={{ fontSize: 11, fontWeight: 600, background: C.accentLight, color: C.accent, borderRadius: 6, padding: '2px 8px' }}>
                {isPro ? 'Pro' : 'Free'}
              </span>
            </div>
          </div>

          {/* "General" — main navigation */}
          <DashSection label="General">
            {TABS.map(tab => (
              <DashNavRow key={tab.id} icon={tab.icon} isActive={activeTab === tab.id} C={C} onClick={() => goTab(tab.id)}>
                {tab.label}
              </DashNavRow>
            ))}
          </DashSection>

          {/* "Mi perfil" */}
          <DashSection label="Mi perfil">
            <DashNavRow icon={<Pencil className="h-4 w-4" />} isActive={activeTab === 'cuenta'} C={C} onClick={() => goTab('cuenta')}>
              Mi cuenta
            </DashNavRow>
            {profiles.length > 0 && (
              <a href={`/${profiles[0].slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <DashNavRow icon={<ExternalLink className="h-4 w-4" />} isActive={false} C={C} onClick={() => {}}>
                  Ver perfil público
                </DashNavRow>
              </a>
            )}
          </DashSection>

          {/* "Preferencias" */}
          <DashSection label="Preferencias">
            <div style={{ padding: '4px 12px 8px' }}>
              <span style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 8 }}>Color</span>
              <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 6 }}>
                {ACCENT_THEMES.map(t => {
                  const isLocked = t.pro && !canColoresPremium;
                  return isLocked ? (
                    <div key={t.id} title={`${t.label} — Pro`} style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: t.accent,
                        border: `2px solid ${C.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'}`,
                      }} />
                      <span style={{
                        position: 'absolute', bottom: -3, right: -3,
                        fontSize: 8, lineHeight: 1,
                        background: C.isDark ? '#1a1a2e' : '#fff',
                        borderRadius: '50%', padding: '1px',
                      }}>🔒</span>
                    </div>
                  ) : (
                    <button key={t.id} title={t.label} onClick={() => setAccentId(t.id)} style={{
                      width: 20, height: 20, flexShrink: 0, borderRadius: '50%', background: t.accent,
                      border: `2px solid ${accentId === t.id ? (C.isDark ? 'white' : '#333') : 'rgba(0,0,0,0.25)'}`,
                      outline: accentId === t.id ? `2px solid ${t.accent}` : 'none',
                      outlineOffset: '2px', cursor: 'pointer',
                    }} />
                  );
                })}
              </div>
            </div>
          </DashSection>

          <div style={{ flex: 1 }} />

          {/* Footer */}
          <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Link to="/pricing"
              style={{ fontSize: 14, color: C.muted, textDecoration: 'none', padding: '7px 10px', borderRadius: 8 }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
            >
              Ver planes
            </Link>
            {user?.isAdmin && (
              <a href="https://github.com/zampaioo9-lang/aura/tree/master/docs/manual" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 14, color: C.muted, textDecoration: 'none', padding: '7px 10px', borderRadius: 8 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
              >
                Manual
              </a>
            )}
            <button
              onClick={() => { logout(); navigate('/'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '7px 10px', borderRadius: 8, textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Content board — floating panel with rounded corners */}
        <main className="flex-1 flex flex-col overflow-hidden tab-content-board" style={{
          background: boardBg,
          borderRadius: 18,
          boxShadow: C.isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 12px 48px rgba(13,148,136,0.10), 0 4px 16px rgba(13,148,136,0.06)',
        }}>
          <div className="flex-1 overflow-y-auto p-6">
            {visitedTabs.has('inicio') && (
              <div style={{ display: activeTab === 'inicio' ? undefined : 'none' }}>
                <TabInicio profiles={profiles} bookings={bookings} userName={user?.name} C={C} analytics={analytics} analyticsError={analyticsError} isPro={isPro ?? false} twoCol onGoToAccount={() => goTab('cuenta')} onGoToAgenda={() => goTab('agenda')} />
              </div>
            )}
            {visitedTabs.has('citas') && (
              <div style={{ display: activeTab === 'citas' ? undefined : 'none' }}>
                <TabCitas
                  pendingBookings={pendingBookings}
                  confirmedBookings={confirmedBookings}
                  totalBookings={bookings.length}
                  updateBookingStatus={updateBookingStatus}
                  profiles={profiles}
                  C={C}
                  onGoToAgenda={() => goTab('agenda')}
                />
              </div>
            )}
            {visitedTabs.has('resenas') && (
              <div style={{ display: activeTab === 'resenas' ? undefined : 'none' }}>
                <TabResenas C={C} isPro={isPro ?? false} />
              </div>
            )}
            {visitedTabs.has('agenda') && (
              <div style={{ display: activeTab === 'agenda' ? undefined : 'none' }}>
                <TabAgenda theme={theme} profiles={profiles} C={C} isPro={isPro ?? false} />
              </div>
            )}
            {visitedTabs.has('cuenta') && (
              <div style={{ display: activeTab === 'cuenta' ? undefined : 'none' }}>
                <AccountSettings asTab tabIsDark={C.isDark} accent={C.accent} onProfileSaved={() => api.get('/profiles').then(r => setProfiles(r.data))} />
              </div>
            )}
            {visitedTabs.has('pacientes') && (
              <div style={{ display: activeTab === 'pacientes' ? undefined : 'none' }}>
                <Pacientes C={C} isPairTherapist={isPairTherapist} isPro={(isPro ?? false) || canPacientes} isActive={activeTab === 'pacientes'} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function DashSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(148,132,170,0.55)', margin: '0 0 4px 10px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </div>
    </div>
  );
}

function DashNavRow({ icon, isActive, C, onClick, children }: { icon: React.ReactNode; isActive: boolean; C: Colors; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10, width: '100%', textAlign: 'left',
        background: isActive ? C.accent : 'transparent',
        border: 'none', cursor: 'pointer', transition: 'background .15s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.isDark ? 'rgba(255,255,255,0.1)' : C.accentLight; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: isActive ? 'white' : C.isDark ? 'rgba(255,255,255,0.6)' : C.accent, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? 'white' : C.isDark ? 'rgba(255,255,255,0.85)' : C.text, lineHeight: 1 }}>
        {children}
      </span>
    </button>
  );
}

/* ── Mock data for blurred chart (Free users) ── */
const MOCK_PER_DAY: Record<string, number> = (() => {
  const vals = [1,0,2,3,1,0,2,1,4,2,0,1,3,2,1,0,2,3,1,2,0,1,2,1,3,0,2,1,3,2];
  const out: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    out[d.toISOString().split('T')[0]] = vals[i];
  }
  return out;
})();

/* ── Bar chart SVG ── */
function BarChartSVG({ perDay, accent, muted }: {
  perDay: Record<string, number>;
  accent: string;
  muted: string;
}) {
  const [hovered, setHovered] = useState<{ date: string; count: number; idx: number } | null>(null);
  const entries = Object.entries(perDay).sort(([a], [b]) => a.localeCompare(b)).slice(-30);

  if (entries.length === 0) return (
    <div style={{ color: muted, fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
      Sin reservas en los últimos 30 días.
    </div>
  );

  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const BAR_W = 8, GAP = 3, CHART_H = 70, LABEL_H = 14;
  const totalW = entries.length * (BAR_W + GAP) - GAP;

  return (
    <div style={{ position: 'relative' }}>
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: LABEL_H + 6,
          left: `${((hovered.idx * (BAR_W + GAP) + BAR_W / 2) / totalW) * 100}%`,
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.82)', color: '#fff',
          fontSize: 11, padding: '3px 8px', borderRadius: 6,
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
        }}>
          {new Date(hovered.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}: {hovered.count} {hovered.count === 1 ? 'reserva' : 'reservas'}
        </div>
      )}
      <svg
        viewBox={`0 0 ${totalW} ${CHART_H + LABEL_H}`}
        style={{ width: '100%', height: CHART_H + LABEL_H, display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        {entries.map(([date, count], i) => {
          const barH = Math.max((count / maxVal) * CHART_H, count > 0 ? 3 : 1);
          const x = i * (BAR_W + GAP);
          const isHov = hovered?.date === date;
          return (
            <rect
              key={date} x={x} y={CHART_H - barH}
              width={BAR_W} height={barH} rx={2}
              fill={accent} opacity={isHov ? 1 : 0.5}
              style={{ cursor: 'default', transition: 'opacity 0.1s' }}
              onMouseEnter={() => setHovered({ date, count, idx: i })}
            />
          );
        })}
        <line x1={0} y1={CHART_H} x2={totalW} y2={CHART_H} stroke={muted} strokeOpacity={0.2} strokeWidth={1} />
        {entries.map(([date], i) => {
          if (i % 5 !== 0 && i !== entries.length - 1) return null;
          const x = i * (BAR_W + GAP) + BAR_W / 2;
          const d = new Date(date + 'T12:00:00');
          return (
            <text key={date} x={x} y={CHART_H + LABEL_H - 2} textAnchor="middle" fontSize={7} fill={muted}>
              {d.getDate()}/{d.getMonth() + 1}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ────────────────── Tab: Inicio ────────────────── */
function TabInicio({ profiles, bookings, userName, C, analytics, analyticsError, isPro, twoCol = false, onGoToAccount, onGoToAgenda }: {
  profiles: Profile[];
  bookings: Booking[];
  userName?: string;
  C: Colors;
  analytics: any;
  analyticsError: boolean;
  isPro: boolean;
  twoCol?: boolean;
  onGoToAccount: () => void;
  onGoToAgenda: () => void;
}) {
  const totalServices = profiles.reduce((sum, p) => sum + p.services.length, 0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [agendaConfigured, setAgendaConfigured] = useState<boolean | null>(null);
  const hasUnpublished = profiles.length > 0 && profiles.some(p => !p.published);

  useEffect(() => {
    if (profiles.length === 0) { setAgendaConfigured(false); return; }
    api.get('/availability/me')
      .then(res => setAgendaConfigured(Array.isArray(res.data) ? res.data.length > 0 : true))
      .catch(() => setAgendaConfigured(true));
  }, [profiles.length]);

  const isProfileCreated  = profiles.length > 0;
  const hasService        = totalServices > 0;
  const isAgendaOk        = agendaConfigured === true;
  const isPublished       = profiles.some(p => p.published);
  const allDone           = isProfileCreated && hasService && isAgendaOk && isPublished;
  const _am = C.accent.match(/rgb\((\d+),(\d+),(\d+)\)/);
  const [_r, _g, _b] = _am ? [_am[1], _am[2], _am[3]] : ['147', '51', '234'];
  const copyUrl = (slug: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const statsGrid = (
    <div className="grid grid-cols-2 gap-4">
      <StatCard label="Reservas"    value={bookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED').length} sub="pendientes y confirmadas" color="indigo"  isDark={C.isDark} shadow={C.cardShadow} />
      <StatCard label="Completadas" value={bookings.filter(b => b.status === 'COMPLETED').length}                           sub="reservas completadas"      color="emerald" isDark={C.isDark} shadow={C.cardShadow} />
      <StatCard label="Servicios"   value={totalServices}                                                                   sub="en todos tus perfiles"     color="amber"   isDark={C.isDark} shadow={C.cardShadow} />
      <StatCard label="Perfiles"    value={profiles.length}                                                                 sub="perfiles profesionales"    color="violet"  isDark={C.isDark} shadow={C.cardShadow} />
    </div>
  );

  const analyticsBlock = (
    <>
      {analyticsError && (
        <div style={{ color: '#6b6b80', fontSize: 13, textAlign: 'center', padding: 16 }}>
          No se pudo cargar Analytics.
        </div>
      )}
      {analytics && (
        <div style={{
          background: C.isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.65)',
          border: `1px solid ${C.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(45,212,191,0.18)'}`,
          borderRadius: 16, padding: 20, marginTop: 16,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: C.isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 16px rgba(45,212,191,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>Analytics</h3>
              {isPro ? (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#10b981',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 20, padding: '2px 8px',
                }}>Pro</span>
              ) : (
                <Link to="/pricing" style={{
                  fontSize: 11, color: C.accent, textDecoration: 'none',
                  background: C.accentLight, border: `1px solid ${C.accent}44`,
                  borderRadius: 20, padding: '2px 8px',
                }}>Ver todo con Pro →</Link>
              )}
            </div>
            <span style={{ color: C.muted, fontSize: 12 }}>Últimos 30 días</span>
          </div>

          {/* Status counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginBottom: 20 }}>
            {[
              { label: 'Pendientes', value: analytics.byStatus.PENDING, color: '#f59e0b' },
              { label: 'Confirmadas', value: analytics.byStatus.CONFIRMED, color: '#3b82f6' },
              { label: 'Completadas', value: analytics.byStatus.COMPLETED, color: '#10b981' },
              { label: 'Canceladas', value: analytics.byStatus.CANCELLED, color: '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: C.isDark ? 'rgba(255,255,255,0.07)' : `${color}14`,
                borderRadius: 10, padding: '10px 4px', textAlign: 'center',
              }}>
                <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ marginBottom: analytics.byService.length > 0 ? 20 : 0 }}>
            <p style={{ color: C.muted, fontSize: 12, margin: '0 0 8px' }}>Reservas por día</p>
            {isPro && analytics.perDay ? (
              <BarChartSVG perDay={analytics.perDay} accent={C.accent} muted={C.muted} />
            ) : (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ filter: 'blur(3px)', pointerEvents: 'none', opacity: 0.6 }}>
                  <BarChartSVG perDay={MOCK_PER_DAY} accent={C.accent} muted={C.muted} />
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.5)', borderRadius: 10, gap: 6,
                }}>
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <Link to="/pricing" style={{ color: C.accent, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    Activa Pro para ver tendencias
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Services */}
          {analytics.byService.length > 0 && (
            <div>
              <p style={{ color: C.muted, fontSize: 12, margin: '0 0 10px' }}>Servicios más solicitados</p>
              {analytics.byService.slice(0, 3).map((s: any, i: number, arr: any[]) => {
                const pct = arr[0].count > 0 ? (s.count / arr[0].count) * 100 : 0;
                return (
                  <div key={s.name} style={{ marginBottom: i < 2 ? 12 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ color: C.text, fontSize: 13 }}>{s.name}</span>
                      <span style={{ color: C.muted, fontSize: 12 }}>{s.count} sesiones · ${s.revenue.toLocaleString()} {s.currency}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 4 }}>
                      <div style={{ height: 4, borderRadius: 4, background: C.accent, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isPro && (
            <p style={{ color: C.muted, fontSize: 12, marginTop: 14, textAlign: 'center' }}>
              Mostrando últimas 10 reservas. <Link to="/pricing" style={{ color: C.accent }}>Activa Pro</Link> para ver historial completo.
            </p>
          )}
        </div>
      )}
    </>
  );

  const onboardingChecklist = !allDone && (
    <div style={{
      marginBottom: 24,
      background: C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
      border: `1.5px solid rgba(${_r},${_g},${_b},0.30)`,
      borderRadius: 16, padding: '18px 20px',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    }}>
      <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>
        Completa tu configuración
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          {
            done: isProfileCreated,
            label: 'Crea tu perfil profesional',
            action: () => window.location.assign('/profile/new'),
            btnLabel: 'Crear perfil',
          },
          {
            done: hasService,
            label: 'Agrega al menos un servicio',
            action: onGoToAccount,
            btnLabel: 'Ir a Mi cuenta',
          },
          {
            done: agendaConfigured === null ? false : isAgendaOk,
            label: 'Configura tu agenda de disponibilidad',
            action: onGoToAgenda,
            btnLabel: 'Ir a Agenda',
          },
          {
            done: isPublished,
            label: 'Publica tu perfil para aparecer en el directorio',
            action: onGoToAccount,
            btnLabel: 'Publicar',
          },
        ].map(({ done, label, action, btnLabel }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? `rgba(${_r},${_g},${_b},0.2)` : C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              border: `1.5px solid ${done ? `rgba(${_r},${_g},${_b},0.6)` : C.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
            }}>
              {done && <span style={{ color: `rgb(${_r},${_g},${_b})`, fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{
              flex: 1, fontSize: 13, color: done ? C.muted : C.text,
              textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1,
            }}>
              {label}
            </span>
            {!done && (
              <button onClick={action} style={{
                flexShrink: 0, background: `rgba(${_r},${_g},${_b},0.15)`,
                border: `1px solid rgba(${_r},${_g},${_b},0.4)`,
                color: `rgb(${_r},${_g},${_b})`,
                borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                {btnLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const unpublishedBanner = !allDone && hasUnpublished && (
    <div style={{
      marginBottom: 24,
      padding: '16px 20px',
      background: C.isDark
        ? `linear-gradient(135deg, rgba(${_r},${_g},${_b},0.14), rgba(${_r},${_g},${_b},0.06))`
        : `linear-gradient(135deg, rgba(${_r},${_g},${_b},0.10), rgba(${_r},${_g},${_b},0.04))`,
      border: `1.5px solid rgba(${_r},${_g},${_b},0.35)`,
      borderRadius: 14,
      display: 'flex', alignItems: 'center', gap: 14,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      <span style={{ fontSize: 26, flexShrink: 0 }}>👁️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: C.accent, fontWeight: 700, fontSize: 14, margin: 0 }}>
          Tu perfil no está publicado
        </p>
        <p style={{ color: C.muted, fontSize: 12, margin: '3px 0 0', lineHeight: 1.4 }}>
          Los pacientes no pueden encontrarte en el directorio. Ve a <strong style={{ color: C.text }}>Mi cuenta</strong> y activa "Publicar perfil".
        </p>
      </div>
      <button
        onClick={onGoToAccount}
        style={{
          background: `linear-gradient(135deg, rgb(${_r},${_g},${_b}), rgba(${_r},${_g},${_b},0.75))`,
          color: 'white', border: 'none', borderRadius: 9,
          padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        Ir a Mi cuenta →
      </button>
    </div>
  );

  /* ── Desktop two-column layout ── */
  if (twoCol) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 className="text-2xl font-bold mb-1" style={{ color: C.text }}>
          Hola, {userName?.split(' ')[0] ?? 'bienvenido'} 👋
        </h2>
        <p style={{ color: C.muted, marginBottom: 24 }}>Aquí tienes un resumen de tu actividad.</p>

        {onboardingChecklist}
        {unpublishedBanner}

        {/* CTA para usuarios sin perfil */}
        {profiles.length === 0 && (
          <div style={{
            background: C.isDark ? `rgba(${_r},${_g},${_b},0.10)` : C.accentLight,
            border: `1.5px dashed ${C.accent}66`,
            borderRadius: 16, padding: '28px 24px', marginBottom: 28, textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏥</div>
            <h3 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>
              Crea tu perfil profesional
            </h3>
            <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px' }}>
              Tu página pública donde los pacientes pueden encontrarte y agendar contigo.
            </p>
            <Link
              to="/profile/new"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 24px', borderRadius: 10, textDecoration: 'none',
                background: `linear-gradient(135deg, rgb(${_r},${_g},${_b}), rgba(${_r},${_g},${_b},0.75))`,
                color: '#fff', fontWeight: 600, fontSize: 14,
              }}
            >
              <Plus className="h-4 w-4" /> Crear mi perfil
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {statsGrid}
          {analyticsBlock}
        </div>
        {profiles.length > 0 && (
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{
              background: C.isDark
                ? `linear-gradient(145deg, rgba(${_r},${_g},${_b},0.25) 0%, rgba(${_r},${_g},${_b},0.1) 100%)`
                : C.accentLight,
              border: `1.5px solid ${C.isDark ? `rgba(${_r},${_g},${_b},0.4)` : C.accent + '33'}`,
              borderRadius: 16, padding: '20px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ExternalLink style={{ width: 15, height: 15, color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.isDark ? 'white' : C.text, margin: 0 }}>Comparte tu perfil</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0, marginTop: 1 }}>Envíalo a tus clientes</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profiles.map(p => (
                  <div key={p.id} style={{
                    background: C.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    {profiles.length > 1 && (
                      <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, margin: '0 0 4px' }}>{p.title}</p>
                    )}
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.accent, fontFamily: 'monospace', margin: '0 0 8px', wordBreak: 'break-all' }}>
                      aliax.io/{p.slug}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => copyUrl(p.slug, p.id)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        background: `linear-gradient(135deg, ${C.accent}, #2dd4bf)`, color: 'white', border: 'none', borderRadius: 8,
                        fontSize: 12, fontWeight: 600, padding: '7px 0', cursor: 'pointer',
                      }}>
                        {copiedId === p.id ? <><span>✓</span> Copiado</> : <><Copy style={{ width: 13, height: 13 }} /> Copiar</>}
                      </button>
                      <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 34, background: C.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        borderRadius: 8, color: C.isDark ? 'rgba(255,255,255,0.7)' : C.muted, textDecoration: 'none',
                      }}>
                        <ExternalLink style={{ width: 13, height: 13 }} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  /* ── Mobile single-column layout ── */
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1" style={{ color: C.text }}>
        Hola, {userName?.split(' ')[0] ?? 'bienvenido'} 👋
      </h2>
      <p className="mb-6" style={{ color: C.muted }}>Aquí tienes un resumen de tu actividad.</p>
      {onboardingChecklist}
      {unpublishedBanner}
      {statsGrid}
      {profiles.length > 0 && (
        <div style={{
          marginTop: 16, borderRadius: 16, padding: 16,
          background: C.isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.75)',
          border: `1px solid ${C.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'}`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        }}>
          <p className="text-sm font-medium mb-2" style={{ color: C.muted }}>Comparte este link con tus clientes</p>
          <div className="flex flex-col gap-2">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: C.isDark ? 'rgba(108,99,255,0.08)' : 'rgba(108,99,255,0.06)', border: `1px solid ${C.isDark ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.15)'}` }}>
                {profiles.length > 1 && (
                  <span className="text-xs shrink-0 font-medium truncate max-w-20" style={{ color: C.muted }}>{p.title}</span>
                )}
                <span className="text-xs flex-1 truncate font-mono" style={{ color: C.accent }}>aliax.io/{p.slug}</span>
                <button onClick={() => copyUrl(p.slug, p.id)} className="shrink-0 p-1 rounded transition-opacity hover:opacity-70" style={{ color: C.accent }} title="Copiar enlace">
                  {copiedId === p.id ? <span className="text-xs font-medium text-green-500">✓ Copiado</span> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 rounded transition-opacity hover:opacity-70" style={{ color: C.accent }} title="Ver perfil público">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
      {analyticsBlock}
    </div>
  );
}

function StatCard({ label, value, sub, color, isDark, shadow }: {
  label: string; value: number | string; sub: string;
  color: 'indigo' | 'emerald' | 'amber' | 'violet'; isDark: boolean; shadow: string;
}) {
  const light = { indigo: { bg: '#eef2ff', text: '#4338ca' }, emerald: { bg: '#ecfdf5', text: '#047857' }, amber: { bg: '#fffbeb', text: '#b45309' }, violet: { bg: '#f5f3ff', text: '#6d28d9' } };
  const dark  = { indigo: { bg: 'rgba(99,102,241,0.18)', text: '#a5b4fc' }, emerald: { bg: 'rgba(16,185,129,0.18)', text: '#6ee7b7' }, amber: { bg: 'rgba(245,158,11,0.18)', text: '#fcd34d' }, violet: { bg: 'rgba(139,92,246,0.18)', text: '#c4b5fd' } };
  const p = isDark ? dark[color] : light[color];
  return (
    <div className="rounded-xl p-5" style={{ background: p.bg, color: p.text, boxShadow: shadow }}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-semibold mt-0.5">{label}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  );
}

/* ────────────────── Tab: Mis Citas ────────────────── */
function TabCitas({ pendingBookings, confirmedBookings, totalBookings, updateBookingStatus, profiles, C, onGoToAgenda }: {
  pendingBookings: Booking[];
  confirmedBookings: Booking[];
  totalBookings: number;
  updateBookingStatus: (id: string, status: string) => void;
  profiles: Profile[];
  C: Colors;
  onGoToAgenda: () => void;
}) {
  const [agendaConfigured, setAgendaConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (profiles.length === 0) return;
    api.get('/availability/me')
      .then(res => setAgendaConfigured(Array.isArray(res.data) ? res.data.length > 0 : true))
      .catch(() => setAgendaConfigured(true));
  }, [profiles.length]);
  const [citasView, setCitasView] = useState<'lista' | 'calendario'>('calendario');
  const [services, setServices] = useState<any[]>([]);
  const [modalSlot, setModalSlot] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    api.get('/services/me').then(r => setServices(r.data.services ?? r.data)).catch(() => {});
  }, []);

  function handleCitasViewChange(v: 'lista' | 'calendario') {
    setCitasView(v);
  }

  const hasActiveProfile = profiles.length > 0;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={citasView === 'calendario' ? 'w-full' : 'max-w-2xl'}>

      {/* ── Banner: agenda no configurada ── */}
      {profiles.length > 0 && agendaConfigured === false && (
        <div style={{
          marginBottom: 20,
          padding: '16px 20px',
          background: C.isDark
            ? 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(234,88,12,0.10))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(254,243,199,0.9))',
          border: '1.5px solid rgba(245,158,11,0.45)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', gap: 14,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>📅</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#d97706', fontWeight: 700, fontSize: 14, margin: 0 }}>
              Tu agenda no está configurada
            </p>
            <p style={{ color: C.muted, fontSize: 12, margin: '3px 0 0', lineHeight: 1.4 }}>
              Define tus horarios de disponibilidad para que tus pacientes puedan agendar contigo.
            </p>
          </div>
          <button
            onClick={onGoToAgenda}
            style={{
              background: '#f59e0b', color: 'white', border: 'none', borderRadius: 9,
              padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Configurar →
          </button>
        </div>
      )}

      {/* Row: lista/calendario toggle + +Crear Cita */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {hasActiveProfile && (
            <div
              className="flex rounded-lg p-0.5"
              style={{ background: C.isDark ? 'rgba(255,255,255,0.08)' : 'rgb(240,237,250)' }}
            >
              {([
                { id: 'lista' as const, label: 'Lista', icon: <CalendarDays className="h-3.5 w-3.5" /> },
                { id: 'calendario' as const, label: 'Calendario', icon: <Calendar className="h-3.5 w-3.5" /> },
              ]).map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => handleCitasViewChange(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={citasView === id
                    ? { background: C.isDark ? 'rgba(255,255,255,0.12)' : 'white', color: C.text }
                    : { background: 'transparent', color: C.muted }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          )}
          {hasActiveProfile && citasView === 'lista' && (
            <button
              onClick={() => setModalSlot({ date: today, time: '09:00' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.accent}, #2dd4bf)`, color: '#fff' }}
            >
              <Plus className="h-3.5 w-3.5" /> Crear cita
            </button>
          )}
        </div>
      </div>

      {/* Calendario view */}
      {citasView === 'calendario' && hasActiveProfile ? (
        <ProfessionalCalendar C={C} profiles={profiles.map(p => ({ id: p.id }))} />
      ) : (
        /* Lista view */
        totalBookings === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: C.muted }}>
            <Calendar className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-base font-medium">Aún no tienes reservas en tu perfil</p>
            <p className="text-sm mt-1">Cuando tus clientes agenden aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {pendingBookings.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-amber-500 mb-3">Pendientes ({pendingBookings.length})</h3>
                <div className="space-y-2">
                  {pendingBookings.map(b => (
                    <ProBookingCard key={b.id} booking={b} C={C}>
                      <button onClick={() => updateBookingStatus(b.id, 'CONFIRMED')} style={{ background: `linear-gradient(135deg, ${C.accent}, #2dd4bf)`, color: '#fff' }} className="text-sm px-3 py-1.5 rounded-lg transition-colors">Confirmar</button>
                      <button onClick={() => updateBookingStatus(b.id, 'CANCELLED')} className="text-sm px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors">Cancelar</button>
                    </ProBookingCard>
                  ))}
                </div>
              </section>
            )}
            {confirmedBookings.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-green-500 mb-3">Confirmadas ({confirmedBookings.length})</h3>
                <div className="space-y-2">
                  {confirmedBookings.map(b => (
                    <ProBookingCard key={b.id} booking={b} C={C}>
                      <button onClick={() => updateBookingStatus(b.id, 'COMPLETED')} style={{ background: 'rgba(45,212,191,0.12)', color: '#0d9488', border: '1px solid rgba(45,212,191,0.25)' }} className="text-sm px-3 py-1.5 rounded-lg transition-colors">Completar</button>
                      <button onClick={() => updateBookingStatus(b.id, 'CANCELLED')} className="text-sm px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors">Cancelar</button>
                    </ProBookingCard>
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      )}

      {modalSlot && (
        <NewBookingModal
          slot={modalSlot}
          services={services.filter((s: any) => s.isActive)}
          profiles={profiles}
          C={C}
          onClose={() => setModalSlot(null)}
          onCreated={() => { setModalSlot(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}


function ProBookingCard({ booking: b, children, C }: { booking: Booking; children: React.ReactNode; C: Colors }) {
  return (
    <div className="rounded-xl p-4 flex items-center justify-between"
      style={{
        background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${C.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
        boxShadow: C.isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
      }}>
      <div>
        <p className="font-medium" style={{ color: C.text }}>{b.clientName}</p>
        <p className="text-sm" style={{ color: C.muted }}>{b.service.name} &middot; {formatCurrency(b.service.price, b.service.currency)}</p>
        <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: C.muted }}>
          <Clock className="h-3.5 w-3.5" />
          {new Date(b.date).toLocaleDateString()} {b.startTime} - {b.endTime}
        </p>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

/* ────────────────── Tab: Reseñas ────────────────── */

function TabResenas({ C, isPro }: { C: Colors; isPro: boolean }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!isPro) { setLoading(false); return; }
    api.get('/reviews/mine')
      .then(res => {
        setReviews(res.data.reviews);
        setAverageRating(res.data.averageRating);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isPro]);

  const toggleVisibility = async (id: string) => {
    setToggling(id);
    try {
      const res = await api.put(`/reviews/${id}/visibility`);
      setReviews(prev => prev.map(r => r.id === id ? { ...r, isVisible: res.data.isVisible } : r));
    } catch {}
    setToggling(null);
  };

  if (!isPro) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: C.text }}>Reseñas</h2>
        <p className="text-sm mb-8" style={{ color: C.muted }}>Lo que dicen tus pacientes sobre ti.</p>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '56px 32px', textAlign: 'center',
          background: C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${C.isDark ? 'rgba(45,212,191,0.12)' : 'rgba(45,212,191,0.2)'}`,
          borderRadius: 16,
        }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(45,212,191,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Star style={{ width: 24, height: 24, color: '#2dd4bf' }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>Reseñas verificadas — Plan Pro</p>
          <p style={{ fontSize: 13, color: C.muted, maxWidth: 320, lineHeight: 1.6 }}>
            Con el plan Pro, tus pacientes reciben un email al completar su cita para dejar una reseña verificada en tu perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 className="text-xl font-bold mb-1" style={{ color: C.text }}>Reseñas</h2>
      <p className="text-sm mb-8" style={{ color: C.muted }}>Lo que dicen tus pacientes sobre ti.</p>

      {averageRating !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
          padding: '16px 20px',
          background: C.isDark ? 'rgba(45,212,191,0.08)' : 'rgba(45,212,191,0.06)',
          border: `1px solid ${C.isDark ? 'rgba(45,212,191,0.18)' : 'rgba(45,212,191,0.2)'}`,
          borderRadius: 12,
        }}>
          <Star fill="#2dd4bf" color="#2dd4bf" size={24} />
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{averageRating}</span>
            <span style={{ fontSize: 13, color: C.muted, marginLeft: 6 }}>
              ({reviews.filter(r => r.isVisible).length} reseña{reviews.filter(r => r.isVisible).length !== 1 ? 's' : ''} visible{reviews.filter(r => r.isVisible).length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      )}

      {loading && <p style={{ color: C.muted, fontSize: 14 }}>Cargando…</p>}

      {!loading && reviews.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '56px 32px', textAlign: 'center',
          background: C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${C.isDark ? 'rgba(45,212,191,0.12)' : 'rgba(45,212,191,0.2)'}`,
          borderRadius: 16,
        }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(45,212,191,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Star style={{ width: 24, height: 24, color: '#2dd4bf' }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>Aún no hay reseñas registradas</p>
          <p style={{ fontSize: 13, color: C.muted, maxWidth: 320, lineHeight: 1.6 }}>
            Cuando marques una cita como completada, tu paciente recibirá un email para dejar su reseña.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.map(r => (
          <div key={r.id} style={{
            padding: '16px 20px',
            background: C.isDark ? 'rgba(255,255,255,0.04)' : '#fff',
            border: `1px solid ${C.isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}`,
            borderRadius: 12,
            opacity: r.isVisible ? 1 : 0.5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={14} fill={n <= r.rating ? '#2dd4bf' : 'none'} color={n <= r.rating ? '#2dd4bf' : '#d4d4d8'} strokeWidth={1.5} />
                  ))}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{r.clientName}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>
                  {new Date(r.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => toggleVisibility(r.id)}
                disabled={toggling === r.id}
                title={r.isVisible ? 'Ocultar reseña' : 'Mostrar reseña'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.muted }}
              >
                {r.isVisible ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
              </button>
            </div>
            {r.comment && (
              <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>{r.comment}</p>
            )}
            {!r.isVisible && (
              <p style={{ fontSize: 11, color: '#f59e0b', margin: '8px 0 0' }}>Oculta — no visible en tu perfil público</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────── Tab: Configurar Agenda ────────────────── */
function TabAgenda({ theme, profiles, C, isPro }: { theme: 'dark' | 'light'; profiles: Profile[]; C: Colors; isPro: boolean }) {
  if (profiles.length === 0) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* CTA banner */}
        <div style={{
          background: C.cardBg, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '14px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <p style={{ color: C.text, fontWeight: 600, fontSize: 14, margin: 0 }}>Activa tu agenda creando tu perfil</p>
            <p style={{ color: C.muted, fontSize: 12, margin: '3px 0 0' }}>Con tu perfil recibirás reservas en línea</p>
          </div>
          <Link
            to="/profile/new"
            className="flex items-center gap-1.5 whitespace-nowrap text-white text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: C.accent, textDecoration: 'none' }}
          >
            <Plus className="h-3.5 w-3.5" /> Crear perfil
          </Link>
        </div>

        {/* Free features */}
        <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 10px' }}>Incluido gratis</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { icon: '📅', label: 'Disponibilidad', desc: 'Define tus días y horarios de atención' },
            { icon: '🗂️', label: 'Servicios', desc: 'Crea y administra tu catálogo de servicios' },
          ].map(({ icon, label, desc }) => (
            <div key={label} style={{
              background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
              border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '14px 16px',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              boxShadow: C.isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.05)',
            }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <p style={{ color: C.text, fontWeight: 600, fontSize: 13, margin: '8px 0 4px' }}>{label}</p>
              <p style={{ color: C.muted, fontSize: 12, margin: 0, lineHeight: 1.4 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Pro features */}
        <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 10px' }}>Plan Pro</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '🗓️', label: 'Horarios por servicio', desc: 'Disponibilidad independiente para cada servicio' },
            { icon: '🚫', label: 'Bloqueos fijos', desc: 'Bloquea franjas recurrentes automáticamente' },
            { icon: '⚙️', label: 'Reglas de reserva', desc: 'Auto-confirmación, lista de espera y pagos previos' },
            { icon: '🔔', label: 'Notificaciones Pro', desc: 'Recordatorios, feedback y reagendamiento automático' },
          ].map(({ icon, label, desc }) => (
            <ProGate key={label} isPro={isPro}>
              <div style={{
                background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
                border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '14px 16px', height: '100%', boxSizing: 'border-box',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                boxShadow: C.isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.05)',
              }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <p style={{ color: C.text, fontWeight: 600, fontSize: 13, margin: '8px 0 4px' }}>{label}</p>
                <p style={{ color: C.muted, fontSize: 12, margin: 0, lineHeight: 1.4 }}>{desc}</p>
              </div>
            </ProGate>
          ))}
        </div>
      </div>
    );
  }
  return <SchedulingPanel theme={theme} accent={C.accent} />;
}
