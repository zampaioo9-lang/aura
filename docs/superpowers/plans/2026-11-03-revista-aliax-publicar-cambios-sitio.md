# Revista Aliax — botón "Publicar cambios en el sitio" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace automatic per-edit Vercel rebuilds on Revista Aliax articles with an explicit "Publicar cambios en el sitio" button in the CMS, backed by a pending-changes indicator — fully replacing the 2-minute throttle committed earlier today (`0546a7b`), which never shipped.

**Architecture:** The 5 "small edit" routes (article metadata, block create/update/swap/delete) stop calling the Vercel Deploy Hook at all — they just record a timestamp. The 3 "deliberate action" routes (publish/unpublish/delete article) keep triggering a real rebuild immediately, unchanged. A new button calls a new endpoint that triggers a real rebuild on demand; a new status endpoint tells the CMS whether anything saved is still unpublished, by comparing two timestamps in a single-row database table.

**Tech Stack:** Prisma (Postgres), Express + Zod (backend), React (CMS).

**Design spec:** `docs/superpowers/specs/2026-11-03-revista-aliax-publicar-cambios-sitio-design.md`

---

### Task 1: Prisma schema — repurpose `BlogRebuildState`

**Files:**
- Modify: `backend/prisma/schema.prisma` (the `BlogRebuildState` model, currently at the end of the file)

**Context:** This table was created earlier today for a 2-minute rebuild throttle that was committed (`0546a7b`) but never deployed — nothing in production code has ever read or written to it beyond a disposable test script that cleaned up after itself. It's safe to treat as empty and change its shape freely, no data migration needed.

- [ ] **Step 1: Replace the column**

Find the model (search for `model BlogRebuildState`):
```prisma
// Single-row table (fixed id) tracking the last time the Revista static-site rebuild
// was actually triggered, so block/article edits can be throttled to one rebuild per
// REBUILD_THROTTLE_MS instead of one per edit. See triggerBlogRebuild() in
// routes/articles.ts -- can't use an in-memory timer for this because the backend
// runs as a Vercel serverless function with no state shared across invocations.
model BlogRebuildState {
  id              String    @id @default("singleton")
  lastTriggeredAt DateTime?
}
```
Change to:
```prisma
// Single-row table (fixed id) comparing "when was content last saved" against "when
// did the site last actually get rebuilt", so the CMS can show a "cambios sin
// publicar" indicator and the admin republishes on demand via "Publicar cambios en el
// sitio" instead of every edit triggering its own Vercel deploy. See
// markContentEdited() and triggerBlogRebuild() in routes/articles.ts -- this has to be
// a persisted timestamp rather than in-memory state, because the backend runs as a
// Vercel serverless function with no state shared across invocations.
model BlogRebuildState {
  id            String    @id @default("singleton")
  lastEditAt    DateTime?
  lastRebuiltAt DateTime?
}
```

- [ ] **Step 2: Apply the schema change**

This is a production database change — confirm with the user before running it (same as every prior schema change this session).

`prisma migrate dev` requires an interactive terminal, unavailable here. Use the established non-interactive sequence instead, from `backend/`:
```bash
npx prisma db push --accept-data-loss
```
Expected: "Your database is now in sync with your Prisma schema." The `--accept-data-loss` flag's generic wording is misleading here — the table is empty, so there is no actual data at risk.

- [ ] **Step 3: Regenerate the Prisma client**

