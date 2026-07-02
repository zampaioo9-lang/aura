import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

async function verifyClientOwnership(clientId: string, userId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new AppError(404, 'Paciente no encontrado');
  if (client.userId !== userId) throw new AppError(403, 'No autorizado');
  return client;
}

const PLACEHOLDER = '[PACIENTE]';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Nombre completo primero (más largo) para no dejar fragmentos sueltos del
// nombre completo tras reemplazar solo una parte.
function buildNameVariants(fullName: string): string[] {
  const trimmed = fullName.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\s+/).filter(p => p.length >= 3);
  return [trimmed, ...parts].sort((a, b) => b.length - a.length);
}

function anonymizeName(text: string, fullName: string): string {
  let result = text;
  for (const variant of buildNameVariants(fullName)) {
    const pattern = new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'gi');
    result = result.replace(pattern, PLACEHOLDER);
  }
  return result;
}

// Se reinserta solo el primer nombre (no el nombre completo) porque así es
// como los terapeutas suelen referirse al paciente en el texto narrativo.
// Convierte listas/objetos a texto legible. El frontend renderiza estos
// campos en <textarea> planos — si Claude regresa una lista o un objeto en
// vez de un string, se veía literalmente "[object Object]" en la nota.
function stringifyField(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map(stringifyField).join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${stringifyField(v)}`)
      .join('\n');
  }
  return String(value);
}

function deanonymizeValue(value: unknown, fullName: string): unknown {
  const firstName = fullName.trim().split(/\s+/)[0] ?? fullName;
  if (typeof value === 'string') {
    return value.split(PLACEHOLDER).join(firstName);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deanonymizeValue(v, fullName);
    }
    return out;
  }
  return value;
}

const TBCS_BASE = `
PRINCIPIOS DEL MODELO QUE DEBES APLICAR:
- Escribe siempre desde el paradigma de los recursos, NO del déficit. Nunca uses lenguaje de síntomas, patología o disfunción.
- Usa las palabras del cliente cuando estén disponibles en la descripción. Prioriza citas textuales o paráfrasis cercanas a su voz.
- El cliente es el experto en su propia vida. El terapeuta acompaña, no diagnostica ni prescribe.
- Evita frases como "el paciente presenta", "se observa resistencia", "déficit de", "dificultad para". En su lugar usa "el cliente identifica", "reconoce", "describe", "expresa".
- Si la descripción no menciona algo explícitamente para un campo, infiere desde una lente de competencia y posibilidad — nunca desde una lente de problema.
- El tono debe ser clínico pero centrado en soluciones: preciso, sin ser frío; esperanzador, sin ser superficial.
`;

const NOTE_PROMPTS: Record<string, string> = {
  LIBRE: `Genera una nota de sesión clínica estructurada con estos campos:
- summary: Resumen narrativo de lo ocurrido en sesión
- topics: Temas principales trabajados
- observations: Observaciones clínicas del terapeuta
- nextPlan: Plan para la próxima sesión
- homework: Tareas asignadas al paciente`,

  SOAP: `Genera una nota clínica en formato SOAP con estos campos:
- summary (S - Subjetivo): Lo que reporta el paciente, síntomas, cómo se sintió
- observations (O - Objetivo): Observaciones clínicas del terapeuta
- topics (A - Assessment): Evaluación, análisis e interpretación clínica
- nextPlan (P - Plan): Intervenciones, tareas y próximos pasos
- homework: Tareas asignadas`,

  DIAMANTE: `${TBCS_BASE}
Genera una nota en formato Diamante TBCS (postura ADOPT) con estos campos:

- summary — MEJORES ESPERANZAS: El resultado deseado del cliente en sus propias palabras. ¿Qué espera que sea diferente? Escribe en primera persona del cliente cuando sea posible. No parafrasees como problema — reformula como esperanza.
  Ejemplo correcto: "Que pueda tomar decisiones sin quedarme paralizada."
  Ejemplo incorrecto: "El paciente refiere dificultades en la toma de decisiones."

- observations — RECURSOS PARA EL RESULTADO: Habilidades, fortalezas, excepciones y red de apoyo identificados en sesión. Incluye tanto lo que el cliente reporta de sí mismo como lo que el terapeuta observa. Nombra capacidades concretas, no rasgos genéricos.
  Ejemplo correcto: "Identifica que escribir sus pensamientos antes de actuar le ayuda a clarificarse. Cuenta con una pareja que escucha sin juzgar."
  Ejemplo incorrecto: "El paciente tiene buenas habilidades sociales."

- topics — HISTORIA DEL RESULTADO: Momentos pasados — esta semana o en su historia — donde el resultado deseado o algo cercano a él estuvo presente. Siempre responde implícitamente: ¿qué hizo el cliente para que eso fuera posible? El agente del cambio es el cliente.
  Ejemplo correcto: "Esta semana tomó una decisión laboral sin el ciclo habitual de rumiación. Lo logró escribiendo sus pros y contras la noche anterior."
  Ejemplo incorrecto: "Refiere mejoría en la semana."

- homework — FUTURO PREFERIDO: Cómo describe el cliente su vida cuando el resultado deseado esté plenamente presente. Usa lenguaje descriptivo y sensorial — qué notaría diferente, qué dirían otros, cómo se vería a sí mismo. Escribe en primera persona del cliente.
  Ejemplo correcto: "Me imagino tomando decisiones con calma, confiando en mi criterio. Cuando algo no me guste lo diré sin esperar semanas."
  Ejemplo incorrecto: "El paciente desea mejorar su toma de decisiones y reducir la ansiedad."

- nextPlan — ESCALA DE AVANCE: Infiere del contexto descrito en qué nivel percibe el cliente su avance (0–10) y genera los textos de las dos preguntas de escala. Devuelve un objeto JSON con este formato exacto: {"scale": número entre 0 y 10, "q1": "qué lo tiene en ese nivel y no en uno menor (en voz del cliente)", "q2": "cómo sabría que avanzó un nivel más (en voz del cliente)"}
  Ejemplo: {"scale": 6, "q1": "Que esta semana lo hice. Tomé esa decisión y no me paralicé.", "q2": "Cuando pueda tomar decisiones importantes sin necesitar escribirlo primero."}`,

  NECS: `${TBCS_BASE}
Genera una nota Centrada en Soluciones (NECS) — formato híbrido que combina el rigor documental del SOAP con la epistemología del Diamante TBCS. Con estos campos:

- summary — LA ESPERANZA QUE TRAJO HOY / MEJOR ESPERANZA: ¿Para qué vino el cliente a esta sesión específica? No el motivo de consulta general, sino el resultado deseado de la sesión de hoy. Escribe en primera persona del cliente, con sus palabras cuando sea posible. Reemplaza la queja por la esperanza.
  Ejemplo correcto: "Quiero salir de aquí sabiendo que esta semana no fue casualidad, que soy capaz."
  Ejemplo incorrecto: "El paciente acude por problemas de ansiedad."

- topics — MOMENTOS DE AVANCE / EXCEPCIONES: ¿Qué estuvo mejor desde la última sesión? ¿En qué momento el resultado deseado estuvo presente, aunque sea parcialmente? Siempre incluye qué hizo el cliente para que eso fuera posible — el agente del cambio es siempre el cliente, no la terapia ni el terapeuta. Si no hubo avances, registra qué fortalezas se mantuvieron aun en la dificultad.
  Ejemplo correcto: "Tomó una decisión laboral sin el ciclo de rumiación habitual. Lo atribuye a haberse dado tiempo para escribir sus pensamientos. 'Eso lo hice yo, no fue suerte.'"
  Ejemplo incorrecto: "Refiere que la semana estuvo mejor."

- observations — LO QUE NOTÉ EN SESIÓN: Observaciones clínicas desde una lente de recursos. Describe la presentación (afecto, lenguaje, postura, contacto) y los recursos observados: momentos de competencia, fortalezas visibles, capacidades relacionales. Evita describir solo lo que falta o lo que preocupa.
  Ejemplo correcto: "Llegó más erguida que en sesiones anteriores. Usa el humor al referirse a sus patrones previos — señal de distancia saludable del problema."
  Ejemplo incorrecto: "Se observa ansiedad leve y dificultad para el contacto visual."

- homework — CÓMO SE VE EL CAMBIO / FUTURO PREFERIDO: Cómo describió el cliente su vida cuando el resultado deseado esté presente. Lenguaje descriptivo, concreto y sensorial. Primera persona del cliente. No tareas prescritas por el terapeuta — la autonomía del cliente se preserva.
  Ejemplo correcto: "Me veo llegando a las reuniones sin ese nudo en el estómago. Pudiendo decir lo que pienso sin ensayarlo tres veces."
  Ejemplo incorrecto: "Se le indicó practicar técnicas de respiración y registrar pensamientos automáticos."

- nextPlan — ESCALA DE AVANCE: Infiere del contexto descrito en qué nivel percibe el cliente su avance (0–10) y genera los textos de las dos preguntas de escala. Devuelve un objeto JSON con este formato exacto: {"scale": número entre 0 y 10, "q1": "qué lo tiene en ese nivel y no en uno menor (en voz del cliente)", "q2": "cómo sabría que avanzó un nivel más (en voz del cliente)"}
  Ejemplo: {"scale": 5, "q1": "Que el martes me quedé a hablar en vez de encerrarme. Eso antes no pasaba.", "q2": "Cuando pueda escuchar su punto de vista sin sentir que estoy perdiendo algo."}`,
};

router.post('/generate', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { description, noteType = 'LIBRE', clientId } = req.body;
    if (!description?.trim()) throw new AppError(400, 'La descripción es requerida');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AppError(500, 'ANTHROPIC_API_KEY no configurada');

    // Si viene clientId, sustituimos el nombre real del paciente por un
    // placeholder antes de mandar el texto a la API de IA, y lo reinsertamos
    // en la respuesta generada. Así el texto clínico completo se sigue
    // enviando (misma calidad de nota), pero sin datos identificables.
    let patientName: string | null = null;
    let anonymizedDescription = description;
    if (clientId) {
      const clientRecord = await verifyClientOwnership(clientId, req.userId!);
      patientName = clientRecord.name;
      anonymizedDescription = anonymizeName(description, patientName);
    }

    const client = new Anthropic({ apiKey });
    const prompt = NOTE_PROMPTS[noteType] ?? NOTE_PROMPTS.LIBRE;

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1800,
      messages: [{
        role: 'user',
        content: `Eres un asistente clínico experto. Basándote en la siguiente descripción de sesión, genera una nota clínica estructurada en español.

${prompt}

Responde ÚNICAMENTE con un objeto JSON válido con esos campos. Sin texto adicional, sin markdown, solo el JSON. Cada campo de texto (summary, topics, observations, homework) debe ser un string de texto narrativo — nunca una lista ni un objeto anidado. La excepción es nextPlan en formato Diamante/NECS, que sí debe ser el objeto {scale, q1, q2} indicado arriba.

Descripción de la sesión:
${anonymizedDescription}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new AppError(500, 'La IA no devolvió un JSON válido');

    let generated = JSON.parse(jsonMatch[0]);
    if (patientName) {
      generated = deanonymizeValue(generated, patientName);
    }

    // El frontend renderiza summary/topics/observations/homework como texto
    // plano siempre. nextPlan es texto plano salvo en Diamante/NECS, donde
    // el frontend espera el objeto {scale, q1, q2} tal cual.
    for (const field of ['summary', 'topics', 'observations', 'homework']) {
      if (field in generated) generated[field] = stringifyField(generated[field]);
    }
    if (noteType !== 'DIAMANTE' && noteType !== 'NECS' && 'nextPlan' in generated) {
      generated.nextPlan = stringifyField(generated.nextPlan);
    }

    res.json(generated);
  } catch (err) {
    next(err);
  }
});

export default router;
