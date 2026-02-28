import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function PayPalReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const orderId = params.get('token');
    if (!orderId) {
      navigate('/pricing');
      return;
    }

    api.post('/subscriptions/paypal/order/capture', { orderId })
      .then(() => refreshUser())
      .then(() => navigate('/payment/success'))
      .catch(() => navigate('/pricing'));
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0f12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e8e8f0',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Loader2 style={{ width: 40, height: 40, color: '#6b63ff', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b6b80', fontSize: 16 }}>Confirmando tu pago...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
