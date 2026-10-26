# Talleres/Cursos/Webinars — Fase 2 (Backend: constructor de preguntas + reglas de puntuación) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un profesional con plan Pro o Clínico puede, vía API, agregar un módulo de tipo Cuestionario a su Offering, construirle preguntas (texto libre, opción única, opción múltiple con sus opciones y valores), definir reglas de puntuación (rangos de suma total → mensaje), y la oferta no se puede publicar si un módulo de Cuestionario se quedó sin preguntas.

**Architecture:** Todo vive en el mismo `backend/src/routes/offerings.ts` ya existente (mismo patrón que Fase 1: sub-recursos en el mismo archivo, como ya hace `services.ts`). Se habilita `QUESTIONNAIRE` como tipo de módulo creable (en Fase 1 estaba deliberadamente excluido). Las rutas nuevas de preguntas/reglas son **solo para el dueño** (no públicas) — a diferencia de los módulos Texto/Video/PDF, no se expone el contenido del cuestionario a nadie sin autenticar en esta fase, para no sumar más superficie al pendiente ya marcado de Fase 1 sobre contenido público sin gating de compra.

**Tech Stack:** Express + Prisma + Zod — mismo patrón ya establecido.

**Fuera de esta Fase 2:** que el comprador responda el cuestionario, calcular su puntaje, generar el PDF de resultado (eso es Fase 4, requiere `Purchase` que es Fase 3). Reordenar preguntas arrastrando. Editar las opciones de una pregunta ya creada (si hace falta cambiarlas, se borra la pregunta y se crea de nuevo — el tipo y las opciones son inmutables post-creación, igual que `Module.type`/`Offering.type` ya lo son).

---

### Task 0: Preparar el worktree

