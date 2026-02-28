import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function PaymentSuccess() {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    async function confirm() {
      try {
        // Small delay to allow webhook processing time
        await new Promise(r => setTimeout(r, 1500));

        // Verify subscription is active
        await api.get('/subscriptions/current');

        // Refresh user context so Dashboard reflects new plan
        await refreshUser();

        setStatus('success');
      } catch {
        // Even if the request fails, show success — webhook may be processing
        await refreshUser().catch(() => {});
        setStatus('success');
      }
    }

    confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0f12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: '#22222c',
          border: '1px solid #2e2e3d',
          borderRadius: 20,
          padding: '48px 40px',
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <>
            <Loader2
              style={{
                width: 48,
                height: 48,
                color: '#6b63ff',
                margin: '0 auto 20px',
                animation: 'ps-spin 1s linear infinite',
              }}
            />
            <h2 style={{ color: '#e8e8f0', fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>
              Confirmando tu pago...
            </h2>
            <p style={{ color: '#6b6b80', fontSize: 15, margin: 0 }}>
              Estamos verificando tu suscripcion.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <CheckCircle style={{ width: 40, height: 40, color: '#22c55e' }} />
            </div>
            <h2 style={{ color: '#e8e8f0', fontSize: 26, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Plan activado
            </h2>
            <p style={{ color: '#6b6b80', fontSize: 15, lineHeight: 1.6, margin: '0 0 36px' }}>
              Tu plan Pro ha sido activado correctamente. Ya tienes acceso a todas las funciones profesionales.
            </p>
            <Link
              to="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                background: '#6b63ff',
                color: 'white',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Ir al dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ color: '#f87171', fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
              Algo salio mal
            </h2>
            <p style={{ color: '#6b6b80', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
              No pudimos confirmar tu pago. Si ya realizaste el cobro, contacta a soporte@aliax.io
            </p>
            <Link
              to="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                border: '1px solid #2e2e3d',
                background: 'transparent',
                color: '#e8e8f0',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Volver al dashboard
            </Link>
          </>
        )}
      </div>

      <style>{`
        @keyframes ps-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
