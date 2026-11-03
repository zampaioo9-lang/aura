# Revista Aliax — cerrar brecha visual de Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between the approved Revista Aliax mockup and what `frontend/scripts/generate-blog.ts` actually generates: featured-article hero with fallback, audience+category filter pills (plain JS), author/date/reading-time byline, a therapist-conversion CTA box on patient-audience articles, and a related-articles section — plus a new `Article.author` field and a fix for a CMS bug that silently saves a cover image as empty.

**Architecture:** Backend adds one nullable `author` column to the existing `Article` model (same shape as the `metaDescription` field added in Fase 1) and enforces it only at publish time, matching the existing "Agrega ... antes de publicar" pattern already used in `offerings.ts`. The CMS gets one new input and a one-line bug fix. All the public-page work is a single rewrite of `frontend/scripts/generate-blog.ts` — still plain server-rendered HTML with a small embedded `<script>` for the pill filters, no client framework, consistent with why this page is static in the first place (SEO, no JS required to see content).

**Tech Stack:** Express + Prisma + Zod (backend), React (AdminPanel CMS), a Node/TypeScript script run via `tsx` at build time (frontend), plain embedded JS for client-side filtering.

**Design spec:** `docs/superpowers/specs/2026-11-02-revista-aliax-fase1-gap-design.md`

---

### Task 1: Prisma schema — `Article.author`

**Files:**
- Modify: `backend/prisma/schema.prisma` (the `Article` model, currently at line 744)

- [ ] **Step 1: Add the column**

In `backend/prisma/schema.prisma`, change:
```prisma
model Article {
  id              String        @id @default(cuid())
  slug            String        @unique
  title           String
  excerpt         String
  metaDescription String?
  categoryId      String
  coverImage      String?
  featured        Boolean       @default(false)
```
to:
```prisma
model Article {
  id              String        @id @default(cuid())
  slug            String        @unique
  title           String
  excerpt         String
  metaDescription String?
  author          String?
  categoryId      String
  coverImage      String?
  featured        Boolean       @default(false)
```

- [ ] **Step 2: Create the migration**

Run from `backend/`:
```bash
npx prisma migrate dev --name add_article_author
```
Expected: a new folder under `backend/prisma/migrations/` and "Your database is now in sync with your schema." The generated SQL should be exactly:
```sql
-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "author" TEXT;
```

- [ ] **Step 3: Regenerate the Prisma client**