Antes de empezar, verifica que el worktree de la Fase 1 sigue disponible y actualízalo con lo que ya está en `master` (incluye el merge de Fase 1 ya desplegado a producción):

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-cursos-webinars\backend"
git fetch origin
git checkout -b feature/talleres-fase2-cuestionarios origin/master
npm install
npx tsc --noEmit
```

(Nota: si el worktree ya no existe o da problemas, créalo de nuevo igual que en Fase 1: `git worktree add .worktrees/talleres-fase2-cuestionarios -b feature/talleres-fase2-cuestionarios origin/master` desde la raíz del repo, y copia `backend/.env` del checkout principal al nuevo worktree — ese archivo está gitignored, no se copia solo.)

---

### Task 1: Validación — esquemas Zod para Question y ScoringRule, y habilitar QUESTIONNAIRE como tipo de módulo

**Files:**
- Modify: `backend/src/utils/validation.ts`

- [ ] **Step 1: Agregar los esquemas nuevos**

Al final de `backend/src/utils/validation.ts`, agregar:

```typescript
export const createQuestionSchema = z.object({
  text: z.string().min(3, 'Minimo 3 caracteres').max(300, 'Maximo 300 caracteres'),
  type: z.enum(['FREE_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
  options: z.array(z.object({
    label: z.string().min(1, 'La opcion no puede estar vacia').max(100, 'Maximo 100 caracteres'),
    value: z.number().int('El valor debe ser un numero entero'),
  })).optional(),
}).refine(
  (data) => data.type === 'FREE_TEXT' || (!!data.options && data.options.length >= 2),
  { message: 'Las preguntas de opcion unica o multiple requieren al menos 2 opciones' }
).refine(
  (data) => data.type !== 'FREE_TEXT' || !data.options,
  { message: 'Las preguntas de texto libre no llevan opciones' }
);

export const updateQuestionSchema = z.object({
  text: z.string().min(3, 'Minimo 3 caracteres').max(300, 'Maximo 300 caracteres'),
});

export const createScoringRuleSchema = z.object({
  minScore: z.number().int('minScore debe ser un numero entero'),
  maxScore: z.number().int('maxScore debe ser un numero entero'),
  message: z.string().min(3, 'Minimo 3 caracteres').max(500, 'Maximo 500 caracteres'),
}).refine(
  (data) => data.maxScore >= data.minScore,
  { message: 'maxScore debe ser mayor o igual a minScore' }
);

export const updateScoringRuleSchema = z.object({
  minScore: z.number().int().optional(),
  maxScore: z.number().int().optional(),
  message: z.string().min(3).max(500).optional(),
}).refine(
  (data) => data.minScore === undefined || data.maxScore === undefined || data.maxScore >= data.minScore,
  { message: 'maxScore debe ser mayor o igual a minScore' }
);
```

- [ ] **Step 2: Habilitar `QUESTIONNAIRE` en `createModuleSchema`, sin romper la regla de fileUrl**

`createModuleSchema` hoy (Fase 1) excluye `QUESTIONNAIRE` a propósito, y su segundo `.refine()` exige `fileUrl` para "cualquier tipo que no sea TEXT" — eso rompería con QUESTIONNAIRE si solo se agrega al enum sin ajustar el refine (un módulo de cuestionario no usa `fileUrl` ni `textContent`, su contenido son las Preguntas que se agregan después, por separado). Busca el bloque actual en `backend/src/utils/validation.ts` (debería verse así):

```typescript
export const createModuleSchema = z.object({
  title: z.string().min(2, 'Minimo 2 caracteres').max(150, 'Maximo 150 caracteres'),
  description: z.string().max(500).optional().or(z.literal('')),
  type: z.enum(['TEXT', 'VIDEO', 'PDF'], {
    errorMap: () => ({ message: 'Tipo de modulo no valido (en esta version: TEXT, VIDEO o PDF)' }),
  }),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
}).refine(
  (data) => data.type !== 'TEXT' || !!data.textContent,
  { message: 'Un modulo de texto requiere contenido' }
).refine(
  (data) => data.type === 'TEXT' || !!data.fileUrl,
  { message: 'Un modulo de video o PDF requiere un archivo subido primero (fileUrl)' }
);
```

Reemplázalo por:

```typescript
export const createModuleSchema = z.object({
  title: z.string().min(2, 'Minimo 2 caracteres').max(150, 'Maximo 150 caracteres'),
  description: z.string().max(500).optional().or(z.literal('')),
  type: z.enum(['TEXT', 'VIDEO', 'PDF', 'QUESTIONNAIRE'], {
    errorMap: () => ({ message: 'Tipo de modulo no valido (TEXT, VIDEO, PDF o QUESTIONNAIRE)' }),
  }),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
}).refine(
  (data) => data.type !== 'TEXT' || !!data.textContent,
  { message: 'Un modulo de texto requiere contenido' }
).refine(
  (data) => !(data.type === 'VIDEO' || data.type === 'PDF') || !!data.fileUrl,
  { message: 'Un modulo de video o PDF requiere un archivo subido primero (fileUrl)' }
);
```

(El cambio real es: el segundo `.refine()` ahora solo exige `fileUrl` para `VIDEO`/`PDF` explícitamente, en vez de "para cualquier tipo que no sea TEXT" — así `QUESTIONNAIRE` queda libre de ambas exigencias, como corresponde.)

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add src/utils/validation.ts
git commit -m "feat: add Zod schemas for Question/ScoringRule, enable QUESTIONNAIRE module type"
```

---

### Task 2: Corregir el invariante de tipo de Módulo para que no exija fileUrl en Cuestionarios, y endurecer el chequeo de publicación

**Files:**
- Modify: `backend/src/routes/offerings.ts`

El `PUT /:offeringId/modules/:moduleId` ya existente tiene esta lógica (de la Fase 1):

```typescript
    if (existing.type === 'TEXT') {
      if (!finalTextContent) {
        throw new AppError(400, 'Un modulo de texto requiere contenido');
      }
    } else {
      if (!finalFileUrl) {
        throw new AppError(400, 'Un modulo de video o PDF requiere un archivo');
      }
    }
```

El `else` ahora mismo cubre "cualquier tipo que no sea TEXT", lo cual incluiría incorrectamente a `QUESTIONNAIRE` y le exigiría un `fileUrl` que nunca va a tener. Hay que acotarlo.

- [ ] **Step 1: Acotar el invariante al tipo real**

Reemplaza ese bloque por:

```typescript
    if (existing.type === 'TEXT') {
      if (!finalTextContent) {
        throw new AppError(400, 'Un modulo de texto requiere contenido');
      }
    } else if (existing.type === 'VIDEO' || existing.type === 'PDF') {
      if (!finalFileUrl) {
        throw new AppError(400, 'Un modulo de video o PDF requiere un archivo');
      }
    }
    // QUESTIONNAIRE no tiene invariante de textContent/fileUrl — su contenido son las
    // Preguntas (Question), que se gestionan por separado via las rutas de /questions.
```

- [ ] **Step 2: Endurecer `PATCH /:id/publish` para que un Cuestionario vacío bloquee la publicación**

El chequeo actual (dentro de `if (existing.status === 'DRAFT')`) solo verifica que haya al menos un módulo:

```typescript
    if (existing.status === 'DRAFT') {
      const moduleCount = await prisma.module.count({ where: { offeringId: existing.id } });
      if (moduleCount === 0) {
        throw new AppError(400, 'Agrega al menos un modulo antes de publicar');
      }
    }
```

Reemplázalo por (ahora también revisa que ningún módulo de tipo Cuestionario esté vacío de preguntas):

```typescript
    if (existing.status === 'DRAFT') {
      const modules = await prisma.module.findMany({
        where: { offeringId: existing.id },
        include: { _count: { select: { questions: true } } },
      });
      if (modules.length === 0) {
        throw new AppError(400, 'Agrega al menos un modulo antes de publicar');
      }
      const emptyQuestionnaire = modules.find(
        (m) => m.type === 'QUESTIONNAIRE' && m._count.questions === 0
      );
      if (emptyQuestionnaire) {
        throw new AppError(
          400,
          `El modulo de cuestionario "${emptyQuestionnaire.title}" necesita al menos una pregunta antes de publicar`
        );
      }
    }
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores. (Si `_count.questions` da un error de tipos, es porque el cliente de Prisma necesita regenerarse — corre `npm run db:generate` y vuelve a intentar; no debería hacer falta ningún cambio de schema, `Question` ya existe desde la Fase 1.)

- [ ] **Step 4: Commit**

```bash
git add src/routes/offerings.ts
git commit -m "fix: scope module type-invariant to TEXT/VIDEO/PDF only, block publishing with empty questionnaires"
```

---

### Task 3: API — CRUD de Question (preguntas de un módulo Cuestionario)

**Files:**
- Modify: `backend/src/routes/offerings.ts`

- [ ] **Step 1: Agregar el import de los nuevos schemas**

En la línea de imports de `backend/src/routes/offerings.ts`, agrega `createQuestionSchema, updateQuestionSchema` a la lista ya importada desde `../utils/validation`:

```typescript
import { createOfferingSchema, updateOfferingSchema, createModuleSchema, updateModuleSchema, createQuestionSchema, updateQuestionSchema } from '../utils/validation';
```

- [ ] **Step 2: Agregar el helper de ownership para Module (patron mas limpio que el de Offering, una sola query atomica)**

Justo después de la función `verifyOfferingOwnership` ya existente, agrega:

```typescript
// Helper: verify a module belongs to offeringId AND the offering's profile belongs to
// userId, in one atomic query — closes the same class of IDOR that Fase 1's review found
// on the Module routes (see the comments on PUT/DELETE /:offeringId/modules/:moduleId
// below), but in a single query instead of two separate ones.
async function verifyModuleOwnership(offeringId: string, moduleId: string, userId: string) {
  const module = await prisma.module.findFirst({
    where: { id: moduleId, offeringId, offering: { profile: { userId } } },
  });
  if (!module) throw new AppError(404, 'Modulo no encontrado');
  return module;
}

// Helper: verify a question belongs to moduleId AND that module's offering's profile
// belongs to userId, in one atomic query — same pattern, one level deeper.
async function verifyQuestionOwnership(moduleId: string, questionId: string, userId: string) {
  const question = await prisma.question.findFirst({
    where: { id: questionId, moduleId, module: { offering: { profile: { userId } } } },
  });
  if (!question) throw new AppError(404, 'Pregunta no encontrada');
  return question;
}
```

- [ ] **Step 3: Agregar las rutas de Question**

Agrega esto después de la ruta `DELETE /:offeringId/modules/:moduleId` ya existente, y antes de `export default router;`:

```typescript
// POST /api/offerings/:offeringId/modules/:moduleId/questions — Add question (auth, owner, module must be QUESTIONNAIRE)
router.post('/:offeringId/modules/:moduleId/questions', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const module = await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    if (module.type !== 'QUESTIONNAIRE') {
      throw new AppError(400, 'Solo los modulos de tipo Cuestionario pueden tener preguntas');
    }

    const data = createQuestionSchema.parse(req.body);
    const currentCount = await prisma.question.count({ where: { moduleId: req.params.moduleId } });

    const question = await prisma.question.create({
      data: {
        moduleId: req.params.moduleId,
        order: currentCount + 1,
        text: data.text,
        type: data.type,
        ...(data.options ? { options: { create: data.options } } : {}),
      },
      include: { options: true },
    });
    res.status(201).json(question);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/:offeringId/modules/:moduleId/questions — List questions (auth, owner only — not public yet, same reasoning as the Fase 1 TODO on module content)
router.get('/:offeringId/modules/:moduleId/questions', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);

    const questions = await prisma.question.findMany({
      where: { moduleId: req.params.moduleId },
      orderBy: { order: 'asc' },
      include: { options: true },
    });
    res.json(questions);
  } catch (err) {
    next(err);
  }
});

