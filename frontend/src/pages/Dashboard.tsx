import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Plus, LogOut, Calendar, Clock, Settings,
  CalendarDays, Facebook, Instagram, Linkedin, MessageCircle,
  Home, Compass, Briefcase, Pencil, Search, ChevronRight, Camera,
  Sun, Moon, Lock, Copy, ExternalLink,
} from 'lucide-react';
import { useUpload } from '../hooks/useUpload';
import { formatCurrency } from '../lib/utils';
import { PROFESSION_CATEGORIES } from '../lib/professions';
import BookingForm from '../components/BookingForm';

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

interface ClientBooking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; price: number; currency: string; durationMinutes: number };
  profile: { title: string; slug: string };
}

type Tab = 'inicio' | 'citas' | 'explorar' | 'profesional';

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

const DARK: Colors = {
  sideBg: '#18181f',
  navBg: '#18181f',
  mainBg: '#0f0f12',
  tabsBg: '#18181f',
  border: '#2e2e3d',
  cardBg: '#22222c',
  cardShadow: 'none',
  text: '#e8e8f0',
  muted: '#6b6b80',
  accent: '#6c63ff',
  accentLight: 'rgba(108, 99, 255, 0.15)',
  isDark: true,
};

const LIGHT: Colors = {
  sideBg: 'white',
  navBg: 'white',
  mainBg: 'rgb(245, 244, 240)',
  tabsBg: 'white',
  border: 'rgb(220, 215, 235)',
  cardBg: 'white',
  cardShadow: '0 2px 8px rgba(0,0,0,0.07)',
  text: '#2d2b55',
  muted: '#6b6b8f',
  accent: '#6c63ff',
  accentLight: 'rgba(108, 99, 255, 0.08)',
  isDark: false,
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { uploadImage, uploading: uploadingAvatar } = useUpload();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clientBookings, setClientBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    () => (searchParams.get('tab') as Tab) || 'inicio'
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('aliax_theme') as 'dark' | 'light') || 'dark'
  );
  const C = theme === 'dark' ? DARK : LIGHT;

  useEffect(() => { localStorage.setItem('aliax_theme', theme); }, [theme]);

  useEffect(() => {
    const email = user?.email ?? '';
    Promise.all([
      api.get('/profiles').then(r => setProfiles(r.data)),
      api.get('/bookings').then(r => setBookings(r.data)),
      email
        ? api.get(`/bookings/client/${encodeURIComponent(email)}`).then(r => setClientBookings(r.data))
        : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [user?.email]);

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
    const result = await uploadImage(file);
    if (!result) return;
    const primary = profiles[0];
    if (primary) {
      await api.put(`/profiles/${primary.id}`, { avatar: result.url });
      setProfiles(prev => prev.map((p, i) => i === 0 ? { ...p, avatar: result.url } : p));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: C.mainBg }}>
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  const pendingBookings   = bookings.filter(b => b.status === 'PENDING');
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const totalServices     = profiles.reduce((sum, p) => sum + p.services.length, 0);

  const initials = (user?.name ?? '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const sidebarAvatar = profiles.find(p => p.avatar)?.avatar ?? user?.avatar ?? null;
  const socialLinks   = (user?.socialLinks || {}) as Record<string, string>;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'inicio',      label: 'Inicio',             icon: <Home className="h-4 w-4" /> },
    { id: 'citas',       label: 'Mis Citas',          icon: <Calendar className="h-4 w-4" /> },
    { id: 'explorar',    label: 'Explorar',           icon: <Compass className="h-4 w-4" /> },
    { id: 'profesional', label: 'Perfil Profesional', icon: <Briefcase className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.mainBg }}>
      {/* Navbar */}
      <nav
        className="px-6 py-3 flex items-center justify-between shrink-0"
        style={{ background: C.navBg, borderBottom: `1px solid ${C.border}` }}
      >
        <Link to="/" className="font-bold text-lg" style={{ color: C.text }}>Aliax.io</Link>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: C.muted }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text)}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </nav>

      {/* ── Mobile profile card (visible solo en mobile) ── */}
      <div
        className="md:hidden flex flex-col items-center text-center gap-3 px-6 py-6 shrink-0"
        style={{ background: C.sideBg, borderBottom: `1px solid ${C.border}` }}
      >
        {/* Avatar grande */}
        <div
          className="rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold"
          style={{ width: 96, height: 96, background: 'rgba(108,99,255,0.15)', color: '#6c63ff', border: '2px solid rgba(108,99,255,0.35)', flexShrink: 0 }}
        >
          {sidebarAvatar
            ? <img src={sidebarAvatar} alt={user?.name} className="w-full h-full object-cover" />
            : initials}
        </div>
        {/* Nombre */}
        <div>
          <p className="font-bold text-xl leading-tight" style={{ color: C.text }}>{user?.name}</p>
          {profiles[0]?.profession && (
            <p className="text-sm mt-0.5" style={{ color: C.accent }}>{profiles[0].profession}</p>
          )}
        </div>
        {/* Botones */}
        <div className="flex items-center gap-3 mt-1">
          <Link
            to="/account"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: C.accent, color: 'white' }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar perfil
          </Link>
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: C.accentLight, color: C.muted, border: `1px solid ${C.border}` }}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — oculto en mobile */}
        <aside
          className="hidden md:flex shrink-0 flex-col p-6 gap-5 overflow-y-auto"
          style={{ width: '400px', background: C.sideBg, borderRight: `1px solid ${C.border}` }}
        >
          {/* Avatar */}
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="relative">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="rounded-full overflow-hidden flex items-center justify-center text-4xl font-bold select-none focus:outline-none"
                style={{ width: '140px', height: '140px', background: 'rgba(108,99,255,0.15)', color: '#6c63ff', border: '2px solid rgba(108,99,255,0.35)' }}
              >
                {sidebarAvatar
                  ? <img src={sidebarAvatar} alt={user?.name} className="w-full h-full object-cover" />
                  : initials}
              </button>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: C.accent, border: `2px solid ${C.sideBg}` }}
              >
                {uploadingAvatar
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="h-3 w-3 text-white" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="font-bold text-2xl leading-tight" style={{ color: C.text }}>{user?.name}</p>
              {user?.bio && <p className="text-sm mt-1 leading-snug" style={{ color: C.muted }}>{user.bio}</p>}
            </div>
          </div>

          {/* Social icons */}
          <div className="flex justify-center gap-2">
            {SOCIAL_ICONS.map(({ key, Icon, color }) => {
              const url = buildSocialUrl(key, socialLinks[key] || '');
              if (!url) return (
                <span key={key} className="p-2 rounded-lg" style={{ color: C.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)' }}>
                  <Icon className="h-4 w-4" />
                </span>
              );
              return (
                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg transition-opacity hover:opacity-75"
                  style={{ color, backgroundColor: color + '22' }}>
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>

          <div className="h-px" style={{ background: C.border }} />

          {/* Editar perfil */}
          <Link
            to="/account"
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-full"
            style={C.isDark
              ? { background: C.cardBg, border: `1px solid ${C.border}`, color: C.text }
              : { background: 'rgb(107, 99, 255)', border: 'none', color: 'white' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Pencil className="h-4 w-4" />
            Editar perfil
          </Link>

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: C.accentLight, color: C.muted, border: `1px solid ${C.border}` }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>

          {/* Logout */}
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center justify-center gap-2 text-sm transition-colors py-1"
            style={{ color: C.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </aside>

        {/* Main area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div
            className="flex shrink-0 md:px-6 justify-center md:justify-start"
            style={{ background: C.tabsBg, borderBottom: `1px solid ${C.border}` }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col md:flex-row items-center gap-1 md:gap-1.5 px-5 md:px-4 py-3 md:py-3.5 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
                style={activeTab === tab.id
                  ? { borderBottomColor: C.accent, color: C.accent }
                  : { borderBottomColor: 'transparent', color: C.muted }}
                onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = C.muted; }}
              >
                <span className="[&>svg]:h-5 [&>svg]:w-5 md:[&>svg]:h-4 md:[&>svg]:w-4">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'profesional' && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold leading-none">Pro</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'inicio'      && <TabInicio profiles={profiles} bookings={bookings} userName={user?.name} C={C} />}
            {activeTab === 'citas'       && (
              <TabCitas
                pendingBookings={pendingBookings}
                confirmedBookings={confirmedBookings}
                totalBookings={bookings.length}
                updateBookingStatus={updateBookingStatus}
                clientBookings={clientBookings}
                C={C}
              />
            )}
            {activeTab === 'explorar'    && <TabExplorar C={C} />}
            {activeTab === 'profesional' && <TabProfesional profiles={profiles} totalServices={totalServices} C={C} />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ────────────────── Tab: Inicio ────────────────── */
function TabInicio({ profiles, bookings, userName, C }: {
  profiles: Profile[];
  bookings: Booking[];
  userName?: string;
  C: Colors;
}) {
  const totalServices = profiles.reduce((sum, p) => sum + p.services.length, 0);
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-1" style={{ color: C.text }}>
        Hola, {userName?.split(' ')[0] ?? 'bienvenido'} 👋
      </h2>
      <p className="mb-6" style={{ color: C.muted }}>Aquí tienes un resumen de tu actividad.</p>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Reservas"  value={bookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED').length} sub="pendientes y confirmadas" color="indigo"  isDark={C.isDark} shadow={C.cardShadow} />
        <StatCard label="Servicios" value={totalServices}  sub="en todos tus perfiles"    color="emerald" isDark={C.isDark} shadow={C.cardShadow} />
        <StatCard label="Perfiles"  value={profiles.length} sub="perfiles profesionales"  color="amber"   isDark={C.isDark} shadow={C.cardShadow} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, isDark, shadow }: {
  label: string; value: number; sub: string;
  color: 'indigo' | 'emerald' | 'amber'; isDark: boolean; shadow: string;
}) {
  const light = { indigo: { bg: '#eef2ff', text: '#4338ca' }, emerald: { bg: '#ecfdf5', text: '#047857' }, amber: { bg: '#fffbeb', text: '#b45309' } };
  const dark  = { indigo: { bg: 'rgba(99,102,241,0.18)', text: '#a5b4fc' }, emerald: { bg: 'rgba(16,185,129,0.18)', text: '#6ee7b7' }, amber: { bg: 'rgba(245,158,11,0.18)', text: '#fcd34d' } };
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
const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendiente',  className: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Confirmada', className: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Completada', className: 'bg-slate-100 text-slate-600' },
  CANCELLED: { label: 'Cancelada',  className: 'bg-red-100 text-red-500' },
  NO_SHOW:   { label: 'No asistió', className: 'bg-orange-100 text-orange-600' },
};

function TabCitas({ pendingBookings, confirmedBookings, totalBookings, updateBookingStatus, clientBookings, C }: {
  pendingBookings: Booking[];
  confirmedBookings: Booking[];
  totalBookings: number;
  updateBookingStatus: (id: string, status: string) => void;
  clientBookings: ClientBooking[];
  C: Colors;
}) {
  const [view, setView] = useState<'pro' | 'client'>('pro');

  const cancelClientBooking = async (id: string) => {
    const ok = window.confirm('¿Cancelar esta reserva?');
    if (!ok) return;
    await api.put(`/bookings/${id}/cancel`, {});
    window.location.reload();
  };

  if (view === 'client') {
    return (
      <div className="max-w-2xl">
        <ViewSwitcher view={view} onChange={setView} clientCount={clientBookings.length} proCount={totalBookings} C={C} />
        {clientBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: C.muted }}>
            <Calendar className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-base font-medium">No tienes reservas como cliente</p>
            <p className="text-sm mt-1">Ve a Explorar para reservar con un profesional.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clientBookings.map(b => {
              const st = STATUS_LABEL[b.status] ?? { label: b.status, className: 'bg-slate-100 text-slate-500' };
              const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED';
              return (
                <div key={b.id} className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: C.cardBg, border: `1px solid ${C.border}`, boxShadow: C.cardShadow }}>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium" style={{ color: C.text }}>{b.profile.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.className}`}>{st.label}</span>
                    </div>
                    <p className="text-sm" style={{ color: C.muted }}>{b.service.name} &middot; {formatCurrency(b.service.price, b.service.currency)}</p>
                    <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: C.muted }}>
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(b.date).toLocaleDateString()} {b.startTime} - {b.endTime}
                    </p>
                  </div>
                  {canCancel && (
                    <button onClick={() => cancelClientBooking(b.id)}
                      className="text-sm px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors">
                      Cancelar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <ViewSwitcher view={view} onChange={setView} clientCount={clientBookings.length} proCount={totalBookings} C={C} />
      {totalBookings === 0 ? (
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
                    <button onClick={() => updateBookingStatus(b.id, 'CONFIRMED')} className="text-sm px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors">Confirmar</button>
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
                    <button onClick={() => updateBookingStatus(b.id, 'COMPLETED')} className="text-sm px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors">Completar</button>
                  </ProBookingCard>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ViewSwitcher({ view, onChange, proCount, clientCount, C }: {
  view: 'pro' | 'client'; onChange: (v: 'pro' | 'client') => void;
  proCount: number; clientCount: number; C: Colors;
}) {
  return (
    <div className="flex rounded-lg p-0.5 mb-5 w-fit"
      style={{ background: C.isDark ? 'rgba(255,255,255,0.08)' : 'rgb(240,237,250)' }}>
      {([
        { id: 'pro' as const, label: 'Como profesional', count: proCount },
        { id: 'client' as const, label: 'Como cliente', count: clientCount },
      ]).map(({ id, label, count }) => (
        <button key={id} onClick={() => onChange(id)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          style={view === id
            ? { background: C.isDark ? 'rgba(255,255,255,0.12)' : 'white', color: C.text }
            : { background: 'transparent', color: C.muted }}>
          {label}
          <span className="text-xs px-1.5 py-0.5 rounded-full"
            style={view === id
              ? { background: C.accentLight, color: C.accent }
              : { background: 'rgba(128,128,128,0.15)', color: C.muted }}>
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}

function ProBookingCard({ booking: b, children, C }: { booking: Booking; children: React.ReactNode; C: Colors }) {
  return (
    <div className="rounded-xl p-4 flex items-center justify-between"
      style={{ background: C.cardBg, border: `1px solid ${C.border}`, boxShadow: C.cardShadow }}>
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

/* ────────────────── Tab: Explorar ────────────────── */
interface DirectoryProfile {
  id: string; slug: string; title: string; profession: string;
  bio?: string; avatar?: string;
  services: { id: string; name: string; price: number; currency: string; durationMinutes: number; isActive: boolean }[];
  user?: { name: string };
  socialLinks?: Record<string, string>;
  availabilitySlots?: { dayOfWeek: number; startTime: string; endTime: string }[];
  createdAt?: string;
}

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_ORDER_WEEK = [1, 2, 3, 4, 5, 6, 0];

type ExploreScreen = 'directory' | 'professionals' | 'profile';

function TabExplorar({ C }: { C: Colors }) {
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [screen, setScreen] = useState<ExploreScreen>('directory');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<DirectoryProfile | null>(null);
  const [bookingState, setBookingState] = useState<{ profileId: string; serviceId: string; serviceName: string } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    api.get('/profiles/directory')
      .then(r => setProfiles(r.data))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const existingProfessions = useMemo(() => new Set(profiles.map(p => p.profession).filter(Boolean)), [profiles]);
  const allPredefined = useMemo(() => new Set(PROFESSION_CATEGORIES.flatMap(c => c.professions)), []);

  const availableCategories = useMemo(() =>
    PROFESSION_CATEGORIES
      .map(cat => ({ ...cat, professions: cat.professions.filter(p => existingProfessions.has(p)) }))
      .filter(cat => cat.professions.length > 0),
    [existingProfessions]);

  const uncategorized = useMemo(() =>
    [...existingProfessions].filter(p => !allPredefined.has(p)),
    [existingProfessions, allPredefined]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return availableCategories;
    const q = search.toLowerCase();
    return availableCategories
      .map(cat => ({ ...cat, professions: cat.professions.filter(p => p.toLowerCase().includes(q) || cat.category.toLowerCase().includes(q)) }))
      .filter(cat => cat.professions.length > 0);
  }, [availableCategories, search]);

  const filteredUncategorized = useMemo(() => {
    if (!search.trim()) return uncategorized;
    const q = search.toLowerCase();
    return uncategorized.filter(p => p.toLowerCase().includes(q));
  }, [uncategorized, search]);

  const professionalsForProfession = useMemo(() =>
    profiles.filter(p => p.profession === selectedProfession),
    [profiles, selectedProfession]);

  function goBack() {
    if (screen === 'profile') { setSelectedProfile(null); setScreen('professionals'); }
    else if (screen === 'professionals') { setSelectedProfession(''); setScreen('directory'); }
  }

  async function handleSelectProfile(p: DirectoryProfile) {
    setSelectedProfile(p);
    setScreen('profile');
    try {
      const { data } = await api.get(`/profiles/${p.slug}`);
      setSelectedProfile(prev => prev?.id === p.id ? { ...prev, ...data } : prev);
    } catch {}
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  if (screen === 'profile' && selectedProfile) {
    const p = selectedProfile;
    const socialLinks = p.socialLinks || {};
    const hasSocialLinks = SOCIAL_ICONS.some(({ key }) => !!(socialLinks as any)[key]);
    const availByDay: Record<number, { startTime: string; endTime: string }[]> = {};
    (p.availabilitySlots || []).forEach(s => {
      if (!availByDay[s.dayOfWeek]) availByDay[s.dayOfWeek] = [];
      availByDay[s.dayOfWeek].push({ startTime: s.startTime, endTime: s.endTime });
    });
    const activeDays = DAY_ORDER_WEEK.filter(d => availByDay[d]?.length > 0);
    const memberYear = p.createdAt ? new Date(p.createdAt).getFullYear() : null;

    return (
      <div className="max-w-2xl">
        <button onClick={goBack} className="flex items-center gap-1.5 text-sm mb-5" style={{ color: C.accent }}>
          <ChevronRight className="h-4 w-4 rotate-180" /> Volver
        </button>

        {/* Tarjeta cuadrada del profesional */}
        <div className="rounded-2xl p-6 mb-4 flex flex-col items-center text-center mx-auto"
          style={{ background: C.cardBg, border: `1px solid ${C.border}`, boxShadow: C.cardShadow, width: 300 }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3 overflow-hidden"
            style={{ background: C.accentLight, color: C.accent }}>
            {p.avatar ? <img src={p.avatar} alt={p.title} className="w-20 h-20 object-cover" /> : initials(p.title || p.slug)}
          </div>
          <h2 className="text-base font-bold leading-tight" style={{ color: C.text }}>{p.title}</h2>
          {p.profession && <p className="text-sm mt-1" style={{ color: C.accent }}>{p.profession}</p>}
          {memberYear && (
            <p className="text-xs mt-1 flex items-center gap-1 justify-center" style={{ color: C.muted }}>
              <Clock className="h-3 w-3" /> En Aliax.io desde {memberYear}
            </p>
          )}
          {p.bio && <p className="text-xs mt-2 leading-relaxed" style={{ color: C.muted }}>{p.bio}</p>}
          {hasSocialLinks && (
            <div className="flex gap-2 mt-3">
              {SOCIAL_ICONS.map(({ key, Icon, color }) => {
                const val = (socialLinks as any)[key];
                const url = val ? buildSocialUrl(key, val) : null;
                if (!url) return null;
                return (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-75"
                    style={{ backgroundColor: color + '22', color }}>
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Disponibilidad */}
        {activeDays.length > 0 && (
          <div className="rounded-xl p-4 mb-4 mx-auto"
            style={{ background: C.cardBg, border: `1px solid ${C.border}`, width: 300 }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>Disponibilidad</p>
            <div className="space-y-2">
              {activeDays.map(day => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-8" style={{ color: C.text }}>{DAY_NAMES_ES[day]}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availByDay[day].map((slot, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded"
                        style={{ background: C.accentLight, color: C.accent }}>
                        {slot.startTime} – {slot.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Servicios */}
        {p.services.length === 0
          ? <p className="text-sm text-center py-8" style={{ color: C.muted }}>No hay servicios disponibles</p>
          : (
            <div className="mx-auto" style={{ width: 300 }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>Servicios</p>
              <div className="space-y-3">
                {p.services.map(s => (
                  <div key={s.id} className="rounded-xl p-4 flex items-center justify-between"
                    style={{ background: C.cardBg, border: `1px solid ${C.border}`, boxShadow: C.cardShadow }}>
                    <div>
                      <p className="font-medium" style={{ color: C.text }}>{s.name}</p>
                      <p className="text-sm" style={{ color: C.muted }}>{formatCurrency(s.price, s.currency)} · {s.durationMinutes} min</p>
                    </div>
                    <button
                      onClick={() => setBookingState({ profileId: p.id, serviceId: s.id, serviceName: s.name })}
                      className="text-sm px-3 py-1.5 text-white rounded-lg"
                      style={{ background: C.accent }}
                    >
                      Reservar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

      {bookingState && !bookingSuccess && (
        <BookingForm
          profileId={bookingState.profileId}
          serviceId={bookingState.serviceId}
          serviceName={bookingState.serviceName}
          onClose={() => setBookingState(null)}
          onSuccess={() => { setBookingSuccess(true); setBookingState(null); }}
        />
      )}

      {bookingSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center">
            <div className="text-4xl mb-4">&#10003;</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">¡Reserva registrada!</h3>
            <p className="text-slate-500 mb-6">Recibirás una confirmación pronto.</p>
            <button onClick={() => setBookingSuccess(false)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      )}
      </div>
    );
  }

  if (screen === 'professionals') {
    return (
      <div className="max-w-2xl">
        <button onClick={goBack} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: C.accent }}>
          <ChevronRight className="h-4 w-4 rotate-180" /> Volver
        </button>
        <h2 className="text-xl font-semibold mb-1" style={{ color: C.text }}>{selectedProfession}</h2>
        <p className="text-sm mb-5" style={{ color: C.muted }}>
          {professionalsForProfession.length} profesional{professionalsForProfession.length !== 1 ? 'es' : ''}
        </p>
        {professionalsForProfession.length === 0
          ? <p className="text-sm text-center py-12" style={{ color: C.muted }}>No hay profesionales en esta categoría</p>
          : (
            <div className="space-y-3">
              {professionalsForProfession.map(p => (
                <button key={p.id}
                  onClick={() => handleSelectProfile(p)}
                  className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                  style={{ background: C.cardBg, border: `1px solid ${C.border}`, boxShadow: C.cardShadow }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden"
                    style={{ background: C.accentLight, color: C.accent }}>
                    {p.avatar ? <img src={p.avatar} alt={p.title} className="w-12 h-12 object-cover" /> : initials(p.title || p.slug)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: C.text }}>{p.title}</p>
                    {p.bio && <p className="text-sm truncate" style={{ color: C.muted }}>{p.bio}</p>}
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>{p.services.length} servicios</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: C.muted }} />
                </button>
              ))}
            </div>
          )}
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-6 w-6 border-4 border-t-transparent rounded-full"
        style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
    </div>
  );

  const isEmpty = filteredCategories.length === 0 && filteredUncategorized.length === 0;
  const headerBg = C.isDark ? 'rgba(255,255,255,0.04)' : 'rgb(248,245,252)';

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h2 className="text-xl font-semibold mb-1" style={{ color: C.text }}>Explorar</h2>
        <p className="text-sm" style={{ color: C.muted }}>Encuentra el profesional que necesitás</p>
      </div>
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: C.muted }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar profesión..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: C.cardBg, border: `1px solid ${C.border}`, color: C.text }}
          onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
          onBlur={e => (e.currentTarget.style.borderColor = C.border)}
        />
      </div>
      {isEmpty ? (
        <p className="text-center py-12 text-sm" style={{ color: C.muted }}>
          {search ? 'No se encontraron resultados' : 'No hay profesionales registrados aún'}
        </p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, boxShadow: C.cardShadow }}>
          {filteredCategories.map((cat, ci) => (
            <div key={cat.category}>
              {ci > 0 && <div className="h-px" style={{ background: C.border }} />}
              <div className="px-4 py-2" style={{ background: headerBg, borderBottom: `1px solid ${C.border}` }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{cat.category}</p>
              </div>
              {cat.professions.map(profession => {
                const count = profiles.filter(p => p.profession === profession).length;
                return (
                  <button key={profession}
                    onClick={() => { setSelectedProfession(profession); setScreen('professionals'); }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                    style={{ borderBottom: `1px solid ${C.border}`, background: C.cardBg }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.accentLight)}
                    onMouseLeave={e => (e.currentTarget.style.background = C.cardBg)}>
                    <span className="text-sm" style={{ color: C.text }}>{profession}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: C.accentLight, color: C.accent }}>{count}</span>
                      <ChevronRight className="h-4 w-4" style={{ color: C.muted }} />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
          {filteredUncategorized.length > 0 && (
            <div>
              <div className="px-4 py-2" style={{ background: headerBg, borderBottom: `1px solid ${C.border}` }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Otros</p>
              </div>
              {filteredUncategorized.map(profession => {
                const count = profiles.filter(p => p.profession === profession).length;
                return (
                  <button key={profession}
                    onClick={() => { setSelectedProfession(profession); setScreen('professionals'); }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                    style={{ borderBottom: `1px solid ${C.border}`, background: C.cardBg }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.accentLight)}
                    onMouseLeave={e => (e.currentTarget.style.background = C.cardBg)}>
                    <span className="text-sm" style={{ color: C.text }}>{profession}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: C.accentLight, color: C.accent }}>{count}</span>
                      <ChevronRight className="h-4 w-4" style={{ color: C.muted }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────── Tab: Perfil Profesional ────────────────── */
function TabProfesional({ profiles, totalServices, C }: { profiles: Profile[]; totalServices: number; C: Colors }) {
  const btnBg     = C.isDark ? '#2e2e3d' : '#f1f5f9';
  const btnBorder = `1px solid ${C.border}`;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyUrl = (slug: string, id: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Briefcase className="h-14 w-14 opacity-30" style={{ color: C.muted }} />
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: C.text }}>Aún no tienes un perfil profesional</p>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Crea tu perfil para ofrecer servicios y recibir reservas.</p>
        </div>
        <Link to="/profile/new" className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-lg"
          style={{ background: C.accent }}>
          <Plus className="h-4 w-4" />
          Crear perfil
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>Disponible</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: C.text }}>Mis Perfiles</h2>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            {profiles.length} {profiles.length === 1 ? 'perfil' : 'perfiles'} &middot; {totalServices} servicios en total
          </p>
        </div>
        {profiles.length < 2 ? (
          <Link
            to="/profile/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
            style={{ background: C.accent }}
          >
            <Plus className="h-4 w-4" />
            Añadir Perfil
          </Link>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
              style={{ background: btnBg, color: C.muted, border: btnBorder }}
            >
              <Lock className="h-4 w-4" />
              Añadir Perfil
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Premium</span>
            </button>
            <p className="text-xs" style={{ color: C.muted }}>Límite del plan Pro. Actualizá a Premium para más perfiles.</p>
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {profiles.map(p => (
          <div key={p.id} className="rounded-xl p-5" style={{ background: C.cardBg, border: `1px solid ${C.border}`, boxShadow: C.cardShadow }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold" style={{ color: C.text }}>{p.title}</h3>
                <p className="text-sm" style={{ color: C.muted }}>{p.profession}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: p.published
                  ? (C.isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7')
                  : (C.isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: p.published
                  ? (C.isDark ? '#4ade80' : '#15803d')
                  : C.muted,
              }}>
                {p.published ? 'Publicado' : 'Borrador'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mb-3" style={{ color: C.muted }}>
              <span>{p.services.length} servicios</span>
              <span>&middot;</span>
              <span>{p._count.bookings} reservas</span>
              <span>&middot;</span>
              <span className="capitalize">{p.template.toLowerCase()}</span>
            </div>

            {/* URL pública */}
            <div className="mb-3">
              <p className="text-xs mb-1.5 font-medium" style={{ color: C.muted }}>Comparte este link con tus clientes</p>
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: C.isDark ? 'rgba(108,99,255,0.08)' : 'rgba(108,99,255,0.06)', border: `1px solid ${C.isDark ? 'rgba(108,99,255,0.2)' : 'rgba(108,99,255,0.15)'}` }}
              >
                <span className="text-xs flex-1 truncate font-mono" style={{ color: C.accent }}>
                  aliax.io/{p.slug}
                </span>
              <button
                onClick={() => copyUrl(p.slug, p.id)}
                className="shrink-0 p-1 rounded transition-opacity hover:opacity-70"
                style={{ color: C.accent }}
                title="Copiar enlace"
              >
                {copiedId === p.id
                  ? <span className="text-xs font-medium text-green-500">✓ Copiado</span>
                  : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={`/${p.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1 rounded transition-opacity hover:opacity-70"
                style={{ color: C.accent }}
                title="Ver perfil público"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to={`/profile/edit/${p.id}`} className="text-sm px-3 py-1.5 rounded-lg" style={{ background: btnBg, color: C.text, border: btnBorder }}>Editar</Link>
              <Link to="/dashboard/services" className="text-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-1" style={{ background: btnBg, color: C.text, border: btnBorder }}>
                <Settings className="h-3 w-3" /> Servicios
              </Link>
              <Link to="/dashboard/availability" className="text-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-1" style={{ background: btnBg, color: C.text, border: btnBorder }}>
                <Clock className="h-3 w-3" /> Horarios
              </Link>
              <Link to="/dashboard/scheduling" className="text-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-1" style={{ background: C.accentLight, color: C.accent, border: `1px solid ${C.accent}22` }}>
                <CalendarDays className="h-3 w-3" /> Agenda
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
