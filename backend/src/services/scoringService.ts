// Funcion pura, sin acceso a base de datos: recibe las respuestas ya guardadas (o a punto
// de guardarse), un mapa de valor numerico por cada QuestionOption, y las ScoringRule del
// modulo, y devuelve el puntaje total + el mensaje que corresponde. Las preguntas de texto
// libre (FREE_TEXT) no tienen valueOptionIds, asi que no suman nada -- un cuestionario
// compuesto solo de esas siempre da totalScore: 0, y como ya se decidio en el diseno, eso
// no es un error: simplemente no hay nada que puntuar.
const FALLBACK_MESSAGE = 'Gracias por completar el cuestionario.';

// Estructural: una fila real de Answer (de Prisma) ya cumple esta forma -- se le puede
// pasar directo, sin mapear campo por campo, a cualquiera de los tres llamadores de abajo.
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

// Los tres llamadores de esta fase (GET /:accessToken leyendo respuestas ya guardadas,
// POST .../answers justo despues de guardarlas, y GET .../result.pdf) comparten esta misma
// funcion para no duplicar la logica de puntaje en ningun lado.
//
// - answers: cualquier lista con valueOptionIds por elemento (filas de Answer sirven tal cual).
// - optionValues: id de QuestionOption -> su value numerico. Un id que no este en el mapa
//   suma 0 (no es un error -- asi es como las preguntas FREE_TEXT, que no tienen opciones,
//   terminan sin aportar nada al puntaje).
// - scoringRules: se usa la PRIMERA regla cuyo rango [minScore, maxScore] (ambos inclusive)
//   contenga el puntaje total; si ninguna coincide, se usa FALLBACK_MESSAGE.
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
