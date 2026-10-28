import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

interface QuestionOption {
  id: string;
  label: string;
  value: number;
}

interface Question {
  id: string;
  text: string;
  type: 'FREE_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  options: QuestionOption[];
}

interface ModuleResult {
  totalScore: number;
  message: string;
}

interface AccessModule {
  id: string;
  title: string;
  description: string | null;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'QUESTIONNAIRE';
  order: number;
  textContent?: string | null;
  fileUrl?: string | null;
  questions?: Question[];
  result?: ModuleResult;
}

interface AccessData {
  buyerName: string;
  offering: {
    id: string;
    title: string;
    description: string | null;
    type: 'LIVE_WORKSHOP' | 'RECORDED_COURSE';
    scheduledAt: string | null;
    externalLink: string | null;
  };
  modules: AccessModule[];
}

export default function AccessPurchase() {
  const { accessToken } = useParams();
  const [data, setData] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    api.get(`/access/${accessToken}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Acceso no encontrado'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center text-slate-500">{error || 'Acceso no encontrado'}</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">{data.offering.title}</h1>
        <p className="text-slate-500 mb-6">Hola {data.buyerName}, aqui esta tu contenido.</p>

        {data.offering.type === 'LIVE_WORKSHOP' && (
          <div className="mb-6 p-4 bg-teal-50 rounded-lg text-sm text-teal-800 space-y-3">
            {data.offering.scheduledAt && !isNaN(new Date(data.offering.scheduledAt).getTime()) ? (
              <p>
                <span className="font-medium">Fecha y hora: </span>
                {new Date(data.offering.scheduledAt).toLocaleDateString('es-MX', { dateStyle: 'full' })}
                {' · '}
                {new Date(data.offering.scheduledAt).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}
              </p>
            ) : (
              <p className="font-medium">Fecha por confirmar</p>
            )}
            {data.offering.externalLink && (
              <a
                href={data.offering.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors"
              >
                Unirse al taller
              </a>
            )}
          </div>
        )}

        <div className="space-y-6">
          {data.modules.map((module) => (
            <ModuleBlock key={module.id} module={module} accessToken={accessToken!} onAnswered={load} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleBlock({
  module,
  accessToken,
  onAnswered,
}: {
  module: AccessModule;
  accessToken: string;
  onAnswered: () => void;
}) {
  return (
    <div className="border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">{module.title}</h2>
      {module.description && <p className="text-slate-600 mb-3">{module.description}</p>}

      {module.type === 'TEXT' && <p className="text-slate-700 whitespace-pre-wrap">{module.textContent}</p>}

      {module.type === 'VIDEO' && module.fileUrl && (
        <video controls className="w-full rounded-lg" src={module.fileUrl} />
      )}

      {module.type === 'PDF' && module.fileUrl && (
        <a href={module.fileUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
          Descargar PDF
        </a>
      )}

      {module.type === 'QUESTIONNAIRE' && module.result && (
        <QuestionnaireResult result={module.result} accessToken={accessToken} moduleId={module.id} />
      )}
      {module.type === 'QUESTIONNAIRE' && !module.result && (
        <QuestionnaireForm questions={module.questions ?? []} accessToken={accessToken} moduleId={module.id} onSubmitted={onAnswered} />
      )}
    </div>
  );
}

function QuestionnaireResult({
  result,
  accessToken,
  moduleId,
}: {
  result: ModuleResult;
  accessToken: string;
  moduleId: string;
}) {
  const pdfUrl = `${api.defaults.baseURL}/access/${accessToken}/modules/${moduleId}/result.pdf`;
  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <p className="text-slate-900 font-medium mb-1">Puntaje: {result.totalScore}</p>
      <p className="text-slate-700 mb-3">{result.message}</p>
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors"
      >
        Descargar PDF
      </a>
    </div>
  );
}

function QuestionnaireForm({
  questions,
  accessToken,
  moduleId,
  onSubmitted,
}: {
  questions: Question[];
  accessToken: string;
  moduleId: string;
  onSubmitted: () => void;
}) {
  const [values, setValues] = useState<Record<string, { valueText?: string; valueOptionIds?: string[] }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setText = (questionId: string, text: string) => {
    setValues((prev) => ({ ...prev, [questionId]: { valueText: text } }));
  };

  const toggleOption = (question: Question, optionId: string) => {
    setValues((prev) => {
      const current = prev[question.id]?.valueOptionIds ?? [];
      const next =
        question.type === 'SINGLE_CHOICE'
          ? [optionId]
          : current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
      return { ...prev, [question.id]: { valueOptionIds: next } };
    });
  };

  const submit = async () => {
    setError('');
    const answers = questions.map((q) => ({ questionId: q.id, ...values[q.id] }));
    const missing = answers.some(
      (a) => (!a.valueText || a.valueText.trim().length === 0) && (!a.valueOptionIds || a.valueOptionIds.length === 0),
    );
    if (missing) {
      setError('Responde todas las preguntas antes de enviar');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/access/${accessToken}/modules/${moduleId}/answers`, { answers });
      onSubmitted();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo enviar el cuestionario');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id}>
          <p className="font-medium text-slate-900 mb-2">{q.text}</p>
          {q.type === 'FREE_TEXT' && (
            <textarea
              value={values[q.id]?.valueText ?? ''}
              onChange={(e) => setText(q.id, e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg"
              rows={3}
            />
          )}
          {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && (
            <div className="space-y-1">
              {q.options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2">
                  <input
                    type={q.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                    name={q.id}
                    checked={(values[q.id]?.valueOptionIds ?? []).includes(opt.id)}
                    onChange={() => toggleOption(q, opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        disabled={submitting}
        onClick={submit}
        className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
      >
        Enviar respuestas
      </button>
    </div>
  );
}
