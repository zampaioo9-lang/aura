# Revista Aliax — Blog (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Revista Aliax" — a blog with admin-only authoring (Category + Article + ArticleBlock), an editor in AdminPanel with reorderable text/image/button blocks, and public pages generated as static HTML at build time for SEO.

**Architecture:** Backend follows the exact `Offering`/`Module` pattern already in this codebase (Prisma models, zod validation, one router file, admin-gated CRUD + a public read-only endpoint). Frontend adds an AdminPanel tab (Tailwind, matching its existing light theme) with a block editor that reuses `useUpload`'s `uploadImage`. SEO is solved by a new build-time script that fetches published articles from the API and writes static `.html` files (same technique already used for `barberia.html`/`salon.html`), plus a generated `sitemap.xml`/`robots.txt`, wired into `vercel.json` rewrites.

**Tech Stack:** Express + Prisma + Zod (backend), React + Tailwind (AdminPanel), a small Node/TypeScript script run via `tsx` at build time (frontend).

**Design spec:** `docs/superpowers/specs/2026-10-29-revista-aliax-blog-design.md`

---

### Task 1: Prisma schema — Category, Article, ArticleBlock

**Files:**
- Modify: `backend/prisma/schema.prisma` (append at end of file)

- [ ] **Step 1: Append the new models and enums**

At the end of `backend/prisma/schema.prisma`, add:

```prisma
model Category {
  id       String            @id @default(cuid())
  name     String
  slug     String            @unique
  audience CategoryAudience
  active   Boolean           @default(true)
  order    Int               @default(0)
  articles Article[]

  @@index([audience])
}

enum CategoryAudience {
  PACIENTES
  TERAPEUTAS
}

model Article {
  id          String        @id @default(cuid())
  slug        String        @unique
  title       String
  excerpt     String
  categoryId  String
  coverImage  String?
  featured    Boolean       @default(false)
  status      ArticleStatus @default(DRAFT)
  publishedAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  category Category       @relation(fields: [categoryId], references: [id])
  blocks   ArticleBlock[]

  @@index([categoryId])
  @@index([status])
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
}

model ArticleBlock {
  id          String           @id @default(cuid())
  articleId   String
  order       Int
  type        ArticleBlockType
  text        String?
  imageUrl    String?
  imageAlt    String?
  buttonLabel String?
  buttonUrl   String?

  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@index([articleId])
}

enum ArticleBlockType {
  TEXT
  IMAGE
  BUTTON
}
```

- [ ] **Step 2: Create the migration**

Run from `backend/`:
```bash
npx prisma migrate dev --name add_revista_blog
```
Expected: a new folder under `backend/prisma/migrations/` (timestamp + `add_revista_blog`), and "Your database is now in sync with your schema."

- [ ] **Step 3: Regenerate the Prisma client**

```bash
npx prisma generate
```
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat: add Category/Article/ArticleBlock models for Revista Aliax blog"
```

---

### Task 2: Backend validation schemas

**Files:**
- Modify: `backend/src/utils/validation.ts` (append)

- [ ] **Step 1: Append zod schemas**

At the end of `backend/src/utils/validation.ts`:

```typescript
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres').max(80, 'Maximo 80 caracteres'),
  audience: z.enum(['PACIENTES', 'TERAPEUTAS'], {
    errorMap: () => ({ message: 'Audiencia no valida (PACIENTES o TERAPEUTAS)' }),
  }),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  active: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const createArticleSchema = z.object({
  title: z.string().min(3, 'Minimo 3 caracteres').max(150, 'Maximo 150 caracteres'),
  excerpt: z.string().min(10, 'Minimo 10 caracteres').max(300, 'Maximo 300 caracteres'),
  categoryId: z.string(),
  coverImage: z.string().url().optional().or(z.literal('')),
  featured: z.boolean().optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  excerpt: z.string().min(10).max(300).optional(),
  categoryId: z.string().optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  featured: z.boolean().optional(),
});

export const createArticleBlockSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'BUTTON'], {
    errorMap: () => ({ message: 'Tipo de bloque no valido (TEXT, IMAGE o BUTTON)' }),
  }),
  text: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  imageAlt: z.string().max(200).optional(),
  buttonLabel: z.string().max(60).optional(),
  buttonUrl: z.string().url().optional().or(z.literal('')),
}).refine(
  (data) => data.type !== 'TEXT' || !!data.text?.trim(),
  { message: 'Un bloque de texto requiere contenido' }
).refine(
  (data) => data.type !== 'IMAGE' || !!data.imageUrl,
  { message: 'Un bloque de imagen requiere subir una imagen primero (imageUrl)' }
).refine(
  (data) => data.type !== 'BUTTON' || (!!data.buttonLabel?.trim() && !!data.buttonUrl),
  { message: 'Un bloque de boton requiere texto y URL' }
);