// PUT /api/offerings/:offeringId/modules/:moduleId/questions/:questionId — Update question text (auth, owner). Type and options are immutable post-creation (same convention as Module.type/Offering.type) — to change them, delete and recreate the question.
router.put('/:offeringId/modules/:moduleId/questions/:questionId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    await verifyQuestionOwnership(req.params.moduleId, req.params.questionId, req.userId!);

    const data = updateQuestionSchema.parse(req.body);
    const question = await prisma.question.update({
      where: { id: req.params.questionId },
      data,
      include: { options: true },
    });
    res.json(question);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offerings/:offeringId/modules/:moduleId/questions/:questionId — Delete question (auth, owner). Cascades to its QuestionOption rows and any Answer rows via the schema's onDelete: Cascade.
router.delete('/:offeringId/modules/:moduleId/questions/:questionId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);

    const { count } = await prisma.question.deleteMany({
      where: { id: req.params.questionId, moduleId: req.params.moduleId },
    });
    if (count === 0) throw new AppError(404, 'Pregunta no encontrada');

    res.json({ message: 'Pregunta eliminada' });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 5: Probar manualmente, con datos de prueba desechables, contra la base de datos real**

Igual que en Fase 1: crea un usuario + perfil + offering + module (tipo QUESTIONNAIRE) de prueba via Prisma o via la API ya existente, genera un JWT real, y por HTTP contra el servidor local (`npm run dev`):

1. `POST .../questions` con `type: 'SINGLE_CHOICE'` y 2 opciones → 201, confirma que las opciones se crearon (`options` en la respuesta).
2. `POST .../questions` con `type: 'FREE_TEXT'` y sin `options` → 201.
3. Intentar `POST .../questions` sobre un módulo que NO es QUESTIONNAIRE (usa un módulo TEXT ya creado en otra prueba) → 400.
4. `GET .../questions` → 200, lista ambas preguntas con sus opciones.
5. **Reproduce el ataque IDOR de Fase 1, adaptado a preguntas:** crea un segundo usuario/profile/offering/module de prueba, y con el token del segundo intenta `DELETE` sobre una pregunta del PRIMER usuario (combinando el offeringId/moduleId del segundo con el questionId del primero) → debe dar 404, la pregunta debe seguir existiendo.
6. Limpia TODOS los datos de prueba (users, profiles, offerings, modules, questions, options) directamente via Prisma, y confirma con queries finales que no quedó nada.
7. Detén el servidor.

- [ ] **Step 6: Commit**

```bash
git add src/routes/offerings.ts
git commit -m "feat: add Question CRUD routes nested under Module"
```

---

### Task 4: API — CRUD de ScoringRule (reglas de puntuación de un módulo Cuestionario)

**Files:**
- Modify: `backend/src/routes/offerings.ts`

- [ ] **Step 1: Agregar el import de los nuevos schemas**

Extiende el mismo import de la Task 3 para incluir `createScoringRuleSchema, updateScoringRuleSchema`:

```typescript
import { createOfferingSchema, updateOfferingSchema, createModuleSchema, updateModuleSchema, createQuestionSchema, updateQuestionSchema, createScoringRuleSchema, updateScoringRuleSchema } from '../utils/validation';
```

- [ ] **Step 2: Agregar el helper de ownership para ScoringRule**

Después del helper `verifyQuestionOwnership` agregado en la Task 3, agrega:

```typescript
// Helper: verify a scoring rule belongs to moduleId AND that module's offering's profile
// belongs to userId — same pattern as verifyQuestionOwnership.
async function verifyScoringRuleOwnership(moduleId: string, ruleId: string, userId: string) {
  const rule = await prisma.scoringRule.findFirst({
    where: { id: ruleId, moduleId, module: { offering: { profile: { userId } } } },
  });
  if (!rule) throw new AppError(404, 'Regla de puntuacion no encontrada');
  return rule;
}
```

- [ ] **Step 3: Agregar las rutas de ScoringRule**

Agrega esto después de las rutas de Question de la Task 3, antes de `export default router;`:

```typescript
// POST /api/offerings/:offeringId/modules/:moduleId/scoring-rules — Add scoring rule (auth, owner, module must be QUESTIONNAIRE)
router.post('/:offeringId/modules/:moduleId/scoring-rules', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const module = await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    if (module.type !== 'QUESTIONNAIRE') {
      throw new AppError(400, 'Solo los modulos de tipo Cuestionario pueden tener reglas de puntuacion');
    }

    const data = createScoringRuleSchema.parse(req.body);
    const rule = await prisma.scoringRule.create({
      data: { moduleId: req.params.moduleId, ...data },
    });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/:offeringId/modules/:moduleId/scoring-rules — List scoring rules (auth, owner only)
router.get('/:offeringId/modules/:moduleId/scoring-rules', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);

    const rules = await prisma.scoringRule.findMany({
      where: { moduleId: req.params.moduleId },
      orderBy: { minScore: 'asc' },
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

// PUT /api/offerings/:offeringId/modules/:moduleId/scoring-rules/:ruleId — Update scoring rule (auth, owner)
router.put('/:offeringId/modules/:moduleId/scoring-rules/:ruleId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);
    const existing = await verifyScoringRuleOwnership(req.params.moduleId, req.params.ruleId, req.userId!);

    const data = updateScoringRuleSchema.parse(req.body);

    // Re-check minScore<=maxScore against the MERGED result, same reasoning as every
    // other partial-update invariant check in this file (Offering.scheduledAt/externalLink,
    // Module.textContent/fileUrl): a PUT that only sends one of the two fields must not be
    // able to produce an inverted range.
    const finalMin = data.minScore !== undefined ? data.minScore : existing.minScore;
    const finalMax = data.maxScore !== undefined ? data.maxScore : existing.maxScore;
    if (finalMax < finalMin) {
      throw new AppError(400, 'maxScore debe ser mayor o igual a minScore');
    }

    const rule = await prisma.scoringRule.update({
      where: { id: req.params.ruleId },
      data,
    });
    res.json(rule);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offerings/:offeringId/modules/:moduleId/scoring-rules/:ruleId — Delete scoring rule (auth, owner)
router.delete('/:offeringId/modules/:moduleId/scoring-rules/:ruleId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyModuleOwnership(req.params.offeringId, req.params.moduleId, req.userId!);

    const { count } = await prisma.scoringRule.deleteMany({
      where: { id: req.params.ruleId, moduleId: req.params.moduleId },
    });
    if (count === 0) throw new AppError(404, 'Regla de puntuacion no encontrada');

    res.json({ message: 'Regla de puntuacion eliminada' });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 5: Probar manualmente, con datos de prueba desechables, contra la base de datos real**

Mismo patrón que la Task 3: crear datos de prueba reales, probar por HTTP:

1. `POST .../scoring-rules` con `minScore: 0, maxScore: 10, message: '...'` → 201.
2. `POST .../scoring-rules` con `minScore: 11, maxScore: 20, message: '...'` → 201.
3. `POST .../scoring-rules` con `minScore: 10, maxScore: 5` (invertido) → 400.
4. `GET .../scoring-rules` → 200, lista ambas, ordenadas por minScore.
5. `PUT .../scoring-rules/:ruleId` enviando solo `{ maxScore: 3 }` sobre la regla `0-10` → debe dar 400 (3 < 0 es falso... ojo, recalcula: minScore existente es 0, si mandas maxScore:3, finalMin=0 finalMax=3, 3>=0 es valido, no deberia fallar. Prueba en cambio enviar `{ minScore: 15 }` sobre esa misma regla 0-10 → finalMin=15, finalMax=10 (el existente) → 15>10 → debe dar 400). Ajusta el escenario exacto al construir la prueba, el punto es confirmar que el chequeo de rango mergeado funciona en ambas direcciones.
6. Reproduce el ataque IDOR igual que en Task 3 (segundo usuario intentando `DELETE` una regla del primero) → 404, la regla debe seguir existiendo.
7. Limpia todos los datos de prueba, confirma con queries finales.
8. Detén el servidor.

- [ ] **Step 6: Commit**

```bash
git add src/routes/offerings.ts
git commit -m "feat: add ScoringRule CRUD routes nested under Module"
```

---

## Qué sigue después de esta Fase 2

- **Fase 3:** checkout de invitado + pago (Stripe/PayPal) + creación de `Purchase` + envío de correo con `accessToken`.
- **Fase 4:** página de acceso del comprador (vía `accessToken`, sin login), visor de módulos, responder cuestionario (usando las `Question`/`QuestionOption` de esta fase), calcular el puntaje con `ScoringRule`, generar y descargar el PDF de resultado.
- **Fase 5 (frontend):** dashboard "Mis Talleres y Cursos" del profesional — crear/editar Offering, agregar módulos, y el constructor de preguntas visual sobre las rutas de esta Fase 2. Nada de esto se construyó todavía; hasta este punto, Fases 1 y 2 son 100% backend.

Cada una merece su propio plan cuando llegue el momento.
