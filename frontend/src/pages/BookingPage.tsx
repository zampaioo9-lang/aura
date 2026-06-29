import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, MapPin, ArrowLeft, Award, Star } from 'lucide-react';
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
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; clientName: string }[]>([]);
  const [reviewStats, setReviewStats] = useState<{ averageRating: number | null; reviewCount: number } | null>(null);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  useEffect(() => {
    api.get(`/profiles/${slug}`)
      .then(res => setProfile(res.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!profile?.id) return;
    api.get(`/reviews/profile/${profile.id}`)
      .then(res => {
        setReviews(res.data.reviews || []);
        setReviewStats({ averageRating: res.data.averageRating, reviewCount: res.data.reviewCount });
      })
      .catch(() => {})
      .finally(() => setReviewsLoaded(true));
  }, [profile?.id]);

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
              {profile.modality && (
                <span className="bp-tag">
                  {{ presencial: 'Presencial', online: 'En línea', hibrida: 'Presencial y en línea' }[profile.modality as string] ?? profile.modality}
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

        {/* Reviews */}
        {reviewsLoaded && (
          <div style={{ marginTop: 32 }}>
            <p className="bp-services-title">Reseñas</p>
            {reviews.length > 0 && reviewStats?.averageRating != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 16px', background: 'rgba(45,212,191,0.08)', borderRadius: 10, border: '1px solid rgba(45,212,191,0.18)' }}>
                <Star size={16} fill="#2dd4bf" color="#2dd4bf" />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{reviewStats.averageRating}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>({reviewStats.reviewCount} reseña{reviewStats.reviewCount !== 1 ? 's' : ''})</span>
              </div>
            )}
            {reviews.length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Aún no se han registrado reseñas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.slice(0, 5).map(r => (
                  <div key={r.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                      {[1,2,3,4,5].map(n => <Star key={n} size={12} fill={n <= r.rating ? '#2dd4bf' : 'none'} color={n <= r.rating ? '#2dd4bf' : 'rgba(255,255,255,0.2)'} strokeWidth={1.5} />)}
                    </div>
                    {r.comment && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 4px', lineHeight: 1.5 }}>{r.comment}</p>}
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{r.clientName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
