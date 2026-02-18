import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, LayoutGrid, Bell, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Stats {
  users: { total: number; newThisMonth: number };
  profiles: { total: number };
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
  _count: { profiles: number; professionalBookings: number };
  profiles: {
    id: string;
    slug: string;
    title: string;
    published: boolean;
    _count: { bookings: number; services: number };
  }[];
}

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

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

  if (loading || !user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Panel de Administración</h1>
          <p className="text-sm text-gray-500">Vista general de Aura</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Volver al Dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="w-5 h-5 text-indigo-600" />}
              label="Usuarios"
              value={stats.users.total}
              sub={`+${stats.users.newThisMonth} este mes`}
              color="bg-indigo-50"
            />
            <StatCard
              icon={<LayoutGrid className="w-5 h-5 text-purple-600" />}
              label="Perfiles"
              value={stats.profiles.total}
              color="bg-purple-50"
            />
            <StatCard
              icon={<CalendarCheck className="w-5 h-5 text-emerald-600" />}
              label="Reservas"
              value={stats.bookings.total}
              sub={`${stats.bookings.confirmed} confirmadas`}
              color="bg-emerald-50"
            />
            <StatCard
              icon={<Bell className="w-5 h-5 text-amber-600" />}
              label="WhatsApp enviados"
              value={stats.notifications.sent}
              color="bg-amber-50"
            />
          </div>
        )}

        {/* Booking breakdown */}
        {stats && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Estado de reservas</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Pendientes', value: stats.bookings.pending, color: 'text-yellow-600 bg-yellow-50' },
                { label: 'Confirmadas', value: stats.bookings.confirmed, color: 'text-green-600 bg-green-50' },
                { label: 'Completadas', value: stats.bookings.completed, color: 'text-blue-600 bg-blue-50' },
                { label: 'Canceladas', value: stats.bookings.cancelled, color: 'text-red-600 bg-red-50' },
                { label: 'No show', value: stats.bookings.noShow, color: 'text-gray-600 bg-gray-100' },
              ].map(item => (
                <div key={item.label} className={`rounded-lg px-4 py-3 ${item.color}`}>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs font-medium mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Usuarios</h2>
              <p className="text-xs text-gray-400">{total} en total</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-64"
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
            <div className="p-8 text-center text-gray-400 text-sm">Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium">Usuario</th>
                    <th className="text-left px-5 py-3 font-medium">Teléfono</th>
                    <th className="text-center px-5 py-3 font-medium">Perfiles</th>
                    <th className="text-center px-5 py-3 font-medium">Reservas</th>
                    <th className="text-left px-5 py-3 font-medium">Registro</th>
                    <th className="text-center px-5 py-3 font-medium">Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-gray-400 text-xs">{u.email}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{u.phone || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs">
                          {u._count.profiles}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs">
                          {u._count.professionalBookings}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {u.isAdmin ? (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">Admin</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Usuario</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
