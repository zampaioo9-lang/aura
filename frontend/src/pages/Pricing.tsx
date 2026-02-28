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

function PayPalGoldButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        height: 48,
        borderRadius: 8,
        border: 'none',
        background: '#FFC439',
        color: '#003087',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f0b429'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFC439'; }}
    >
      <svg width="80" height="20" viewBox="0 0 80 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.5 2H5.2C4.9 2 4.6 2.2 4.6 2.5L2.9 13.1C2.9 13.3 3 13.5 3.2 13.5H5.3C5.6 13.5 5.9 13.3 5.9 13L6.4 9.9C6.4 9.6 6.7 9.4 7 9.4H8.3C10.9 9.4 12.4 8.1 12.8 5.6C13 4.5 12.8 3.6 12.3 3C11.7 2.3 10.7 2 9.5 2ZM9.9 5.7C9.7 7 8.6 7 7.6 7H7L7.4 4.4C7.4 4.2 7.6 4.1 7.8 4.1H8C8.7 4.1 9.4 4.1 9.7 4.5C9.9 4.7 10 5.1 9.9 5.7Z" fill="#003087"/>
        <path d="M21.5 5.6H19.4C19.2 5.6 19 5.7 19 5.9L18.9 6.5L18.7 6.2C18.1 5.4 17 5.1 15.9 5.1C13.4 5.1 11.3 7 10.9 9.6C10.7 10.9 11 12.1 11.7 12.9C12.4 13.7 13.4 14 14.6 14C16.6 14 17.7 12.7 17.7 12.7L17.6 13.3C17.6 13.5 17.7 13.7 17.9 13.7H19.8C20.1 13.7 20.4 13.5 20.4 13.2L21.8 6.1C21.9 5.8 21.7 5.6 21.5 5.6ZM18.3 9.7C18.1 10.9 17.1 11.8 15.9 11.8C15.3 11.8 14.8 11.6 14.5 11.2C14.2 10.8 14.1 10.3 14.2 9.7C14.4 8.5 15.4 7.6 16.6 7.6C17.2 7.6 17.7 7.8 18 8.2C18.4 8.6 18.5 9.1 18.3 9.7Z" fill="#003087"/>
        <path d="M33 5.6H30.9C30.6 5.6 30.4 5.7 30.3 5.9L27.5 10.1L26.3 6.1C26.2 5.8 25.9 5.6 25.6 5.6H23.6C23.4 5.6 23.2 5.8 23.3 6L25.5 12.8L23.4 15.7C23.3 15.9 23.4 16.2 23.7 16.2H25.8C26.1 16.2 26.3 16.1 26.4 15.9L33.3 6.1C33.5 5.9 33.3 5.6 33 5.6Z" fill="#003087"/>
        <path d="M40.5 2H36.2C35.9 2 35.6 2.2 35.6 2.5L33.9 13.1C33.9 13.3 34 13.5 34.2 13.5H36.5C36.7 13.5 36.9 13.4 36.9 13.2L37.4 9.9C37.4 9.6 37.7 9.4 38 9.4H39.3C41.9 9.4 43.4 8.1 43.8 5.6C44 4.5 43.8 3.6 43.3 3C42.7 2.3 41.7 2 40.5 2ZM40.9 5.7C40.7 7 39.6 7 38.6 7H38L38.4 4.4C38.4 4.2 38.6 4.1 38.8 4.1H39C39.7 4.1 40.4 4.1 40.7 4.5C40.9 4.7 41 5.1 40.9 5.7Z" fill="#009CDE"/>
        <path d="M52.5 5.6H50.4C50.2 5.6 50 5.7 50 5.9L49.9 6.5L49.7 6.2C49.1 5.4 48 5.1 46.9 5.1C44.4 5.1 42.3 7 41.9 9.6C41.7 10.9 42 12.1 42.7 12.9C43.4 13.7 44.4 14 45.6 14C47.6 14 48.7 12.7 48.7 12.7L48.6 13.3C48.6 13.5 48.7 13.7 48.9 13.7H50.8C51.1 13.7 51.4 13.5 51.4 13.2L52.8 6.1C52.9 5.8 52.7 5.6 52.5 5.6ZM49.3 9.7C49.1 10.9 48.1 11.8 46.9 11.8C46.3 11.8 45.8 11.6 45.5 11.2C45.2 10.8 45.1 10.3 45.2 9.7C45.4 8.5 46.4 7.6 47.6 7.6C48.2 7.6 48.7 7.8 49 8.2C49.4 8.6 49.5 9.1 49.3 9.7Z" fill="#009CDE"/>
        <path d="M55 2.3L53.2 13.2C53.2 13.4 53.3 13.6 53.5 13.6H55.3C55.6 13.6 55.9 13.4 55.9 13.1L57.6 2.5C57.6 2.3 57.5 2.1 57.3 2.1H55.3C55.1 2 55 2.1 55 2.3Z" fill="#009CDE"/>
      </svg>
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
          <PayPalGoldButton onClick={onPayPalLifetime} />
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
