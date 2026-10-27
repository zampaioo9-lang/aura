import { useNavigate, useParams } from 'react-router-dom';

export default function OfferingCheckoutCancel() {
  const navigate = useNavigate();
  const { offeringId } = useParams();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-10">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Pago cancelado</h1>
        <p className="text-slate-500 mb-6">No se realizo ningun cargo. Puedes intentarlo de nuevo cuando quieras.</p>
        <button onClick={() => navigate(`/oferta/${offeringId}`)}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors">
          Volver a la oferta
        </button>
      </div>
    </div>
  );
}
