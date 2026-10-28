# Fase 4: Página de acceso del comprador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Con su `accessToken`, un comprador entra a `/mi-compra/:accessToken` (sin login), ve los módulos de su Offering, responde el cuestionario una sola vez, y descarga un PDF con su puntaje y resultado.

**Architecture:** Nuevo archivo `backend/src/routes/access.ts` (rutas públicas basadas en `accessToken`, sin auth) + dos servicios nuevos (`scoringService.ts` para calcular el puntaje, `pdfService.ts` para generar el PDF con `pdfkit`). Se modifican las rutas públicas de `offerings.ts` para dejar de filtrar contenido pagado a quien no compró (cierre de un TODO de Fase 1). Frontend: una página nueva que reutiliza los patrones visuales ya establecidos en `OfferingPublic.tsx`.

**Tech Stack:** Express + Prisma + Zod + `pdfkit` (nuevo). Frontend: React + react-router-dom + axios (`src/api/client.ts`), Tailwind.

---

## Task 0: Preparar el worktree

**Files:** ninguno (solo comandos).

- [ ] **Step 1: Verificar que `.worktrees/` este en `.gitignore`**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax"
git check-ignore -q .worktrees && echo "IGNORED" || echo "NOT IGNORED"
```
Expected: `IGNORED`.

- [ ] **Step 2: Crear el worktree y la rama**

```bash
git worktree add .worktrees/talleres-fase4-acceso-comprador -b feature/talleres-fase4-acceso-comprador master
```

- [ ] **Step 3: Copiar los `.env`**

```bash
cp "C:\Users\zampa\Mis Proyectos\Aliax\backend\.env" "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend\.env"
cp "C:\Users\zampa\Mis Proyectos\Aliax\frontend\.env" "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\frontend\.env" 2>/dev/null || true
```

- [ ] **Step 4: Instalar dependencias**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npm install
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\frontend" && npm install
```

- [ ] **Step 5: Verificar que compila limpio antes de tocar nada**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```
Expected: sin output.

Todos los paths de las tareas siguientes son relativos a `C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\`.

---

## Task 1: Instalar `pdfkit`

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Instalar la libreria y sus tipos**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend"
npm install pdfkit@^0.20.2
npm install --save-dev @types/pdfkit@^0.17.7
```
Expected: `package.json` gana `"pdfkit": "^0.20.2"` en `dependencies` y `"@types/pdfkit": "^0.17.7"` en `devDependencies`.

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add pdfkit for generating questionnaire result PDFs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Validacion Zod para el envio de respuestas

**Files:**
- Modify: `backend/src/utils/validation.ts`

- [ ] **Step 1: Agregar `submitAnswersSchema` al final del archivo**

```typescript
export const submitAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid('questionId invalido'),
    valueText: z.string().max(2000, 'Maximo 2000 caracteres').optional(),
    valueOptionIds: z.array(z.string().uuid('id de opcion invalido')).optional(),
  })).min(1, 'Debes responder al menos una pregunta'),
});
```

Nota: esta validacion solo cubre la FORMA generica del payload. La validacion especifica por tipo de pregunta (FREE_TEXT requiere `valueText`, SINGLE_CHOICE exactamente una opcion, etc.) no se puede hacer aqui porque depende de datos en la base de datos (el `type` de cada `Question`) -- esa parte se valida en la ruta misma (Task 6), siguiendo el mismo patron que ya usa este backend para invariantes que dependen del estado existente (ver `offerings.ts`, los chequeos de `existing.type` en los `PUT`).

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/validation.ts
git commit -m "feat: add submitAnswersSchema for questionnaire answer submission

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `scoringService.ts` — calculo de puntaje

**Files:**
- Create: `backend/src/services/scoringService.ts`

- [ ] **Step 1: Crear el archivo completo**

```typescript
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
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/services/scoringService.ts
git commit -m "feat: add scoringService with pure score calculation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `pdfService.ts` — generacion del PDF de resultado

**Files:**
- Create: `backend/src/services/pdfService.ts`

- [ ] **Step 1: Crear el archivo completo**

```typescript
import PDFDocument from 'pdfkit';

