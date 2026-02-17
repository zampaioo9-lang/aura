import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Search, AlertTriangle } from 'lucide-react';
import { useServices, type Service } from '../hooks/useServices';
import { useToast } from '../components/Toast';
import ServiceList from '../components/ServiceList';
import ServiceFormModal from '../components/ServiceFormModal';
import api from '../api/client';

type Tab = 'active' | 'inactive' | 'all';

export default function ServicesDashboard() {
  const { services, stats, loading, error, setError, createService, updateService, deleteService, toggleService } = useServices();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [profiles, setProfiles] = useState<{ id: string; title: string }[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');

  // Fetch user profiles for the create form
  useEffect(() => {
    api.get('/profiles').then(res => {
      setProfiles(res.data);
      if (res.data.length > 0) setSelectedProfileId(res.data[0].id);
    });
  }, []);

  // Filtered services
  const filtered = useMemo(() => {
    let result = services;
    if (tab === 'active') result = result.filter(s => s.isActive);
    else if (tab === 'inactive') result = result.filter(s => !s.isActive);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [services, tab, search]);

  const openCreate = () => {
    if (stats && stats.active >= stats.limit) {
      toast(`Has alcanzado el limite de ${stats.limit} servicios activos. Desactiva alguno para crear uno nuevo.`, 'error');
      return;
    }
    setEditingService(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await createService({ ...data, profileId: selectedProfileId });
        toast('Servicio creado exitosamente');
      } else if (editingService) {
        await updateService(editingService.id, data);
        toast('Servicio actualizado');
      }
      setModalOpen(false);
      setEditingService(null);
    } catch (err: any) {
      toast(err.message || 'Error al guardar', 'error');
    }
  };

  const handleToggle = async (service: Service) => {
    try {
      await toggleService(service.id);
      toast(service.isActive ? 'Servicio desactivado' : 'Servicio activado');
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const confirmDelete = (service: Service) => {
    setDeleteTarget(service);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService(deleteTarget.id);
      toast('Servicio eliminado');
      setDeleteTarget(null);
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'active', label: 'Activos', count: stats?.active || 0 },
    { key: 'inactive', label: 'Inactivos', count: stats?.inactive || 0 },
    { key: 'all', label: 'Todos', count: stats?.total || 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="text-sm font-semibold text-slate-900">Mis Servicios</h1>
        <button onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="h-4 w-4" /> Agregar servicio
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">Cerrar</button>
          </div>
        )}

        {/* Stats + Limit warning */}
        {stats && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{stats.active}</span> de{' '}
                <span className="font-semibold text-slate-900">{stats.limit}</span> servicios activos
              </p>
              <div className="w-32 bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${stats.active >= stats.limit ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((stats.active / stats.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
            {stats.active >= stats.limit && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Has alcanzado el limite de {stats.limit} servicios activos. Desactiva alguno para crear uno nuevo.
              </div>
            )}
          </div>
        )}

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  tab === t.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar servicios..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Profile selector for create (only if multiple profiles) */}
        {profiles.length > 1 && modalOpen && modalMode === 'create' && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Perfil para el servicio</label>
            <select
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Service list */}
        <ServiceList
          services={filtered}
          loading={loading}
          showActions
          emptyMessage={
            tab === 'active' ? 'No tienes servicios activos'
            : tab === 'inactive' ? 'No tienes servicios inactivos'
            : 'Aun no tienes servicios. Crea tu primero!'
          }
          onEdit={openEdit}
          onDelete={confirmDelete}
          onToggle={handleToggle}
        />
      </div>

      {/* Create/Edit Modal */}
      <ServiceFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingService(null); }}
        service={editingService}
        mode={modalMode}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Eliminar servicio</h3>
            <p className="text-sm text-slate-500 mb-6">
              Estas seguro de eliminar el servicio <strong>"{deleteTarget.name}"</strong>?
              El servicio se desactivara y dejara de ser visible.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
