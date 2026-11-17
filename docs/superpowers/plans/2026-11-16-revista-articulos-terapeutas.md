# Artículos de terapeutas en la Revista Aliax Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que terapeutas Pro y Pro IA escriban artículos desde su panel, los envíen a revisión de César y, al aprobarse, se publiquen en la Revista firmados con enlace a su perfil.

**Architecture:** Se reutiliza el modelo `Article`/`ArticleBlock`, el editor por bloques y el sistema de publicación y reconstrucción de la Revista. `Article` gana dueño (`authorUserId`), nota de revisión, fecha de envío y estados `PENDING_REVIEW` y `CHANGES_REQUESTED`; `categoryId` pasa a opcional. Un router nuevo `/api/my-articles` (solo Pro/Pro IA, solo artículos propios) cubre al terapeuta; el router admin existente gana "pedir cambios" y publica desde `PENDING_REVIEW` exigiendo categoría.

**Tech Stack:** Express + Prisma (backend, Vercel serverless), React + Vite + TS (frontend), Resend (correo). El backend NO tiene ejecutor de pruebas: se verifica con `npx tsc --noEmit` (backend), `npx tsc -b` (frontend; NUNCA `--noEmit` a secas) y scripts `tsx` desechables.

Spec: `docs/superpowers/specs/2026-11-16-revista-articulos-terapeutas-design.md`.

---

## Reglas para todos los implementadores

- Trabajar SOLO en el worktree indicado; nunca tocar el repo principal (`master`). Nada de `git stash`.
- Python NO está instalado: editar con Edit/Write y verificar con `git diff`. Algunos archivos tienen CRLF; si un Edit multilínea no encuentra el texto, usar ediciones de una línea.
- Regla absoluta de texto: nunca usar el carácter guion largo "—" en copy, correos ni mensajes de error. Español neutro de México, tuteando.
- Nunca `border` en elementos nuevos del frontend; usar sombra sutil. Todo cambio visual debe verse bien en oscuro/claro y escritorio/móvil.
- NO ejecutar `prisma db push`, `prisma migrate deploy` ni nada contra la base de datos de producción, NO desplegar, NO enviar correos reales. El controlador hace eso con autorización de César.
- `git status` limpio de artefactos (`tsconfig.tsbuildinfo`) antes de cada commit.

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `backend/prisma/schema.prisma` | Modificar | Campos y estados nuevos de `Article`; relación con `User` |
| `backend/prisma/migrations/20261116120000_article_therapist_authors/migration.sql` | Crear | SQL aditivo (se aplica a producción aparte) |
| `backend/src/lib/articleWorkflow.ts` | Crear | Reglas puras de estado y validación de envío |
| `backend/src/utils/validation.ts` | Modificar | Esquemas `createMyArticleSchema` y `updateMyArticleSchema` |
| `backend/src/services/emailService.ts` | Modificar | 3 plantillas: envío a revisión, aprobado, cambios solicitados |
| `backend/src/routes/my-articles.ts` | Crear | Rutas del terapeuta |
| `backend/src/index.ts`, `backend/api/index.ts` | Modificar | Montar `/api/my-articles` en AMBOS puntos de entrada |
| `backend/src/routes/articles.ts` | Modificar | Publicar desde revisión, pedir cambios, listado y `/public` |
| `frontend/src/hooks/useArticles.ts` | Modificar | Tipos y llamadas nuevas |
| `frontend/src/hooks/useMyArticles.ts` | Crear | Llamadas del terapeuta |
| `frontend/src/components/articles/MyArticles.tsx` | Crear | Pestaña "Mis artículos" (lista y editor) |
| `frontend/src/pages/Dashboard.tsx` | Modificar | Registrar la pestaña (patrón de `talleres`) |
| `frontend/src/components/admin/AdminRevista.tsx` | Modificar | Bandeja "Por revisar" |
| `frontend/scripts/generate-blog.ts` | Modificar | Firma con enlace al perfil |

---

### Task 1: Esquema y archivo de migración

**Files:** Modify `backend/prisma/schema.prisma` (modelo `Article` ~línea 785, enum `ArticleStatus` ~807, modelo `User`); Create la migración.

- [ ] **Step 1: Editar el esquema.** En `enum ArticleStatus` agregar `PENDING_REVIEW` y `CHANGES_REQUESTED` después de `DRAFT`:

