# Revista Aliax — bloques Subtítulo y Lista con viñetas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new article content block types to Revista Aliax — `SUBTITLE` (a short section heading) and `BULLET_LIST` (one bullet per line) — alongside the existing `TEXT`/`IMAGE`/`BUTTON` types, reusing the block system's existing `text` column (no new columns).

**Architecture:** Both new types are pure additions to the existing `ArticleBlockType` enum. They flow through the same CRUD/validation/CMS/static-generation pipeline that `TEXT` already uses — no new tables, no new API shapes, no new React state in the CMS editor (both reuse `handleTextChange`/`handleTextBlur`, which already operate generically on `block.text`).

**Tech Stack:** Prisma (Postgres enum), Zod (backend validation), React (CMS block editor), a Node/TypeScript build script (`generate-blog.ts`) for the public static HTML.

**Design spec:** `docs/superpowers/specs/2026-11-02-revista-aliax-bloque-subtitulo-lista-design.md`

---

### Task 1: Prisma schema — `SUBTITLE` and `BULLET_LIST` enum values

**Files:**
- Modify: `backend/prisma/schema.prisma:788-792` (`enum ArticleBlockType`)

- [ ] **Step 1: Add the two values**

In `backend/prisma/schema.prisma`, change:
```prisma
enum ArticleBlockType {
  TEXT
  IMAGE
  BUTTON
}
```
to:
```prisma
enum ArticleBlockType {
  TEXT
  IMAGE
  BUTTON
  SUBTITLE
  BULLET_LIST
}
```

- [ ] **Step 2: Apply the schema change**

`prisma migrate dev` requires an interactive terminal, which isn't available in this environment. Use the non-interactive sequence instead, from `backend/`:
```bash
npx prisma db push --accept-data-loss
```
Expected: "Your database is now in sync with your Prisma schema." Adding enum values is purely additive (no existing row can violate it), so despite the `--accept-data-loss` flag's generic wording, nothing is actually at risk here — this is the same safe pattern already used for the two prior migrations on this project (`add_article_author`, `category_slug_unique_per_audience`).

This is a production database change — confirm with the user before running it, the same way prior schema changes in this project were confirmed.

- [ ] **Step 3: Regenerate the Prisma client**

If the local dev backend is running, stop it first (the generated client's native binary can be file-locked on Windows while the server holds it open):
```bash
npx prisma generate
```
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Create the migration file to match**

Prisma's own `migrate dev` would generate two separate `ALTER TYPE ... ADD VALUE` statements (Postgres requires each `ADD VALUE` outside an explicit multi-statement transaction in this Prisma/Postgres version, matching the project's existing migration style). Create the file by hand, following the same convention as the prior two migrations in this project:
```bash
TS=$(date -u +%Y%m%d%H%M%S)
mkdir -p "backend/prisma/migrations/${TS}_add_subtitle_bullet_list_block_types"
cat > "backend/prisma/migrations/${TS}_add_subtitle_bullet_list_block_types/migration.sql" << 'EOF'
-- AlterEnum
ALTER TYPE "ArticleBlockType" ADD VALUE 'SUBTITLE';
ALTER TYPE "ArticleBlockType" ADD VALUE 'BULLET_LIST';
EOF
npx prisma migrate resolve --applied "${TS}_add_subtitle_bullet_list_block_types"
```
Expected: "Migration ... marked as applied." Then confirm with:
```bash
npx prisma migrate status
```
Expected: "Database schema is up to date!"

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat: add SUBTITLE and BULLET_LIST article block types"
```

---

### Task 2: Backend validation — accept the two new block types

**Files:**
- Modify: `backend/src/utils/validation.ts:353-368` (`createArticleBlockSchema`)

**Context:** `updateArticleBlockSchema` (lines 370-377) has no `type` field at all — a block's type is fixed at creation and never changes, so it needs no edit here. The existing `.refine()` that requires non-empty `text` only for `TEXT` blocks must now also cover `SUBTITLE` and `BULLET_LIST` — both are "text-based" blocks exactly like `TEXT`, just rendered differently, and an empty one is just as useless as an empty paragraph.

- [ ] **Step 1: Extend the enum and the text-required check**

Change:
```typescript
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
  (data) => data.type !== 'BUTTON' || (!!data.buttonLabel?.trim() && !!data.buttonUrl),
  { message: 'Un bloque de boton requiere texto y URL' }
);
```
to:
```typescript
export const createArticleBlockSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'BUTTON', 'SUBTITLE', 'BULLET_LIST'], {
    errorMap: () => ({ message: 'Tipo de bloque no valido (TEXT, IMAGE, BUTTON, SUBTITLE o BULLET_LIST)' }),
  }),
  text: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  imageAlt: z.string().max(200).optional(),
  buttonLabel: z.string().max(60).optional(),
  buttonUrl: z.string().url().optional().or(z.literal('')),
}).refine(
  (data) => !['TEXT', 'SUBTITLE', 'BULLET_LIST'].includes(data.type) || !!data.text?.trim(),
  { message: 'Un bloque de texto requiere contenido' }
).refine(
  (data) => data.type !== 'BUTTON' || (!!data.buttonLabel?.trim() && !!data.buttonUrl),
  { message: 'Un bloque de boton requiere texto y URL' }
);
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/validation.ts
git commit -m "feat: accept SUBTITLE and BULLET_LIST block types in validation"
```

---

### Task 3: Frontend types — `ArticleBlockType`

**Files:**
- Modify: `frontend/src/hooks/useArticles.ts:6`

- [ ] **Step 1: Add the two values**

Change:
```typescript
export type ArticleBlockType = 'TEXT' | 'IMAGE' | 'BUTTON';
```
to:
```typescript
export type ArticleBlockType = 'TEXT' | 'IMAGE' | 'BUTTON' | 'SUBTITLE' | 'BULLET_LIST';
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npx tsc -b
```
Expected: no errors. This is a union-type widening — nothing that pattern-matches on a *specific* value (`=== 'TEXT'` etc.) breaks by adding new possible values; only exhaustiveness-checked `switch`/if-chains with no fallback would need updating, and none exist yet at this point in the plan (Task 4 and Task 5 add the explicit handling).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useArticles.ts
git commit -m "feat: add SUBTITLE and BULLET_LIST to ArticleBlockType"
```

