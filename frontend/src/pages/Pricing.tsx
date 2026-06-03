import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const FREE_FEATURES = [
  '1 perfil profesional',
  'Servicios ilimitados',
  'Reservas ilimitadas',
  'Notificaciones por email',
  'Hasta 3 fotos por servicio',
  '2 templates (Minimalist y Bold)',
  'Listado en el directorio de Aliax',
];

const PRO_FEATURES = [
  'Todo lo del plan gratuito',
  'Notificaciones por WhatsApp al cliente y a ti',
  'Hasta 20 fotos por servicio',
  'Los 4 templates (incluye Elegant y Creative)',
  'Analytics completos y tendencias',
  'Posición destacada en el directorio',
  'Hasta 3 perfiles',
  'Recordatorio automático 24h por WhatsApp',
];

const TEAL   = '#2dd4bf';
const TEAL_D = '#0d9488';
const TEXT   = '#e8f0f0';
const MUTED  = '#6aada8';
const DIM    = '#3d7a75';

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isPro } = useAuth();
  const [loadingStripe, setLoadingStripe] = useState(false);

  const handleProStripe = async () => {
    if (!user) { navigate('/register'); return; }
    setLoadingStripe(true);
    try {
      const res = await api.post('/subscriptions/stripe/checkout', { interval: 'MONTHLY' });
      window.location.href = res.data.url;
    } catch {
      setLoadingStripe(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #030f0e 0%, #052e2a 50%, #0a3d35 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '60px 20px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(45,212,191,0.12)',
          border: '1px solid rgba(45,212,191,0.3)',
          borderRadius: 20,
          padding: '6px 16px',
          color: TEAL,
          fontSize: 13,
          marginBottom: 16,
        }}>
          Planes simples, sin sorpresas
        </div>
        <h1 style={{ color: TEXT, fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>
          Empieza gratis. Crece cuando quieras.
        </h1>
        <p style={{ color: MUTED, fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
          Tu perfil, tus reservas y tus servicios son siempre gratis. El plan Pro agrega WhatsApp y más visibilidad cuando lo necesites.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 860 }}>

        {/* Free Card */}
        <div style={{
          flex: '1 1 360px', maxWidth: 400,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(45,212,191,0.15)',
          borderRadius: 20,
          padding: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Gift size={20} color={MUTED} />
            <span style={{ color: MUTED, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Gratuito</span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <span style={{ color: TEXT, fontSize: 42, fontWeight: 800 }}>$0</span>
            <span style={{ color: DIM, fontSize: 16 }}> / siempre</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FREE_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: MUTED, fontSize: 14 }}>
                <Check size={16} color={TEAL_D} style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => user ? navigate('/dashboard') : navigate('/register')}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: 12,
              border: `1px solid rgba(45,212,191,0.35)`,
              background: 'transparent', color: TEAL,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {user ? 'Ir al dashboard' : 'Crear cuenta gratis'}
          </button>
        </div>

        {/* Pro Card */}
        <div style={{
          flex: '1 1 360px', maxWidth: 400,
          background: 'linear-gradient(135deg, rgba(45,212,191,0.12) 0%, rgba(13,148,136,0.08) 100%)',
          border: `2px solid rgba(45,212,191,0.45)`,
          borderRadius: 20,
          padding: 32,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: `linear-gradient(90deg, ${TEAL}, ${TEAL_D})`,
            borderRadius: 20, padding: '4px 16px',
            color: '#fff', fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            RECOMENDADO
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Zap size={20} color={TEAL} />
            <span style={{ color: TEAL, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Pro</span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <span style={{ color: TEXT, fontSize: 42, fontWeight: 800 }}>$9</span>
            <span style={{ color: MUTED, fontSize: 16 }}> USD / mes</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRO_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: TEXT, fontSize: 14 }}>
                <Check size={16} color={TEAL} style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div style={{
              width: '100%', padding: '13px 20px', borderRadius: 12,
              background: 'rgba(45,212,191,0.15)', color: TEAL,
              fontSize: 15, fontWeight: 600, textAlign: 'center',
            }}>
              ✓ Ya tienes Pro activo
            </div>
          ) : (
            <button
              onClick={handleProStripe}
              disabled={loadingStripe}
              style={{
                width: '100%', padding: '13px 20px', borderRadius: 12,
                border: 'none',
                background: `linear-gradient(90deg, ${TEAL}, ${TEAL_D})`,
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: loadingStripe ? 'not-allowed' : 'pointer',
                opacity: loadingStripe ? 0.7 : 1,
              }}
            >
              {loadingStripe ? 'Redirigiendo...' : 'Activar Pro — $9/mes'}
            </button>
          )}
          <p style={{ color: DIM, fontSize: 12, textAlign: 'center', marginTop: 10 }}>
            Cancela en cualquier momento
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 560, width: '100%', marginTop: 48, color: MUTED, fontSize: 14, textAlign: 'center' }}>
        <p>¿Dudas? Escríbenos a <a href="mailto:hola@aliax.io" style={{ color: TEAL }}>hola@aliax.io</a></p>
      </div>
    </div>
  );
}
