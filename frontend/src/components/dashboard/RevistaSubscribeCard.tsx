import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle } from 'lucide-react';
import api from '../../api/client';

interface Colors {
  isDark: boolean;
  accent: string;
  muted: string;
  text: string;
}

interface RevistaSubscribeCardProps {
  C: Colors;
  name: string;
  email: string;
  newsletterSubscribed?: boolean;
}

export default function RevistaSubscribeCard({ C, name, email, newsletterSubscribed }: RevistaSubscribeCardProps) {
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = async () => {
    if (!consent || status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await api.post('/newsletter/subscribe', {
        fullName: name,
        email,
        audience: 'TERAPEUTAS',
      });
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Algo salió mal, intenta de nuevo.');
    }
  };

  const cardStyle: React.CSSProperties = {
    background: C.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
    boxShadow: C.isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
    borderRadius: 16,
    padding: '16px 18px',
    marginTop: 12,
  };

  if (newsletterSubscribed) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <CheckCircle style={{ width: 16, height: 16, color: C.accent, flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: C.isDark ? 'white' : C.text, margin: 0 }}>
            Ya estás suscrito a Revista Aliax
          </p>
        </div>
        <a href="/revista" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.accent, textDecoration: 'none' }}>
          Ver la Revista →
        </a>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Mail style={{ width: 16, height: 16, color: C.accent, flexShrink: 0 }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: C.isDark ? 'white' : C.text, margin: 0 }}>
          Suscríbete a Revista Aliax
        </p>
      </div>
      <p style={{ fontSize: 11, color: C.muted, margin: '0 0 10px' }}>
        Recibe los artículos nuevos y compártelos con tus pacientes.
      </p>

      {status === 'sent' ? (
        <p style={{ fontSize: 12, color: C.accent, margin: 0 }}>
          Revisa tu correo ({email}) para confirmar tu suscripción.
        </p>
      ) : (
        <>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: C.muted, marginBottom: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              Acepto recibir correos de Revista Aliax y el{' '}
              <Link to="/privacidad" style={{ color: C.accent }}>Aviso de Privacidad</Link>.
            </span>
          </label>
          <button
            onClick={handleSubscribe}
            disabled={!consent || status === 'sending'}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
              background: `linear-gradient(135deg, ${C.accent}, #2dd4bf)`,
              color: 'white', fontSize: 12, fontWeight: 600,
              cursor: consent ? 'pointer' : 'not-allowed',
              opacity: consent && status !== 'sending' ? 1 : 0.5,
            }}
          >
            {status === 'sending' ? 'Enviando...' : 'Suscribirme'}
          </button>
          {status === 'error' && (
            <p style={{ fontSize: 11, color: '#dc2626', margin: '6px 0 0' }}>{errorMsg}</p>
          )}
        </>
      )}
    </div>
  );
}