If a local dev backend is running, stop it first (the generated client's native binary can be file-locked on Windows while a server holds it open):
```bash
npx prisma generate
```
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Create the migration file to match**

```bash
TS=$(date -u +%Y%m%d%H%M%S)
mkdir -p "backend/prisma/migrations/${TS}_blog_rebuild_state_edit_vs_rebuilt"
cat > "backend/prisma/migrations/${TS}_blog_rebuild_state_edit_vs_rebuilt/migration.sql" << 'EOF'
-- AlterTable
ALTER TABLE "BlogRebuildState" DROP COLUMN "lastTriggeredAt",
ADD COLUMN     "lastEditAt" TIMESTAMP(3),
ADD COLUMN     "lastRebuiltAt" TIMESTAMP(3);
EOF
npx prisma migrate resolve --applied "${TS}_blog_rebuild_state_edit_vs_rebuilt"
```
Expected: "Migration ... marked as applied." Then confirm with:
```bash
npx prisma migrate status
```
Expected: "Database schema is up to date!"

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat: repurpose BlogRebuildState for edit-vs-rebuilt tracking"
```

---

### Task 2: Backend — stop auto-triggering rebuilds, add the two new endpoints

**Files:**
- Modify: `backend/src/routes/articles.ts`

**Context:** This file currently has the never-deployed 2-minute throttle from `0546a7b` (`triggerBlogRebuild(options: { force?: boolean })`, `REBUILD_THROTTLE_MS`). This task replaces that logic entirely — don't build on top of it.

- [ ] **Step 1: Replace the top-of-file rebuild logic**

Change:
```typescript
// Publishing/unpublishing/deleting a published article must regenerate the static
// /revista HTML. We trigger that by calling a Vercel Deploy Hook. A failure here must
// NEVER fail the request — the DB write already succeeded, and the only consequence
// of a missed deploy is a stale public page, corrected by the next trigger or a
// manual deploy. Retry once, then just log.
//
// Deliberately NOT awaited by callers: the deploy hook round-trip can take seconds,
// and the admin's edit already succeeded in the DB by the time this fires — making
// them wait for a background rebuild signal adds latency with zero benefit to the
// request itself.
//
// Throttled by default (force=false): editing a long article block-by-block used to
// fire one full site rebuild per block, which on 2026-11-03 burned through Vercel's
// daily deploy cap mid-edit and silently stopped updating the live page (the hook
// failure is caught and only logged, so the admin never saw an error — the page just
// stopped reflecting new edits). We can't debounce with an in-memory timer because
// this backend runs as a Vercel serverless function with no state shared across
// invocations (confirmed: api/index.ts, the production entry point, deliberately
// does NOT start the node-cron jobs that src/index.ts starts for local dev, exactly
// because that pattern doesn't survive here) — so the "wait" has to be a persisted
// timestamp (BlogRebuildState) checked synchronously instead. force=true (used by
// publish/unpublish/delete, deliberate rare actions where a stale page is worse than
// an extra deploy) always fires regardless of the throttle window.
const REBUILD_THROTTLE_MS = 2 * 60 * 1000;

async function triggerBlogRebuild(options: { force?: boolean } = {}): Promise<void> {
  const hookUrl = process.env.BLOG_DEPLOY_HOOK_URL;
  if (!hookUrl) return;

  if (!options.force) {
    const state = await prisma.blogRebuildState.findUnique({ where: { id: 'singleton' } });
    if (state?.lastTriggeredAt && Date.now() - state.lastTriggeredAt.getTime() < REBUILD_THROTTLE_MS) {
      return;
    }
  }

  await prisma.blogRebuildState.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', lastTriggeredAt: new Date() },
    update: { lastTriggeredAt: new Date() },
  });

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
to:
```typescript
// Publishing/unpublishing/deleting a published article, or clicking "Publicar cambios
// en el sitio" in the CMS, regenerates the static /revista HTML by calling a Vercel
// Deploy Hook. A failure here must NEVER fail the request — the DB write already
// succeeded, and the only consequence of a missed deploy is a stale public page,
// corrected by the next real trigger or a manual deploy. Retry once, then just log.
//
// Deliberately NOT awaited by callers: the deploy hook round-trip can take seconds,
// and the caller's work already succeeded in the DB by the time this fires.
async function triggerBlogRebuild(): Promise<void> {
  const hookUrl = process.env.BLOG_DEPLOY_HOOK_URL;
  if (!hookUrl) return;

  await prisma.blogRebuildState.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', lastRebuiltAt: new Date() },
    update: { lastRebuiltAt: new Date() },
  });

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

// Called by the 5 "small edit" routes (article metadata, block create/update/swap/
// delete) instead of triggerBlogRebuild(). Only records that something changed -- no
// network call to Vercel, so these routes keep their original near-zero latency.
// Editing a long article block-by-block used to fire one full site rebuild per block
// (no "save all" step exists for blocks -- each one autosaves individually), which on
// 2026-11-03 burned through Vercel's daily deploy cap mid-edit and silently stopped
// updating the live page. Now nothing republishes automatically: the admin decides
// when via the "Publicar cambios en el sitio" button (POST /publish-site-changes
// below), guided by the "cambios sin publicar" indicator (GET /rebuild-status below).
async function markContentEdited(): Promise<void> {
  await prisma.blogRebuildState.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', lastEditAt: new Date() },
    update: { lastEditAt: new Date() },
  });
}
```

