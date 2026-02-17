import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Plus, ExternalLink, LogOut, Calendar, Clock, Settings } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface Profile {
  id: string;
  slug: string;
  title: string;
  profession: string;
  template: string;
  published: boolean;
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

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/profiles').then(r => setProfiles(r.data)),
      api.get('/bookings').then(r => setBookings(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const updateBookingStatus = async (id: string, status: string) => {
    if (status === 'CANCELLED') {
      const confirmed = window.confirm('¿Estas seguro de que quieres cancelar esta reserva?');
      if (!confirmed) return;
    }
    await api.patch(`/bookings/${id}/status`, { status });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;

  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-slate-900">Aura</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Hola, {user?.name}</span>
          <button onClick={() => { logout(); navigate('/'); }} className="text-slate-400 hover:text-slate-600">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profiles */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Mis Perfiles</h2>
          <Link to="/profile/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="h-4 w-4" /> Nuevo Perfil
          </Link>
        </div>

        {profiles.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Aun no tienes perfiles. Crea tu primero!
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {profiles.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{p.title}</h3>
                    <p className="text-sm text-slate-500">{p.profession}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.published ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <span>{p.services.length} servicios</span>
                  <span>&middot;</span>
                  <span>{p._count.bookings} reservas</span>
                  <span>&middot;</span>
                  <span className="capitalize">{p.template.toLowerCase()}</span>
                </div>
                <div className="flex gap-2">
                  <Link to={`/profile/edit/${p.id}`} className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors">
                    Editar
                  </Link>
                  <Link to="/dashboard/services" className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center gap-1">
                    <Settings className="h-3 w-3" /> Servicios
                  </Link>
                  <Link to="/dashboard/availability" className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Horarios
                  </Link>
                  {p.published && (
                    <Link to={`/${p.slug}`} className="text-sm px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1">
                      Ver <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bookings */}
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          <Calendar className="h-5 w-5 inline mr-1.5" />
          Reservas
        </h2>

        {pendingBookings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-amber-700 mb-2">Pendientes ({pendingBookings.length})</h3>
            <div className="space-y-2">
              {pendingBookings.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-amber-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{b.clientName}</p>
                    <p className="text-sm text-slate-500">{b.service.name} &middot; {formatCurrency(b.service.price, b.service.currency)}</p>
                    <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(b.date).toLocaleDateString()} {b.startTime} - {b.endTime}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateBookingStatus(b.id, 'CONFIRMED')} className="text-sm px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors">
                      Confirmar
                    </button>
                    <button onClick={() => updateBookingStatus(b.id, 'CANCELLED')} className="text-sm px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {confirmedBookings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-green-700 mb-2">Confirmadas ({confirmedBookings.length})</h3>
            <div className="space-y-2">
              {confirmedBookings.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-green-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{b.clientName}</p>
                    <p className="text-sm text-slate-500">{b.service.name} &middot; {formatCurrency(b.service.price, b.service.currency)}</p>
                    <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(b.date).toLocaleDateString()} {b.startTime} - {b.endTime}
                    </p>
                  </div>
                  <button onClick={() => updateBookingStatus(b.id, 'COMPLETED')} className="text-sm px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors">
                    Completar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {bookings.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Aun no tienes reservas.
          </div>
        )}
      </div>
    </div>
  );
}