```prisma
enum ArticleStatus {
  DRAFT
  PENDING_REVIEW
  CHANGES_REQUESTED
  PUBLISHED
}
```

En `model Article` cambiar `categoryId String` a `categoryId String?`, la relación `category Category` a `category Category?`, y agregar:

```prisma
  authorUserId String?
  reviewNote   String?
  submittedAt  DateTime?

  authorUser User? @relation("ArticleAuthor", fields: [authorUserId], references: [id], onDelete: SetNull)
```

Agregar `@@index([authorUserId])`. En `model User` agregar `articles Article[] @relation("ArticleAuthor")`.

- [ ] **Step 2: Crear la migración** `backend/prisma/migrations/20261116120000_article_therapist_authors/migration.sql`:

```sql
-- AlterEnum
ALTER TYPE "ArticleStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "ArticleStatus" ADD VALUE 'CHANGES_REQUESTED';

-- AlterTable
ALTER TABLE "Article" ADD COLUMN "authorUserId" TEXT,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ALTER COLUMN "categoryId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Article_authorUserId_idx" ON "Article"("authorUserId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Verificar el nombre real de la FK de categoría con `grep -n "Article_categoryId" backend/prisma/migrations -r`; si la FK de `categoryId` es `ON DELETE RESTRICT`, dejarla (no se cambia).

- [ ] **Step 3: Regenerar el cliente y compilar.** Desde `backend/`: `npx prisma generate` y `npx tsc --noEmit`. Si el compilador marca usos de `article.category` que ahora puede ser `null`, corregirlos con `article.category?.…` solo donde el flujo admite artículos sin categoría (listados del admin). Anotar cada archivo tocado.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma backend/src
git commit -m "feat: esquema de articulos de terapeutas (dueno, estados de revision, categoria opcional)"
```

---

### Task 2: Reglas de estado y validación

**Files:** Create `backend/src/lib/articleWorkflow.ts`; Modify `backend/src/utils/validation.ts` (al final de los esquemas de artículos, después de `updateArticleBlockSchema`); Test (desechable) `backend/scripts/check-article-workflow-tmp.ts`.

- [ ] **Step 1: Crear `backend/src/lib/articleWorkflow.ts`:**

```ts
export type ArticleState = 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'PUBLISHED';

// Estados en los que el terapeuta puede editar y enviar.
const AUTHOR_EDITABLE: ArticleState[] = ['DRAFT', 'CHANGES_REQUESTED'];

export function canAuthorEdit(status: string): boolean {
  return AUTHOR_EDITABLE.includes(status as ArticleState);
}

export function canAuthorSubmit(status: string): boolean {
  return canAuthorEdit(status);
}

export function canAuthorWithdraw(status: string): boolean {
  return status === 'PENDING_REVIEW';
}

export function canAuthorDelete(status: string): boolean {
  return status === 'DRAFT' || status === 'CHANGES_REQUESTED';
}

export interface SubmitCheck {
  title: string;
  excerpt: string;
  blockCount: number;
  textBlockCount: number;
}

// Devuelve el mensaje de error, o null si el artículo se puede enviar a revisión.
export function validateForSubmit(a: SubmitCheck): string | null {
  if (a.title.trim().length < 3) return 'Escribe un título de al menos 3 caracteres';
  if (a.excerpt.trim().length < 10) return 'Escribe un extracto de al menos 10 caracteres';
  if (a.blockCount === 0) return 'Agrega contenido a tu artículo antes de enviarlo';
  if (a.textBlockCount === 0) return 'Tu artículo necesita al menos un bloque de texto';
  return null;
}
```

- [ ] **Step 2: Agregar esquemas en `validation.ts`:**

```ts
// Esquemas del terapeuta: sin categoria, sin autor y sin "destacado" (los asigna el admin).
export const createMyArticleSchema = z.object({
  title: z.string().min(3, 'Minimo 3 caracteres').max(150, 'Maximo 150 caracteres'),
  excerpt: z.string().max(300, 'Maximo 300 caracteres').optional().or(z.literal('')),
  metaDescription: z.string().max(300, 'Maximo 300 caracteres').optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
});

export const updateMyArticleSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  excerpt: z.string().max(300).optional().or(z.literal('')),
  metaDescription: z.string().max(300).optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
});
```