- [ ] **Step 2: Add the two new routes, before any `/:id` route**

Express matches routes in registration order, not by specificity — a route like `GET /:id` registered before `GET /rebuild-status` would swallow a request to `/articles/rebuild-status` by treating `"rebuild-status"` as the `:id`. This file already follows that rule once (`GET /public` is registered before `GET /:id` for the same reason) — add the two new routes in that same spot.

Change:
```typescript
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
```
to:
```typescript
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

// POST /api/articles/publish-site-changes — Rebuild the live site now (auth, admin)
//
// What the "Publicar cambios en el sitio" button calls. Unlike the 5 small-edit
// routes (which only call markContentEdited()), this always triggers a real rebuild
// regardless of whether anything is pending -- the admin asked for it explicitly.
router.post('/publish-site-changes', authMiddleware, adminMiddleware, async (_req: AuthRequest, res, next) => {
  try {
    await triggerBlogRebuild();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/rebuild-status — Does the live site need republishing? (auth, admin)
//
// true when content was saved (markContentEdited) more recently than the last real
// rebuild (triggerBlogRebuild), or when content was saved and no rebuild has ever
// happened. Drives the "Cambios sin publicar" indicator in the CMS.
router.get('/rebuild-status', authMiddleware, adminMiddleware, async (_req: AuthRequest, res, next) => {
  try {
    const state = await prisma.blogRebuildState.findUnique({ where: { id: 'singleton' } });
    const hasPendingChanges = !!state?.lastEditAt && (!state.lastRebuiltAt || state.lastEditAt > state.lastRebuiltAt);
    res.json({ hasPendingChanges });
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/:id — Get one article with blocks (auth, admin — for the editor)
```

- [ ] **Step 3: Switch the 3 "deliberate action" routes to the simplified call**

Change (in `PATCH /:id/publish`):
```typescript
    triggerBlogRebuild({ force: true });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/unpublish — Unpublish (auth, admin)
```
to:
```typescript
    triggerBlogRebuild();
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/unpublish — Unpublish (auth, admin)
```

Change (in `PATCH /:id/unpublish`):
```typescript
    triggerBlogRebuild({ force: true });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id — Delete (auth, admin). Cascades blocks.
```
to:
```typescript
    triggerBlogRebuild();
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id — Delete (auth, admin). Cascades blocks.
```

Change (in `DELETE /:id`):
```typescript
    if (existing.status === 'PUBLISHED') triggerBlogRebuild({ force: true });
```
to:
```typescript
    if (existing.status === 'PUBLISHED') triggerBlogRebuild();
```

- [ ] **Step 4: Switch the 5 "small edit" routes from `triggerBlogRebuild()` to `markContentEdited()`**

Change (in `PUT /:id`, article metadata update):
```typescript
    if (existing.status === 'PUBLISHED') triggerBlogRebuild();
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/publish — Publish (auth, admin)
```
to:
```typescript
    if (existing.status === 'PUBLISHED') await markContentEdited();
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/publish — Publish (auth, admin)
```

Change (in `POST /:id/blocks`):
```typescript
    if (article.status === 'PUBLISHED') triggerBlogRebuild();
    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/:id/blocks/:blockId — Update block, including reorder (auth, admin)
```
to:
```typescript
    if (article.status === 'PUBLISHED') await markContentEdited();
    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/:id/blocks/:blockId — Update block, including reorder (auth, admin)
```