---

### Task 4: CMS — Subtítulo and Lista blocks in `BlockEditor.tsx`

**Files:**
- Modify: `frontend/src/components/admin/BlockEditor.tsx`

- [ ] **Step 1: Give new blocks a sensible starting value in `handleAddBlock`**

Change:
```typescript
  const handleAddBlock = async (type: ArticleBlockType) => {
    if (adding) return;
    setAdding(true);
    try {
      if (type === 'TEXT') await createBlock(articleId, { type, text: 'Escribe aqui...' });
      else if (type === 'BUTTON') await createBlock(articleId, { type, buttonLabel: 'Ver mas', buttonUrl: 'https://aliax.io' });
      else await createBlock(articleId, { type, imageUrl: '', imageAlt: '' }); // IMAGE needs upload before it can be saved as non-empty; see handleImageUpload below
      await loadBlocks();
    } catch {
      toast('No se pudo agregar el bloque', 'error');
    } finally {
      setAdding(false);
    }
  };
```
to:
```typescript
  const handleAddBlock = async (type: ArticleBlockType) => {
    if (adding) return;
    setAdding(true);
    try {
      if (type === 'TEXT') await createBlock(articleId, { type, text: 'Escribe aqui...' });
      else if (type === 'SUBTITLE') await createBlock(articleId, { type, text: 'Subtitulo' });
      else if (type === 'BULLET_LIST') await createBlock(articleId, { type, text: 'Primer punto\nSegundo punto' });
      else if (type === 'BUTTON') await createBlock(articleId, { type, buttonLabel: 'Ver mas', buttonUrl: 'https://aliax.io' });
      else await createBlock(articleId, { type, imageUrl: '', imageAlt: '' }); // IMAGE needs upload before it can be saved as non-empty; see handleImageUpload below
      await loadBlocks();
    } catch {
      toast('No se pudo agregar el bloque', 'error');
    } finally {
      setAdding(false);
    }
  };
```

- [ ] **Step 2: Add the two new labels in the block header**

Change:
```typescript
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: 'uppercase' }}>
              {block.type === 'TEXT' ? 'Texto' : block.type === 'IMAGE' ? 'Imagen' : 'Boton'}
            </span>
```
to:
```typescript
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: 'uppercase' }}>
              {block.type === 'TEXT' ? 'Texto' : block.type === 'SUBTITLE' ? 'Subtitulo' : block.type === 'BULLET_LIST' ? 'Lista' : block.type === 'IMAGE' ? 'Imagen' : 'Boton'}
            </span>
```

