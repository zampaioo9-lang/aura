import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, LayoutGrid, Search, ChevronLeft, ChevronRight, UserCheck, Clock, CreditCard, Tag, Sun, Moon, Trash2, Mail, MailX, Send } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Stats {
  users: { total: number; newThisMonth: number; inTrial: number; paid: number; withDiscount: number };
  profiles: { total: number };
  clients: { total: number };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    noShow: number;
  };
  notifications: { sent: number };
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  createdAt: string;
  trialEndsAt: string | null;
  plan: string | null;
  planInterval: string | null;
  planExpiresAt: string | null;
  stripeSubscriptionId: string | null;
  paypalSubscriptionId: string | null;
  stripeHasDiscount: boolean;
  welcomeEmailSentAt: string | null;
  blocked: boolean;
  featureOverrides: Record<string, boolean>;
  _count: { profiles: number; professionalBookings: number };
  profiles: {
    id: string;
    slug: string;
    title: string;
    published: boolean;
    _count: { bookings: number; services: number };
  }[];
}

const INTERVAL_LABEL: Record<string, string> = {
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
  LIFETIME: 'Lifetime',
};

function PlanBadge({ u }: { u: UserRow }) {
  if (u.plan === 'PRO') {
    const intervalLabel = INTERVAL_LABEL[u.planInterval ?? ''] ?? u.planInterval ?? '?';
    const payMethod = u.paypalSubscriptionId ? 'PayPal' : u.stripeSubscriptionId ? 'Stripe' : '';
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold whitespace-nowrap">
          PRO · {intervalLabel}
        </span>
        {payMethod && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <CreditCard className="w-3 h-3" /> {payMethod}
          </span>
        )}
        {u.stripeHasDiscount && (
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
            <Tag className="w-3 h-3" /> Descuento
          </span>
        )}
      </div>
    );
  }

  if (u.trialEndsAt) {
    const daysLeft = Math.max(0, Math.ceil((new Date(u.trialEndsAt).getTime() - Date.now()) / 86400000));
    if (daysLeft === 0) {
      return <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">Trial expirado</span>;
    }
    const dayOf = Math.max(1, 15 - daysLeft);
    return (
      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium whitespace-nowrap">
        Prueba · Día {dayOf}/14
      </span>
    );
  }

  return <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">Sin plan</span>;
}

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [dark, setDark] = useState(() => localStorage.getItem('aliax_theme') === 'dark');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sendingWelcome, setSendingWelcome] = useState<string | null>(null);
  const [annSubject, setAnnSubject] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annAudience, setAnnAudience] = useState<'all' | 'pro' | 'trial'>('all');
  const [sendingAnn, setSendingAnn] = useState(false);
  const [annResult, setAnnResult] = useState<{ ok: boolean; sent?: number; failed?: number; error?: string } | null>(null);

  // Newsletter (Resend Broadcasts)
  const [nlSubject, setNlSubject] = useState('');
  const [nlHtml, setNlHtml] = useState('');
  const [nlName, setNlName] = useState('');
  const [sendingNl, setSendingNl] = useState(false);
  const [nlResult, setNlResult] = useState<{ ok: boolean; broadcastId?: string; error?: string } | null>(null);
  const [syncingAudience, setSyncingAudience] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; added?: number; total?: number; error?: string } | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState<string | null>(null);
  const [updatingBlock, setUpdatingBlock] = useState<string | null>(null);

  const FEATURE_LABELS: { key: string; label: string }[] = [
    { key: 'historia_clinica',  label: 'Historia Clínica' },
    { key: 'terapia_pareja',    label: 'Terapia de Pareja' },
    { key: 'pacientes',         label: 'Pacientes' },
    { key: 'analytics',         label: 'Analytics' },
    { key: 'agenda',            label: 'Agenda' },
    { key: 'templates_premium', label: 'Templates Premium' },
    { key: 'colores_premium',   label: 'Colores Premium' },
  ];

  const handleToggleFeature = async (userId: string, key: string, value: boolean) => {
    setUpdatingPermissions(userId);
    try {
      await api.patch(`/admin/users/${userId}/features`, { [key]: value });
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, featureOverrides: { ...u.featureOverrides, [key]: value } }
          : u
      ));
    } catch (err) {
      console.error('Error actualizando feature:', err);
    } finally {
      setUpdatingPermissions(null);
    }
  };

  const handleToggleBlock = async (userId: string, blocked: boolean) => {
    setUpdatingBlock(userId);
    try {
      await api.patch(`/admin/users/${userId}/block`, { blocked });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, blocked } : u
      ));
    } catch (err) {
      console.error('Error bloqueando usuario:', err);
    } finally {
      setUpdatingBlock(null);
    }
  };

  const handleGrantAll = async (userId: string) => {
    const allTrue = Object.fromEntries(FEATURE_LABELS.map(f => [f.key, true]));
    setUpdatingPermissions(userId);
    try {
      await api.patch(`/admin/users/${userId}/features`, allTrue);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, featureOverrides: allTrue } : u
      ));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setUpdatingPermissions(null);
    }
  };

  const handleRevokeAll = async (userId: string) => {
    const allFalse = Object.fromEntries(FEATURE_LABELS.map(f => [f.key, false]));
    setUpdatingPermissions(userId);
    try {
      await api.patch(`/admin/users/${userId}/features`, allFalse);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, featureOverrides: allFalse } : u
      ));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setUpdatingPermissions(null);
    }
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('aliax_theme', next ? 'dark' : 'light');
  };

  const C = dark
    ? {
        page: '#0d0d1a',
        header: '#10101f',
        headerBorder: '#1e1e3a',
        card: '#14142a',
        cardBorder: '#2a2a4a',
        text: '#e8e8f8',
        textMuted: '#8888aa',
        textFaint: '#555577',
        tableHdr: '#111128',
        tableRow: '#1c1c35',
        tableRowAlt: '#191930',
        tableRowHover: '#22223f',
        expandedBg: '#181830',
        inputBg: '#1c1c35',
        inputBorder: '#2a2a4a',
        subCard: '#0d0d1a',
      }
    : {
        page: '#f9fafb',
        header: '#ffffff',
        headerBorder: '#e5e7eb',
        card: '#ffffff',
        cardBorder: '#e5e7eb',
        text: '#111827',
        textMuted: '#6b7280',
        textFaint: '#9ca3af',
        tableHdr: '#f9fafb',
        tableRow: '#ffffff',
        tableRowAlt: '#f9fafb',
        tableRowHover: '#f3f4f6',
        expandedBg: '#eef2ff40',
        inputBg: '#ffffff',
        inputBorder: '#e5e7eb',
        subCard: '#ffffff',
      };

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    setLoadingUsers(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (search) params.append('search', search);
    api.get(`/admin/users?${params}`)
      .then(res => {
        setUsers(res.data.users);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .finally(() => setLoadingUsers(false));
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleDeleteUser = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      setTotal(prev => prev - 1);
      setExpandedUser(null);
      setConfirmDelete(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar usuario');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendNewsletter = async () => {
    if (!nlSubject.trim() || !nlHtml.trim()) return;
    const confirmed = window.confirm(`¿Enviar este newsletter a TODA la audiencia en Resend?\n\nEsto es irreversible.`);
    if (!confirmed) return;
    setSendingNl(true);
    setNlResult(null);
    try {
      const res = await api.post('/admin/newsletter', { subject: nlSubject, html: nlHtml, name: nlName || undefined });
      setNlResult({ ok: true, broadcastId: res.data.broadcastId });
    } catch (err: any) {
      setNlResult({ ok: false, error: err.response?.data?.error || 'Error al enviar' });
    } finally {
      setSendingNl(false);
    }
  };

  const handleSyncAudience = async () => {
    const confirmed = window.confirm('¿Sincronizar todos los usuarios actuales con la audiencia de Resend?');
    if (!confirmed) return;
    setSyncingAudience(true);
    setSyncResult(null);
    try {
      const res = await api.post('/admin/newsletter/sync');
      setSyncResult({ ok: true, added: res.data.added, total: res.data.total });
    } catch (err: any) {
      setSyncResult({ ok: false, error: err.response?.data?.error || 'Error al sincronizar' });
    } finally {
      setSyncingAudience(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!annSubject.trim() || !annBody.trim()) return;
    const confirmed = window.confirm(`¿Enviar este anuncio a todos los usuarios (${annAudience === 'all' ? 'todos' : annAudience === 'pro' ? 'solo PRO' : 'solo trial'})?`);
    if (!confirmed) return;
    setSendingAnn(true);
    setAnnResult(null);
    try {
      const res = await api.post('/admin/send-announcement', { subject: annSubject, body: annBody, audience: annAudience });
      setAnnResult({ ok: true, sent: res.data.sent, failed: res.data.failed });
    } catch (err: any) {
      setAnnResult({ ok: false, error: err.response?.data?.error || 'Error al enviar' });
    } finally {
      setSendingAnn(false);
    }
  };

  const handleSendWelcome = async (userId: string) => {
    setSendingWelcome(userId);
    try {
      const res = await api.post(`/admin/users/${userId}/welcome-email`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, welcomeEmailSentAt: res.data.sentAt } : u));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al enviar email de bienvenida');
    } finally {
      setSendingWelcome(null);
    }
  };

  if (loading || !user?.isAdmin) return null;

  return (
    <div style={{ minHeight: '100vh', background: C.page }}>
      {/* Header */}
      <div style={{ background: C.header, borderBottom: `1px solid ${C.headerBorder}` }}
        className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: C.text }}>Panel de Administración</h1>
          <p className="text-sm" style={{ color: C.textMuted }}>Vista general de Aliax.io</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg transition-colors"
            style={{ background: C.card, border: `1px solid ${C.cardBorder}`, color: C.textMuted }}
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-indigo-500 hover:text-indigo-400 font-medium"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl p-5 animate-pulse h-24" style={{ background: C.card }} />
            ))}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard dark={dark} C={C}
                icon={<Users className="w-5 h-5 text-indigo-500" />}
                label="Profesionales"
                sub={`+${stats.users.newThisMonth} este mes`}
                value={stats.users.total}
                iconBg={dark ? 'rgba(99,102,241,0.15)' : '#eef2ff'}
              />
              <StatCard dark={dark} C={C}
                icon={<Clock className="w-5 h-5 text-yellow-500" />}
                label="En periodo de prueba"
                value={stats.users.inTrial}
                iconBg={dark ? 'rgba(234,179,8,0.15)' : '#fefce8'}
              />
              <StatCard dark={dark} C={C}
                icon={<CreditCard className="w-5 h-5 text-green-500" />}
                label="Clientes PRO"
                value={stats.users.paid}
                iconBg={dark ? 'rgba(34,197,94,0.15)' : '#f0fdf4'}
              />
              <StatCard dark={dark} C={C}
                icon={<Tag className="w-5 h-5 text-amber-500" />}
                label="Con código de descuento"
                value={stats.users.withDiscount}
                iconBg={dark ? 'rgba(245,158,11,0.15)' : '#fffbeb'}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard dark={dark} C={C}
                icon={<UserCheck className="w-5 h-5 text-sky-500" />}
                label="Clientes únicos"
                value={stats.clients.total}
                sub="Personas que reservaron"
                iconBg={dark ? 'rgba(14,165,233,0.15)' : '#f0f9ff'}
              />
              <StatCard dark={dark} C={C}
                icon={<LayoutGrid className="w-5 h-5 text-purple-500" />}
                label="Perfiles publicados"
                value={stats.profiles.total}
                iconBg={dark ? 'rgba(168,85,247,0.15)' : '#faf5ff'}
              />
              <StatCard dark={dark} C={C}
                icon={<CalendarCheck className="w-5 h-5 text-emerald-500" />}
                label="Reservas"
                value={stats.bookings.total}
                sub={`${stats.bookings.confirmed} confirmadas`}
                iconBg={dark ? 'rgba(16,185,129,0.15)' : '#ecfdf5'}
              />
            </div>
          </>
        )}

        {/* Booking breakdown */}
        {stats && (
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: C.textMuted }}>Estado de reservas</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Pendientes', value: stats.bookings.pending, lightBg: '#fefce8', lightT: '#ca8a04', darkC: 'rgba(234,179,8,0.12)', darkT: '#ca8a04' },
                { label: 'Confirmadas', value: stats.bookings.confirmed, lightBg: '#f0fdf4', lightT: '#16a34a', darkC: 'rgba(34,197,94,0.12)', darkT: '#16a34a' },
                { label: 'Completadas', value: stats.bookings.completed, lightBg: '#eff6ff', lightT: '#2563eb', darkC: 'rgba(59,130,246,0.12)', darkT: '#3b82f6' },
                { label: 'Canceladas', value: stats.bookings.cancelled, lightBg: '#fef2f2', lightT: '#dc2626', darkC: 'rgba(239,68,68,0.12)', darkT: '#ef4444' },
                { label: 'No show', value: stats.bookings.noShow, lightBg: '#f3f4f6', lightT: '#6b7280', darkC: 'rgba(156,163,175,0.12)', darkT: '#9ca3af' },
              ].map(item => (
                <div key={item.label} className="rounded-lg px-4 py-3"
                  style={{ background: dark ? item.darkC : item.lightBg, color: dark ? item.darkT : item.lightT }}>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs font-medium mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter — Resend Broadcasts */}
        <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: C.text }}>
            <Send className="w-4 h-4 text-purple-500" />
            Newsletter <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">Resend Broadcasts</span>
          </h2>
          <p className="text-xs mb-4" style={{ color: C.textFaint }}>
            Envía a toda la audiencia con tracking de aperturas, clics y baja automática. Requiere <code>RESEND_AUDIENCE_ID</code> configurado.
          </p>

          {/* Sync */}
          <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
            <button
              onClick={handleSyncAudience}
              disabled={syncingAudience}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border disabled:opacity-50"
              style={{ border: `1px solid ${C.cardBorder}`, color: C.textMuted, background: C.inputBg }}
            >
              {syncingAudience ? 'Sincronizando...' : '↑ Sincronizar usuarios existentes'}
            </button>
            {syncResult && (
              <p className="text-xs" style={{ color: syncResult.ok ? '#16a34a' : '#dc2626' }}>
                {syncResult.ok ? `✓ ${syncResult.added} contactos sincronizados de ${syncResult.total}` : `✗ ${syncResult.error}`}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Nombre interno</label>
                <input
                  type="text"
                  placeholder="Ej: Newsletter Marzo 2026"
                  value={nlName}
                  onChange={e => setNlName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Asunto del correo</label>
                <input
                  type="text"
                  placeholder="Ej: Tu competencia ya usa IA. ¿Y tú?"
                  value={nlSubject}
                  onChange={e => { setNlSubject(e.target.value); setNlResult(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>HTML del newsletter</label>
              <textarea
                rows={8}
                placeholder={'<h1>Título</h1>\n<p>Contenido...</p>\n\nResend añade el enlace de baja automáticamente.'}
                value={nlHtml}
                onChange={e => { setNlHtml(e.target.value); setNlResult(null); }}
                className="w-full px-3 py-2 text-sm rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
              />
            </div>
            <div className="flex items-center gap-4">
              {nlResult && (
                <p className="text-sm" style={{ color: nlResult.ok ? '#16a34a' : '#dc2626' }}>
                  {nlResult.ok
                    ? `✓ Broadcast enviado — ID: ${nlResult.broadcastId}`
                    : `✗ ${nlResult.error}`}
                </p>
              )}
              <button
                onClick={handleSendNewsletter}
                disabled={sendingNl || !nlSubject.trim() || !nlHtml.trim()}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingNl ? 'Enviando...' : 'Enviar Newsletter'}
              </button>
            </div>
          </div>
        </div>

        {/* Announcement */}
        <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: C.text }}>
            <Send className="w-4 h-4 text-indigo-500" />
            Enviar anuncio a usuarios
          </h2>
          <p className="text-xs mb-4" style={{ color: C.textFaint }}>
            Envía un correo informando sobre nuevas funciones o novedades.
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="w-40">
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Audiencia</label>
                <select
                  value={annAudience}
                  onChange={e => setAnnAudience(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text, colorScheme: dark ? 'dark' : 'light' }}
                >
                  <option value="all">Todos</option>
                  <option value="pro">Solo PRO</option>
                  <option value="trial">Solo trial</option>
                </select>
              </div>
              <div className="flex-1 min-w-48">
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Asunto del correo</label>
                <input
                  type="text"
                  placeholder="Ej: Novedades en Aliax — Marzo 2026"
                  value={annSubject}
                  onChange={e => { setAnnSubject(e.target.value); setAnnResult(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Mensaje</label>
              <textarea
                rows={4}
                placeholder="Escribe el mensaje del anuncio. Puedes usar saltos de línea."
                value={annBody}
                onChange={e => { setAnnBody(e.target.value); setAnnResult(null); }}
                className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
              />
            </div>
            <div className="flex items-center gap-4">
              {annResult && (
                <p className="text-sm" style={{ color: annResult.ok ? '#16a34a' : '#dc2626' }}>
                  {annResult.ok
                    ? `✓ Enviado a ${annResult.sent} usuario${annResult.sent !== 1 ? 's' : ''}${annResult.failed ? ` (${annResult.failed} fallidos)` : ''}`
                    : `✗ ${annResult.error}`}
                </p>
              )}
              <button
                onClick={handleSendAnnouncement}
                disabled={sendingAnn || !annSubject.trim() || !annBody.trim()}
                className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sendingAnn ? 'Enviando...' : 'Enviar anuncio'}
              </button>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="rounded-xl" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
            style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: C.text }}>Usuarios</h2>
              <p className="text-xs" style={{ color: C.textFaint }}>{total} en total</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textFaint }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-64"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Buscar
              </button>
            </form>
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center text-sm" style={{ color: C.textFaint }}>Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: C.tableHdr, borderBottom: `1px solid ${C.cardBorder}` }}>
                    <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Usuario</th>
                    <th className="text-left px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Registro</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Plan</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Tipo</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Reservas</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Bienvenida</th>
                    <th className="text-center px-5 py-3 font-medium text-xs" style={{ color: C.textMuted }}>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <React.Fragment key={u.id}>
                      <tr
                        style={{
                          background: expandedUser === u.id ? C.expandedBg : (idx % 2 === 0 ? C.tableRow : C.tableRowAlt),
                          borderBottom: `1px solid ${C.cardBorder}`,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.tableRowHover)}
                        onMouseLeave={e => (e.currentTarget.style.background = expandedUser === u.id ? C.expandedBg : (idx % 2 === 0 ? C.tableRow : C.tableRowAlt))}
                        onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium" style={{ color: C.text }}>{u.name}</p>
                          <p className="text-xs" style={{ color: C.textFaint }}>{u.email}</p>
                          {u.phone && <p className="text-xs" style={{ color: C.textFaint }}>{u.phone}</p>}
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: C.textFaint }}>
                          {new Date(u.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <PlanBadge u={u} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          {u._count.profiles > 0 ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                              Profesional ({u._count.profiles})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">
                              Sin perfil
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs">
                            {u._count.professionalBookings}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {u.welcomeEmailSentAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium" title={`Enviado: ${new Date(u.welcomeEmailSentAt).toLocaleString('es-ES')}`}>
                              <Mail className="w-3 h-3" /> Enviado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-500 text-xs rounded-full font-medium">
                              <MailX className="w-3 h-3" /> No enviado
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {u.isAdmin ? (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">Admin</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Usuario</span>
                          )}
                        </td>
                      </tr>
                      {expandedUser === u.id && (
                        <tr style={{ background: C.expandedBg }}>
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              {[
                                { label: 'Nombre', value: u.name },
                                { label: 'Email', value: u.email },
                                { label: 'Teléfono', value: u.phone || '—' },
                                { label: 'Miembro desde', value: new Date(u.createdAt).toLocaleDateString('es-ES') },
                              ].map(item => (
                                <div key={item.label} className="rounded-lg px-3 py-2"
                                  style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                                  <p className="text-xs" style={{ color: C.textFaint }}>{item.label}</p>
                                  <p className="text-sm font-medium truncate" style={{ color: C.text }}>{item.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Plan details */}
                            <div className="rounded-lg px-3 py-2 mb-3"
                              style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                              <p className="text-xs mb-1" style={{ color: C.textFaint }}>Plan</p>
                              {u.plan === 'PRO' ? (
                                <div className="flex flex-wrap gap-3 text-sm" style={{ color: C.text }}>
                                  <span>PRO · {INTERVAL_LABEL[u.planInterval ?? ''] ?? u.planInterval}</span>
                                  {u.planExpiresAt && (
                                    <span style={{ color: C.textMuted }}>
                                      Expira: {new Date(u.planExpiresAt).toLocaleDateString('es-ES')}
                                    </span>
                                  )}
                                  {u.stripeSubscriptionId && (
                                    <span style={{ color: C.textMuted }}>Stripe: {u.stripeSubscriptionId}</span>
                                  )}
                                  {u.paypalSubscriptionId && (
                                    <span style={{ color: C.textMuted }}>PayPal: {u.paypalSubscriptionId}</span>
                                  )}
                                  {u.stripeHasDiscount && (
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
                                      <Tag className="w-3 h-3" /> Pagó con código de descuento
                                    </span>
                                  )}
                                </div>
                              ) : u.trialEndsAt ? (
                                <div style={{ color: C.text }} className="text-sm">
                                  Periodo de prueba · Termina: {new Date(u.trialEndsAt).toLocaleDateString('es-ES')}
                                </div>
                              ) : (
                                <p className="text-sm" style={{ color: C.textMuted }}>Sin plan activo</p>
                              )}
                            </div>

                            {u.profiles.length > 0 ? (
                              <>
                                <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>Perfiles</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {u.profiles.map(p => (
                                    <div key={p.id} className="rounded-lg px-4 py-2 flex items-center justify-between"
                                      style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                                      <div>
                                        <p className="text-sm font-medium" style={{ color: C.text }}>{p.title}</p>
                                        <p className="text-xs" style={{ color: C.textFaint }}>/{p.slug}</p>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs" style={{ color: C.textMuted }}>
                                        <span>{p._count.services} servicios</span>
                                        <span>{p._count.bookings} reservas</span>
                                        <span style={{ color: p.published ? '#16a34a' : C.textFaint, fontWeight: p.published ? 500 : 400 }}>
                                          {p.published ? 'Publicado' : 'Borrador'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs italic" style={{ color: C.textFaint }}>Este usuario aún no creó ningún perfil.</p>
                            )}

                            {/* Welcome email status & send button */}
                            <div className="rounded-lg px-3 py-2 mt-3 flex items-center justify-between"
                              style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                              <div>
                                <p className="text-xs" style={{ color: C.textFaint }}>Email de bienvenida</p>
                                {u.welcomeEmailSentAt ? (
                                  <p className="text-sm flex items-center gap-1.5" style={{ color: '#16a34a' }}>
                                    <Mail className="w-3.5 h-3.5" />
                                    Enviado el {new Date(u.welcomeEmailSentAt).toLocaleDateString('es-ES')} a las {new Date(u.welcomeEmailSentAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                ) : (
                                  <p className="text-sm flex items-center gap-1.5" style={{ color: '#dc2626' }}>
                                    <MailX className="w-3.5 h-3.5" />
                                    No se ha enviado el correo de bienvenida
                                  </p>
                                )}
                              </div>
                              {!u.welcomeEmailSentAt && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSendWelcome(u.id); }}
                                  disabled={sendingWelcome === u.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {sendingWelcome === u.id ? 'Enviando...' : 'Enviar bienvenida'}
                                </button>
                              )}
                              {u.welcomeEmailSentAt && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSendWelcome(u.id); }}
                                  disabled={sendingWelcome === u.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                  style={{ border: `1px solid ${C.cardBorder}`, color: C.textMuted }}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  {sendingWelcome === u.id ? 'Reenviando...' : 'Reenviar'}
                                </button>
                              )}
                            </div>

                            {/* ── Control de Acceso ── */}
                            {!u.isAdmin && (
                              <div className="rounded-lg px-4 py-3 mt-3"
                                style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                                <p className="text-xs font-bold mb-3" style={{ color: C.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                  Control de Acceso
                                </p>

                                {/* Blocked banner */}
                                {u.blocked && (
                                  <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    <span className="text-xs font-semibold" style={{ color: '#f87171' }}>🔴 CUENTA BLOQUEADA</span>
                                    <button
                                      disabled={updatingBlock === u.id}
                                      onClick={() => handleToggleBlock(u.id, false)}
                                      className="px-3 py-1 text-xs font-semibold rounded-md transition-colors"
                                      style={{ background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', opacity: updatingBlock === u.id ? 0.6 : 1 }}
                                    >
                                      {updatingBlock === u.id ? '...' : 'Desbloquear'}
                                    </button>
                                  </div>
                                )}

                                {/* Module checkboxes */}
                                <p className="text-xs mb-2" style={{ color: C.textFaint, fontWeight: 600, letterSpacing: '0.04em' }}>Módulos habilitados individualmente</p>
                                <div className="grid grid-cols-2 gap-1.5 mb-3">
                                  {FEATURE_LABELS.map(({ key, label }) => {
                                    const enabled = u.featureOverrides?.[key] === true;
                                    const busy = updatingPermissions === u.id;
                                    return (
                                      <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all"
                                        style={{
                                          background: enabled ? 'rgba(34,197,94,0.08)' : C.inputBg,
                                          border: `1px solid ${enabled ? 'rgba(34,197,94,0.35)' : C.inputBorder}`,
                                          opacity: busy ? 0.6 : 1,
                                        }}>
                                        <input
                                          type="checkbox"
                                          checked={enabled}
                                          disabled={busy}
                                          onChange={e => handleToggleFeature(u.id, key, e.target.checked)}
                                          style={{ accentColor: '#22c55e', width: 13, height: 13, cursor: 'pointer' }}
                                        />
                                        <span className="text-xs" style={{ color: C.text }}>{label}</span>
                                      </label>
                                    );
                                  })}
                                </div>

                                {/* Quick actions */}
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    disabled={updatingPermissions === u.id}
                                    onClick={() => handleGrantAll(u.id)}
                                    className="px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                                    style={{ background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer' }}
                                  >
                                    Dar todo Pro
                                  </button>
                                  <button
                                    disabled={updatingPermissions === u.id}
                                    onClick={() => handleRevokeAll(u.id)}
                                    className="px-3 py-1 text-xs rounded-md transition-colors disabled:opacity-50"
                                    style={{ background: C.inputBg, color: C.textMuted, border: `1px solid ${C.inputBorder}`, cursor: 'pointer' }}
                                  >
                                    Quitar todo
                                  </button>
                                  {!u.blocked && (
                                    <button
                                      disabled={updatingBlock === u.id}
                                      onClick={() => handleToggleBlock(u.id, true)}
                                      className="px-3 py-1 text-xs rounded-md transition-colors disabled:opacity-50"
                                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}
                                    >
                                      {updatingBlock === u.id ? '...' : 'Bloquear cuenta'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Delete user */}
                            {!u.isAdmin && (
                              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.cardBorder}` }}>
                                {confirmDelete === u.id ? (
                                  <div className="flex items-center gap-3">
                                    <p className="text-sm text-red-500 flex-1">¿Eliminar a <strong>{u.name}</strong> y todos sus datos?</p>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      disabled={deletingId === u.id}
                                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                    >
                                      {deletingId === u.id ? 'Eliminando...' : 'Sí, eliminar'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDelete(null)}
                                      className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                                      style={{ border: `1px solid ${C.cardBorder}`, color: C.textMuted }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDelete(u.id)}
                                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Eliminar usuario
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderTop: `1px solid ${C.cardBorder}` }}>
              <p className="text-xs" style={{ color: C.textFaint }}>Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${C.cardBorder}`, background: C.card, color: C.text }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ border: `1px solid ${C.cardBorder}`, background: C.card, color: C.text }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, iconBg, C,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  iconBg: string;
  dark: boolean;
  C: Record<string, string>;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
      <div className="inline-flex p-2 rounded-lg mb-3" style={{ background: iconBg }}>{icon}</div>
      <p className="text-2xl font-bold" style={{ color: C.text }}>{value}</p>
      <p className="text-sm mt-0.5" style={{ color: C.textMuted }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: C.textFaint }}>{sub}</p>}
    </div>
  );
}