Nota: `excerpt` es obligatorio en el modelo, así que al crear sin extracto se guarda como cadena vacía y `validateForSubmit` lo exige (mínimo 10) al enviar.

- [ ] **Step 3: Script de verificación** `backend/scripts/check-article-workflow-tmp.ts` que pruebe con asserts (imprime PASS/FAIL y sale con código 1 si algo falla): `canAuthorEdit('DRAFT')` true; `'CHANGES_REQUESTED'` true; `'PENDING_REVIEW'` false; `'PUBLISHED'` false; `canAuthorWithdraw('PENDING_REVIEW')` true y `('DRAFT')` false; `canAuthorDelete('PUBLISHED')` false; `validateForSubmit` devuelve mensaje cuando título corto, extracto corto, cero bloques, cero bloques de texto, y `null` cuando `{title:'Mi artículo', excerpt:'Un extracto válido', blockCount:2, textBlockCount:1}`.

Run (desde `backend/`): `npx tsx scripts/check-article-workflow-tmp.ts`
Expected: todo PASS, exit 0.

- [ ] **Step 4: Typecheck, borrar el script y commit**

```bash
cd backend && npx tsc --noEmit && rm scripts/check-article-workflow-tmp.ts
git add backend/src
git commit -m "feat: reglas de estado y esquemas de validacion para articulos de terapeutas"
```

---

### Task 3: Plantillas de correo

**Files:** Modify `backend/src/services/emailService.ts` (dentro del objeto `emailTemplates`, junto a `welcome`; usar los helpers `baseTemplate`, `heading`, `subtext`, `ctaButton` ya definidos arriba en el archivo; leer `welcome` para ver cómo se usan).

- [ ] **Step 1: Agregar tres plantillas** con la forma `{ to, subject, html }`:

1. `articleSubmittedAdmin: (data: { authorName: string; title: string }) =>` con `to: env.ADMIN_EMAIL` (importar `env` si no está importado; ya se usa en otras plantillas del archivo). Subject: `Nuevo artículo por revisar: ${data.title}`. Contenido: `${data.authorName} envió un artículo a revisión`, el título, y botón `Revisar artículo` a `https://www.aliax.io/admin`.
2. `articleApproved: (data: { userName: string; userEmail: string; title: string; slug: string }) =>` Subject: `Tu artículo fue aprobado`. Contenido: felicitación, "tu artículo ya está aprobado y aparecerá en la Revista en unos minutos", botón `Ver en la Revista` a `https://www.aliax.io/revista/${data.slug}`.
3. `articleChangesRequested: (data: { userName: string; userEmail: string; title: string; note: string }) =>` Subject: `Hay cambios por hacer en tu artículo`. Contenido: la nota completa en un recuadro, "puedes editar tu artículo y volver a enviarlo", botón `Editar mi artículo` a `https://www.aliax.io/dashboard`.

Escapar el texto del usuario (`title`, `note`, `authorName`) con la función de escape HTML que use el archivo (buscar `escapeHtml` o similar; si no existe, crear una local de 5 caracteres `& < > " '`) antes de insertarlo en el HTML.

- [ ] **Step 2: Script desechable** que renderice las tres plantillas con datos de prueba, compruebe que el HTML contiene las URLs esperadas, que NO contiene "—" y que un título con `<script>` sale escapado. NO enviar nada. Ejecutarlo con `npx tsx` y borrarlo.

- [ ] **Step 3: `npx tsc --noEmit` y commit**

```bash
git add backend/src/services/emailService.ts
git commit -m "feat: correos de revision de articulos (envio, aprobado, cambios solicitados)"
```

---

### Task 4: Router del terapeuta `/api/my-articles`

**Files:** Create `backend/src/routes/my-articles.ts`; Modify `backend/src/index.ts` (cerca de la línea 83 donde se monta `/api/cron`) y `backend/api/index.ts` (cerca de la línea 105): importar y montar `app.use('/api/my-articles', myArticlesRouter)` en AMBOS.

- [ ] **Step 1: Crear `backend/src/routes/my-articles.ts`:**

