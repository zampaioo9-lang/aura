import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';

export default function OfferingPayPalReturn() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const orderId = searchParams.get('token'); // PayPal devuelve el orderId en el parametro "token"
    if (!orderId) {
      setStatus('error');
      return;
    }
    api.post('/purchases/paypal/capture', { orderId })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [searchParams]);

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
        {status === 'error' && <p className="text-red-600">No pudimos confirmar tu pago. Si el cargo se realizo, contactanos con tu comprobante.</p>}
      </div>
    </div>
  );
}