Change (in `PUT /:id/blocks/:blockId`):
```typescript
    if (article?.status === 'PUBLISHED') triggerBlogRebuild();
    res.json(block);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/blocks/swap — Swap the order of two blocks (auth, admin)
```
to:
```typescript
    if (article?.status === 'PUBLISHED') await markContentEdited();
    res.json(block);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/articles/:id/blocks/swap — Swap the order of two blocks (auth, admin)
```

Change (in `PATCH /:id/blocks/swap`):
```typescript
    if (article?.status === 'PUBLISHED') triggerBlogRebuild();
    res.json([updatedA, updatedB]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id/blocks/:blockId — Delete block (auth, admin)
```
to:
```typescript
    if (article?.status === 'PUBLISHED') await markContentEdited();
    res.json([updatedA, updatedB]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id/blocks/:blockId — Delete block (auth, admin)
```

Change (in `DELETE /:id/blocks/:blockId`):
```typescript
    if (article?.status === 'PUBLISHED') triggerBlogRebuild();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
```
to:
```typescript
    if (article?.status === 'PUBLISHED') await markContentEdited();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 5: Verify it compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/articles.ts
git commit -m "feat: replace auto-rebuild throttle with explicit publish-site-changes endpoint"
```

---

### Task 3: Frontend hook — `publishSiteChanges` and `getRebuildStatus`

**Files:**
- Modify: `frontend/src/hooks/useArticles.ts:191-207` (after `swapBlockOrder`, and the `return` statement)

- [ ] **Step 1: Add the two new functions and export them**

Change:
```typescript
  // One request, swapped atomically server-side -- unlike two separate updateBlock
  // calls, a failure here can never leave two blocks sharing the same order value.
  const swapBlockOrder = useCallback(async (articleId: string, blockAId: string, blockBId: string): Promise<void> => {
    try {
      await api.patch(`/articles/${articleId}/blocks/swap`, { blockAId, blockBId });
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al reordenar'));
    }
  }, []);

  return {
    listCategories, createCategory, updateCategory,
    listArticles, getArticle, createArticle, updateArticle,
    publishArticle, unpublishArticle, deleteArticle,
    createBlock, updateBlock, deleteBlock, swapBlockOrder,
  };
}
```
to:
```typescript
  // One request, swapped atomically server-side -- unlike two separate updateBlock
  // calls, a failure here can never leave two blocks sharing the same order value.
  const swapBlockOrder = useCallback(async (articleId: string, blockAId: string, blockBId: string): Promise<void> => {
    try {
      await api.patch(`/articles/${articleId}/blocks/swap`, { blockAId, blockBId });
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al reordenar'));
    }
  }, []);

  // Always triggers a real rebuild (the admin asked for it explicitly) -- what the
  // "Publicar cambios en el sitio" button calls.
  const publishSiteChanges = useCallback(async (): Promise<void> => {
    try {
      await api.post('/articles/publish-site-changes');
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al publicar los cambios en el sitio'));
    }
  }, []);

  const getRebuildStatus = useCallback(async (): Promise<{ hasPendingChanges: boolean }> => {
    try {
      const res = await api.get('/articles/rebuild-status');
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al consultar el estado de publicacion'));
    }
  }, []);

  return {
    listCategories, createCategory, updateCategory,
    listArticles, getArticle, createArticle, updateArticle,
    publishArticle, unpublishArticle, deleteArticle,
    createBlock, updateBlock, deleteBlock, swapBlockOrder,
    publishSiteChanges, getRebuildStatus,
  };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend && npx tsc -b
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useArticles.ts
git commit -m "feat: add publishSiteChanges and getRebuildStatus to useArticles"
```

---

### Task 4: CMS — the button and the pending-changes indicator

**Files:**
- Modify: `frontend/src/components/admin/AdminRevista.tsx`

- [ ] **Step 1: Pull in the two new hook functions and add state**