```ts
import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { isProUser } from '../lib/planUtils';
import { slugify } from '../utils/slugify';
import { emailTemplates, sendEmail } from '../services/emailService';
import {
  createMyArticleSchema, updateMyArticleSchema,
  createArticleBlockSchema, updateArticleBlockSchema,
} from '../utils/validation';
import { canAuthorEdit, canAuthorSubmit, canAuthorWithdraw, canAuthorDelete, validateForSubmit } from '../lib/articleWorkflow';

const router = Router();
const prisma = new PrismaClient();

interface AuthorRequest extends AuthRequest { author?: { id: string; name: string } }

// Solo planes Pro y Pro IA (el admin tambien pasa). Todas las rutas cuelgan de esto.
async function requireAuthorAccess(req: AuthorRequest, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, plan: true, planExpiresAt: true, isAdmin: true, blocked: true },
    });
    if (!user || user.blocked) throw new AppError(403, 'No autorizado');
    if (!isProUser(user)) throw new AppError(403, 'Escribir articulos es un beneficio de los planes Pro y Pro IA');
    req.author = { id: user.id, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}

router.use(authMiddleware, requireAuthorAccess);

// 404 (no 403) cuando el articulo no es del usuario, para no revelar que existe.
async function loadOwnArticle(id: string, userId: string) {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || article.authorUserId !== userId) throw new AppError(404, 'Articulo no encontrado');
  return article;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'articulo';
  let slug = base;
  let n = 2;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

// GET /api/my-articles
router.get('/', async (req: AuthorRequest, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      where: { authorUserId: req.author!.id },
      select: {
        id: true, slug: true, title: true, excerpt: true, status: true, reviewNote: true,
        submittedAt: true, publishedAt: true, updatedAt: true, coverImage: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(articles);
  } catch (err) { next(err); }
});

// POST /api/my-articles
router.post('/', async (req: AuthorRequest, res, next) => {
  try {
    const data = createMyArticleSchema.parse(req.body);
    const article = await prisma.article.create({
      data: {
        title: data.title,
        excerpt: data.excerpt || '',
        metaDescription: data.metaDescription || undefined,
        coverImage: data.coverImage || undefined,
        slug: await uniqueSlug(data.title),
        author: req.author!.name,
        authorUserId: req.author!.id,
        status: 'DRAFT',
      },
    });
    res.status(201).json(article);
  } catch (err) { next(err); }
});

// GET /api/my-articles/:id
router.get('/:id', async (req: AuthorRequest, res, next) => {
  try {
    await loadOwnArticle(req.params.id, req.author!.id);
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { blocks: { orderBy: { order: 'asc' } } },
    });
    res.json(article);
  } catch (err) { next(err); }
});

// PUT /api/my-articles/:id  (solo borrador o cambios solicitados)
router.put('/:id', async (req: AuthorRequest, res, next) => {
  try {
    const existing = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(existing.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const data = updateMyArticleSchema.parse(req.body);
    const article = await prisma.article.update({
      where: { id: existing.id },
      data: {
        ...data,
        coverImage: data.coverImage || undefined,
        metaDescription: data.metaDescription || undefined,
      },
    });
    res.json(article);
  } catch (err) { next(err); }
});

// DELETE /api/my-articles/:id
router.delete('/:id', async (req: AuthorRequest, res, next) => {
  try {
    const existing = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorDelete(existing.status)) throw new AppError(409, 'Este articulo no se puede borrar');
    await prisma.article.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/my-articles/:id/blocks
router.post('/:id/blocks', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(article.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const data = createArticleBlockSchema.parse(req.body);
    const maxOrder = await prisma.articleBlock.aggregate({ where: { articleId: article.id }, _max: { order: true } });
    const block = await prisma.articleBlock.create({
      data: { ...data, articleId: article.id, order: (maxOrder._max.order ?? 0) + 1 },
    });
    res.status(201).json(block);
  } catch (err) { next(err); }
});

// PATCH /api/my-articles/:id/blocks/swap  (antes de /:blockId para que no choque)
router.patch('/:id/blocks/swap', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(article.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const { blockAId, blockBId } = req.body as { blockAId?: string; blockBId?: string };
    if (!blockAId || !blockBId) throw new AppError(400, 'Se requieren blockAId y blockBId');
    const [a, b] = await Promise.all([
      prisma.articleBlock.findUnique({ where: { id: blockAId } }),
      prisma.articleBlock.findUnique({ where: { id: blockBId } }),
    ]);
    if (!a || !b || a.articleId !== article.id || b.articleId !== article.id) {
      throw new AppError(400, 'Ambos bloques deben pertenecer a este articulo');
    }
    const [ua, ub] = await prisma.$transaction([
      prisma.articleBlock.update({ where: { id: a.id }, data: { order: b.order } }),
      prisma.articleBlock.update({ where: { id: b.id }, data: { order: a.order } }),
    ]);
    res.json([ua, ub]);
  } catch (err) { next(err); }
});

// PUT /api/my-articles/:id/blocks/:blockId
router.put('/:id/blocks/:blockId', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(article.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const block = await prisma.articleBlock.findUnique({ where: { id: req.params.blockId } });
    if (!block || block.articleId !== article.id) throw new AppError(404, 'Bloque no encontrado');
    const data = updateArticleBlockSchema.parse(req.body);
    res.json(await prisma.articleBlock.update({ where: { id: block.id }, data }));
  } catch (err) { next(err); }
});

// DELETE /api/my-articles/:id/blocks/:blockId
router.delete('/:id/blocks/:blockId', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorEdit(article.status)) throw new AppError(409, 'Este articulo ya no se puede editar');
    const block = await prisma.articleBlock.findUnique({ where: { id: req.params.blockId } });
    if (!block || block.articleId !== article.id) throw new AppError(404, 'Bloque no encontrado');
    await prisma.articleBlock.delete({ where: { id: block.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/my-articles/:id/submit
router.post('/:id/submit', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorSubmit(article.status)) throw new AppError(409, 'Este articulo ya fue enviado');
    const blocks = await prisma.articleBlock.findMany({ where: { articleId: article.id }, select: { type: true } });
    const problem = validateForSubmit({
      title: article.title,
      excerpt: article.excerpt,
      blockCount: blocks.length,
      textBlockCount: blocks.filter(b => b.type === 'TEXT').length,
    });
    if (problem) throw new AppError(400, problem);
    const updated = await prisma.article.update({
      where: { id: article.id },
      data: { status: 'PENDING_REVIEW', submittedAt: new Date(), reviewNote: null },
    });
    // El correo nunca bloquea el envio.
    try {
      const tpl = emailTemplates.articleSubmittedAdmin({ authorName: req.author!.name, title: article.title });
      sendEmail(tpl.to, tpl.subject, tpl.html).catch(() => {});
    } catch { /* ignorar */ }
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/my-articles/:id/withdraw
router.post('/:id/withdraw', async (req: AuthorRequest, res, next) => {
  try {
    const article = await loadOwnArticle(req.params.id, req.author!.id);
    if (!canAuthorWithdraw(article.status)) throw new AppError(409, 'Solo puedes retirar un articulo en revision');
    res.json(await prisma.article.update({ where: { id: article.id }, data: { status: 'DRAFT' } }));
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 2: Montar en ambos puntos de entrada** (importar `myArticlesRouter from './routes/my-articles'`, ajustando la ruta relativa en `api/index.ts`, y `app.use('/api/my-articles', myArticlesRouter)` junto a las otras rutas). Verificar con `grep -n "my-articles" backend/src/index.ts backend/api/index.ts` que aparece en los dos.

- [ ] **Step 3: Typecheck** `npx tsc --noEmit` desde `backend/`. Si `AuthRequest` no tiene `userId` con ese nombre, usar el campo real que usa `articles.ts`.

- [ ] **Step 4: Commit**

```bash
git add backend/src backend/api
git commit -m "feat: rutas /api/my-articles para que terapeutas Pro escriban y envien articulos"
```

---

### Task 5: Cambios en las rutas del administrador

**Files:** Modify `backend/src/routes/articles.ts`.

- [ ] **Step 1: `GET /` (listado admin, ~línea 184).** Agregar al `include` actual `authorUser: { select: { id: true, name: true, email: true } }` y que el listado devuelva también `reviewNote` y `submittedAt` (ya vienen en el registro). No cambiar el orden actual.

- [ ] **Step 2: `PATCH /:id/publish` (~línea 292).** Además del guard de autor, agregar `if (!existing.categoryId) throw new AppError(400, 'Asigna una categoria antes de publicar');`. Al actualizar, incluir `reviewNote: null`. Después de `triggerBlogRebuild();`, si `existing.authorUserId`, buscar al usuario (`name`, `email`) y enviar `emailTemplates.articleApproved({ userName, userEmail, title: existing.title, slug: existing.slug })` con `sendEmail(...)` dentro de un `try` que nunca bloquee ni rompa la respuesta. Importar `sendEmail` desde `../services/emailService`.

- [ ] **Step 3: Nueva ruta `PATCH /:id/request-changes`** junto a `unpublish`:

```ts
router.patch('/:id/request-changes', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (note.length < 3) throw new AppError(400, 'Escribe una nota para el autor');
    if (note.length > 2000) throw new AppError(400, 'La nota es demasiado larga (maximo 2000 caracteres)');
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Articulo no encontrado');
    if (existing.status !== 'PENDING_REVIEW') throw new AppError(409, 'Solo se pueden devolver articulos en revision');
    const article = await prisma.article.update({
      where: { id: existing.id },
      data: { status: 'CHANGES_REQUESTED', reviewNote: note },
    });
    if (existing.authorUserId) {
      try {
        const author = await prisma.user.findUnique({ where: { id: existing.authorUserId }, select: { name: true, email: true } });
        if (author) {
          const tpl = emailTemplates.articleChangesRequested({ userName: author.name, userEmail: author.email, title: existing.title, note });
          sendEmail(tpl.to, tpl.subject, tpl.html).catch(() => {});
        }
      } catch { /* el correo nunca bloquea */ }
    }
    res.json(article);
  } catch (err) { next(err); }
});
```

- [ ] **Step 4: `GET /public` (~línea 198).** Después de `findMany`, calcular `authorProfileSlug`: reunir los `authorUserId` no nulos, consultar `prisma.profile.findMany({ where: { userId: { in: ids }, published: true }, select: { userId: true, slug: true }, orderBy: { createdAt: 'asc' } })`, armar un mapa `userId -> primer slug`, y responder `articles.map(a => ({ ...a, authorProfileSlug: a.authorUserId ? map.get(a.authorUserId) ?? null : null }))`. Verificar que `Profile` tenga `createdAt`; si no, quitar el `orderBy`.

- [ ] **Step 5: `unpublish`** (~línea 309): un artículo de terapeuta despublicado vuelve a `DRAFT` como hoy; no cambiar.

- [ ] **Step 6: `npx tsc --noEmit` y commit**

```bash
git add backend/src/routes/articles.ts
git commit -m "feat: admin publica desde revision con categoria obligatoria, pide cambios y firma con enlace al perfil"
```

---

### Task 6: Frontend del terapeuta, "Mis artículos"

**Files:** Modify `frontend/src/hooks/useArticles.ts` (tipos); Create `frontend/src/hooks/useMyArticles.ts`, `frontend/src/components/articles/MyArticles.tsx`; Modify `frontend/src/pages/Dashboard.tsx`.

- [ ] **Step 1: Tipos.** En `useArticles.ts` cambiar `export type ArticleStatus = 'DRAFT' | 'PUBLISHED';` por `'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'PUBLISHED'`; en `interface Article` poner `categoryId: string | null;`, y agregar `authorUserId?: string | null; reviewNote?: string | null; submittedAt?: string | null; authorUser?: { id: string; name: string; email: string } | null;`. Corregir con `npx tsc -b` los usos de `article.category` y `categoryId` que ahora pueden ser nulos.