export const updateArticleBlockSchema = z.object({
  text: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  imageAlt: z.string().max(200).optional(),
  buttonLabel: z.string().max(60).optional(),
  buttonUrl: z.string().url().optional().or(z.literal('')),
  order: z.number().int().min(1).optional(),
});
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/validation.ts
git commit -m "feat: add zod schemas for Category/Article/ArticleBlock"
```

---

### Task 3: Backend routes — categories

**Files:**
- Create: `backend/src/utils/slugify.ts`
- Create: `backend/src/routes/articles.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/api/index.ts`

**Note on the slugify helper:** both `Category` and `Article` need a URL-safe slug derived from a name/title with Spanish accents (á, é, í, ó, ú, ñ). Create the shared utility first so it's written once instead of copy-pasted into every route handler. Use `\p{Diacritic}` (a Unicode property escape, needs the `u` regex flag) to strip accents — do NOT write out a literal Unicode combining-mark character range by hand in source, since that range easily gets mangled into literal combining-mark bytes when copied through different editors/tools; `\p{Diacritic}` expresses the same idea without needing any literal non-ASCII bytes in the file.

- [ ] **Step 0: Create the shared slugify utility**

Create `backend/src/utils/slugify.ts`:

```typescript
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
```

- [ ] **Step 1: Create the router file with category routes**

Create `backend/src/routes/articles.ts`:

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminMiddleware } from '../middleware/adminAuth';
import {
  createCategorySchema, updateCategorySchema,
  createArticleSchema, updateArticleSchema,
  createArticleBlockSchema, updateArticleBlockSchema,
} from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { slugify } from '../utils/slugify';

const router = Router();
const prisma = new PrismaClient();

// All routes in this file except GET /public require auth + admin, mirroring
// how offerings.ts gates owner-only routes but with isAdmin instead of ownership
// (there is only one author in this phase: the Aliax admin).

// POST /api/articles/categories — Create category (auth, admin)
router.post('/categories', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const slug = slugify(data.name);
    const category = await prisma.category.create({ data: { ...data, slug } });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/categories — List all categories (auth, admin — includes inactive)
router.get('/categories', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: [{ audience: 'asc' }, { order: 'asc' }] });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/categories/:id — Update category (auth, admin)
router.put('/categories/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Mount the router**

In `backend/src/index.ts`, find the line `app.use('/api/exchange-rate', exchangeRateRoutes);` and add directly after it:
```typescript
app.use('/api/articles', articleRoutes);
```
And near the top with the other route imports, add:
```typescript
import articleRoutes from './routes/articles';
```

In `backend/api/index.ts`, find the block requiring `exchangeRateRoutes` (around the other `require('../src/routes/...')` lines) and add:
```typescript
const articleRoutes = require('../src/routes/articles').default;
```
Then find `app.use('/api/exchange-rate', exchangeRateRoutes);` in that same file and add directly after it:
```typescript
app.use('/api/articles', articleRoutes);
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/articles.ts backend/src/index.ts backend/api/index.ts
git commit -m "feat: add category CRUD routes for Revista Aliax"
```

---

### Task 4: Backend routes — articles and blocks

**Files:**
- Modify: `backend/src/routes/articles.ts`

- [ ] **Step 1: Add article CRUD routes**

In `backend/src/routes/articles.ts`, insert before the final `export default router;` line:

```typescript
// POST /api/articles — Create article (auth, admin). Starts as DRAFT.
router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createArticleSchema.parse(req.body);
    const slug = slugify(data.title);
    const article = await prisma.article.create({
      data: { ...data, slug, coverImage: data.coverImage || undefined },
    });
    res.status(201).json(article);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles — List all articles, draft + published (auth, admin)
router.get('/', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/public — Published articles only, with category + ordered blocks.
// This is the endpoint the build-time static-generation script calls. No auth.
router.get('/public', async (_req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true, blocks: { orderBy: { order: 'asc' } } },
      orderBy: { publishedAt: 'desc' },
    });
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/:id — Get one article with blocks (auth, admin — for the editor)
router.get('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { category: true, blocks: { orderBy: { order: 'asc' } } },
    });
    if (!article) throw new AppError(404, 'Articulo no encontrado');
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/:id — Update article metadata (auth, admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = updateArticleSchema.parse(req.body);
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { ...data, coverImage: data.coverImage || undefined },
    });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/publish — Publish (auth, admin)
router.patch('/:id/publish', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await triggerBlogRebuild();
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/unpublish — Unpublish (auth, admin)
router.patch('/:id/unpublish', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT' },
    });
    await triggerBlogRebuild();
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id — Delete (auth, admin). Cascades blocks.
router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    await prisma.article.delete({ where: { id: req.params.id } });
    if (existing?.status === 'PUBLISHED') await triggerBlogRebuild();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/articles/:id/blocks — Add block (auth, admin)
