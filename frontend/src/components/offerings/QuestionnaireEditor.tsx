import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X as XIcon } from 'lucide-react';
import { useOfferings, type Question, type ScoringRule } from '../../hooks/useOfferings';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

interface Props {
  C: Colors;
  offeringId: string;
  moduleId: string;
}

type QuestionType = 'FREE_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  FREE_TEXT: 'Texto libre',
  SINGLE_CHOICE: 'Opcion unica',
  MULTIPLE_CHOICE: 'Opcion multiple',
};

export default function QuestionnaireEditor({ C, offeringId, moduleId }: Props) {
  const { fetchQuestions, createQuestion, updateQuestionText, deleteQuestion, fetchScoringRules, createScoringRule, updateScoringRule, deleteScoringRule } = useOfferings();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingRules, setLoadingRules] = useState(true);
  const [error, setError] = useState('');

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      setQuestions(await fetchQuestions(offeringId, moduleId));
    } finally {
      setLoadingQuestions(false);
    }
  }, [fetchQuestions, offeringId, moduleId]);
  const loadRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      setRules(await fetchScoringRules(offeringId, moduleId));
    } finally {
      setLoadingRules(false);
    }
  }, [fetchScoringRules, offeringId, moduleId]);

  useEffect(() => {
    loadQuestions();
    loadRules();
  }, [loadQuestions, loadRules]);

  // ── Questions ──
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('FREE_TEXT');
  const [qOptions, setQOptions] = useState<{ label: string; value: string }[]>([{ label: '', value: '' }, { label: '', value: '' }]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');

  const resetQuestionForm = () => {
    setAddingQuestion(false);
    setQText('');
    setQType('FREE_TEXT');
    setQOptions([{ label: '', value: '' }, { label: '', value: '' }]);
  };

  const submitQuestion = async () => {
    setError('');
    if (qText.trim().length < 3) {
      setError('La pregunta debe tener al menos 3 caracteres');
      return;
    }
    try {
      if (qType === 'FREE_TEXT') {
        await createQuestion(offeringId, moduleId, { text: qText.trim(), type: qType });
      } else {
        const withLabel = qOptions.filter((o) => o.label.trim());
        if (withLabel.length < 2) {
          setError(`Solo detectamos ${withLabel.length} opcion${withLabel.length === 1 ? '' : 'es'} con texto; agrega al menos 2`);
          return;
        }
        // Validar el valor numerico de cada opcion ANTES de convertir con Number(...) || 0 --
        // sin esto, dejar el campo Valor vacio (un descuido facil al redactar rapido) guardaba
        // silenciosamente una opcion con 0 puntos, sin avisar que el valor se ignoro.
        const missingValue = withLabel.find((o) => o.value.trim() === '' || Number.isNaN(Number(o.value)));
        if (missingValue) {
          setError(`La opcion "${missingValue.label.trim()}" necesita un valor numerico`);
          return;
        }
        const parsedOptions = withLabel.map((o) => ({ label: o.label.trim(), value: Number(o.value) }));
        await createQuestion(offeringId, moduleId, { text: qText.trim(), type: qType, options: parsedOptions });
      }
      resetQuestionForm();
      await loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveQuestionText = async (questionId: string) => {
    setError('');
    try {
      await updateQuestionText(offeringId, moduleId, questionId, editingQuestionText.trim());
      setEditingQuestionId(null);
      await loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeQuestion = async (questionId: string) => {
    setError('');
    try {
      await deleteQuestion(offeringId, moduleId, questionId);
      await loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Scoring rules ──
  const [addingRule, setAddingRule] = useState(false);
  const [rMin, setRMin] = useState('');
  const [rMax, setRMax] = useState('');
  const [rMessage, setRMessage] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRMin, setEditRMin] = useState('');
  const [editRMax, setEditRMax] = useState('');
  const [editRMessage, setEditRMessage] = useState('');

  const resetRuleForm = () => {
    setAddingRule(false);
    setRMin('');
    setRMax('');
    setRMessage('');
  };

  const submitRule = async () => {
    setError('');
    const minScore = Number(rMin);
    const maxScore = Number(rMax);
    if (Number.isNaN(minScore) || Number.isNaN(maxScore) || maxScore < minScore) {
      setError('El rango de puntaje no es valido (maximo debe ser mayor o igual al minimo)');
      return;
    }
    if (rMessage.trim().length < 3) {
      setError('El mensaje debe tener al menos 3 caracteres');
      return;
    }
    try {
      await createScoringRule(offeringId, moduleId, { minScore, maxScore, message: rMessage.trim() });
      resetRuleForm();
      await loadRules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEditRule = (rule: ScoringRule) => {
    setEditingRuleId(rule.id);
    setEditRMin(String(rule.minScore));
    setEditRMax(String(rule.maxScore));
    setEditRMessage(rule.message);
  };

  const saveRule = async (ruleId: string) => {
    setError('');
    const minScore = Number(editRMin);
    const maxScore = Number(editRMax);
    if (Number.isNaN(minScore) || Number.isNaN(maxScore) || maxScore < minScore) {
      setError('El rango de puntaje no es valido');
      return;
    }
    try {
      await updateScoringRule(offeringId, moduleId, ruleId, { minScore, maxScore, message: editRMessage.trim() });
      setEditingRuleId(null);
      await loadRules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeRule = async (ruleId: string) => {
    setError('');
    try {
      await deleteScoringRule(offeringId, moduleId, ruleId);
      await loadRules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const inp: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 7, width: '100%', boxSizing: 'border-box',
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'white',
    border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none',
  };
  const miniBtn: React.CSSProperties = {
    fontSize: 12, padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
    background: 'transparent', color: C.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
  };
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '8px 10px', background: C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderRadius: 8, marginBottom: 6,
  };

  return (
    <div style={{ marginTop: 10 }}>
      {error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</p>}

      {/* Preguntas */}
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '10px 0 6px' }}>
        Preguntas
      </p>
      {loadingQuestions ? (
        <p style={{ fontSize: 12, color: C.muted }}>Cargando...</p>
      ) : (
        questions.map((q) => (
          <div key={q.id} style={row}>
            {editingQuestionId === q.id ? (
              <>
                <input style={{ ...inp, flex: 1 }} value={editingQuestionText} onChange={(e) => setEditingQuestionText(e.target.value)} />
                <button onClick={() => saveQuestionText(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, display: 'flex' }}><Check size={16} /></button>
                <button onClick={() => setEditingQuestionId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}><XIcon size={16} /></button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}>
                  {q.text} <span style={{ color: C.muted, fontSize: 11 }}>({QUESTION_TYPE_LABEL[q.type]}{q.options.length > 0 ? `, ${q.options.length} opciones` : ''})</span>
                </span>
                <button onClick={() => { setEditingQuestionId(q.id); setEditingQuestionText(q.text); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, display: 'flex' }}><Pencil size={14} /></button>
                <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))
      )}

      {addingQuestion ? (
        <div style={{ padding: 10, background: C.accentLight, borderRadius: 10, marginTop: 6 }}>
          <input style={{ ...inp, marginBottom: 6 }} placeholder="Texto de la pregunta" value={qText} onChange={(e) => setQText(e.target.value)} />
          <select style={{ ...inp, marginBottom: 6 }} value={qType} onChange={(e) => setQType(e.target.value as QuestionType)}>
            <option value="FREE_TEXT">Texto libre</option>
            <option value="SINGLE_CHOICE">Opcion unica</option>
            <option value="MULTIPLE_CHOICE">Opcion multiple</option>
          </select>
          {qType !== 'FREE_TEXT' && (
            <div style={{ marginBottom: 6 }}>
              {qOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <input
                    style={{ ...inp, flex: 2 }}
                    placeholder={`Opcion ${i + 1}`}
                    value={opt.label}
                    onChange={(e) => setQOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, label: e.target.value } : o))}
                  />
                  <input
                    style={{ ...inp, flex: 1 }}
                    type="number"
                    placeholder="Valor"
                    value={opt.value}
                    onChange={(e) => setQOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, value: e.target.value } : o))}
                  />
                  {qOptions.length > 2 && (
                    <button onClick={() => setQOptions((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button style={miniBtn} onClick={() => setQOptions((prev) => [...prev, { label: '', value: '' }])}>
                <Plus size={12} /> Opcion
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...miniBtn, background: C.accent, color: '#fff', borderColor: C.accent }} onClick={submitQuestion}>Guardar pregunta</button>
            <button style={miniBtn} onClick={resetQuestionForm}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button style={miniBtn} onClick={() => setAddingQuestion(true)}><Plus size={12} /> Pregunta</button>
      )}

      {/* Reglas de puntaje */}
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '16px 0 6px' }}>
        Reglas de puntaje
      </p>
      {loadingRules ? (
        <p style={{ fontSize: 12, color: C.muted }}>Cargando...</p>
      ) : (
        rules.map((r) => (
          <div key={r.id} style={row}>
            {editingRuleId === r.id ? (
              <>
                <input style={{ ...inp, width: 50 }} type="number" value={editRMin} onChange={(e) => setEditRMin(e.target.value)} />
                <span style={{ color: C.muted }}>-</span>
                <input style={{ ...inp, width: 50 }} type="number" value={editRMax} onChange={(e) => setEditRMax(e.target.value)} />
                <input style={{ ...inp, flex: 1 }} value={editRMessage} onChange={(e) => setEditRMessage(e.target.value)} />
                <button onClick={() => saveRule(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, display: 'flex' }}><Check size={16} /></button>
                <button onClick={() => setEditingRuleId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}><XIcon size={16} /></button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}>
                  <strong>{r.minScore}-{r.maxScore}</strong> &rarr; {r.message}
                </span>
                <button onClick={() => startEditRule(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, display: 'flex' }}><Pencil size={14} /></button>
                <button onClick={() => removeRule(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))
      )}

      {addingRule ? (
        <div style={{ padding: 10, background: C.accentLight, borderRadius: 10, marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input style={{ ...inp, flex: 1 }} type="number" placeholder="Min" value={rMin} onChange={(e) => setRMin(e.target.value)} />
            <input style={{ ...inp, flex: 1 }} type="number" placeholder="Max" value={rMax} onChange={(e) => setRMax(e.target.value)} />
          </div>
          <input style={{ ...inp, marginBottom: 6 }} placeholder="Mensaje de resultado" value={rMessage} onChange={(e) => setRMessage(e.target.value)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...miniBtn, background: C.accent, color: '#fff', borderColor: C.accent }} onClick={submitRule}>Guardar regla</button>
            <button style={miniBtn} onClick={resetRuleForm}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button style={miniBtn} onClick={() => setAddingRule(true)}><Plus size={12} /> Regla</button>
      )}
    </div>
  );
}
