import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Gift, Sparkles } from 'lucide-react';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

type Region = 'MX' | 'INTL';

const FREE_FEATURES = [
  'Listado en el directorio de Aliax',
  '1 perfil profesional',
  'Agenda configurable',
  'Notas de sesión manuales',
  'Servicios y reservas ilimitadas',
];

const PRO_FEATURES = [
  'Todo lo del plan gratuito',
  'Todos los templates y colores premium',
  'Analytics completos',
  'Historia Clínica Individual y de Pareja',
  'Configuración avanzada de disponibilidad',
];

const CLINICO_FEATURES = [
  'Todo lo del plan Pro',
  'Notas de sesión generadas con IA (Libre, SOAP, Diamante TBCS, Centrada en Soluciones)',
  'Transcripción de audio de sesión → nota automática',
  'Separación de hablantes, consentimiento del paciente, el audio nunca se almacena',
  'Uso generoso para tu consulta de tiempo completo',
];

const PRICES = {
  PRO:     { MX: { amount: '$210 MXN', currency: 'MXN' as const }, INTL: { amount: '$14 USD',  currency: 'USD' as const } },
  CLINICO: { MX: { amount: '$900 MXN', currency: 'MXN' as const }, INTL: { amount: '$60 USD', currency: 'USD' as const } },
};

const TEAL   = '#2dd4bf';
const TEAL_D = '#0d9488';
const PURPLE = '#7c3aed';
const TEXT   = '#e8f0f0';
const MUTED  = '#6aada8';
const DIM    = '#3d7a75';