- [ ] **Step 2: `useMyArticles.ts`.** Siguiendo el estilo de `useArticles.ts` (hook con `useCallback` y el cliente `api`), exponer: `list()`, `create({ title, excerpt?, metaDescription?, coverImage? })`, `get(id)`, `update(id, data)`, `remove(id)`, `addBlock(id, data)`, `updateBlock(id, blockId, data)`, `deleteBlock(id, blockId)`, `swapBlocks(id, blockAId, blockBId)`, `submit(id)`, `withdraw(id)`, todo contra `/my-articles`.

- [ ] **Step 3: `MyArticles.tsx`.** Componente con las props de color del Dashboard (`C`, igual que `TalleresCursos`: leer `frontend/src/pages/TalleresCursos.tsx` para el patrón de props `{ C, isActive, isPro }` y de estilos) con dos vistas:
  - **Lista:** tarjetas con título, estado (insignias: Borrador, En revisión, Cambios solicitados, Publicado), fecha, y para `CHANGES_REQUESTED` la nota de César en un recuadro destacado. Botón "Nuevo artículo". Para usuarios Free (`isPro` falso): pantalla de invitación a Pro con enlace a `/pricing`, igual que otros módulos bloqueados.
  - **Editor:** campos título, extracto (máx. 300 con contador), meta descripción, portada (subida con `/upload/image`, igual que `ArticleEditor.tsx`; esperar a que termine antes de permitir guardar), y bloques reutilizando `BlockEditor.tsx` (leer su interfaz; si está acoplado a las rutas `/articles`, hacerlo configurable con una prop de "api" o "basePath" sin romper el uso del admin). Sin categoría, sin destacado, sin slug. Autor visible y no editable. Botones: Guardar, "Enviar a revisión". Si el estado es `PENDING_REVIEW`: solo lectura con "Retirar". Si es `PUBLISHED`: solo lectura con enlace a `/revista/<slug>` y el texto "Para hacer cambios, escríbenos a hola@aliax.io".
  - Todos los textos en español de México, sin guion largo; sin `border` en elementos nuevos; verificar claro/oscuro y móvil.

