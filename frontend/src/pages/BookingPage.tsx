import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, MapPin, ArrowLeft, Award } from 'lucide-react';
import api from '../api/client';
import BookingForm from '../components/BookingForm';
import { formatPrice, formatDuration } from '../lib/utils';
import './BookingPage.css';

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
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="bp-fullscreen">
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(45,212,191,0.2)', borderTopColor: '#2dd4bf', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!profile) return (
    <div className="bp-fullscreen">
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>No se encontró el perfil solicitado.</p>
      <button onClick={() => navigate(-1)} style={{ color: '#2dd4bf', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
        ← Volver
      </button>
    </div>
  );

  if (success) return (
    <div className="bp-fullscreen">
      <div className="bp-success-card">
        <div className="bp-success-icon">✓</div>
        <h2 className="bp-success-title">¡Reserva Registrada!</h2>
        <p className="bp-success-sub">Recibirás una confirmación pronto.</p>
        <button className="bp-success-btn" onClick={() => navigate(`/${slug}`)}>
          Ver Perfil
        </button>
      </div>
    </div>
  );

  const initials = profile.title
    ?.split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase() ?? '?';

  return (
    <div className="bp-wrap">
      <div className="bp-orb-1" />
      <div className="bp-orb-2" />

      <div className="bp-content">
        {/* Back */}
        <button className="bp-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />
          Volver
        </button>

        {/* Professional card */}
        <div className="bp-pro-card">
          {profile.avatar
            ? <img className="bp-avatar" src={profile.avatar} alt={profile.title} />
            : <div className="bp-avatar-initials">{initials}</div>
          }
          <div style={{ minWidth: 0 }}>
            <h1 className="bp-pro-name">{profile.title}</h1>
            <p className="bp-pro-profession">{profile.profession}</p>
            <div className="bp-pro-tags">
              {profile.specialty && (
                <span className="bp-tag">{profile.specialty}</span>
              )}
              {profile.country && (
                <span className="bp-tag">
                  <MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />
                  {profile.country}
                </span>
              )}
              {profile.yearsExperience && (
                <span className="bp-tag">
                  <Award size={10} style={{ display: 'inline', marginRight: 3 }} />
                  {profile.yearsExperience} años exp.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Services */}
        <p className="bp-services-title">Selecciona un servicio</p>

        <div>
          {profile.services?.map((s: any) => (
            <div key={s.id} className="bp-svc-card">
              <div style={{ minWidth: 0 }}>
                <p className="bp-svc-name">{s.name}</p>
                <div className="bp-svc-meta">
                  <Clock size={11} />
                  {formatDuration(s.durationMinutes)}
                </div>
                {s.description && (
                  <p className="bp-svc-desc">{s.description}</p>
                )}
              </div>
              <div className="bp-svc-right">
                <span className="bp-svc-price">{formatPrice(s.price, s.currency)}</span>
                <button
                  className="bp-svc-btn"
                  onClick={() => setSelectedService({ id: s.id, name: s.name })}
                >
                  Reservar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedService && (
        <BookingForm
          profileId={profile.id}
          serviceId={selectedService.id}
          serviceName={selectedService.name}
          primaryColor={profile.customization?.primaryColor || '#2dd4bf'}
          onClose={() => setSelectedService(null)}
          onSuccess={() => { setSuccess(true); setSelectedService(null); }}
        />
      )}
    </div>
  );
}