- [ ] **Step 3: Add the two new form fields**

Change:
```typescript
          {block.type === 'TEXT' && (
            <textarea
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, minHeight: 80, outline: 'none' }}
              value={block.text ?? ''}
              onChange={(e) => handleTextChange(block, e.target.value)}
              onBlur={() => handleTextBlur(block)}
            />
          )}

          {block.type === 'IMAGE' && (
```
to:
```typescript
          {block.type === 'TEXT' && (
            <textarea
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, minHeight: 80, outline: 'none' }}
              value={block.text ?? ''}
              onChange={(e) => handleTextChange(block, e.target.value)}
              onBlur={() => handleTextBlur(block)}
            />
          )}

          {block.type === 'SUBTITLE' && (
            <input
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none' }}
              value={block.text ?? ''}
              onChange={(e) => handleTextChange(block, e.target.value)}
              onBlur={() => handleTextBlur(block)}
            />
          )}

          {block.type === 'BULLET_LIST' && (
            <div>
              <textarea
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, minHeight: 80, outline: 'none' }}
                value={block.text ?? ''}
                onChange={(e) => handleTextChange(block, e.target.value)}
                onBlur={() => handleTextBlur(block)}
              />
              <p style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>Un punto por linea</p>
            </div>
          )}

          {block.type === 'IMAGE' && (
```

- [ ] **Step 4: Add the two new "Agregar bloque" buttons**

Change:
```typescript
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button disabled={adding} onClick={() => handleAddBlock('TEXT')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Texto
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('IMAGE')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Imagen
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('BUTTON')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Boton
        </button>
      </div>
```
to:
```typescript
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button disabled={adding} onClick={() => handleAddBlock('TEXT')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Texto
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('SUBTITLE')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Subtitulo
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('BULLET_LIST')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Lista
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('IMAGE')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Imagen
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('BUTTON')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Boton
        </button>
      </div>
```
(`flexWrap: 'wrap'` added because the row now has 5 buttons instead of 3 — without it, the row can overflow narrower AdminPanel widths.)

- [ ] **Step 5: Verify it compiles**

```bash
cd frontend && npx tsc -b
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/BlockEditor.tsx
git commit -m "feat: add Subtitulo and Lista blocks to the CMS block editor"
```

---

### Task 5: Public page — render `SUBTITLE` and `BULLET_LIST`

**Files:**
- Modify: `frontend/scripts/generate-blog.ts`

- [ ] **Step 1: Widen the `ArticleBlock` interface**

Change:
```typescript
interface ArticleBlock {
  type: 'TEXT' | 'IMAGE' | 'BUTTON';
```
to:
```typescript
interface ArticleBlock {
  type: 'TEXT' | 'IMAGE' | 'BUTTON' | 'SUBTITLE' | 'BULLET_LIST';
```

- [ ] **Step 2: Add CSS for the bullet list**