function detectRegion(): Region {
  try {
    const lang = navigator.language || '';
    if (lang.toLowerCase().includes('mx')) return 'MX';
  } catch { /* noop */ }
  return 'INTL';
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isPro, isClinico } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>('INTL');

  useEffect(() => {
    let resolved = detectRegion();
    api.get('/profiles').then(res => {
      const country = res.data?.[0]?.country as string | undefined;
      if (country && /m[eé]xico|^mx$/i.test(country)) resolved = 'MX';
      setRegion(resolved);
    }).catch(() => setRegion(resolved));
  }, []);

  const priceOf = (tier: 'PRO' | 'CLINICO') => PRICES[tier][region];

  const handleStripe = async (tier: 'PRO' | 'CLINICO') => {
    if (!user) { navigate('/register'); return; }
    setLoading(`stripe-${tier}`);
    try {
      const { currency } = priceOf(tier);
      const res = await api.post('/subscriptions/stripe/checkout', { interval: 'MONTHLY', currency, tier });
      window.location.href = res.data.url;
    } catch {
      setLoading(null);
    }
  };

  const handlePayPal = async (tier: 'PRO' | 'CLINICO') => {
    if (!user) { navigate('/register'); return; }
    setLoading(`paypal-${tier}`);
    try {
      const { currency } = priceOf(tier);
      const res = await api.post('/subscriptions/paypal/subscription/create', { interval: 'MONTHLY', currency, tier });
      window.location.href = res.data.approvalUrl;
    } catch {
      setLoading(null);
    }
  };

  const regionToggle = (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
      {(['MX', 'INTL'] as Region[]).map(r => (
        <button
          key={r}
          onClick={() => setRegion(r)}
          style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${region === r ? TEAL : 'rgba(255,255,255,0.15)'}`,
            background: region === r ? 'rgba(45,212,191,0.15)' : 'transparent',
            color: region === r ? TEAL : MUTED,
          }}
        >
          {r === 'MX' ? '🇲🇽 México' : '🌎 Internacional'}
        </button>
      ))}
    </div>
  );

  const proPrice = priceOf('PRO');
  const clinicoPrice = priceOf('CLINICO');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '120px 20px 60px', fontFamily: 'system-ui, sans-serif', position: 'relative',
    }}>
      <LandingHeader />
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'inline-block', background: 'rgba(45,212,191,0.12)',
          border: '1px solid rgba(45,212,191,0.3)', borderRadius: 20, padding: '6px 16px',
          color: TEAL, fontSize: 13, marginBottom: 16,
        }}>
          Planes simples, sin sorpresas
        </div>
        <h1 style={{ color: TEXT, fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>
          Automatiza tu nota clínica
        </h1>
        <p style={{ color: MUTED, fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
          Grabas la sesión, Aliax transcribe y genera la nota. Tu perfil, reservas y servicios son siempre gratis.
        </p>
      </div>

      {regionToggle}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 1160 }}>

        {/* Free Card */}
        <div style={{ flex: '1 1 320px', maxWidth: 360, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 20, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Gift size={20} color={MUTED} />
            <span style={{ color: MUTED, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Gratuito</span>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ color: TEXT, fontSize: 38, fontWeight: 800 }}>$0</span>
            <span style={{ color: DIM, fontSize: 15 }}> / siempre</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {FREE_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: MUTED, fontSize: 13.5 }}>
                <Check size={15} color={TEAL_D} style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => user ? navigate('/dashboard') : navigate('/register')}
            style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: `1px solid rgba(45,212,191,0.35)`, background: 'transparent', color: TEAL, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {user ? 'Ir al dashboard' : 'Crear cuenta gratis'}
          </button>
        </div>

        {/* Pro Card */}
        <div style={{ flex: '1 1 320px', maxWidth: 360, background: 'linear-gradient(135deg, rgba(45,212,191,0.12) 0%, rgba(13,148,136,0.08) 100%)', border: `2px solid rgba(45,212,191,0.45)`, borderRadius: 20, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Zap size={20} color={TEAL} />
            <span style={{ color: TEAL, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Pro</span>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ color: TEXT, fontSize: 38, fontWeight: 800 }}>{proPrice.amount}</span>
            <span style={{ color: MUTED, fontSize: 15 }}> / mes</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {PRO_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: TEXT, fontSize: 13.5 }}>
                <Check size={15} color={TEAL} style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
          {isPro && !isClinico ? (
            <div style={{ width: '100%', padding: '12px 20px', borderRadius: 12, background: 'rgba(45,212,191,0.15)', color: TEAL, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
              ✓ Ya tienes Pro activo
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => handleStripe('PRO')} disabled={!!loading} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: `linear-gradient(90deg, ${TEAL}, ${TEAL_D})`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'stripe-PRO' ? 0.7 : 1 }}>
                {loading === 'stripe-PRO' ? 'Redirigiendo...' : `Pagar con tarjeta — ${proPrice.amount}/mes`}
              </button>
              <button onClick={() => handlePayPal('PRO')} disabled={!!loading} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: '#FFC439', color: '#003087', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'paypal-PRO' ? 0.7 : 1 }}>
                {loading === 'paypal-PRO' ? 'Redirigiendo...' : `PayPal — ${proPrice.amount}/mes`}
              </button>
            </div>
          )}
        </div>

        {/* Clínico Card */}
        <div style={{ flex: '1 1 320px', maxWidth: 360, background: 'linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(88,28,135,0.08) 100%)', border: `2px solid rgba(124,58,237,0.5)`, borderRadius: 20, padding: 28, position: 'relative' }}>
          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg, ${PURPLE}, #a855f7)`, borderRadius: 20, padding: '4px 16px', color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
            RECOMENDADO
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Sparkles size={20} color={PURPLE} />
            <span style={{ color: PURPLE, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Clínico</span>
          </div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ color: TEXT, fontSize: 38, fontWeight: 800 }}>{clinicoPrice.amount}</span>
            <span style={{ color: MUTED, fontSize: 15 }}> / mes</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {CLINICO_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: TEXT, fontSize: 13.5 }}>
                <Check size={15} color={PURPLE} style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>
          {isClinico ? (
            <div style={{ width: '100%', padding: '12px 20px', borderRadius: 12, background: 'rgba(124,58,237,0.18)', color: PURPLE, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
              ✓ Ya tienes Clínico activo
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => handleStripe('CLINICO')} disabled={!!loading} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: `linear-gradient(90deg, ${PURPLE}, #a855f7)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'stripe-CLINICO' ? 0.7 : 1 }}>
                {loading === 'stripe-CLINICO' ? 'Redirigiendo...' : `Pagar con tarjeta — ${clinicoPrice.amount}/mes`}
              </button>
              <button onClick={() => handlePayPal('CLINICO')} disabled={!!loading} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: '#FFC439', color: '#003087', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'paypal-CLINICO' ? 0.7 : 1 }}>
                {loading === 'paypal-CLINICO' ? 'Redirigiendo...' : `PayPal — ${clinicoPrice.amount}/mes`}
              </button>
            </div>
          )}
          <p style={{ color: DIM, fontSize: 11.5, textAlign: 'center', marginTop: 8 }}>Sin costo de instalación</p>
        </div>
      </div>

      <div style={{ maxWidth: 560, width: '100%', marginTop: 40, color: MUTED, fontSize: 14, textAlign: 'center' }}>
        <p>¿Dudas? Escríbenos a <a href="mailto:hola@aliax.io" style={{ color: TEAL }}>hola@aliax.io</a></p>
      </div>
      <div style={{ width: '100%', marginTop: 40 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
