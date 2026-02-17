import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useAvailability } from '../hooks/useAvailability';
import { useToast } from '../components/Toast';
import WeeklyCalendar from '../components/availability/WeeklyCalendar';
import TimeSlotPicker from '../components/availability/TimeSlotPicker';
import QuickTemplates from '../components/availability/QuickTemplates';
import api from '../api/client';
import type { AvailabilitySlot } from '../types/availability';

interface Profile {
  id: string;
  title: string;
  slug: string;
}

export default function AvailabilityDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Modals
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [defaultDay, setDefaultDay] = useState<number>(1);
  const [deleteConfirm, setDeleteConfirm] = useState<AvailabilitySlot | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    api.get('/profiles').then(res => {
      setProfiles(res.data);
      if (res.data.length > 0) setSelectedProfileId(res.data[0].id);
    }).finally(() => setLoadingProfiles(false));
  }, []);

  const {
    slotsByDay,
    loading,
    error,
    createSlot,
    updateSlot,
    deleteSlot,
    bulkCreate,
    clearDay,
    toggleSlot,
    refetch,
  } = useAvailability(selectedProfileId);

  const handleAdd = (dayOfWeek: number) => {
    setEditingSlot(null);
    setDefaultDay(dayOfWeek);
    setShowPicker(true);
  };

  const handleEdit = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setShowPicker(true);
  };

  const handleSaveSlot = async (data: { dayOfWeek: number; startTime: string; endTime: string }) => {
    if (editingSlot) {
      await updateSlot(editingSlot.id, data);
      toast('Horario actualizado');
    } else {
      await createSlot({ ...data, profileId: selectedProfileId });
      toast('Horario creado');
    }
  };

  const handleDelete = (slot: AvailabilitySlot) => {
    setDeleteConfirm(slot);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSlot(deleteConfirm.id);
      toast('Horario eliminado');
    } catch {
      toast('Error al eliminar', 'error');
    }
    setDeleteConfirm(null);
  };

  const handleToggle = async (slot: AvailabilitySlot) => {
    try {
      const updated = await toggleSlot(slot.id);
      toast(updated.isActive ? 'Horario activado' : 'Horario desactivado');
    } catch {
      toast('Error al cambiar estado', 'error');
    }
  };

  const handleApplyTemplate = async (slots: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
    // Clear all days first, then bulk create
    for (let d = 0; d < 7; d++) {
      await clearDay(d);
    }
    await bulkCreate({ profileId: selectedProfileId, slots });
    toast('Plantilla aplicada');
    refetch();
  };

  if (loadingProfiles) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <button
          onClick={() => setShowTemplates(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Sparkles className="h-4 w-4" /> Aplicar Plantilla
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Horarios de Disponibilidad</h1>
          {profiles.length > 1 && (
            <select
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <WeeklyCalendar
            slotsByDay={slotsByDay}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        )}
      </div>

      {/* Modals */}
      <TimeSlotPicker
        isOpen={showPicker}
        onClose={() => { setShowPicker(false); setEditingSlot(null); }}
        onSave={handleSaveSlot}
        editingSlot={editingSlot}
        defaultDay={defaultDay}
      />

      <QuickTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApply={handleApplyTemplate}
      />

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Eliminar horario</h3>
            <p className="text-sm text-slate-500 mb-5">
              Estas seguro de eliminar este horario? Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
