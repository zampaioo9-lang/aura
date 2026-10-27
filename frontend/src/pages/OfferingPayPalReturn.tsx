import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';

export default function OfferingPayPalReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { offeringId } = useParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const orderId = searchParams.get('token'); // PayPal devuelve el orderId en el parametro "token"
    if (!orderId) {
      setStatus('error');
      return;
    }
    api.post('/purchases/paypal/capture', { orderId })
      .then(() => setStatus('success'))
      .catch((err: any) => {
        const details = err.response?.data?.details;
        const message = Array.isArray(details) && details.length > 0
          ? details.join('. ')
          : err.response?.data?.error || 'No se pudo confirmar el pago';
        console.error('Error al confirmar pago PayPal:', message);
        setStatus('error');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-10">
        {status === 'loading' && <p className="text-slate-500">Confirmando tu pago...</p>}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">&#10003;</div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Pago recibido</h1>
            <p className="text-slate-500">Revisa tu correo: ahi te enviamos el enlace para acceder a tu compra.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-600 mb-6">No pudimos confirmar tu pago. Si el cargo se realizo, contactanos con tu comprobante.</p>
            {offeringId && (
              <button onClick={() => navigate(`/oferta/${offeringId}`)}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors">
                Volver a la oferta
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