export interface ResultPdfParams {
  offeringTitle: string;
  buyerName: string;
  totalScore: number;
  message: string;
}

// Genera un PDF de una sola pagina con el resultado del cuestionario, en memoria (nunca se
// escribe a disco). pdfkit se eligio sobre un enfoque basado en navegador headless
// (Puppeteer) porque este backend corre en funciones serverless de Vercel, donde un
// Chromium headless necesita un binario especial (@sparticuz/chromium) y arranca mucho mas
// lento -- para un documento de una pagina sin diseno elaborado, pdfkit es mas simple y
// liviano.
export function generateResultPdf(params: ResultPdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(params.offeringTitle, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Resultado de ${params.buyerName}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(18).text(`Puntaje: ${params.totalScore}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(params.message, { align: 'center' });

    doc.end();
  });
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/services/pdfService.ts
git commit -m "feat: add pdfService generating a one-page result PDF with pdfkit

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `access.ts` — `GET /:accessToken`

**Files:**
- Create: `backend/src/routes/access.ts`

- [ ] **Step 1: Crear el archivo con el helper compartido y la ruta de lectura**

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { calculateScore } from '../services/scoringService';

const router = Router();
const prisma = new PrismaClient();

// Helper compartido por las tres rutas de este archivo: el accessToken es la UNICA
// credencial del comprador (sin login) -- quien lo tenga, tiene acceso a esta compra.
async function getPurchaseOrThrow(accessToken: string) {
  const purchase = await prisma.purchase.findUnique({ where: { accessToken } });
  if (!purchase) throw new AppError(404, 'Acceso no encontrado');
  return purchase;
}

// Helper compartido: calcula el puntaje+mensaje para un conjunto de respuestas de un
// modulo, consultando sus ScoringRule y el valor de cada QuestionOption. Usado tanto para
// mostrar el resultado de un cuestionario ya respondido (GET /:accessToken) como para
// calcularlo justo despues de guardar las respuestas (Task 6) y para el PDF (Task 7) --
// unico lugar que sabe como ir de "respuestas guardadas" a "puntaje y mensaje".
async function computeResultForModule(moduleId: string, answers: Array<{ valueOptionIds: string[] }>) {
  const [scoringRules, optionRows] = await Promise.all([
    prisma.scoringRule.findMany({ where: { moduleId } }),
    prisma.questionOption.findMany({ where: { question: { moduleId } } }),
  ]);
  const optionValues = new Map(optionRows.map((o) => [o.id, o.value]));
  return calculateScore(answers, optionValues, scoringRules);
}

// GET /api/access/:accessToken -- sin auth, el accessToken es la credencial.
router.get('/:accessToken', async (req, res, next) => {
  try {
    const purchase = await getPurchaseOrThrow(req.params.accessToken);

    const offering = await prisma.offering.findUnique({
      where: { id: purchase.offeringId },
      include: { modules: { orderBy: { order: 'asc' } } },
    });
    if (!offering) throw new AppError(404, 'Acceso no encontrado');

    const modules = await Promise.all(
      offering.modules.map(async (module) => {
        if (module.type !== 'QUESTIONNAIRE') {
          return module;
        }

        const existingAnswers = await prisma.answer.findMany({
          where: { purchaseId: purchase.id, question: { moduleId: module.id } },
        });

        if (existingAnswers.length > 0) {
          const result = await computeResultForModule(module.id, existingAnswers);
          return { ...module, result };
        }

        const questions = await prisma.question.findMany({
          where: { moduleId: module.id },
          orderBy: { order: 'asc' },
          include: { options: true },
        });
        return { ...module, questions };
      }),
    );

    res.json({
      buyerName: purchase.buyerName,
      offering: {
        id: offering.id,
        title: offering.title,
        description: offering.description,
        type: offering.type,
        scheduledAt: offering.scheduledAt,
        externalLink: offering.externalLink,
      },
      modules,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/access.ts
git commit -m "feat: add GET /api/access/:accessToken, buyer content without login

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `access.ts` — `POST /:accessToken/modules/:moduleId/answers`

**Files:**
- Modify: `backend/src/routes/access.ts`

- [ ] **Step 1: Agregar el import de `submitAnswersSchema` al inicio del archivo**

Buscar la linea `import { calculateScore } from '../services/scoringService';` y agregar justo despues:
```typescript
import { submitAnswersSchema } from '../utils/validation';
```

- [ ] **Step 2: Agregar la ruta, antes de `export default router;`**

```typescript
// POST /api/access/:accessToken/modules/:moduleId/answers -- sin auth. El cuestionario se
// responde una sola vez (decision de diseno); un segundo intento se rechaza con 400.
//
// LIMITE CONOCIDO Y ACEPTADO: el chequeo de "ya respondiste" (existingCount > 0) y el
// prisma.answer.createMany de abajo son dos operaciones separadas, no una transaccion --
// dos envios casi simultaneos del mismo comprador podrian ambos pasar el chequeo y crear
// respuestas duplicadas para las mismas preguntas, inflando el puntaje calculado despues.
// Mismo tipo de condicion de carrera ya aceptada en otras partes de este proyecto (ver
// purchases.ts, el chequeo de capacity); cerrarla del todo requeriria una restriccion unica
// a nivel de base de datos (purchaseId, questionId), que el spec de esta fase decidio no
// agregar (sin cambios de schema). Bajo riesgo real: requiere que el mismo comprador
// envie el formulario dos veces en una ventana de milisegundos.
router.post('/:accessToken/modules/:moduleId/answers', async (req, res, next) => {
  try {
    const purchase = await getPurchaseOrThrow(req.params.accessToken);

    const module = await prisma.module.findFirst({
      where: { id: req.params.moduleId, offeringId: purchase.offeringId },
    });
    if (!module) throw new AppError(404, 'Modulo no encontrado');
    if (module.type !== 'QUESTIONNAIRE') {
      throw new AppError(400, 'Este modulo no es un cuestionario');
    }

    const existingCount = await prisma.answer.count({
      where: { purchaseId: purchase.id, question: { moduleId: module.id } },
    });
    if (existingCount > 0) {
      throw new AppError(400, 'Ya respondiste este cuestionario');
    }

    const data = submitAnswersSchema.parse(req.body);

    const questions = await prisma.question.findMany({
      where: { moduleId: module.id },
      include: { options: true },
    });
    if (questions.length === 0) throw new AppError(400, 'Este cuestionario no tiene preguntas');

    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const answeredIds = new Set(data.answers.map((a) => a.questionId));

    if (answeredIds.size !== data.answers.length) {
      throw new AppError(400, 'Hay respuestas duplicadas para la misma pregunta');
    }
    if (answeredIds.size !== questions.length || questions.some((q) => !answeredIds.has(q.id))) {
      throw new AppError(400, 'Debes responder todas las preguntas del cuestionario');
    }

    for (const answer of data.answers) {
      const question = questionsById.get(answer.questionId)!;

      if (question.type === 'FREE_TEXT') {
        if (!answer.valueText || answer.valueText.trim().length === 0) {
          throw new AppError(400, `La pregunta "${question.text}" requiere una respuesta de texto`);
        }
        if (answer.valueOptionIds && answer.valueOptionIds.length > 0) {
          throw new AppError(400, `La pregunta "${question.text}" no acepta opciones`);
        }
      } else {
        const validOptionIds = new Set(question.options.map((o) => o.id));
        const selected = answer.valueOptionIds ?? [];
        if (selected.length === 0) {
          throw new AppError(400, `La pregunta "${question.text}" requiere al menos una opcion`);
        }
        if (question.type === 'SINGLE_CHOICE' && selected.length > 1) {
          throw new AppError(400, `La pregunta "${question.text}" acepta solo una opcion`);
        }
        if (selected.some((id) => !validOptionIds.has(id))) {
          throw new AppError(400, `La pregunta "${question.text}" tiene una opcion invalida`);
        }
        if (answer.valueText) {
          throw new AppError(400, `La pregunta "${question.text}" no acepta texto libre`);
        }
      }
    }

    await prisma.answer.createMany({
      data: data.answers.map((a) => ({
        purchaseId: purchase.id,
        questionId: a.questionId,
        valueText: a.valueText || null,
        valueOptionIds: a.valueOptionIds ?? [],
      })),
    });

    const result = await computeResultForModule(
      module.id,
      data.answers.map((a) => ({ valueOptionIds: a.valueOptionIds ?? [] })),
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/access.ts
git commit -m "feat: add POST .../answers, one-time questionnaire submission + scoring

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `access.ts` — `GET /:accessToken/modules/:moduleId/result.pdf`

**Files:**
- Modify: `backend/src/routes/access.ts`

- [ ] **Step 1: Agregar el import de `generateResultPdf` al inicio del archivo**

Buscar la linea `import { submitAnswersSchema } from '../utils/validation';` y agregar justo despues:
```typescript
import { generateResultPdf } from '../services/pdfService';
```

- [ ] **Step 2: Agregar la ruta, antes de `export default router;`**

```typescript
// GET /api/access/:accessToken/modules/:moduleId/result.pdf -- sin auth. Solo funciona si
// ya se respondio el cuestionario (404 si no). El PDF se genera al vuelo en cada peticion,
// no se guarda ningun archivo.
router.get('/:accessToken/modules/:moduleId/result.pdf', async (req, res, next) => {
  try {
    const purchase = await getPurchaseOrThrow(req.params.accessToken);

    const module = await prisma.module.findFirst({
      where: { id: req.params.moduleId, offeringId: purchase.offeringId },
      include: { offering: { select: { title: true } } },
    });
    if (!module) throw new AppError(404, 'Modulo no encontrado');

    const answers = await prisma.answer.findMany({
      where: { purchaseId: purchase.id, question: { moduleId: module.id } },
    });
    if (answers.length === 0) throw new AppError(404, 'Todavia no respondiste este cuestionario');

    const { totalScore, message } = await computeResultForModule(module.id, answers);

    const pdfBuffer = await generateResultPdf({
      offeringTitle: module.offering.title,
      buyerName: purchase.buyerName,
      totalScore,
      message,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resultado.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/access.ts
git commit -m "feat: add GET .../result.pdf, on-the-fly questionnaire result PDF

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Montar el router nuevo

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/api/index.ts`

- [ ] **Step 1: `backend/src/index.ts`**

Buscar la linea `import purchaseRoutes from './routes/purchases';` y agregar justo despues:
```typescript
import accessRoutes from './routes/access';
```

Buscar la linea `app.use('/api/purchases', purchaseRoutes);` y agregar justo despues:
```typescript
app.use('/api/access', accessRoutes);
```

- [ ] **Step 2: `backend/api/index.ts`**

Buscar la linea `const purchaseRoutes = require('../src/routes/purchases').default;` y agregar justo despues:
```typescript
  const accessRoutes = require('../src/routes/access').default;
```

Buscar la linea `app.use('/api/purchases', purchaseRoutes);` y agregar justo despues:
```typescript
  app.use('/api/access', accessRoutes);
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/index.ts api/index.ts
git commit -m "feat: mount access router

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Cerrar el TODO de Fase 1 — filtrar contenido pagado en las rutas publicas

**Files:**
- Modify: `backend/src/routes/offerings.ts`

- [ ] **Step 1: `GET /:id` — calcular `isOwner` siempre, no solo cuando no esta publicado**

En `backend/src/routes/offerings.ts`, dentro de `router.get('/:id', ...)`, hay este bloque exacto:

```typescript
    const authHeader = req.headers.authorization;
    let isOwner = false;
    if (authHeader?.startsWith('Bearer ') && offering.status !== 'PUBLISHED') {
      const payload = verifyToken(authHeader.slice(7));
      isOwner = !!payload && payload.userId === offering.profile.userId;
    }

    if (offering.status !== 'PUBLISHED' && !isOwner) {
      throw new AppError(404, 'Oferta no encontrada');
    }

    // Do not leak the internal profile.userId to the client; it's only needed
    // above for the isOwner check.
    const { userId, ...publicProfile } = offering.profile;
    res.json({ ...offering, profile: publicProfile });
```

Reemplazarlo por este (el unico cambio real es quitar `&& offering.status !== 'PUBLISHED'` de la condicion del primer `if`, para que `isOwner` se calcule siempre que venga un token -- antes solo se calculaba para ofertas no publicadas, porque antes de esta fase no hacia falta saberlo para una oferta ya publicada; ahora SI hace falta, para decidir si se filtra el contenido de los modulos. El resto es nuevo: filtrar `textContent`/`fileUrl` cuando no es el dueno):

```typescript
    const authHeader = req.headers.authorization;
    let isOwner = false;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      isOwner = !!payload && payload.userId === offering.profile.userId;
    }

    if (offering.status !== 'PUBLISHED' && !isOwner) {
      throw new AppError(404, 'Oferta no encontrada');
    }

    // Cierra el TODO de Fase 1: ahora que Purchase existe y se usa de verdad (Fase 3/4),
    // quien no es el dueno del Offering ya no ve el contenido completo de los modulos --
    // solo lo esencial para decidir si comprar (titulo, descripcion, tipo, orden). El
    // contenido real se sirve unicamente por accessToken (ver access.ts, Fase 4).
    const sanitizedModules = isOwner
      ? offering.modules
      : offering.modules.map(({ textContent, fileUrl, ...rest }) => rest);

    // Do not leak the internal profile.userId to the client; it's only needed
    // above for the isOwner check.
    const { userId, ...publicProfile } = offering.profile;
    res.json({ ...offering, modules: sanitizedModules, profile: publicProfile });
```

- [ ] **Step 2: `GET /:offeringId/modules` — agregar el mismo filtrado**

En el mismo archivo, hay este bloque exacto:

```typescript
router.get('/:offeringId/modules', async (req, res, next) => {
  try {
    const offering = await prisma.offering.findUnique({ where: { id: req.params.offeringId } });
    if (!offering) throw new AppError(404, 'Oferta no encontrada');
    if (offering.status !== 'PUBLISHED') throw new AppError(404, 'Oferta no encontrada');

    const modules = await prisma.module.findMany({
      where: { offeringId: req.params.offeringId },
      orderBy: { order: 'asc' },
    });
    res.json(modules);
  } catch (err) {
    next(err);
  }
});
```

Reemplazarlo por este:

```typescript
router.get('/:offeringId/modules', async (req, res, next) => {
  try {
    const offering = await prisma.offering.findUnique({
      where: { id: req.params.offeringId },
      include: { profile: { select: { userId: true } } },
    });
    if (!offering) throw new AppError(404, 'Oferta no encontrada');
    if (offering.status !== 'PUBLISHED') throw new AppError(404, 'Oferta no encontrada');

    const authHeader = req.headers.authorization;
    let isOwner = false;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      isOwner = !!payload && payload.userId === offering.profile.userId;
    }

    const modules = await prisma.module.findMany({
      where: { offeringId: req.params.offeringId },
      orderBy: { order: 'asc' },
    });

    // Mismo cierre del TODO de Fase 1 que GET /:id (ver arriba).
    const sanitizedModules = isOwner
      ? modules
      : modules.map(({ textContent, fileUrl, ...rest }) => rest);

    res.json(sanitizedModules);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Quitar los dos comentarios TODO que esta tarea cierra**

Buscar y eliminar estas dos lineas de comentario (ya no aplican, el gap que describian queda cerrado):

```typescript
// TODO(Fase 3/4 — checkout y gating de acceso): esta ruta publica devuelve el contenido
// completo de los modulos (fileUrl, textContent) sin verificar ninguna Purchase. Es el
// alcance esperado de esta fase (no hay checkout todavia), pero en cuanto exista Purchase,
// hay que dejar de incluir fileUrl/textContent aqui para quien no haya comprado.
```
(justo antes de `router.get('/:id', ...)`) y:

```typescript
// TODO(Fase 3/4 — checkout y gating de acceso): mismo pendiente que GET /:id — esta ruta
// sirve fileUrl/textContent completos sin verificar Purchase. Alcance esperado de esta fase.
```
(justo antes de `router.get('/:offeringId/modules', ...)`).

- [ ] **Step 4: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/offerings.ts
git commit -m "fix: stop serving module content to non-owners on public Offering routes

Closes the TODO left open since Fase 1: now that Purchase actually
gates paid content (Fase 3/4), GET /:id and GET /:offeringId/modules
strip textContent/fileUrl for anyone who isn't the Offering's owner.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Frontend — página de acceso del comprador

**Files:**
- Create: `frontend/src/pages/AccessPurchase.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Crear la pagina**

```tsx
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
```

- [ ] **Step 2: Registrar la ruta en `App.tsx`**

Agregar el lazy import junto a los demas:
```typescript
const AccessPurchase = lazy(() => import('./pages/AccessPurchase'));
```

Buscar la linea `<Route path="/oferta/:offeringId/paypal-retorno" element={<OfferingPayPalReturn />} />` (la ultima de las rutas de Fase 3, justo antes del catch-all `<Route path="/:slug" ...>`) y agregar justo despues, **antes** de esa linea del catch-all:
```tsx
<Route path="/mi-compra/:accessToken" element={<AccessPurchase />} />
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\frontend" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/AccessPurchase.tsx src/App.tsx
git commit -m "feat: add buyer access page at /mi-compra/:accessToken

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Verificacion empirica

No hay suite de tests en este backend. Verificacion contra el dev server local + datos de prueba desechables (un `Purchase` creado directo via Prisma, sin pasar por checkout real -- Fase 3 ya quedo verificada por separado).

- [ ] **Step 1: Levantar el dev server en un puerto libre**

Primero confirmar que el puerto elegido (4531) esta libre -- este proyecto ha tenido procesos Node huerfanos de sesiones anteriores ocupando puertos, y reusar uno ya ocupado por otra cosa daria una falsa confianza (el chequeo de salud pasaria contra un servidor que no es el tuyo):

```bash
netstat -ano | grep ":4531"
```
Expected: sin output (puerto libre). Si muestra algo, elegir otro puerto libre (ej. 4532) y usarlo en todos los comandos de esta tarea en vez de 4531.

Con el puerto confirmado libre, levantar el servidor:

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase4-acceso-comprador\backend"
PORT=4531 npm run dev > /tmp/fase4-dev.log 2>&1 &
disown
sleep 6
curl -s -o /dev/null -w "health: %{http_code}\n" http://localhost:4531/api/health
```
Expected: `health: 200`.

- [ ] **Step 2: Crear datos de prueba desechables (profesional + Offering + modulos + Purchase) directo via Prisma**

Guardar como `backend/setup-fase4-test-data.tmp.ts` y correr con `npx tsx setup-fase4-test-data.tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now().toString(36);
  const user = await prisma.user.create({
    data: { email: `test-fase4-${suffix}@example.com`, password: 'x', name: 'Test Fase 4', plan: 'PRO' },
  });
  const profile = await prisma.profile.create({
    data: { userId: user.id, slug: `test-fase4-${suffix}`, title: 'Test Fase 4 Profile', profession: 'Psicologo' },
  });
  const offering = await prisma.offering.create({
    data: {
      profileId: profile.id,
      type: 'RECORDED_COURSE',
      title: 'Curso de prueba Fase 4',
      priceUSD: 10,
      status: 'PUBLISHED',
    },
  });

  const textModule = await prisma.module.create({
    data: { offeringId: offering.id, order: 1, title: 'Introduccion', type: 'TEXT', textContent: 'Contenido de prueba' },
  });

  const quizModule = await prisma.module.create({
    data: { offeringId: offering.id, order: 2, title: 'Cuestionario', type: 'QUESTIONNAIRE' },
  });

  const question = await prisma.question.create({
    data: {
      moduleId: quizModule.id,
      order: 1,
      text: 'Que tan de acuerdo estas?',
      type: 'SINGLE_CHOICE',
      options: { create: [{ label: 'Poco', value: 1 }, { label: 'Mucho', value: 10 }] },
    },
    include: { options: true },
  });

  await prisma.scoringRule.create({
    data: { moduleId: quizModule.id, minScore: 0, maxScore: 5, message: 'Resultado bajo' },
  });
  await prisma.scoringRule.create({
    data: { moduleId: quizModule.id, minScore: 6, maxScore: 10, message: 'Resultado alto' },
  });

  const purchase = await prisma.purchase.create({
    data: {
      offeringId: offering.id,
      buyerName: 'Comprador Prueba',
      buyerEmail: 'comprador-prueba@example.com',
      accessToken: `test-access-${suffix}`,
      paidAt: new Date(),
      amountPaid: 10,
      currency: 'USD',
      providerRef: `test-ref-${suffix}`,
    },
  });

  console.log(JSON.stringify({
    offeringId: offering.id,
    textModuleId: textModule.id,
    quizModuleId: quizModule.id,
    questionId: question.id,
    optionLowId: question.options.find((o) => o.label === 'Poco')!.id,
    optionHighId: question.options.find((o) => o.label === 'Mucho')!.id,
    accessToken: purchase.accessToken,
    profileId: profile.id,
    userId: user.id,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Probar `GET /:accessToken` antes de responder el cuestionario**

```bash
curl -s http://localhost:4531/api/access/<accessToken del Step 2>
```
Expected: JSON con `buyerName: "Comprador Prueba"`, el modulo `TEXT` con su `textContent`, y el modulo `QUESTIONNAIRE` con `questions` (no `result`).

- [ ] **Step 4: Probar `accessToken` invalido**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4531/api/access/token-que-no-existe
```
Expected: `404`.

- [ ] **Step 5: Responder el cuestionario con la opcion de puntaje alto**

```bash
curl -s -X POST "http://localhost:4531/api/access/<accessToken>/modules/<quizModuleId>/answers" \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"questionId":"<questionId>","valueOptionIds":["<optionHighId>"]}]}'
```
Expected: `201` con `{"totalScore":10,"message":"Resultado alto"}`.

- [ ] **Step 6: Intentar responder de nuevo (debe rechazarse)**

```bash
curl -s -X POST "http://localhost:4531/api/access/<accessToken>/modules/<quizModuleId>/answers" \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"questionId":"<questionId>","valueOptionIds":["<optionLowId>"]}]}'
```
Expected: `400` con `{"error":"Ya respondiste este cuestionario"}`.

- [ ] **Step 7: Confirmar que `GET /:accessToken` ahora muestra el resultado en vez de las preguntas**

```bash
curl -s http://localhost:4531/api/access/<accessToken>
```
Expected: el modulo `QUESTIONNAIRE` ahora tiene `result: {"totalScore":10,"message":"Resultado alto"}`, sin `questions`.

- [ ] **Step 8: Descargar el PDF y confirmar que es un PDF valido**

```bash
curl -s -o /tmp/fase4-result.pdf "http://localhost:4531/api/access/<accessToken>/modules/<quizModuleId>/result.pdf"
file /tmp/fase4-result.pdf
```
Expected: `file` reporta `PDF document` (no HTML de error). Abrir el archivo manualmente para confirmar que se ve el titulo, el nombre, el puntaje y el mensaje.

- [ ] **Step 9: Confirmar que las rutas publicas de `offerings.ts` ya NO exponen contenido a un visitante sin comprar (Task 9)**

```bash
curl -s "http://localhost:4531/api/offerings/<offeringId>" | grep -o '"textContent":"[^"]*"' || echo "textContent no aparece (correcto)"
curl -s "http://localhost:4531/api/offerings/<offeringId>/modules" | grep -o '"textContent":"[^"]*"' || echo "textContent no aparece (correcto)"
```
Expected: ambas imprimen "textContent no aparece (correcto)" -- el contenido del modulo TEXT ya no se sirve sin comprar.

- [ ] **Step 10: Limpiar todos los datos de prueba**

Guardar como `backend/cleanup-fase4-test-data.tmp.ts` y correr con `npx tsx cleanup-fase4-test-data.tmp.ts <profileId> <userId>`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const profileId = process.argv[2];
  const userId = process.argv[3];

  const offerings = await prisma.offering.findMany({ where: { profileId }, select: { id: true } });
  const offeringIds = offerings.map((o) => o.id);

  await prisma.answer.deleteMany({ where: { purchase: { offeringId: { in: offeringIds } } } });
  await prisma.purchase.deleteMany({ where: { offeringId: { in: offeringIds } } });
  await prisma.scoringRule.deleteMany({ where: { module: { offeringId: { in: offeringIds } } } });
  await prisma.questionOption.deleteMany({ where: { question: { module: { offeringId: { in: offeringIds } } } } });
  await prisma.question.deleteMany({ where: { module: { offeringId: { in: offeringIds } } } });
  await prisma.module.deleteMany({ where: { offeringId: { in: offeringIds } } });
  await prisma.offering.deleteMany({ where: { profileId } });
  await prisma.profile.delete({ where: { id: profileId } });
  await prisma.user.delete({ where: { id: userId } });

  console.log('cleanup done');
}
main().finally(() => prisma.$disconnect());
```

Confirmar con una consulta que no quedo nada residual antes de seguir.

- [ ] **Step 11: Detener el dev server y borrar los scripts temporales**

```bash
rm -f backend/setup-fase4-test-data.tmp.ts backend/cleanup-fase4-test-data.tmp.ts
rm -f /tmp/fase4-result.pdf /tmp/fase4-dev.log
# detener el proceso del dev server (buscar su PID con netstat y Stop-Process)
```

---

## Task 12: Revision final y cierre de rama

- [ ] **Step 1: Dispatch del agente `superpowers:code-reviewer`** sobre el diff completo de la rama contra `master`, con especial atencion a: que `computeResultForModule` se use consistentemente en las tres rutas (sin duplicar logica de calculo en ningun lado), que la validacion por tipo de pregunta en `POST .../answers` realmente cubra los tres tipos (`FREE_TEXT`/`SINGLE_CHOICE`/`MULTIPLE_CHOICE`) sin huecos, que el filtrado de contenido en `offerings.ts` (Task 9) no haya roto el caso del dueno viendo su propio Offering, y que ninguna de las rutas nuevas de `access.ts` filtre datos de una compra ajena (el `accessToken` siempre debe ser la unica forma de resolver que `Purchase`).
- [ ] **Step 2: Corregir lo que el reviewer encuentre, re-verificar empiricamente lo que haya cambiado.**
- [ ] **Step 3: Usar `superpowers:finishing-a-development-branch`** para presentar las 4 opciones de cierre (mergear local / PR / dejar como esta / descartar).

---

## Qué sigue después de esta Fase 4

Con Fases 1-4 completas, el flujo de "Talleres, Cursos y Webinars" queda funcional de punta a punta: un profesional crea una oferta con módulos y cuestionario, la publica, un visitante la compra como invitado, y accede a su contenido y resultado sin necesitar cuenta. Lo que sigue (no planeado todavía) sería la Fase 5 mencionada en el plan de Fase 2: un dashboard "Mis Talleres y Cursos" en el panel del profesional, ya que hasta ahora toda la gestión de ofertas se ha hecho directo contra la API.
