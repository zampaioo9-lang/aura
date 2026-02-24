import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import MinimalistTemplate from '../components/templates/MinimalistTemplate';
import BoldTemplate from '../components/templates/BoldTemplate';
import ElegantTemplate from '../components/templates/ElegantTemplate';
import CreativeTemplate from '../components/templates/CreativeTemplate';
import BookingForm from '../components/BookingForm';

export default function PublicProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingService, setBookingService] = useState<{ id: string; name: string } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    api.get(`/profiles/${slug}`)
      .then(res => setProfile(res.data))
      .catch(err => {
        if (err.response?.status === 404) setError('Perfil no encontrado');
        else setError('Error al cargar perfil');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <p className="text-slate-500 text-lg mb-4">{error}</p>
      <button onClick={() => navigate(-1)} className="text-indigo-600 hover:underline">Volver</button>
    </div>
  );

  const handleBook = (serviceId: string) => {
    const services: any[] = profile.services || [];
    const service = services.find((s: any) => s.id === serviceId);
    if (service) setBookingService({ id: service.id, name: service.name });
  };

  const templateMap: Record<string, React.ComponentType<any>> = {
    MINIMALIST: MinimalistTemplate,
    BOLD: BoldTemplate,
    ELEGANT: ElegantTemplate,
    CREATIVE: CreativeTemplate,
  };

  const Template = templateMap[profile.template] || MinimalistTemplate;

  return (
    <>
      <Template profile={profile} onBook={handleBook} />

      {bookingService && !bookingSuccess && (
        <BookingForm
          profileId={profile.id}
          serviceId={bookingService.id}
          serviceName={bookingService.name}
          onClose={() => setBookingService(null)}
          onSuccess={() => { setBookingSuccess(true); setBookingService(null); }}
        />
      )}

      {bookingSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center">
            <div className="text-4xl mb-4">&#10003;</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Reserva Registrada!</h3>
            <p className="text-slate-500 mb-6">Recibiras una confirmacion pronto.</p>
            <button onClick={() => setBookingSuccess(false)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