- [ ] **Step 4: Registrar la pestaña en `Dashboard.tsx`** siguiendo exactamente el patrón de `talleres`: ampliar `type Tab` (línea ~68), agregar el elemento al arreglo de pestañas (~línea 355) con un icono de `lucide-react` (por ejemplo `PenLine`) y etiqueta `Mis artículos`, y montar `<MyArticles ... />` en las dos zonas (móvil ~línea 755 y escritorio ~línea 1058) con `visitedMobile`/`activeTab` como `talleres`; agregar la entrada a la barra móvil (~línea 820).

- [ ] **Step 5: `npx tsc -b` desde `frontend/`, verificación visual** con `npx vite --port 5199 --strictPort` y capturas con Chrome sin ventana de la lista y del editor (no se puede iniciar sesión, así que verificar con una página temporal que monte `MyArticles` con datos simulados; borrarla después). Detener SOLO el servidor propio por puerto con PowerShell (`Get-NetTCPConnection -LocalPort 5199`), nunca matar todos los procesos de node.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat: pestaña Mis articulos para terapeutas Pro y Pro IA"
```

---

### Task 7: Bandeja "Por revisar" del administrador

**Files:** Modify `frontend/src/hooks/useArticles.ts` (agregar `requestChanges(id, note)`), `frontend/src/components/admin/AdminRevista.tsx`, `frontend/src/components/admin/ArticleEditor.tsx` (leer cómo elige la categoría).

- [ ] **Step 1:** En `useArticles.ts` agregar `requestChanges(id: string, note: string)` con `PATCH /articles/:id/request-changes`.
- [ ] **Step 2:** En `AdminRevista.tsx`, en la vista de Artículos agregar un filtro/pestaña **"Por revisar (N)"** que liste los `PENDING_REVIEW` con autor (`authorUser.name`), título y fecha de envío; resaltar el contador cuando N > 0. Los artículos de terapeutas en cualquier estado muestran una insignia con el nombre del autor.
- [ ] **Step 3:** Al abrir un artículo de terapeuta (usar `ArticleEditor` existente), mostrar un bloque de revisión: selector de categoría (obligatorio, de las categorías activas; reutilizar el selector que ya existe en el editor), botón **"Publicar"** (deshabilitado sin categoría; guarda la categoría y llama a `publishArticle`) y botón **"Pedir cambios"** que abre un cuadro con una nota obligatoria (3 a 2000 caracteres) y llama a `requestChanges`. Mostrar los mensajes de error del backend, no genéricos.
- [ ] **Step 4:** `npx tsc -b`, capturas con datos simulados como en Task 6, commit:

```bash
git add frontend/src
git commit -m "feat: bandeja Por revisar con publicar y pedir cambios en el panel de administrador"
```

---

### Task 8: Firma con enlace al perfil en la Revista pública

**Files:** Modify `frontend/scripts/generate-blog.ts` (tipo `Article` ~línea 33 y la línea ~133 `const name = a.author || 'Aliax'`).

- [ ] **Step 1:** Agregar `authorProfileSlug?: string | null` al tipo. Donde se renderiza la firma (byline), si existe `authorProfileSlug`, envolver el nombre en un `<a href="https://www.aliax.io/${slug}" ...>` con el mismo estilo de enlace de la página (color `#0d9488`, sin subrayado agresivo), escapando el nombre y el slug como hace el resto del archivo. Sin slug, el nombre queda como texto.
- [ ] **Step 2:** Verificación local: ejecutar el generador contra una respuesta simulada (no contra producción con datos reales de terapeutas) o con la API real solo en lectura; comprobar que el HTML de un artículo con `authorProfileSlug` contiene el enlace y que uno sin él queda igual que antes. Documentar cómo se ejecutó.
- [ ] **Step 3:** `npx tsc -b` y commit:

