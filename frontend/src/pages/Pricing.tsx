import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ArrowLeft, Check, CreditCard, Infinity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

type Interval = 'MONTHLY' | 'LIFETIME';

const LAUNCH_END = new Date('2026-03-29T00:00:00Z');

const FEATURES = [
  '1 perfil profesional',
  'Sistema de reservas',
  'Notificaciones WhatsApp',
  'Múltiples plantillas',
  'Soporte prioritario',
];

// ─── Countdown display ───────────────────────────────────────────────────────

function Countdown({ remaining }: { remaining: number }) {
  const totalSecs = Math.floor(remaining / 1000);
  const days    = Math.floor(totalSecs / 86400);
  const hours   = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '0 0 20px' }}>
      {[
        { label: 'días', value: days },
        { label: 'hrs',  value: hours },
        { label: 'min',  value: minutes },
        { label: 'seg',  value: seconds },
      ].map(({ label, value }, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                background: 'rgba(107,99,255,0.15)',
                border: '1px solid rgba(107,99,255,0.3)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 22,
                fontWeight: 700,
                color: '#a5b4fc',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 42,
              }}
            >
              {pad(value)}
            </div>
            <div style={{ fontSize: 10, color: '#6b6b80', marginTop: 3 }}>{label}</div>
          </div>
          {i < 3 && (
            <span style={{ color: '#6b63ff', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function StripeButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 12,
        border: 'none',
        background: '#6b63ff',
        color: 'white',
        fontSize: 15,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = loading ? '0.7' : '1'; }}
    >
      {loading ? (
        <span
          style={{
            width: 18, height: 18,
            border: '2px solid rgba(255,255,255,0.35)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'pp-spin 0.75s linear infinite',
          }}
        />
      ) : (
        <CreditCard style={{ width: 17, height: 17, flexShrink: 0 }} />
      )}
      {loading ? 'Redirigiendo...' : 'Pagar con tarjeta'}
    </button>
  );
}

function GuestPayPalButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 12,
        border: '1px solid #2e2e3d',
        background: 'transparent',
        color: '#6b6b80',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.borderColor = '#6b63ff';
        b.style.color = '#e8e8f0';
      }}
      onMouseLeave={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.borderColor = '#2e2e3d';
        b.style.color = '#6b6b80';
      }}
    >
      Continuar con PayPal
    </button>
  );
}

function FeatureList({ extra }: { extra?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 32 }}>
      {FEATURES.map(f => (
        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(107,99,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Check style={{ width: 11, height: 11, color: '#6b63ff' }} />
          </span>
          <span style={{ color: '#c8c8d8', fontSize: 14 }}>{f}</span>
        </div>
      ))}
      {extra}
    </div>
  );
}

// ─── Monthly plan card ───────────────────────────────────────────────────────

function MonthlyCard({
  stripeLoading,
  onStripe,
  onPayPalApprove,
  onGuestPayPal,
  isLoggedIn,
}: {
  stripeLoading: Interval | null;
  onStripe: (i: Interval) => void;
  onPayPalApprove: (subscriptionId: string) => Promise<void>;
  onGuestPayPal: () => void;
  isLoggedIn: boolean;
}) {
  const isLoading = stripeLoading === 'MONTHLY';

  return (
    <div
      style={{
        flex: 1,
        minWidth: 280,
        position: 'relative',
        background: '#22222c',
        border: '1px solid #2e2e3d',
        borderRadius: 20,
        padding: '40px 32px 32px',
      }}
    >
      <p style={{ color: '#6b6b80', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Pro Mensual
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 54, fontWeight: 800, color: '#e8e8f0', lineHeight: 1, letterSpacing: '-0.03em' }}>
          $19
        </span>
        <span style={{ color: '#6b6b80', fontSize: 16 }}>/mes</span>
      </div>

      <p style={{ color: '#6b6b80', fontSize: 14, lineHeight: 1.65, margin: '0 0 28px' }}>
        Acceso completo. Cancela cuando quieras.
      </p>

      <FeatureList />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <StripeButton loading={isLoading} onClick={() => onStripe('MONTHLY')} />

        {isLoggedIn ? (
          <div style={{ borderRadius: 12, overflow: 'hidden' }}>
            <PayPalButtons
              style={{ layout: 'horizontal', height: 48, tagline: false, shape: 'rect', color: 'gold' }}
              createSubscription={(_data: Record<string, unknown>, actions: any) =>
                actions.subscription.create({ plan_id: import.meta.env.VITE_PAYPAL_PLAN_MONTHLY })
              }
              onApprove={(data: any) => onPayPalApprove(data.subscriptionID!)}
              onError={(err: unknown) => console.error('PayPal monthly error:', err)}
            />
          </div>
        ) : (
          <GuestPayPalButton onClick={onGuestPayPal} />
        )}
      </div>
    </div>
  );
}

// ─── Lifetime plan card ──────────────────────────────────────────────────────