Change:
```typescript
  const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle } = useArticles();
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<'categorias' | 'articulos'>('articulos');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newAudience, setNewAudience] = useState<CategoryAudience>('PACIENTES');
  const [creating, setCreating] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [creatingArticle, setCreatingArticle] = useState(false);
```
to:
```typescript
  const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle, publishSiteChanges, getRebuildStatus } = useArticles();
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<'categorias' | 'articulos'>('articulos');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newAudience, setNewAudience] = useState<CategoryAudience>('PACIENTES');
  const [creating, setCreating] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [creatingArticle, setCreatingArticle] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [publishingSite, setPublishingSite] = useState(false);
```

- [ ] **Step 2: Add the load/handle functions**

Change:
```typescript
  const loadArticles = async () => {
    try {
      setArticles(await listArticles());
    } catch {
      toast('No se pudieron cargar los articulos', 'error');
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadArticles(); }, []);
```
to:
```typescript
  const loadArticles = async () => {
    try {
      setArticles(await listArticles());
    } catch {
      toast('No se pudieron cargar los articulos', 'error');
    }
  };

  const loadRebuildStatus = async () => {
    try {
      const { hasPendingChanges } = await getRebuildStatus();
      setHasPendingChanges(hasPendingChanges);
    } catch {
      // Silent -- this is just a status indicator, not worth a toast if it fails to load.
    }
  };

  const handlePublishSiteChanges = async () => {
    setPublishingSite(true);
    try {
      await publishSiteChanges();
      toast('Cambios publicados en el sitio', 'success');
      await loadRebuildStatus();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setPublishingSite(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadArticles(); }, []);
  useEffect(() => { loadRebuildStatus(); }, []);
```

- [ ] **Step 3: Refresh the indicator when returning from the editor**

Change:
```typescript
            <ArticleEditor
              C={C}
              articleId={creatingArticle ? null : editingArticleId}
              categories={categories}
              onClose={() => { setEditingArticleId(null); setCreatingArticle(false); }}
              onSaved={loadArticles}
            />
```
to:
```typescript
            <ArticleEditor
              C={C}
              articleId={creatingArticle ? null : editingArticleId}
              categories={categories}
              onClose={() => { setEditingArticleId(null); setCreatingArticle(false); loadRebuildStatus(); }}
              onSaved={loadArticles}
            />
```

