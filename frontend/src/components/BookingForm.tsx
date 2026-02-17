import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import api from '../api/client';

interface BookingFormProps {
  profileId: string;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingForm({ profileId, serviceId, serviceName, onClose, onSuccess }: BookingFormProps) {
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    date: '',
    startTime: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Available slots state
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  // Fetch available slots when date changes
  useEffect(() => {
    if (!form.date) {
      setSlots([]);
      setSlotsError('');
      return;
    }

    setSlotsLoading(true);
    setSlotsError('');
    setForm(f => ({ ...f, startTime: '' }));

    api.get('/bookings/available-slots', {
      params: { serviceId, profileId, date: form.date },
    })
      .then(res => {
        setSlots(res.data.slots || []);
        if ((res.data.slots || []).length === 0) {
          setSlotsError('No hay horarios disponibles para esta fecha');
        }
      })
      .catch(() => {
        setSlotsError('Error al cargar horarios');
        setSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [form.date, serviceId, profileId]);

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // optional
    return /^\+[1-9]\d{1,14}$/.test(phone);
  };

  const handlePhoneChange = (value: string) => {
    setForm(f => ({ ...f, clientPhone: value }));
    if (value && !validatePhone(value)) {
      setPhoneError('Formato: +34612345678 (sin espacios)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.clientPhone && !validatePhone(form.clientPhone)) {
      setPhoneError('Formato: +34612345678 (sin espacios)');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/bookings', {
        profileId,
        serviceId,
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined,
        clientNotes: form.notes || undefined,
        date: form.date,
        startTime: form.startTime,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al reservar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Reservar</h3>
        <p className="text-sm text-slate-500 mb-4">{serviceName}</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input type="text" required value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefono WhatsApp (opcional)</label>
            <input type="tel" value={form.clientPhone} onChange={e => handlePhoneChange(e.target.value)}
              placeholder="+34612345678"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${
                phoneError ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`} />
            {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
            <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          {/* Time slots */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Clock className="h-3.5 w-3.5 inline mr-1" />
              Horario
            </label>

            {!form.date && (
              <p className="text-sm text-slate-400 py-3">Selecciona una fecha para ver horarios disponibles</p>
            )}

            {form.date && slotsLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando horarios...
              </div>
            )}

            {form.date && !slotsLoading && slotsError && (
              <p className="text-sm text-amber-600 py-3">{slotsError}</p>
            )}

            {form.date && !slotsLoading && slots.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {slots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, startTime: slot }))}
                    className={`px-2 py-1.5 text-sm rounded-lg border transition-colors ${
                      form.startTime === slot
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.startTime || !!phoneError}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Reservando...' : 'Reservar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