In `pageShell`'s `<style>` block, change:
```typescript
.ra-pill-active{background:#2dd4bf;border-color:#2dd4bf;color:#04201c}
@media (max-width:860px){.ra-grid3{grid-template-columns:1fr}.ra-hero-grid{grid-template-columns:1fr}}
</style>
```
to:
```typescript
.ra-pill-active{background:#2dd4bf;border-color:#2dd4bf;color:#04201c}
.ra-bullets li{font-size:17px;line-height:1.75;color:rgba(255,255,255,0.75);margin-bottom:8px}
.ra-bullets li::marker{color:#2dd4bf}
@media (max-width:860px){.ra-grid3{grid-template-columns:1fr}.ra-hero-grid{grid-template-columns:1fr}}
</style>
```
(The bullet text reuses the exact same font-size/line-height/color as a normal paragraph — see `renderBlock`'s `TEXT` case below — only the marker gets the accent color, per the approved design.)

- [ ] **Step 3: Add the two new branches to `renderBlock`**

Change:
```typescript
  if (block.type === 'BUTTON') {
    return `<div style="text-align:center;margin:32px 0"><a href="${escapeHtml(block.buttonUrl ?? '')}" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">${escapeHtml(block.buttonLabel ?? '')}</a></div>`;
  }
  throw new Error(`[Revista] Tipo de bloque desconocido: ${(block as ArticleBlock).type}`);
}
```
to:
```typescript
  if (block.type === 'BUTTON') {
    return `<div style="text-align:center;margin:32px 0"><a href="${escapeHtml(block.buttonUrl ?? '')}" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">${escapeHtml(block.buttonLabel ?? '')}</a></div>`;
  }
  if (block.type === 'SUBTITLE') {
    return `<h3 style="font-size:26px;margin:40px 0 16px">${escapeHtml(block.text ?? '')}</h3>`;
  }
  if (block.type === 'BULLET_LIST') {
    const items = (block.text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join('\n');
    if (!items) return '';
    return `<ul class="ra-bullets" style="margin:0 0 24px;padding-left:20px">${items}</ul>`;
  }
  throw new Error(`[Revista] Tipo de bloque desconocido: ${(block as ArticleBlock).type}`);
}
```
(`<h3>` picks up the existing global `h1,h2,h3{font-family:'Bebas Neue',sans-serif;color:#fff}` rule already in `pageShell` — no new font-family/color declaration needed, only the size and spacing are block-specific. The empty-after-filtering case for `BULLET_LIST`, e.g. a block saved with only blank lines, renders nothing rather than an empty `<ul></ul>`, consistent with how `IMAGE` already returns `''` when `imageUrl` is missing.)

- [ ] **Step 4: Verify it compiles**

```bash
cd frontend && npx tsc -b
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/scripts/generate-blog.ts
git commit -m "feat: render Subtitulo and Lista blocks on the public Revista pages"
```

---

### Task 6: End-to-end verification

**Files:** none (verification only, no code changes)

- [ ] **Step 1: Confirm an empty Subtitulo/Lista block can't be saved with blank content**

Create a test article, add a Subtitulo block, clear its text entirely, and try to publish. Expected: same "Un bloque de texto requiere contenido" behavior already in place for an empty paragraph block (verify this is enforced — note this check lives in `createArticleBlockSchema`, which only runs on block *creation*, not on later edits, matching the existing behavior for `TEXT` blocks today; this is a pre-existing project convention, not a gap introduced here).

- [ ] **Step 2: Create real content covering both new block types**

In an existing or new article, add:
- A Subtitulo block with a short heading.
- A Lista block with 3-4 lines, including one blank line in the middle (to confirm blank lines are dropped, not rendered as empty bullets).

Save/publish as appropriate.

- [ ] **Step 3: Verify the generated HTML**

```bash
cd frontend && npx tsx scripts/generate-blog.ts
```
Then, for the test article's generated page:
```bash
grep -o "<h3[^>]*>[^<]*</h3>" "frontend/public/revista/<su-slug>.html"
grep -c "ra-bullets" "frontend/public/revista/<su-slug>.html"
grep -o "<li>[^<]*</li>" "frontend/public/revista/<su-slug>.html"
```
Expected: the `<h3>` shows the subtitle text; `ra-bullets` appears; the `<li>` lines show only the non-blank bullet lines (no empty `<li></li>`).

- [ ] **Step 4: Verify visually in the browser**

Run the local dev servers (backend `PORT=4000`, frontend default) and confirm in a browser that the subtitle reads as a clearly separated heading (not a paragraph) and the bullet points show a teal marker with normal-colored text.

- [ ] **Step 5: Deploy**

Once verified, deploy following the established process for this project:
1. `git push origin master` (the Vercel Deploy Hook for Revista rebuilds from GitHub, not from a local manual deploy — pushing first avoids a later publish/edit in the live CMS silently reverting a manual deploy, which happened earlier this same day).
2. `npx vercel --prod --scope cesars-projects-ddd06b7a --yes` from the **repository root** (not from `frontend/` — doing so creates a stray new Vercel project instead of deploying to the real `aura` project; this exact mistake happened earlier today).
3. Confirm the output says `Aliased: https://www.aliax.io`.
4. `cd backend && npx vercel --prod --scope cesars-projects-ddd06b7a --yes` (confirm `Aliased: https://api.aliax.io`) — only needed if the backend actually changed in this plan (it does: Tasks 1 and 2 touch the backend).

This task has no code commit of its own (the deploy itself isn't a commit) — if any verification step reveals a bug, fix it as part of whichever earlier task owns that code, commit the fix there, and re-run this task's verification from the top.