```bash
git add frontend/scripts/generate-blog.ts
git commit -m "feat: firma de autor con enlace al perfil en la Revista"
```

---

### Task 9: Revisión final, base de datos de producción, despliegue y recorrido completo (lo hace el controlador, con César)

- [ ] **Step 1: Revisión final** de toda la rama (subagente revisor sobre `git diff master...HEAD`): permisos (un terapeuta nunca toca artículos ajenos ni publicados), que ninguna ruta pública devuelva artículos no publicados, escape de HTML en correos, y que `categoryId` nulo no rompa listados.
- [ ] **Step 2: PEDIR AUTORIZACIÓN EXPLÍCITA a César** y luego aplicar el SQL de la migración a la base de producción compartida con el procedimiento de las migraciones anteriores de Revista (`prisma db push` más `prisma migrate resolve --applied 20261116120000_article_therapist_authors`), sin pegar credenciales en el chat. Verificar con una consulta que las columnas y los valores de enum existen.
- [ ] **Step 3: Mergear a `master`, `git push origin master`** (siempre, para que la reconstrucción de la Revista no revierta el sitio), **desplegar backend primero** (`backend/`, `npx vercel --prod`) y comprobar `/api/health` y que `POST /api/my-articles` sin sesión responde 401. Con confirmación de César por separado, **desplegar el frontend desde la raíz del repo** (`npx vercel --prod`, proyecto "aura") y `npx vercel promote <url> --scope cesars-projects-ddd06b7a`; verificar que `www.aliax.io` sirve el bundle nuevo.
- [ ] **Step 4: Recorrido con una cuenta de prueba Pro** (con César): crear, escribir, enviar, recibir el correo, pedir cambios, ver la nota, reenviar, publicar con categoría, comprobar el correo de aprobación y la firma con enlace en `/revista/<slug>`. Usar un artículo de prueba y borrarlo después; nunca tocar artículos reales de la Revista.
- [ ] **Step 5: Guardar el avance en memoria** (`project_aliax_monetizacion_contenido.md`) y quitar la nota de "tarjeta falsa hasta construir el módulo".