router.post('/:id/blocks', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createArticleBlockSchema.parse(req.body);
    const currentCount = await prisma.articleBlock.count({ where: { articleId: req.params.id } });
    const block = await prisma.articleBlock.create({
      data: { ...data, articleId: req.params.id, order: currentCount + 1 },
    });
    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/:id/blocks/:blockId — Update block, including reorder (auth, admin)
router.put('/:id/blocks/:blockId', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = updateArticleBlockSchema.parse(req.body);
    const block = await prisma.articleBlock.update({ where: { id: req.params.blockId }, data });
    res.json(block);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id/blocks/:blockId — Delete block (auth, admin)
router.delete('/:id/blocks/:blockId', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await prisma.articleBlock.delete({ where: { id: req.params.blockId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Add the deploy-hook trigger helper**

In the same file, right after the `const prisma = new PrismaClient();` line, add:

```typescript
// Publishing/unpublishing/deleting a published article must regenerate the static
// /revista HTML (see Task 10). We trigger that by calling a Vercel Deploy Hook.
// A failure here must NEVER fail the request — the DB write already succeeded, and
// the only consequence of a missed deploy is a stale public page, corrected by the
// next publish action or a manual deploy. Retry once, then just log.
async function triggerBlogRebuild(): Promise<void> {
  const hookUrl = process.env.BLOG_DEPLOY_HOOK_URL;
  if (!hookUrl) return;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(hookUrl, { method: 'POST' });
      if (res.ok) return;
    } catch {
      // fall through to retry/log below
    }
  }
  console.warn('[Revista] No se pudo disparar el deploy hook tras 2 intentos');
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/articles.ts
git commit -m "feat: add article and block CRUD routes, plus deploy-hook trigger"
```

---

### Task 5: Seed the initial categories

**Files:**
- Create: `backend/seed-revista-categories.tmp.ts` (temporary, run once, deleted after use — NOT committed)

- [ ] **Step 1: Write and run the seed script**

Create `backend/seed-revista-categories.tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { slugify } from './src/utils/slugify';

const prisma = new PrismaClient();

const PACIENTES = [
  'Terapia', 'Ansiedad y estres', 'Animo y depresion', 'Pareja',
  'Familia y crianza', 'Autoestima y limites', 'Duelo y cambios de vida',
  'Trabajo y burnout', 'Sexualidad',
];

const TERAPEUTAS = [
  'Marca personal y marketing', 'Primeros pasos profesionales',
  'Gestion de la practica', 'Actualizacion profesional',
  'Autocuidado del terapeuta',
];

async function main() {
  for (const [i, name] of PACIENTES.entries()) {
    await prisma.category.create({
      data: { name, slug: slugify(name), audience: 'PACIENTES', order: i },
    });
  }
  for (const [i, name] of TERAPEUTAS.entries()) {
    await prisma.category.create({
      data: { name, slug: slugify(name), audience: 'TERAPEUTAS', order: i },
    });
  }
  const all = await prisma.category.findMany({ orderBy: [{ audience: 'asc' }, { order: 'asc' }] });
  console.log(JSON.stringify(all.map(c => ({ name: c.name, audience: c.audience })), null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Run:
```bash
cd backend && npx tsx seed-revista-categories.tmp.ts
```
Expected: JSON output listing all 14 categories (9 PACIENTES, 5 TERAPEUTAS).

- [ ] **Step 2: Delete the temporary script**

```bash
rm backend/seed-revista-categories.tmp.ts
```

This task has no commit — it only seeds the shared Neon database (same database for dev and prod, per established project convention), it does not change any file in the repo.

---

### Task 6: Frontend hook — useArticles

**Files:**
- Create: `frontend/src/hooks/useArticles.ts`

- [ ] **Step 1: Write the hook**

Create `frontend/src/hooks/useArticles.ts`, mirroring `frontend/src/hooks/useOfferings.ts`'s shape (interfaces + `useCallback`-wrapped CRUD functions, no auto-fetch-on-mount):

```typescript
import { useCallback } from 'react';
import api from '../api/client';

export type CategoryAudience = 'PACIENTES' | 'TERAPEUTAS';
export type ArticleStatus = 'DRAFT' | 'PUBLISHED';
export type ArticleBlockType = 'TEXT' | 'IMAGE' | 'BUTTON';

export interface Category {
  id: string;
  name: string;
  slug: string;
  audience: CategoryAudience;
  active: boolean;
  order: number;
}

export interface ArticleBlock {
  id: string;
  articleId: string;
  order: number;
  type: ArticleBlockType;
  text: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  categoryId: string;
  category?: Category;
  coverImage: string | null;
  featured: boolean;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  blocks?: ArticleBlock[];
}

export interface CreateCategoryData { name: string; audience: CategoryAudience }
export interface UpdateCategoryData { name?: string; active?: boolean; order?: number }

export interface CreateArticleData {
  title: string; excerpt: string; categoryId: string; coverImage?: string; featured?: boolean;
}
export interface UpdateArticleData {
  title?: string; excerpt?: string; categoryId?: string; coverImage?: string; featured?: boolean;
}

export interface CreateArticleBlockData {
  type: ArticleBlockType; text?: string; imageUrl?: string; imageAlt?: string;
  buttonLabel?: string; buttonUrl?: string;
}
export interface UpdateArticleBlockData {
  text?: string; imageUrl?: string; imageAlt?: string;
  buttonLabel?: string; buttonUrl?: string; order?: number;
}

export function useArticles() {
  const listCategories = useCallback(async (): Promise<Category[]> => {
    const res = await api.get('/articles/categories');
    return res.data;
  }, []);

  const createCategory = useCallback(async (data: CreateCategoryData): Promise<Category> => {
    const res = await api.post('/articles/categories', data);
    return res.data;
  }, []);

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryData): Promise<Category> => {
    const res = await api.put(`/articles/categories/${id}`, data);
    return res.data;
  }, []);

  const listArticles = useCallback(async (): Promise<Article[]> => {
    const res = await api.get('/articles');
    return res.data;
  }, []);

  const getArticle = useCallback(async (id: string): Promise<Article> => {
    const res = await api.get(`/articles/${id}`);
    return res.data;
  }, []);

  const createArticle = useCallback(async (data: CreateArticleData): Promise<Article> => {
    const res = await api.post('/articles', data);
    return res.data;
  }, []);

  const updateArticle = useCallback(async (id: string, data: UpdateArticleData): Promise<Article> => {
    const res = await api.put(`/articles/${id}`, data);
    return res.data;
  }, []);

  const publishArticle = useCallback(async (id: string): Promise<Article> => {
    const res = await api.patch(`/articles/${id}/publish`);
    return res.data;
  }, []);

  const unpublishArticle = useCallback(async (id: string): Promise<Article> => {
    const res = await api.patch(`/articles/${id}/unpublish`);
    return res.data;
  }, []);

  const deleteArticle = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/articles/${id}`);
  }, []);

  const createBlock = useCallback(async (articleId: string, data: CreateArticleBlockData): Promise<ArticleBlock> => {
    const res = await api.post(`/articles/${articleId}/blocks`, data);
    return res.data;
  }, []);

  const updateBlock = useCallback(async (articleId: string, blockId: string, data: UpdateArticleBlockData): Promise<ArticleBlock> => {
    const res = await api.put(`/articles/${articleId}/blocks/${blockId}`, data);
    return res.data;
  }, []);

  const deleteBlock = useCallback(async (articleId: string, blockId: string): Promise<void> => {
    await api.delete(`/articles/${articleId}/blocks/${blockId}`);
  }, []);

  return {
    listCategories, createCategory, updateCategory,
    listArticles, getArticle, createArticle, updateArticle,
    publishArticle, unpublishArticle, deleteArticle,
    createBlock, updateBlock, deleteBlock,
  };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors (the AdminPanel tab that uses this hook doesn't exist yet, so nothing calls it yet — this step just confirms the file itself is valid TypeScript).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useArticles.ts
git commit -m "feat: add useArticles hook for Revista Aliax CMS"
```

---

### Task 7: AdminPanel — register the "Revista" tab and build Categories view

**Files:**
- Modify: `frontend/src/pages/AdminPanel.tsx`
- Create: `frontend/src/components/admin/AdminRevista.tsx`

**Context:** `AdminPanel.tsx` is already 2000+ lines with its 3 existing tabs (Resumen/Usuarios/Comunicación) built inline. Per the file-structure guidance in this plan, the new tab's UI goes in its own component instead of growing that file further — `AdminRevista.tsx` owns both the Categories and Articles sub-views (next task), matching AdminPanel's light Tailwind theme (not the dark `C`-prop theme used in the Dashboard's Talleres/Cursos components — AdminPanel has never used that pattern).

- [ ] **Step 1: Create `AdminRevista.tsx` with the Categories sub-view**

Create `frontend/src/components/admin/AdminRevista.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Newspaper, Tag, Plus } from 'lucide-react';
import { useArticles, type Category, type CategoryAudience } from '../../hooks/useArticles';
import { useToast } from '../Toast';

export default function AdminRevista() {
  const { listCategories, createCategory, updateCategory } = useArticles();
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<'categorias' | 'articulos'>('articulos');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newAudience, setNewAudience] = useState<CategoryAudience>('PACIENTES');
  const [creating, setCreating] = useState(false);

  const loadCategories = async () => {
    try {
      setCategories(await listCategories());
    } catch {
      toast('No se pudieron cargar las categorias', 'error');
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const handleCreateCategory = async () => {
    if (newName.trim().length < 2) {
      toast('El nombre debe tener al menos 2 caracteres', 'error');
      return;
    }
    setCreating(true);
    try {
      await createCategory({ name: newName.trim(), audience: newAudience });
      setNewName('');
      await loadCategories();
      toast('Categoria creada', 'success');
    } catch {
      toast('No se pudo crear la categoria', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory(category.id, { active: !category.active });
      await loadCategories();
    } catch {
      toast('No se pudo actualizar la categoria', 'error');
    }
  };

  const pacientes = categories.filter(c => c.audience === 'PACIENTES');
  const terapeutas = categories.filter(c => c.audience === 'TERAPEUTAS');

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setSubTab('articulos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${subTab === 'articulos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          <Newspaper size={15} /> Articulos
        </button>
        <button
          onClick={() => setSubTab('categorias')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${subTab === 'categorias' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          <Tag size={15} /> Categorias
        </button>
      </div>

      {subTab === 'categorias' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Nueva categoria</h3>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64"
                  placeholder="Ej. Ansiedad y estres"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Audiencia</label>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value as CategoryAudience)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="PACIENTES">Pacientes</option>
                  <option value="TERAPEUTAS">Terapeutas</option>
                </select>
              </div>
              <button
                onClick={handleCreateCategory}
                disabled={creating}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={15} /> {creating ? 'Creando...' : 'Agregar'}
              </button>
            </div>
          </div>

          {([['Pacientes', pacientes], ['Terapeutas', terapeutas]] as const).map(([label, list]) => (
            <div key={label} className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">{label}</h3>
              <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
                {list.map(category => (
                  <div key={category.id} className="flex items-center justify-between px-4 py-3">
                    <span className={`text-sm ${category.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{category.name}</span>
                    <button
                      onClick={() => handleToggleActive(category)}
                      className={`text-xs font-medium px-3 py-1 rounded-full ${category.active ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {category.active ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                ))}
                {list.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">Sin categorias aun.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'articulos' && <div>{/* Task 8 fills this in */}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Register the tab in AdminPanel.tsx**

In `frontend/src/pages/AdminPanel.tsx`:

1. Add to the imports near the top:
```typescript
import AdminRevista from '../components/admin/AdminRevista';
```
2. Add `'revista'` to the `pageTab` union type (line ~496):
```typescript
const [pageTab, setPageTab] = useState<'resumen' | 'usuarios' | 'comunicacion' | 'revista'>('usuarios');
```
3. Add a 4th entry to the tabs array (around line 911-913, right after the `comunicacion` entry):
```typescript
{ id: 'revista' as const, label: 'Revista', icon: Newspaper },
```
   (Add `Newspaper` to the `lucide-react` import list at the top of the file, alongside the existing icon imports.)
4. Find where `{pageTab === 'usuarios' && (...)}`  is rendered (line ~1392) and, as a sibling block at the same level, add:
```tsx
{pageTab === 'revista' && <AdminRevista />}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AdminPanel.tsx frontend/src/components/admin/AdminRevista.tsx
git commit -m "feat: add Revista tab to AdminPanel with category management"
```

---

### Task 8: AdminPanel — Articles list view

**Files:**
- Modify: `frontend/src/components/admin/AdminRevista.tsx`

- [ ] **Step 1: Add article listing state and fetch**

In `AdminRevista.tsx`, extend the hook destructure and add state (near the top of the component, alongside the existing `categories` state):

```typescript
const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle } = useArticles();
```
(replacing the Task 7 destructure, which only had the category functions)

```typescript
const [articles, setArticles] = useState<Article[]>([]);
const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
const [creatingArticle, setCreatingArticle] = useState(false);

const loadArticles = async () => {
  try {
    setArticles(await listArticles());
  } catch {
    toast('No se pudieron cargar los articulos', 'error');
  }
};

useEffect(() => { loadArticles(); }, []);
```

Add `Article` to the type-only import at the top:
```typescript
import { useArticles, type Category, type CategoryAudience, type Article } from '../../hooks/useArticles';
```

- [ ] **Step 2: Replace the articles sub-tab placeholder**

Replace the `{subTab === 'articulos' && <div>{/* Task 8 fills this in */}</div>}` block with:

**Note:** use the same inline-style-with-`C`-prop convention Task 7's fix-up already established for this file (`AdminRevista` now takes `C: Colors` as a prop) — do NOT use Tailwind color classes here (no `bg-white`/`text-slate-*`/etc.), since AdminPanel.tsx has a real dark/light theme toggle that every tab must respect.

```tsx
{subTab === 'articulos' && (
  <div>
    {editingArticleId || creatingArticle ? (
      <div>{/* Task 9/10 fill in the editor here */}</div>
    ) : (
      <>
        <button
          onClick={() => setCreatingArticle(true)}
          style={{
            marginBottom: 16, padding: '9px 18px', background: C.accent, border: 'none',
            borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Plus size={15} /> Nuevo articulo
        </button>
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12 }}>
          {articles.map((article, i) => (
            <div
              key={article.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${C.cardBorder}`,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{article.title}</p>
                <p style={{ fontSize: 12, color: C.textFaint, margin: 0 }}>{article.category?.name ?? ''}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
                  background: article.status === 'PUBLISHED' ? C.accentLight : C.tableRowAlt,
                  color: article.status === 'PUBLISHED' ? C.accent : C.textMuted,
                }}>
                  {article.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                </span>
                <button
                  onClick={() => setEditingArticleId(article.id)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                    border: 'none', background: C.tableRowAlt, color: C.textMuted, cursor: 'pointer',
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (article.status === 'PUBLISHED') await unpublishArticle(article.id);
                      else await publishArticle(article.id);
                      await loadArticles();
                    } catch (err: any) {
                      toast(err.message, 'error');
                    }
                  }}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                    border: 'none', background: C.tableRowAlt, color: C.textMuted, cursor: 'pointer',
                  }}
                >
                  {article.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`¿Borrar "${article.title}"?`)) return;
                    try {
                      await deleteArticle(article.id);
                      await loadArticles();
                    } catch (err: any) {
                      toast(err.message, 'error');
                    }
                  }}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                    border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer',
                  }}
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
          {articles.length === 0 && <p style={{ padding: '12px 16px', fontSize: 14, color: C.textFaint }}>Sin articulos aun.</p>}
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/AdminRevista.tsx
git commit -m "feat: add article list view with publish/unpublish/delete to Revista tab"
```

---

### Task 9: AdminPanel — Article editor (metadata)

**Files:**
- Create: `frontend/src/components/admin/ArticleEditor.tsx`
- Modify: `frontend/src/components/admin/AdminRevista.tsx`

- [ ] **Step 1: Create the editor component (metadata fields only — blocks come in Task 10)**

**Note:** use the same inline-style-with-`C`-prop convention as `AdminRevista.tsx` (not Tailwind color classes) — see Task 7's fix-up for why.

Create `frontend/src/components/admin/ArticleEditor.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useArticles, type Article, type Category } from '../../hooks/useArticles';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../Toast';
import BlockEditor from './BlockEditor';

interface Colors {
  page: string; header: string; headerBorder: string; card: string; cardBorder: string;
  text: string; textMuted: string; textFaint: string; tableHdr: string; tableRow: string;
  tableRowAlt: string; tableRowHover: string; expandedBg: string; inputBg: string;
  inputBorder: string; subCard: string; subCardShadow: string; accent: string; accentLight: string;
}

interface Props {
  C: Colors;
  articleId: string | null; // null = creating a new one
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ArticleEditor({ C, articleId, categories, onClose, onSaved }: Props) {
  const { getArticle, createArticle, updateArticle } = useArticles();
  const { uploadImage, uploading } = useUpload();
  const { toast } = useToast();

  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    getArticle(articleId).then(a => {
      setArticle(a);
      setTitle(a.title);
      setExcerpt(a.excerpt);
      setCategoryId(a.categoryId);
      setCoverImage(a.coverImage || '');
      setFeatured(a.featured);
    });
  }, [articleId]);

  const activeCategories = categories.filter(c => c.active);
  const pacientes = activeCategories.filter(c => c.audience === 'PACIENTES');
  const terapeutas = activeCategories.filter(c => c.audience === 'TERAPEUTAS');

  const handleCoverUpload = async (file: File) => {
    const result = await uploadImage(file);
    if (result) setCoverImage(result.url);
  };

  const handleSave = async () => {
    if (title.trim().length < 3) { toast('El titulo debe tener al menos 3 caracteres', 'error'); return; }
    if (excerpt.trim().length < 10) { toast('El extracto debe tener al menos 10 caracteres', 'error'); return; }
    if (!categoryId) { toast('Elige una categoria', 'error'); return; }

    setSaving(true);
    try {
      if (!article) {
        const created = await createArticle({
          title: title.trim(), excerpt: excerpt.trim(), categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(created);
      } else {
        const updated = await updateArticle(article.id, {
          title: title.trim(), excerpt: excerpt.trim(), categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(updated);
      }
      toast('Guardado', 'success');
      onSaved();
    } catch {
      toast('No se pudo guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4, marginTop: 14,
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 24 }}>
      <button onClick={onClose} style={{ fontSize: 13, color: C.textFaint, marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Volver a articulos</button>

      <label style={lbl}>Titulo</label>
      <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titulo del articulo" />

      <label style={lbl}>Extracto</label>
      <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Resumen corto, se usa en el listado" />

      <label style={lbl}>Categoria</label>
      <select style={inp} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">Elige una categoria</option>
        <optgroup label="Pacientes">
          {pacientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
        <optgroup label="Terapeutas">
          {terapeutas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      </select>

      <label style={lbl}>Imagen de portada</label>
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
      {uploading && <p style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>Subiendo...</p>}
      {coverImage && !uploading && <img src={coverImage} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 14, color: C.text }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Destacado (tarjeta grande en el listado)
      </label>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 20, padding: '9px 18px', background: C.accent, border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Guardando...' : article ? 'Guardar cambios' : 'Crear articulo'}
      </button>

      {article && <BlockEditor C={C} articleId={article.id} />}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `AdminRevista.tsx`**

Replace `<div>{/* Task 9/10 fill in the editor here */}</div>` with:

```tsx
<ArticleEditor
  C={C}
  articleId={creatingArticle ? null : editingArticleId}
  categories={categories}
  onClose={() => { setEditingArticleId(null); setCreatingArticle(false); }}
  onSaved={loadArticles}
/>
```

(`AdminRevista` already has `C` in scope as its own prop, per Task 7's fix-up — just pass it through.)

Add the import at the top of `AdminRevista.tsx`:
```typescript
import ArticleEditor from './ArticleEditor';
```

- [ ] **Step 3: Verify it compiles**

This will fail until Task 10 creates `BlockEditor.tsx` — that's expected and fine, Task 10 is next. Skip the `tsc --noEmit` check for this task and do it combined at the end of Task 10 instead.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/ArticleEditor.tsx frontend/src/components/admin/AdminRevista.tsx
git commit -m "feat: add article metadata editor to Revista tab"
```

---

### Task 10: AdminPanel — Block editor (reorderable TEXT/IMAGE/BUTTON)

**Files:**
- Create: `frontend/src/components/admin/BlockEditor.tsx`

- [ ] **Step 1: Create the block editor**

**Note:** use the same inline-style-with-`C`-prop convention as `AdminRevista.tsx`/`ArticleEditor.tsx` (not Tailwind color classes) — see Task 7's fix-up for why.

Create `frontend/src/components/admin/BlockEditor.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { useArticles, type ArticleBlock, type ArticleBlockType } from '../../hooks/useArticles';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../Toast';

interface Colors {
  page: string; header: string; headerBorder: string; card: string; cardBorder: string;
  text: string; textMuted: string; textFaint: string; tableHdr: string; tableRow: string;
  tableRowAlt: string; tableRowHover: string; expandedBg: string; inputBg: string;
  inputBorder: string; subCard: string; subCardShadow: string; accent: string; accentLight: string;
}

interface Props {
  C: Colors;
  articleId: string;
}

export default function BlockEditor({ C, articleId }: Props) {
  const { getArticle, createBlock, updateBlock, deleteBlock } = useArticles();
  const { uploadImage, uploading } = useUpload();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null);

  const loadBlocks = async () => {
    const article = await getArticle(articleId);
    setBlocks(article.blocks ?? []);
  };

  useEffect(() => { loadBlocks(); }, [articleId]);

  const handleAddBlock = async (type: ArticleBlockType) => {
    try {
      if (type === 'TEXT') await createBlock(articleId, { type, text: 'Escribe aqui...' });
      else if (type === 'BUTTON') await createBlock(articleId, { type, buttonLabel: 'Ver mas', buttonUrl: 'https://' });
      else await createBlock(articleId, { type, imageUrl: '', imageAlt: '' }); // IMAGE needs upload before it can be saved as non-empty; see handleImageUpload below
      await loadBlocks();
    } catch {
      toast('No se pudo agregar el bloque', 'error');
    }
  };

  const handleTextChange = async (block: ArticleBlock, text: string) => {
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, text } : b));
  };
  const handleTextBlur = async (block: ArticleBlock) => {
    try { await updateBlock(articleId, block.id, { text: block.text ?? '' }); } catch { toast('No se pudo guardar el texto', 'error'); }
  };

  const handleButtonChange = (block: ArticleBlock, field: 'buttonLabel' | 'buttonUrl', value: string) => {
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, [field]: value } : b));
  };
  const handleButtonBlur = async (block: ArticleBlock) => {
    try {
      await updateBlock(articleId, block.id, { buttonLabel: block.buttonLabel ?? '', buttonUrl: block.buttonUrl ?? '' });
    } catch { toast('No se pudo guardar el boton', 'error'); }
  };

  const handleImageUpload = async (block: ArticleBlock, file: File) => {
    const result = await uploadImage(file);
    if (!result) return;
    try {
      const updated = await updateBlock(articleId, block.id, { imageUrl: result.url });
      setBlocks(prev => prev.map(b => b.id === block.id ? updated : b));
    } catch { toast('No se pudo guardar la imagen', 'error'); }
  };

  const handleDelete = async (block: ArticleBlock) => {
    try {
      await deleteBlock(articleId, block.id);
      await loadBlocks();
    } catch { toast('No se pudo borrar el bloque', 'error'); }
  };

  // Mirrors moveModule's pattern in TalleresCursos.tsx: swap `order` on two adjacent
  // blocks via two PUT calls, with an in-flight guard against double-clicks, and a
  // reload on failure so the UI never shows a stale order after a partial failure.
  const moveBlock = async (block: ArticleBlock, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === block.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= blocks.length) return;
    const swapWith = blocks[swapIndex];

    setMovingBlockId(block.id);
    try {
      await updateBlock(articleId, block.id, { order: swapWith.order });
      await updateBlock(articleId, swapWith.id, { order: block.order });
      await loadBlocks();
    } catch {
      toast('No se pudo reordenar', 'error');
      await loadBlocks();
    } finally {
      setMovingBlockId(null);
    }
  };

  return (
    <div style={{ marginTop: 24, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Contenido</h3>

      {blocks.map((block, i) => (
        <div key={block.id} style={{ background: C.tableRowAlt, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: 'uppercase' }}>
              {block.type === 'TEXT' ? 'Texto' : block.type === 'IMAGE' ? 'Imagen' : 'Boton'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button disabled={i === 0 || movingBlockId === block.id} onClick={() => moveBlock(block, 'up')} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, opacity: (i === 0 || movingBlockId === block.id) ? 0.3 : 1 }}>
                <ArrowUp size={14} />
              </button>
              <button disabled={i === blocks.length - 1 || movingBlockId === block.id} onClick={() => moveBlock(block, 'down')} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, opacity: (i === blocks.length - 1 || movingBlockId === block.id) ? 0.3 : 1 }}>
                <ArrowDown size={14} />
              </button>
              <button onClick={() => handleDelete(block)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {block.type === 'TEXT' && (
            <textarea
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, minHeight: 80, outline: 'none' }}
              value={block.text ?? ''}
              onChange={(e) => handleTextChange(block, e.target.value)}
              onBlur={() => handleTextBlur(block)}
            />
          )}

          {block.type === 'IMAGE' && (
            <div>
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(block, e.target.files[0])} />
              {uploading && <p style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>Subiendo...</p>}
              {block.imageUrl && <img src={block.imageUrl} alt="" style={{ width: 128, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
            </div>
          )}

          {block.type === 'BUTTON' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none' }}
                placeholder="Texto del boton"
                value={block.buttonLabel ?? ''}
                onChange={(e) => handleButtonChange(block, 'buttonLabel', e.target.value)}
                onBlur={() => handleButtonBlur(block)}
              />
              <input
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none' }}
                placeholder="URL"
                value={block.buttonUrl ?? ''}
                onChange={(e) => handleButtonChange(block, 'buttonUrl', e.target.value)}
                onBlur={() => handleButtonBlur(block)}
              />
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => handleAddBlock('TEXT')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <Plus size={13} /> Texto
        </button>
        <button onClick={() => handleAddBlock('IMAGE')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <Plus size={13} /> Imagen
        </button>
        <button onClick={() => handleAddBlock('BUTTON')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <Plus size={13} /> Boton
        </button>
      </div>
    </div>
  );
}
```

**Note on the IMAGE block validation:** `createArticleBlockSchema` (Task 2) was already built WITHOUT a refine requiring `imageUrl` on IMAGE blocks (confirmed during Task 2's own review) — `handleAddBlock('IMAGE')` above, which creates one with `imageUrl: ''`, is already accepted by the backend as-is. No backend change needed for this task.

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/BlockEditor.tsx
git commit -m "feat: add reorderable block editor (text/image/button) to Revista articles"
```

---

### Task 11: Static generation script (SEO)

**Files:**
- Create: `frontend/scripts/generate-blog.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/vercel.json` (repo root `vercel.json`, not `backend/vercel.json`)

**Context:** This is the piece that makes the blog indexable. It runs once at the start of `npm run build`, fetches every published article from `GET /api/articles/public`, and writes static `.html` files that bake in the real `<title>`/`<meta description>`/`og:*` tags plus the rendered content — using the exact visual design already approved (dark `#080414` background, teal `#2dd4bf` accent, Bebas Neue + Urbanist fonts). `/barberia` and `/salon` in this same repo are the existing precedent for serving a static `.html` file outside the SPA.

- [ ] **Step 1: Add `tsx` as a frontend dev dependency**

```bash
cd frontend && npm install --save-dev tsx
```
Expected: `tsx` appears in `frontend/package.json`'s `devDependencies`.

- [ ] **Step 2: Write the generation script**

Create `frontend/scripts/generate-blog.ts`:

```typescript
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const API_URL = process.env.VITE_API_URL || 'https://api.aliax.io/api';
const SITE_URL = 'https://www.aliax.io';
const PUBLIC_DIR = join(__dirname, '..', 'public');

interface Category {
  id: string; name: string; slug: string; audience: 'PACIENTES' | 'TERAPEUTAS';
}
interface ArticleBlock {
  type: 'TEXT' | 'IMAGE' | 'BUTTON';
  text: string | null; imageUrl: string | null; imageAlt: string | null;
  buttonLabel: string | null; buttonUrl: string | null;
}
interface Article {
  id: string; slug: string; title: string; excerpt: string;
  coverImage: string | null; featured: boolean; publishedAt: string | null;
  category: Category; blocks: ArticleBlock[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageShell(title: string, description: string, canonical: string, ogImage: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${canonical}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Urbanist:wght@300;400;500;600;700;800&display=swap">
<style>
body{margin:0;background:#080414;font-family:'Urbanist',sans-serif;color:rgb(205,192,224)}
a{color:#2dd4bf;text-decoration:none}
h1,h2,h3{font-family:'Bebas Neue',sans-serif;color:#fff}
.ra-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
@media (max-width:860px){.ra-grid3{grid-template-columns:1fr}}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderNav(): string {
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:24px 64px;border-bottom:1px solid rgba(255,255,255,0.06)">
  <a href="/" style="display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(45,212,191,0.5);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:18px;color:#2dd4bf">A</div>
    <div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:#fff;line-height:1">ALIAX</div>
      <div style="font-size:10px;letter-spacing:0.15em;color:rgba(255,255,255,0.45);text-transform:uppercase">Salud Mental</div>
    </div>
  </a>
</div>`;
}

function renderBlock(block: ArticleBlock): string {
  if (block.type === 'TEXT') {
    return `<p style="margin:0 0 24px;font-size:17px;line-height:1.75;color:rgba(255,255,255,0.75)">${escapeHtml(block.text ?? '')}</p>`;
  }
  if (block.type === 'IMAGE') {
    return `<img src="${block.imageUrl}" alt="${escapeHtml(block.imageAlt ?? '')}" style="width:100%;border-radius:20px;margin:24px 0">`;
  }
  return `<div style="text-align:center;margin:32px 0"><a href="${block.buttonUrl}" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">${escapeHtml(block.buttonLabel ?? '')}</a></div>`;
}

function renderArticleCard(a: Article): string {
  return `<div style="border-radius:20px;overflow:hidden;background:#0e0920;box-shadow:0 10px 30px rgba(0,0,0,0.25)">
  <a href="/revista/${a.slug}">
    ${a.coverImage ? `<img src="${a.coverImage}" alt="" style="width:100%;height:160px;object-fit:cover;display:block">` : `<div style="height:160px;background:linear-gradient(135deg,#160d30,#1e1240)"></div>`}
  </a>
  <div style="padding:22px">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(45,212,191,0.12);color:#2dd4bf;font-size:10px;font-weight:700;text-transform:uppercase">${escapeHtml(a.category.name)}</span>
    <h4 style="font-size:16px;color:#fff;margin:10px 0 8px"><a href="/revista/${a.slug}" style="color:#fff">${escapeHtml(a.title)}</a></h4>
    <p style="font-size:13px;line-height:1.55;color:rgba(255,255,255,0.55)">${escapeHtml(a.excerpt)}</p>
  </div>
</div>`;
}

function generateListingPage(articles: Article[]): string {
  const cards = articles.map(renderArticleCard).join('\n');
  const body = `${renderNav()}
<div style="max-width:1200px;margin:0 auto;padding:64px 24px">
  <h1 style="font-size:48px;text-align:center;margin-bottom:40px">Revista Aliax</h1>
  <div class="ra-grid3">${cards}</div>
</div>`;
  return pageShell(
    'Revista Aliax — Ideas y recursos para tu bienestar',
    'Articulos escritos por psicologos de Aliax, para pacientes y terapeutas.',
    `${SITE_URL}/revista`,
    `${SITE_URL}/og-image.png`,
    body
  );
}

function generateArticlePage(a: Article): string {
  const blocksHtml = a.blocks.map(renderBlock).join('\n');
  const body = `${renderNav()}
<div style="max-width:680px;margin:0 auto;padding:64px 24px">
  <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:rgba(45,212,191,0.12);color:#2dd4bf;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:18px">${escapeHtml(a.category.name)}</span>
  <h1 style="font-size:40px;line-height:1.1;margin:0 0 24px">${escapeHtml(a.title)}</h1>
  ${a.coverImage ? `<img src="${a.coverImage}" alt="" style="width:100%;border-radius:24px;margin-bottom:32px">` : ''}
  ${blocksHtml}
</div>`;
  return pageShell(
    `${a.title} — Revista Aliax`,
    a.excerpt,
    `${SITE_URL}/revista/${a.slug}`,
    a.coverImage || `${SITE_URL}/og-image.png`,
    body
  );
}

function generateSitemap(articles: Article[]): string {
  const staticRoutes = ['', '/explorar', '/precios', '/revista'];
  const articleRoutes = articles.map(a => `/revista/${a.slug}`);
  const urls = [...staticRoutes, ...articleRoutes]
    .map(path => `  <url><loc>${SITE_URL}${path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const res = await fetch(`${API_URL}/articles/public`);
  if (!res.ok) throw new Error(`No se pudo obtener /articles/public: ${res.status}`);
  const articles: Article[] = await res.json();

  const revistaDir = join(PUBLIC_DIR, 'revista');
  if (!existsSync(revistaDir)) mkdirSync(revistaDir, { recursive: true });

  writeFileSync(join(revistaDir, 'index.html'), generateListingPage(articles));
  for (const article of articles) {
    writeFileSync(join(revistaDir, `${article.slug}.html`), generateArticlePage(article));
  }
  writeFileSync(join(PUBLIC_DIR, 'sitemap.xml'), generateSitemap(articles));
  writeFileSync(join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  console.log(`[Revista] Generados: ${articles.length} articulos, index, sitemap.xml, robots.txt`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Wire it into the build script**

In `frontend/package.json`, change the `"build"` script from:
```json
"build": "tsc -b && vite build",
```
to:
```json
"build": "tsx scripts/generate-blog.ts && tsc -b && vite build",
```

- [ ] **Step 4: Add rewrites to the root `vercel.json`**

In `vercel.json` (repo root, not `backend/vercel.json`), add two entries before the existing catch-all, so the file reads:
```json
{
  "rewrites": [
    { "source": "/barberia", "destination": "/barberia.html" },
    { "source": "/salon",    "destination": "/salon.html" },
    { "source": "/revista",  "destination": "/revista/index.html" },
    { "source": "/revista/:slug", "destination": "/revista/:slug.html" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ]
}
```

- [ ] **Step 5: Verify it compiles and runs against the live API**

```bash
cd frontend && npx tsc --noEmit
npx tsx scripts/generate-blog.ts
```
Expected: no TypeScript errors, and a log line like `[Revista] Generados: 0 articulos, index, sitemap.xml, robots.txt` (0 because no articles have been published yet — that's expected and correct; Task 12 publishes real test data to verify the non-empty case). Confirm the files exist:
```bash
ls frontend/public/revista/
cat frontend/public/sitemap.xml
cat frontend/public/robots.txt
```

- [ ] **Step 6: Commit**

```bash
git add frontend/scripts/generate-blog.ts frontend/package.json frontend/package-lock.json vercel.json
git commit -m "feat: generate static /revista pages, sitemap.xml and robots.txt at build time"
```

---

### Task 12: Nav link

**Files:**
- Modify: `frontend/src/components/landing/LandingHeader.tsx:9-12`

**Context:** Landing.tsx itself has no nav markup — it delegates to `LandingHeader.tsx`, which defines a single `NAV` array (currently Explorar + Precios) rendered in both the desktop nav and the mobile overlay menu. Adding one entry there updates both automatically, and propagates to every public page that renders `LandingHeader` (not just Landing.tsx).

- [ ] **Step 1: Add "Revista" to the NAV array**

In `frontend/src/components/landing/LandingHeader.tsx`, change:
```typescript
const NAV = [
  { label: 'Explorar', to: '/explorar' },
  { label: 'Precios',  to: '/pricing'  },
];
```
to:
```typescript
const NAV = [
  { label: 'Explorar', to: '/explorar' },
  { label: 'Precios',  to: '/pricing'  },
  { label: 'Revista',  to: '/revista'  },
];
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/LandingHeader.tsx
git commit -m "feat: add Revista link to main nav"
```

---

### Task 13: End-to-end verification and cleanup

**Files:** none (verification only, no code changes)

- [ ] **Step 1: Create test data**

Via the AdminPanel (logged in as the admin account) or a disposable `.tmp.ts` Prisma script (same convention used throughout this project): create 2 categories if none exist from Task 5's seed (reuse the seeded ones), create 2 test articles — one featured, one not — each with at least one TEXT, one IMAGE and one BUTTON block, and publish both.

- [ ] **Step 2: Verify the backend**

```bash
curl -s https://api.aliax.io/api/articles/public | head -c 1000
```
Expected: JSON array with the 2 published test articles, each with `category` and ordered `blocks`.

- [ ] **Step 3: Verify the generation script against real data**

```bash
cd frontend && npx tsx scripts/generate-blog.ts
```
Expected: `[Revista] Generados: 2 articulos, index, sitemap.xml, robots.txt`. Open `frontend/public/revista/<slug>.html` for one of the test articles in a text editor and confirm the `<title>`, `<meta description>`, and `og:*` tags contain the real test article's title/excerpt/cover image — not placeholders.

- [ ] **Step 4: Verify in the browser**

Run both dev servers locally (backend + frontend, project-local ports, following the convention used throughout this session), navigate to `/revista` and confirm the listing matches the approved mockup (dark theme, teal accent, category badges, featured card). Click into an article and confirm the blocks render in the correct order with the correct content.

- [ ] **Step 5: Clean up test data**

Delete the 2 test articles via the AdminPanel (or a disposable cleanup script), and independently re-query to confirm they're gone:
```bash
cd backend && npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.article.findMany({ where: { title: { contains: 'prueba' } } }).then(r => { console.log(JSON.stringify(r)); process.exit(0); });
"
```
Expected: `[]`.

- [ ] **Step 6: Re-run the generation script one final time to clear the test data from the built output**

```bash
cd frontend && npx tsx scripts/generate-blog.ts
```
Expected: `[Revista] Generados: 0 articulos, index, sitemap.xml, robots.txt` (or however many real articles remain, if any were kept intentionally).

- [ ] **Step 7: Stop any dev servers started during verification**

Confirm via `netstat` that the ports used are free again, following the process-ownership-check convention used throughout this project before killing anything.

This task has no commit — it's pure verification. If Step 2 or 3 reveal a bug, fix it as part of whichever earlier task owns that code, commit the fix there, and re-run this task's verification from the top.