(`onClose` fires whenever the admin leaves the article editor — via the "← Volver a articulos" button — regardless of whether they edited the metadata form, added/moved/edited/deleted blocks, or did nothing. That's the one point guaranteed to run after any kind of edit inside that nested editor, which `AdminRevista` otherwise has no visibility into.)

- [ ] **Step 4: Add the button next to "Nuevo articulo"**

Change:
```typescript
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
```
to:
```typescript
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <button
                  onClick={() => setCreatingArticle(true)}
                  style={{
                    padding: '9px 18px', background: C.accent, border: 'none',
                    borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Plus size={15} /> Nuevo articulo
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {hasPendingChanges && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                      Cambios sin publicar
                    </span>
                  )}
                  <button
                    onClick={handlePublishSiteChanges}
                    disabled={!hasPendingChanges || publishingSite}
                    style={{
                      padding: '9px 18px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: hasPendingChanges ? C.accent : C.tableRowAlt,
                      color: hasPendingChanges ? '#fff' : C.textMuted,
                      cursor: (!hasPendingChanges || publishingSite) ? 'not-allowed' : 'pointer',
                      opacity: publishingSite ? 0.6 : 1,
                    }}
                  >
                    {publishingSite ? 'Publicando...' : hasPendingChanges ? 'Publicar cambios en el sitio' : 'Sin cambios pendientes'}
                  </button>
                </div>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12 }}>
```

- [ ] **Step 5: Verify it compiles**

```bash
cd frontend && npx tsc -b
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/AdminRevista.tsx
git commit -m "feat: add Publicar cambios en el sitio button and pending-changes indicator"
```

---

### Task 5: End-to-end verification

**Files:** none (verification only, no code changes)

**Context:** Deploying to production is currently blocked by Vercel's daily deploy cap (hit earlier today, shared across the whole account — resets roughly 24h after the first blocked attempt). Verification happens via local dev servers against the shared production database, same pattern used throughout this session. Deploying the result to Vercel needs explicit user confirmation, same as every deploy this session, and should happen once the cap has cleared.

- [ ] **Step 1: Start local dev servers**

From `backend/`: `PORT=4000 npm run dev`. From `frontend/`: `npm run dev`. Confirm both print their ready lines (`🚀 Aura API running on http://localhost:4000`, Vite's `Local: http://localhost:5173/`).

- [ ] **Step 2: Confirm small edits no longer trigger a rebuild**

Open an already-published article in the CMS at `http://localhost:5173`. Edit a text block (change its content, let it autosave on blur). Independently check the backend logs in the terminal running `PORT=4000 npm run dev` — there should be no `[Revista] No se pudo disparar el deploy hook` line and, since the dev backend's `.env` doesn't have `BLOG_DEPLOY_HOOK_URL` set (confirmed earlier this session), no network attempt either way. The important check is on the **database** side:
```bash
cd backend
cat > check-state.tmp.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.blogRebuildState.findUnique({ where: { id: 'singleton' } }).then((s) => {
  console.log(JSON.stringify(s));
  process.exit(0);
});
EOF
npx tsx check-state.tmp.ts && rm check-state.tmp.ts
```
Expected: `lastEditAt` is a recent timestamp (just updated by the block edit above). Re-run the article edit a few more times (another block, or the metadata form's "Guardar cambios") and confirm `lastEditAt` keeps updating but nothing in the UI shows any deploy-related delay.

- [ ] **Step 3: Confirm the indicator and button**

In the browser, go back to the Articulos list (click "← Volver a articulos" inside the editor, or navigate away and back). Confirm the "Cambios sin publicar" label and the enabled "Publicar cambios en el sitio" button appear. Click it. Confirm:
- A success toast appears ("Cambios publicados en el sitio").
- The indicator disappears and the button becomes disabled, reading "Sin cambios pendientes".
- Re-run the `check-state.tmp.ts` script from Step 2 (recreate it the same way) and confirm `lastRebuiltAt` is now a timestamp at or after `lastEditAt`.

- [ ] **Step 4: Confirm Publicar/Despublicar/Borrar still work as immediate, deliberate actions**

Publish or unpublish a test article (or toggle the status of a disposable one) and confirm `lastRebuiltAt` updates immediately from that action alone, without needing the new button.

- [ ] **Step 5: Confirm a brand-new draft article never shows as pending**

Create a new article via "Nuevo articulo", add a couple of blocks to it, and confirm (re-running the Step 2 script) that none of this changes `lastEditAt` or triggers the "Cambios sin publicar" indicator — the gating `if (status === 'PUBLISHED')` on every small-edit route should mean a DRAFT article never touches `BlogRebuildState` at all. Delete the test article when done (or leave it as a draft if you want to keep working on it later).

- [ ] **Step 6: Stop the dev servers**

Stop both background processes. On Windows, also confirm via `Get-NetTCPConnection -LocalPort 4000,5173` that the underlying node processes actually exited (TaskStop/Ctrl+C have left orphaned processes holding these ports earlier in this session) — if anything's still listening, stop that process directly.

- [ ] **Step 7: Deploy**

Once Vercel's daily cap has cleared, confirm with the user before deploying, then:
```bash
git push origin master
```
From the **repository root** (not `frontend/` — doing so creates a stray new Vercel project, confirmed earlier this session):
```bash
npx vercel --prod --scope cesars-projects-ddd06b7a --yes
```
Confirm the output says `Aliased: https://www.aliax.io`. Then from `backend/`:
```bash
npx vercel --prod --scope cesars-projects-ddd06b7a --yes
```
Confirm `Aliased: https://api.aliax.io`. Spot-check both are healthy:
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://api.aliax.io/api/articles/public"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://www.aliax.io/revista"
```
Expected: `HTTP 200` for both.

This task has no commit of its own beyond the deploy. If any verification step reveals a bug, fix it as part of whichever earlier task owns that code, commit the fix there, and re-run this task's verification from the top.