---

## Self-Review

- **Cobertura del spec:** modelo y estados (Task 1), reglas de estado (2), correos (3), rutas del terapeuta con plan Pro/Pro IA y propiedad (4), admin publica con categoría obligatoria, pide cambios, `/public` con perfil (5), pestaña "Mis artículos" y bloqueo tras publicar (6), bandeja "Por revisar" con categoría asignada solo por César (7), firma con enlace (8), despliegue con autorización y recorrido (9). Fuera de alcance respetado: sin IA, sin edición tras publicar.
- **Marcadores pendientes:** ninguno en las tareas de backend (código completo). Las tareas de frontend (6 y 7) describen la interfaz y los contratos con precisión pero el implementador debe leer `TalleresCursos.tsx`, `BlockEditor.tsx`, `ArticleEditor.tsx` y `AdminRevista.tsx` para igualar los patrones existentes; es deliberado, porque son componentes grandes que ya existen.
- **Consistencia de nombres:** `canAuthorEdit/Submit/Withdraw/Delete`, `validateForSubmit`, `createMyArticleSchema`, `updateMyArticleSchema`, `articleSubmittedAdmin`, `articleApproved`, `articleChangesRequested`, `authorUserId`, `reviewNote`, `submittedAt`, `authorProfileSlug` y `requestChanges` se usan con el mismo nombre en todas las tareas.
