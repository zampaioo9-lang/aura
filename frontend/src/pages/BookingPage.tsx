import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import BookingForm from '../components/BookingForm';
import ServiceCard from '../components/ServiceCard';

export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<{ id: string; name: string } | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/profiles/${slug}`)
      .then(res => setProfile(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;
  if (!profile) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Reserva Registrada!</h2>
          <p className="text-slate-500 mb-6">Recibiras una confirmacion pronto.</p>
          <button onClick={() => navigate(`/${slug}`)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
            Ver Perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Reservar con {profile.title}</h1>
        <p className="text-slate-500 mb-8">Selecciona un servicio para reservar tu cita.</p>

        <div className="space-y-4">
          {profile.services?.map((s: any) => (
            <ServiceCard key={s.id} service={s} onBook={(id) => {
              const svc = profile.services.find((sv: any) => sv.id === id);
              if (svc) setSelectedService({ id: svc.id, name: svc.name });
            }} />
          ))}
        </div>

        {selectedService && (
          <BookingForm
            profileId={profile.id}
            serviceId={selectedService.id}
            serviceName={selectedService.name}
            onClose={() => setSelectedService(null)}
            onSuccess={() => { setSuccess(true); setSelectedService(null); }}
          />
        )}
      </div>
    </div>
  );
}