```bash
npx prisma generate
```
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat: add Article.author field"
```

---

### Task 2: Backend validation — accept `author`

**Files:**
- Modify: `backend/src/utils/validation.ts:333-349` (`createArticleSchema`, `updateArticleSchema`)

- [ ] **Step 1: Add the field to both schemas**

In `backend/src/utils/validation.ts`, change:
```typescript
export const createArticleSchema = z.object({
  title: z.string().min(3, 'Minimo 3 caracteres').max(150, 'Maximo 150 caracteres'),
  excerpt: z.string().min(10, 'Minimo 10 caracteres').max(300, 'Maximo 300 caracteres'),
  metaDescription: z.string().max(300, 'Maximo 300 caracteres').optional().or(z.literal('')),
  categoryId: z.string(),
  coverImage: z.string().url().optional().or(z.literal('')),
  featured: z.boolean().optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  excerpt: z.string().min(10).max(300).optional(),
  metaDescription: z.string().max(300).optional().or(z.literal('')),
  categoryId: z.string().optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  featured: z.boolean().optional(),
});
```
to:
```typescript
export const createArticleSchema = z.object({
  title: z.string().min(3, 'Minimo 3 caracteres').max(150, 'Maximo 150 caracteres'),
  excerpt: z.string().min(10, 'Minimo 10 caracteres').max(300, 'Maximo 300 caracteres'),
  metaDescription: z.string().max(300, 'Maximo 300 caracteres').optional().or(z.literal('')),
  author: z.string().max(100, 'Maximo 100 caracteres').optional().or(z.literal('')),
  categoryId: z.string(),
  coverImage: z.string().url().optional().or(z.literal('')),
  featured: z.boolean().optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  excerpt: z.string().min(10).max(300).optional(),
  metaDescription: z.string().max(300).optional().or(z.literal('')),
  author: z.string().max(100).optional().or(z.literal('')),
  categoryId: z.string().optional(),
  coverImage: z.string().url().optional().or(z.literal('')),
  featured: z.boolean().optional(),
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
git commit -m "feat: accept author on article create/update"
```

---

### Task 3: Backend — persist `author` and require it to publish

**Files:**
- Modify: `backend/src/routes/articles.ts:77-90` (`POST /`)
- Modify: `backend/src/routes/articles.ts:135-149` (`PUT /:id`)
- Modify: `backend/src/routes/articles.ts:151-165` (`PATCH /:id/publish`)

**Context:** `author` passes through the generic `data: { ...data, ... }` spreads in the create/update routes automatically — nothing to change there structurally, but both routes already list out specific fields in that spread alongside `...data` for `coverImage`/`metaDescription` (converting `''` to `undefined`), so this task only touches the publish route, which is where the actual enforcement belongs: the editor saves drafts with or without an author, and the "Publicar" button in the articles list (`AdminRevista.tsx`) calls `PATCH /:id/publish` with no body, so this is the only place that can reject an unauthored article at the point it goes live — matching the existing `offerings.ts` pattern of checking requirements inside the publish route itself, after fetching `existing`.

- [ ] **Step 1: Add the guard in the publish route**

In `backend/src/routes/articles.ts`, change:
```typescript
// PATCH /api/articles/:id/publish — Publish (auth, admin)
router.patch('/:id/publish', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Articulo no encontrado');
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
```
to:
```typescript
// PATCH /api/articles/:id/publish — Publish (auth, admin)
router.patch('/:id/publish', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Articulo no encontrado');
    if (!existing.author?.trim()) throw new AppError(400, 'Agrega un autor antes de publicar');
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
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/articles.ts
git commit -m "feat: require an author before an article can be published"
```

---

### Task 4: Frontend hook — `useArticles.ts` types

**Files:**
- Modify: `frontend/src/hooks/useArticles.ts:29-52` (`Article`, `CreateArticleData`, `UpdateArticleData`)

- [ ] **Step 1: Add `author` to the three interfaces**

In `frontend/src/hooks/useArticles.ts`, change:
```typescript
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  metaDescription: string | null;
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
export interface UpdateCategoryData { active?: boolean; order?: number }

export interface CreateArticleData {
  title: string; excerpt: string; metaDescription?: string; categoryId: string; coverImage?: string; featured?: boolean;
}
export interface UpdateArticleData {
  title?: string; excerpt?: string; metaDescription?: string; categoryId?: string; coverImage?: string; featured?: boolean;
}
```
to:
```typescript
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  metaDescription: string | null;
  author: string | null;
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
export interface UpdateCategoryData { active?: boolean; order?: number }

export interface CreateArticleData {
  title: string; excerpt: string; metaDescription?: string; author?: string; categoryId: string; coverImage?: string; featured?: boolean;
}
export interface UpdateArticleData {
  title?: string; excerpt?: string; metaDescription?: string; author?: string; categoryId?: string; coverImage?: string; featured?: boolean;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npx tsc -b
```
Expected: no errors. `author` is optional on all three interfaces, so no existing caller is broken by adding it — `ArticleEditor.tsx` doesn't need to change for this task to compile cleanly; it's updated to actually use the field in Task 5.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useArticles.ts
git commit -m "feat: add author to Article types"
```

---

### Task 5: CMS — Autor field + fix the upload-race bug

**Files:**
- Modify: `frontend/src/components/admin/ArticleEditor.tsx`

**Context:** This fixes the real bug behind the production article with no cover image: `handleSave` doesn't check `uploading` (from `useUpload`) before saving, so clicking "Guardar"/"Publicar" while the cover image is still mid-upload saves with `coverImage` still `''`. The fix is the same guard pattern already used for `saving`.

- [ ] **Step 1: Add `author` state and load it**

Change:
```typescript
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
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
      setMetaDescription(a.metaDescription || '');
      setCategoryId(a.categoryId);
      setCoverImage(a.coverImage || '');
      setFeatured(a.featured);
    }).catch(() => toast('No se pudo cargar el articulo', 'error'));
  }, [articleId]);
```
to:
```typescript
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [author, setAuthor] = useState('');
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
      setMetaDescription(a.metaDescription || '');
      setAuthor(a.author || '');
      setCategoryId(a.categoryId);
      setCoverImage(a.coverImage || '');
      setFeatured(a.featured);
    }).catch(() => toast('No se pudo cargar el articulo', 'error'));
  }, [articleId]);
```

- [ ] **Step 2: Pass `author` on create/update**

Change:
```typescript
      if (!article) {
        const created = await createArticle({
          title: title.trim(), excerpt: excerpt.trim(), metaDescription: metaDescription.trim() || undefined, categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(created);
      } else {
        const updated = await updateArticle(article.id, {
          title: title.trim(), excerpt: excerpt.trim(), metaDescription: metaDescription.trim() || undefined, categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(updated);
      }
```
to:
```typescript
      if (!article) {
        const created = await createArticle({
          title: title.trim(), excerpt: excerpt.trim(), metaDescription: metaDescription.trim() || undefined, author: author.trim() || undefined, categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(created);
      } else {
        const updated = await updateArticle(article.id, {
          title: title.trim(), excerpt: excerpt.trim(), metaDescription: metaDescription.trim() || undefined, author: author.trim() || undefined, categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(updated);
      }
```

- [ ] **Step 3: Add the "Autor" input and fix the save-button guard**

Change:
```typescript
      <label style={lbl}>Meta descripcion (SEO)</label>
      <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' }} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Opcional. Si la dejas vacia, se usa el Extracto. Esto es lo que aparece en Google y al compartir el enlace." maxLength={300} />

      <label style={lbl}>Categoria</label>
```
to:
```typescript
      <label style={lbl}>Meta descripcion (SEO)</label>
      <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' }} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Opcional. Si la dejas vacia, se usa el Extracto. Esto es lo que aparece en Google y al compartir el enlace." maxLength={300} />

      <label style={lbl}>Autor <span style={{ color: C.textFaint, fontWeight: 400 }}>(requerido para publicar)</span></label>
      <input style={inp} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ej. Cesar A." />

      <label style={lbl}>Categoria</label>
```

Then change:
```typescript
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
```
to:
```typescript
      <button
        onClick={handleSave}
        disabled={saving || uploading}
        style={{
          marginTop: 20, padding: '9px 18px', background: C.accent, border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: (saving || uploading) ? 'not-allowed' : 'pointer', opacity: (saving || uploading) ? 0.6 : 1,
        }}
      >
        {uploading ? 'Subiendo imagen...' : saving ? 'Guardando...' : article ? 'Guardar cambios' : 'Crear articulo'}
      </button>
```

- [ ] **Step 4: Verify it compiles**

```bash
cd frontend && npx tsc -b
```
Expected: no errors anywhere (this resolves the `ArticleEditor.tsx` errors left over from Task 4).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/ArticleEditor.tsx
git commit -m "feat: add Autor field to CMS, fix save-while-uploading race"
```

---

### Task 6: Static generation — rewrite `generate-blog.ts`

**Files:**
- Modify: `frontend/scripts/generate-blog.ts` (full rewrite)

**Context:** This is the single largest task — it replaces the whole file. All the new behavior (hero selection with fallback, audience+category pill filters, byline with reading time, therapist CTA box, related articles) lives here. `noUnusedLocals`/`noUnusedParameters` are both on in `tsconfig.node.json`, so every helper added here must also be called from the same commit — that's why this is one task instead of "helpers" and "wiring" split across two: a half-wired intermediate state won't compile.

- [ ] **Step 1: Replace the whole file**

Replace the full contents of `frontend/scripts/generate-blog.ts` with:

```typescript
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Unlike frontend/src/api/client.ts (which defaults to a relative '/api' -- safe in a
// browser, where it resolves against whatever host served the page), this script runs
// in Node at build time with no "current host" to resolve against, so a relative
// fallback makes no sense here. It falls back to the real production API so a plain
// `npm run build` works out of the box on Vercel (where VITE_API_URL is configured as
// a project env var) -- but that means a local/CI build that forgets to set
// VITE_API_URL will silently read real production articles. Warn loudly so that's
// never silent, even though we keep the fallback (removing it risks breaking the
// actual Vercel build if its env var setup doesn't match what we assume here).
if (!process.env.VITE_API_URL) {
  console.warn('[Revista] VITE_API_URL no esta configurada -- usando la API de produccion por defecto.');
}
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
  id: string; slug: string; title: string; excerpt: string; metaDescription: string | null;
  author: string | null; coverImage: string | null; featured: boolean; publishedAt: string | null;
  category: Category; blocks: ArticleBlock[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 200 words/min is the commonly cited average adult silent-reading speed -- there's no
// per-article field for this, it's always derived from the TEXT blocks at build time so
// it can never drift out of sync with the actual content.
function calculateReadingTime(blocks: ArticleBlock[]): number {
  const words = blocks
    .filter((b) => b.type === 'TEXT' && b.text)
    .reduce((sum, b) => sum + (b.text as string).trim().split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// Articles arrive already ordered publishedAt desc (API orderBy), so the first match in
// each of these is always the most recent one -- no extra sort needed here.
function selectFeatured(articles: Article[]): Article | null {
  if (articles.length === 0) return null;
  const featured = articles.filter((a) => a.featured);
  return featured.length > 0 ? featured[0] : articles[0];
}

function relatedArticles(all: Article[], current: Article): Article[] {
  return all
    .filter((a) => a.id !== current.id && a.category.audience === current.category.audience)
    .slice(0, 3);
}

function collectCategories(articles: Article[]): Category[] {
  const seen = new Map<string, Category>();
  for (const a of articles) {
    if (!seen.has(a.category.id)) seen.set(a.category.id, a.category);
  }
  return Array.from(seen.values());
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
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:url" content="${canonical}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Urbanist:wght@300;400;500;600;700;800&display=swap">
<style>
body{margin:0;background:#080414;font-family:'Urbanist',sans-serif;color:rgb(205,192,224)}
a{color:#2dd4bf;text-decoration:none}
h1,h2,h3{font-family:'Bebas Neue',sans-serif;color:#fff}
.ra-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.ra-pill{padding:8px 18px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;cursor:pointer;font-family:'Urbanist',sans-serif}
.ra-pill-active{background:#2dd4bf;border-color:#2dd4bf;color:#04201c}
@media (max-width:860px){.ra-grid3{grid-template-columns:1fr}#ra-hero{grid-template-columns:1fr !important}}
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

function renderByline(a: Article): string {
  const name = a.author || 'Aliax';
  const minutes = calculateReadingTime(a.blocks);
  return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.55)">
  <span style="width:28px;height:28px;border-radius:50%;background:rgba(45,212,191,0.15);color:#2dd4bf;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${escapeHtml(initials(name))}</span>
  <span>${escapeHtml(name)} · ${formatDate(a.publishedAt)} · ${minutes} min de lectura</span>
</div>`;
}

function renderTherapistCTA(): string {
  return `<div style="background:linear-gradient(135deg,rgba(45,212,191,0.08),rgba(13,148,136,0.04));border-radius:20px;padding:32px;text-align:center;margin:40px 0">
  <h3 style="font-size:20px;margin:0 0 8px">¿Quieres hablar con alguien?</h3>
  <p style="font-size:14px;color:rgba(255,255,255,0.65);margin:0 0 20px">Explora psicologos verificados en Aliax y agenda tu primera sesion.</p>
  <a href="/explorar" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">Explorar terapeutas</a>
</div>`;
}

function renderBlock(block: ArticleBlock): string {
  if (block.type === 'TEXT') {
    return `<p style="margin:0 0 24px;font-size:17px;line-height:1.75;color:rgba(255,255,255,0.75)">${escapeHtml(block.text ?? '')}</p>`;
  }
  if (block.type === 'IMAGE') {
    if (!block.imageUrl) return '';
    return `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.imageAlt ?? '')}" style="width:100%;border-radius:20px;margin:24px 0">`;
  }
  return `<div style="text-align:center;margin:32px 0"><a href="${escapeHtml(block.buttonUrl ?? '')}" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">${escapeHtml(block.buttonLabel ?? '')}</a></div>`;
}

function renderArticleCard(a: Article): string {
  return `<div data-audience="${a.category.audience}" data-category="${a.category.slug}" style="border-radius:20px;overflow:hidden;background:#0e0920;box-shadow:0 10px 30px rgba(0,0,0,0.25)">
  <a href="/revista/${a.slug}">
    ${a.coverImage ? `<img src="${escapeHtml(a.coverImage)}" alt="" style="width:100%;height:160px;object-fit:cover;display:block">` : `<div style="height:160px;background:linear-gradient(135deg,#160d30,#1e1240)"></div>`}
  </a>
  <div style="padding:22px">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(45,212,191,0.12);color:#2dd4bf;font-size:10px;font-weight:700;text-transform:uppercase">${escapeHtml(a.category.name)}</span>
    <h4 style="font-size:16px;color:#fff;margin:10px 0 8px"><a href="/revista/${a.slug}" style="color:#fff">${escapeHtml(a.title)}</a></h4>
    <p style="font-size:13px;line-height:1.55;color:rgba(255,255,255,0.55);margin:0 0 12px">${escapeHtml(a.excerpt)}</p>
    ${renderByline(a)}
  </div>
</div>`;
}

function renderRelatedCard(a: Article): string {
  return `<a href="/revista/${a.slug}" style="display:block;border-radius:16px;overflow:hidden;background:#0e0920">
  ${a.coverImage ? `<img src="${escapeHtml(a.coverImage)}" alt="" style="width:100%;height:120px;object-fit:cover;display:block">` : `<div style="height:120px;background:linear-gradient(135deg,#160d30,#1e1240)"></div>`}
  <div style="padding:16px">
    <h5 style="font-size:14px;color:#fff;margin:0">${escapeHtml(a.title)}</h5>
  </div>
</a>`;
}

function renderRelatedSection(related: Article[]): string {
  if (related.length === 0) return '';
  return `<div style="margin-top:56px">
  <h4 style="font-size:20px;margin-bottom:20px">Tambien te puede interesar</h4>
  <div class="ra-grid3">${related.map(renderRelatedCard).join('\n')}</div>
</div>`;
}

// Plain client-side filtering: every card and the hero carry data-audience/data-category
// attributes, and this script just toggles their display. No build step, no client
// framework -- consistent with the rest of this page being plain static HTML.
function renderPillsScript(): string {
  return `<script>
(function(){
  var audienceBtns = document.querySelectorAll('[data-filter-audience]');
  var categoryRow = document.getElementById('ra-category-row');
  var categoryBtns = categoryRow ? categoryRow.querySelectorAll('[data-filter-category]') : [];
  var items = document.querySelectorAll('[data-audience]');
  var activeAudience = 'ALL';
  var activeCategory = 'ALL';

  function applyFilter(){
    items.forEach(function(el){
      var matchAudience = activeAudience === 'ALL' || el.getAttribute('data-audience') === activeAudience;
      var matchCategory = activeCategory === 'ALL' || el.getAttribute('data-category') === activeCategory;
      el.style.display = (matchAudience && matchCategory) ? '' : 'none';
    });
  }

  function updateCategoryRow(){
    if (!categoryRow) return;
    if (activeAudience === 'ALL') {
      categoryRow.style.display = 'none';
    } else {
      categoryRow.style.display = 'flex';
      categoryBtns.forEach(function(b){
        b.style.display = (b.getAttribute('data-category-audience') === activeAudience) ? '' : 'none';
      });
    }
  }

  audienceBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      activeAudience = btn.getAttribute('data-filter-audience');
      activeCategory = 'ALL';
      audienceBtns.forEach(function(b){ b.classList.toggle('ra-pill-active', b === btn); });
      categoryBtns.forEach(function(b){ b.classList.remove('ra-pill-active'); });
      updateCategoryRow();
      applyFilter();
    });
  });

  categoryBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      activeCategory = btn.getAttribute('data-filter-category');
      categoryBtns.forEach(function(b){ b.classList.toggle('ra-pill-active', b === btn); });
      applyFilter();
    });
  });
})();
</script>`;
}

function generateListingPage(articles: Article[]): string {
  const hero = selectFeatured(articles);
  const rest = hero ? articles.filter((a) => a.id !== hero.id) : articles;
  const categories = collectCategories(articles);

  const heroHtml = hero ? `<div id="ra-hero" data-audience="${hero.category.audience}" data-category="${hero.category.slug}" style="border-radius:20px;overflow:hidden;background:#0e0920;box-shadow:0 10px 30px rgba(0,0,0,0.25);display:grid;grid-template-columns:1fr 1fr;margin-bottom:56px">
  <a href="/revista/${hero.slug}">
    ${hero.coverImage ? `<img src="${escapeHtml(hero.coverImage)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : `<div style="min-height:320px;background:linear-gradient(135deg,#160d30,#1e1240)"></div>`}
  </a>
  <div style="padding:40px;display:flex;flex-direction:column;justify-content:center">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(45,212,191,0.12);color:#2dd4bf;font-size:10px;font-weight:700;text-transform:uppercase;width:fit-content">${escapeHtml(hero.category.name)}</span>
    <h2 style="font-size:28px;margin:14px 0 10px"><a href="/revista/${hero.slug}" style="color:#fff">${escapeHtml(hero.title)}</a></h2>
    <p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,0.65);margin:0 0 20px">${escapeHtml(hero.excerpt)}</p>
    ${renderByline(hero)}
    <a href="/revista/${hero.slug}" style="color:#2dd4bf;font-size:13px;font-weight:700;margin-top:16px;display:inline-block">Leer articulo completo →</a>
  </div>
</div>` : '';

  const pills = `<div style="display:flex;gap:10px;justify-content:center;margin-bottom:16px;flex-wrap:wrap">
  <button class="ra-pill ra-pill-active" data-filter-audience="ALL">Todos</button>
  <button class="ra-pill" data-filter-audience="PACIENTES">Para pacientes</button>
  <button class="ra-pill" data-filter-audience="TERAPEUTAS">Para terapeutas</button>
</div>
<div id="ra-category-row" style="display:none;gap:10px;justify-content:center;margin-bottom:40px;flex-wrap:wrap">
  ${categories.map((c) => `<button class="ra-pill" data-filter-category="${c.slug}" data-category-audience="${c.audience}">${escapeHtml(c.name)}</button>`).join('\n')}
</div>`;

  const cards = rest.map(renderArticleCard).join('\n');
  const body = `${renderNav()}
<div style="max-width:1200px;margin:0 auto;padding:64px 24px">
  <h1 style="font-size:48px;text-align:center;margin-bottom:8px">Revista Aliax</h1>
  <p style="text-align:center;color:rgba(255,255,255,0.6);margin-bottom:32px">Ideas y recursos para cuidar tu bienestar</p>
  ${pills}
  ${heroHtml}
  <h3 style="font-size:24px;margin-bottom:24px">Ultimos articulos</h3>
  <div class="ra-grid3">${cards}</div>
</div>
${renderPillsScript()}`;
  return pageShell(
    'Revista Aliax — Ideas y recursos para tu bienestar',
    'Articulos escritos por psicologos de Aliax, para pacientes y terapeutas.',
    `${SITE_URL}/revista`,
    `${SITE_URL}/og-image.png`,
    body
  );
}

function generateArticlePage(a: Article, allArticles: Article[]): string {
  const renderedBlocks = a.blocks.map(renderBlock);
  if (a.category.audience === 'PACIENTES') {
    renderedBlocks.splice(Math.floor(a.blocks.length / 2), 0, renderTherapistCTA());
  }
  const blocksHtml = renderedBlocks.join('\n');
  const related = relatedArticles(allArticles, a);

  const body = `${renderNav()}
<div style="max-width:680px;margin:0 auto;padding:64px 24px">
  <a href="/revista" style="font-size:13px;color:rgba(255,255,255,0.5)">← Revista Aliax</a>
  <span style="display:inline-block;margin-left:12px;padding:5px 12px;border-radius:999px;background:rgba(45,212,191,0.12);color:#2dd4bf;font-size:11px;font-weight:700;text-transform:uppercase">${escapeHtml(a.category.name)}</span>
  <h1 style="font-size:40px;line-height:1.1;margin:18px 0 16px">${escapeHtml(a.title)}</h1>
  ${renderByline(a)}
  ${a.coverImage ? `<img src="${escapeHtml(a.coverImage)}" alt="" style="width:100%;border-radius:24px;margin:24px 0 32px">` : ''}
  ${blocksHtml}
  ${renderRelatedSection(related)}
</div>`;
  return pageShell(
    `${a.title} — Revista Aliax`,
    a.metaDescription || a.excerpt,
    `${SITE_URL}/revista/${a.slug}`,
    a.coverImage || `${SITE_URL}/og-image.png`,
    body
  );
}

function generateSitemap(articles: Article[]): string {
  // This list is hand-maintained, separate from frontend/src/App.tsx's <Route> list --
  // if a route is added/renamed/removed in App.tsx, it MUST be updated here too, or the
  // sitemap silently drifts (exact failure mode already hit once on a WordPress->React
  // migration for a different Aliax-family project: a hardcoded route list went stale
  // and nobody noticed for weeks). Verified against App.tsx on 2026-10-29: real path is
  // /pricing, not /precios -- this list previously had the wrong one.
  const staticRoutes = ['', '/explorar', '/pricing', '/revista'];
  const articleRoutes = articles.map((a) => `/revista/${a.slug}`);
  const urls = [...staticRoutes, ...articleRoutes]
    .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const res = await fetch(`${API_URL}/articles/public`);
  if (!res.ok) throw new Error(`No se pudo obtener /articles/public: ${res.status}`);
  const articles = (await res.json()) as Article[];

  const revistaDir = join(PUBLIC_DIR, 'revista');
  if (!existsSync(revistaDir)) mkdirSync(revistaDir, { recursive: true });

  writeFileSync(join(revistaDir, 'index.html'), generateListingPage(articles));
  for (const article of articles) {
    writeFileSync(join(revistaDir, `${article.slug}.html`), generateArticlePage(article, articles));
  }
  writeFileSync(join(PUBLIC_DIR, 'sitemap.xml'), generateSitemap(articles));
  writeFileSync(join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  console.log(`[Revista] Generados: ${articles.length} articulos, index, sitemap.xml, robots.txt`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npx tsc -b
```
Expected: no errors (use `-b`, bare `--noEmit` silently checks nothing in this project — see `tsconfig.node.json`'s `include`).

- [ ] **Step 3: Run it against the live API**

```bash
cd frontend && npx tsx scripts/generate-blog.ts
```
Expected: `[Revista] Generados: 1 articulos, index, sitemap.xml, robots.txt` (the one real published article in production today). No thrown errors.

- [ ] **Step 4: Spot-check the output**

```bash
grep -c "ra-pill" frontend/public/revista/index.html
grep -c "data-filter-audience" frontend/public/revista/index.html
```
Expected: both greater than 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/scripts/generate-blog.ts
git commit -m "feat: hero, audience/category filters, byline, therapist CTA and related articles on Revista pages"
```

---

### Task 7: End-to-end verification and cleanup

**Files:** none (verification only, no code changes)

- [ ] **Step 1: Confirm an unauthored article can't be published**

Via the AdminPanel, open an existing draft article (or create one) without filling "Autor", and click "Publicar". Expected: a toast with "Agrega un autor antes de publicar", and the article stays as Borrador.

- [ ] **Step 2: Confirm the save-while-uploading fix**

In the CMS, start uploading a cover image on an article and, before it finishes, try clicking "Guardar cambios"/"Crear articulo". Expected: the button is disabled and reads "Subiendo imagen..." until the upload completes — it's no longer possible to save before the image finishes.

- [ ] **Step 3: Create test data covering every new behavior**

Via the AdminPanel, create and publish (filling Autor on each):
- 2 articles audience PACIENTES (categoria distinta cada uno), una marcada `featured`, con al menos un bloque TEXT, uno IMAGE y uno BUTTON cada una.
- 1 articulo audience PACIENTES con cero bloques TEXT (solo IMAGE/BUTTON) — para confirmar el minimo de 1 min de lectura.
- 1 articulo audience TERAPEUTAS, con al menos un bloque TEXT.

- [ ] **Step 4: Verify the backend**

```bash
curl -s "https://api.aliax.io/api/articles/public" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
const arts=JSON.parse(d);
arts.forEach(a=>console.log(a.slug,'| author:',a.author,'| featured:',a.featured,'| audience:',a.category.audience));
});
"
```
Expected: all 4 test articles listed with the `author` you set and the right `featured`/`audience` values, plus the pre-existing `programa-1`.

- [ ] **Step 5: Run the generator and verify the specifics**

```bash
cd frontend && npx tsx scripts/generate-blog.ts
```
Expected: `[Revista] Generados: 5 articulos, ...` (4 test + `programa-1`).

Then, for the zero-TEXT-block test article's generated page:
```bash
grep -o "[0-9]* min de lectura" "frontend/public/revista/<su-slug>.html"
```
Expected: `1 min de lectura`.

For a PACIENTES test article's page:
```bash
grep -c "Quieres hablar con alguien" "frontend/public/revista/<su-slug>.html"
```
Expected: `1` (or more if it also shows up in a related-article preview — confirm by eye it's the CTA box, not a false match).

For the TERAPEUTAS test article's page:
```bash
grep -c "Quieres hablar con alguien" "frontend/public/revista/<su-slug>.html"
```
Expected: `0`.

- [ ] **Step 6: Verify in the browser**

Run both dev servers locally, navigate to `/revista`, and confirm:
- The featured test article renders as the large hero.
- Clicking "Para pacientes" hides the TERAPEUTAS test article (and the hero, if it's TERAPEUTAS) and shows a second row of category pills; clicking "Todos" hides that row again.
- Opening a PACIENTES article shows the CTA box roughly halfway down, linking to `/explorar`.
- Opening any article shows "Tambien te puede interesar" with up to 3 same-audience articles, never the article itself.

- [ ] **Step 7: Clean up test data**

Delete the 4 test articles via the AdminPanel, and independently re-query to confirm:
```bash
curl -s "https://api.aliax.io/api/articles/public" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{console.log(JSON.parse(d).map(a=>a.slug));});
"
```
Expected: only `programa-1` remains (or whatever real articles existed before this task).

- [ ] **Step 8: Re-run the generator one final time to clear test data from the built output**

```bash
cd frontend && npx tsx scripts/generate-blog.ts
```
Expected: `[Revista] Generados: 1 articulos, ...`.

- [ ] **Step 9: Stop any dev servers started during verification**

Confirm via `netstat` that the ports used are free again.

This task has no commit — it's pure verification. If any step reveals a bug, fix it as part of whichever earlier task owns that code, commit the fix there, and re-run this task's verification from the top.
