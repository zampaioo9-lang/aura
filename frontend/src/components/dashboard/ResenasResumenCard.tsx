import { useEffect, useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import api from '../../api/client';

interface Colors {
  isDark: boolean;
  accent: string;
  muted: string;
  text: string;
}

interface ResenasResumenCardProps {
  C: Colors;
  isPro: boolean;
  onOpen: () => void;
}

interface ReviewLite {
  id: string;
  rating: number;
  comment?: string | null;
  clientName?: string;
  isVisible: boolean;
}

/**
 * Tarjeta de Reseñas para el Inicio del dashboard en móvil.
 * Siempre visible: sin plan Pro, sin reseñas o con reseñas.
 * Al tocarla abre la sección Reseñas.
 */
export default function ResenasResumenCard({ C, isPro, onOpen }: ResenasResumenCardProps) {
  const [reviews, setReviews] = useState<ReviewLite[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(isPro);

  useEffect(() => {
    if (!isPro) { setLoading(false); return; }
    setLoading(true);
    api.get('/reviews/mine')
      .then(res => {
        setReviews(res.data.reviews ?? []);
        setAverageRating(res.data.averageRating ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isPro]);

  const cardStyle: React.CSSProperties = {
    background: C.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
    boxShadow: C.isDark
      ? '0 0 0 1px rgba(255,255,255,0.08), 0 4px 14px rgba(0,0,0,0.45)'
      : '0 2px 8px rgba(0,0,0,0.12)',
    borderRadius: 16,
    padding: '16px 18px',
    marginTop: 12,
    width: '100%',
    textAlign: 'left',
    border: 'none',
    cursor: 'pointer',
    display: 'block',
  };

  const visibles = reviews.filter(r => r.isVisible).length;
  const latest = reviews[0];

  let body: React.ReactNode;
  if (!isPro) {
    body = (
      <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
        Con el plan Pro, tus pacientes reciben un email al completar su cita para dejar una reseña verificada en tu perfil.
      </p>
    );
  } else if (loading) {
    body = <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Cargando…</p>;
  } else if (reviews.length === 0) {
    body = (
      <>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.isDark ? 'white' : C.text, margin: '0 0 4px' }}>
          Aún no hay reseñas registradas
        </p>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
          Cuando marques una cita como completada, tu paciente recibirá un email para dejar su reseña.
        </p>
      </>
    );
  } else {
    body = (
      <>
        {averageRating !== null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: latest?.comment ? 8 : 0 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.isDark ? 'white' : C.text }}>{averageRating}</span>
            <span style={{ fontSize: 13, color: C.muted }}>
              ({visibles} reseña{visibles !== 1 ? 's' : ''} visible{visibles !== 1 ? 's' : ''})
            </span>
          </div>
        )}
        {latest?.comment && (
          <div>
            <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} size={12} fill={n <= latest.rating ? '#2dd4bf' : 'none'} color={n <= latest.rating ? '#2dd4bf' : '#d4d4d8'} strokeWidth={1.5} />
              ))}
            </div>
            <p style={{
              fontSize: 13, color: C.muted, margin: 0, fontStyle: 'italic', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              "{latest.comment}"
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <button type="button" onClick={onOpen} style={cardStyle} aria-label="Abrir Reseñas">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(45,212,191,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Star style={{ width: 14, height: 14, color: '#2dd4bf' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.isDark ? 'white' : C.text, margin: 0 }}>Reseñas</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Lo que dicen tus pacientes sobre ti.</p>
        </div>
        <ChevronRight style={{ width: 16, height: 16, color: C.accent, flexShrink: 0 }} />
      </div>
      {body}
    </button>
  );
}
