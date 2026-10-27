import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

interface Offering {
  id: string;
  title: string;
  description: string | null;
  type: 'LIVE_WORKSHOP' | 'RECORDED_COURSE';
  priceUSD: string;
  priceMXN: string | null;
  profile: { title: string; slug: string; avatar: string | null };
}

export default function OfferingPublic() {
  const { offeringId } = useParams();
  const [offering, setOffering] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'MXN'>('USD');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.get(`/offerings/${offeringId}`)
      .then(res => setOffering(res.data))
      .catch(() => setError('Oferta no encontrada'))
      .finally(() => setLoading(false));
  }, [offeringId]);

  const startCheckout = async (provider: 'stripe' | 'paypal') => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setFormError('Nombre y correo son obligatorios');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post('/purchases/checkout', {
        offeringId,
        buyerName,
        buyerEmail,
        buyerPhone: buyerPhone || undefined,
        currency,
        provider,
      });
      window.location.href = res.data.redirectUrl;
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'No se pudo iniciar el pago');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  if (error || !offering) return <div className="min-h-screen flex items-center justify-center text-slate-500">{error || 'Oferta no encontrada'}</div>;

  const price = currency === 'MXN' ? offering.priceMXN : offering.priceUSD;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <p className="text-sm text-teal-600 font-medium mb-1">{offering.profile.title}</p>
        <h1 className="text-2xl font-semibold text-slate-900 mb-3">{offering.title}</h1>
        {offering.description && <p className="text-slate-600 mb-6">{offering.description}</p>}

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-3xl font-bold text-slate-900">${price}</span>
          <span className="text-slate-500">{currency}</span>
          {offering.priceMXN && (
            <div className="ml-auto flex gap-1">
              <button onClick={() => setCurrency('USD')} className={`px-3 py-1 rounded-full text-sm ${currency === 'USD' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>USD</button>
              <button onClick={() => setCurrency('MXN')} className={`px-3 py-1 rounded-full text-sm ${currency === 'MXN' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>MXN</button>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Tu nombre"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg" />
          <input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="Tu correo" type="email"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg" />
          <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="Telefono (opcional)"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg" />
        </div>

        {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}

        <div className="flex flex-col gap-2">
          <button disabled={submitting} onClick={() => startCheckout('stripe')}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            Pagar con tarjeta
          </button>
          <button disabled={submitting} onClick={() => startCheckout('paypal')}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            Pagar con PayPal
          </button>
        </div>
      </div>
    </div>
  );
}
