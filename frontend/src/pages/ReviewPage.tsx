import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import api from '../api/client';

type TokenState =
  | { status: 'loading' }
  | { status: 'invalid'; reason: 'not_found' | 'already_used' | 'expired' }
  | { status: 'valid'; clientName: string; professionalName: string; professionalAvatar: string | null }
  | { status: 'submitted' };

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<TokenState>({ status: 'loading' });
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState({ status: 'invalid', reason: 'not_found' }); return; }
    api.get(`/reviews/token/${token}`)
      .then(res => {
        const data = res.data;
        if (!data.valid) {
          setState({ status: 'invalid', reason: data.reason });
        } else {
          setState({
            status: 'valid',
            clientName: data.clientName,
            professionalName: data.professionalName,
            professionalAvatar: data.professionalAvatar,
          });
        }
      })
      .catch(() => setState({ status: 'invalid', reason: 'not_found' }));
  }, [token]);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/reviews/submit/${token}`, {
        rating,
        comment: comment.trim() || undefined,
      });
      setState({ status: 'submitted' });
    } catch {
      setSubmitting(false);
    }
  };

  const ACCENT = '#2dd4bf';

  if (state.status === 'loading') {
    return (
      <div style={styles.page}>
        <div style={{ width: 32, height: 32, border: `3px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (state.status === 'invalid') {
    const messages = {
      not_found: { title: 'Enlace no válido', body: 'Este enlace de reseña no existe. Verifica que copiaste la URL correctamente.' },
      already_used: { title: 'Reseña ya enviada', body: 'Ya dejaste tu reseña a través de este enlace. ¡Muchas gracias!' },
      expired: { title: 'Enlace expirado', body: 'Este enlace estuvo disponible por 7 días y ya no es válido.' },
    };
    const msg = messages[state.reason];
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.iconCircle}>
            <Star size={24} color={ACCENT} />
          </div>
          <h1 style={styles.title}>{msg.title}</h1>
          <p style={styles.body}>{msg.body}</p>
        </div>
      </div>
    );
  }

  if (state.status === 'submitted') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.iconCircle, background: 'rgba(45,212,191,0.15)' }}>
            <span style={{ fontSize: 24 }}>✓</span>
          </div>
          <h1 style={styles.title}>¡Gracias por tu reseña!</h1>
          <p style={styles.body}>Tu opinión ayuda a otros a encontrar el apoyo que necesitan.</p>
        </div>
      </div>
    );
  }

  const activeStars = hovered || rating;
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {state.professionalAvatar && (
          <img
            src={state.professionalAvatar}
            alt={state.professionalName}
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }}
          />
        )}
        <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 4px' }}>Califica tu sesión con</p>
        <h1 style={{ ...styles.title, marginBottom: 24 }}>{state.professionalName}</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Star
                size={36}
                fill={n <= activeStars ? ACCENT : 'none'}
                color={n <= activeStars ? ACCENT : '#d4d4d8'}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p style={{ fontSize: 13, color: '#71717a', marginBottom: 16 }}>
            {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][rating]}
          </p>
        )}

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Cuéntanos tu experiencia (opcional)"
          maxLength={500}
          style={{
            width: '100%', minHeight: 96, padding: '10px 12px',
            border: '1px solid #e4e4e7', borderRadius: 8,
            fontSize: 14, lineHeight: 1.5, resize: 'vertical',
            fontFamily: 'inherit', color: '#18181b', background: '#fafafa',
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          style={{
            marginTop: 16, width: '100%', padding: '12px 0',
            background: rating === 0 ? '#e4e4e7' : ACCENT,
            color: rating === 0 ? '#a1a1aa' : '#fff',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
            cursor: rating === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {submitting ? 'Enviando…' : 'Enviar reseña'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f4f4f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    fontFamily: "'Inter','Plus Jakarta Sans',system-ui,sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 32px',
    maxWidth: 440,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(45,212,191,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 20,
    fontWeight: 700,
    color: '#18181b',
  },
  body: {
    margin: 0,
    fontSize: 14,
    color: '#71717a',
    lineHeight: 1.6,
  },
};