function LifetimeCard({
  launchActive,
  remaining,
  stripeLoading,
  onStripe,
  onPayPalLifetime,
  onGuestPayPal,
  isLoggedIn,
}: {
  launchActive: boolean;
  remaining: number;
  stripeLoading: Interval | null;
  onStripe: (i: Interval) => void;
  onPayPalLifetime: () => void;
  onGuestPayPal: () => void;
  isLoggedIn: boolean;
}) {
  const isLoading = stripeLoading === 'LIFETIME';

  return (
    <div
      style={{
        flex: 1,
        minWidth: 280,
        position: 'relative',
        background: 'linear-gradient(145deg, #1b1838 0%, #22222c 70%)',
        border: '1px solid #6b63ff',
        borderRadius: 20,
        padding: '40px 32px 32px',
        boxShadow: '0 0 50px rgba(107,99,255,0.12)',
      }}
    >
      {/* Badge */}
      <div
        style={{
          position: 'absolute',
          top: -14,
          left: '50%',
          transform: 'translateX(-50%)',
          background: launchActive ? 'linear-gradient(90deg, #f97316, #ef4444)' : '#6b63ff',
          color: 'white',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          padding: '5px 18px',
          borderRadius: 100,
          whiteSpace: 'nowrap',
        }}
      >
        {launchActive ? 'Precio de lanzamiento' : 'Mas popular'}
      </div>

      <p style={{ color: '#6b6b80', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Pro Lifetime
      </p>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 54, fontWeight: 800, color: '#a5b4fc', lineHeight: 1, letterSpacing: '-0.03em' }}>
          {launchActive ? '$79' : '$149'}
        </span>
        {launchActive && (
          <span style={{ fontSize: 22, fontWeight: 600, color: '#4b4b60', textDecoration: 'line-through' }}>
            $149
          </span>
        )}
        <span style={{ color: '#6b6b80', fontSize: 16 }}>único pago</span>
      </div>

      <p style={{ color: '#6b6b80', fontSize: 14, lineHeight: 1.65, margin: '0 0 16px' }}>
        Paga una vez. Acceso de por vida.
      </p>

      {launchActive && <Countdown remaining={remaining} />}

      <FeatureList
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(107,99,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Infinity style={{ width: 11, height: 11, color: '#6b63ff' }} />
            </span>
            <span style={{ color: '#c8c8d8', fontSize: 14, fontWeight: 600 }}>Sin renovaciones nunca</span>
          </div>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <StripeButton loading={isLoading} onClick={() => onStripe('LIFETIME')} />

        {isLoggedIn ? (
          <GuestPayPalButton onClick={onPayPalLifetime} />
        ) : (
          <GuestPayPalButton onClick={onGuestPayPal} />
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stripeLoading, setStripeLoading] = useState<Interval | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Date.now() >= LAUNCH_END.getTime()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const launchActive = now < LAUNCH_END.getTime();
  const remaining = Math.max(0, LAUNCH_END.getTime() - now);

  const handleStripe = async (interval: Interval) => {
    if (!user) {
      sessionStorage.setItem('pending_plan', interval);
      navigate('/register');
      return;
    }
    try {
      setStripeLoading(interval);
      const res = await api.post('/subscriptions/stripe/checkout', { interval });
      window.location.href = res.data.url;
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setStripeLoading(null);
    }
  };

  const handlePayPalMonthlyApprove = async (subscriptionId: string) => {
    if (!user) {
      sessionStorage.setItem('pending_plan', 'MONTHLY');
      navigate('/register');
      return;
    }
    try {
      await api.post('/subscriptions/paypal/capture', { subscriptionId, interval: 'MONTHLY' });
      navigate('/payment/success');
    } catch (err) {
      console.error('PayPal monthly capture error:', err);
    }
  };

  const handlePayPalLifetime = async () => {
    if (!user) {
      sessionStorage.setItem('pending_plan', 'LIFETIME');
      navigate('/register');
      return;
    }
    try {
      const res = await api.post('/subscriptions/paypal/order/create');
      window.location.href = res.data.approvalUrl;
    } catch (err) {
      console.error('PayPal lifetime error:', err);
    }
  };

  const handleGuestPayPal = (interval: Interval) => {
    sessionStorage.setItem('pending_plan', interval);
    navigate('/register');
  };

  return (
    <PayPalScriptProvider
      options={{
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
        vault: true,
        intent: 'capture',
      }}
    >
      <style>{`
        @keyframes pp-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0f0f12', color: '#e8e8f0' }}>

        {/* Navbar */}
        <nav
          style={{
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'rgba(15,15,18,0.82)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b6b80',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: 8,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b6b80')}
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#e8e8f0' }}>Aliax.io</span>
        </nav>

        {/* Page content */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px 96px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h1
              style={{
                fontSize: 44,
                fontWeight: 800,
                color: '#e8e8f0',
                margin: '0 0 14px',
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
              }}
            >
              Elige tu plan
            </h1>
            <p style={{ color: '#6b6b80', fontSize: 17, margin: 0 }}>
              14 días de prueba incluidos. Sin sorpresas.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
            <MonthlyCard
              stripeLoading={stripeLoading}
              onStripe={handleStripe}
              onPayPalApprove={handlePayPalMonthlyApprove}
              onGuestPayPal={() => handleGuestPayPal('MONTHLY')}
              isLoggedIn={!!user}
            />
            <LifetimeCard
              launchActive={launchActive}
              remaining={remaining}
              stripeLoading={stripeLoading}
              onStripe={handleStripe}
              onPayPalLifetime={handlePayPalLifetime}
              onGuestPayPal={() => handleGuestPayPal('LIFETIME')}
              isLoggedIn={!!user}
            />
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', marginTop: 40, color: '#3d3d50', fontSize: 13 }}>
            Soporte en soporte@aliax.io
          </p>
        </div>
      </div>
    </PayPalScriptProvider>
  );
}
