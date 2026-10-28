// Funcion pura, sin acceso a base de datos: recibe las respuestas ya guardadas (o a punto
// de guardarse), un mapa de valor numerico por cada QuestionOption, y las ScoringRule del
// modulo, y devuelve el puntaje total + el mensaje que corresponde. Las preguntas de texto
// libre (FREE_TEXT) no tienen valueOptionIds, asi que no suman nada -- un cuestionario
// compuesto solo de esas siempre da totalScore: 0, y como ya se decidio en el diseno, eso
// no es un error: simplemente no hay nada que puntuar.
const FALLBACK_MESSAGE = 'Gracias por completar el cuestionario.';

export interface ScoredAnswer {
  valueOptionIds: string[];
}

export interface ScoringRuleInput {
  minScore: number;
  maxScore: number;
  message: string;
}

export interface ScoreResult {
  totalScore: number;
  message: string;
}

export function calculateScore(
  answers: ScoredAnswer[],
  optionValues: Map<string, number>,
  scoringRules: ScoringRuleInput[],
): ScoreResult {
  let totalScore = 0;
  for (const answer of answers) {
    for (const optionId of answer.valueOptionIds) {
      totalScore += optionValues.get(optionId) ?? 0;
    }
  }

  // Si ningun rango coincide (hueco entre reglas, decision ya tomada en el diseno de esta
  // fase), se usa el mensaje generico de respaldo en vez de fallar.
  const matchingRule = scoringRules.find(
    (rule) => totalScore >= rule.minScore && totalScore <= rule.maxScore,
  );

  return { totalScore, message: matchingRule?.message ?? FALLBACK_MESSAGE };
}
