# Revista Aliax — Fase 2: Newsletter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build double opt-in email subscription for Revista Aliax (two Resend audiences: terapeutas merged into the existing general audience, pacientes in a new one) plus a manual "send this article as a newsletter" flow from the CMS.

**Architecture:** New `NewsletterSubscriber` Prisma model is our consent/dedup source of truth; a new public `backend/src/routes/newsletter.ts` handles subscribe/confirm/unsubscribe; `audienceService.ts` is generalized to target either Resend audience; the existing admin Newsletter UI (`AdminPanel.tsx`) gets an audience selector, and `AdminRevista.tsx` gets a button that pre-fills it from a published article via a new backend preview endpoint. The public subscribe form is static HTML + vanilla JS added to `generate-blog.ts`, matching the existing filter-pills pattern (no client framework, no build step).

**Tech Stack:** Express + Prisma (PostgreSQL/Neon) + Resend (`resend` npm package, Audiences + Broadcasts + transactional email) + Zod validation + React/TypeScript admin UI. No test framework in this repo — verification is `tsc -b`/`tsc --noEmit`, `curl` against local dev servers pointed at the shared production DB with disposable test data, and manual browser checks, matching how every other feature in this repo has been verified (see e.g. `docs/superpowers/plans/2026-07-10-reset-password.md`).

**IMPORTANT — shared database:** This repo has no separate development database (`backend/.env` and `.env.production` point at the same Neon instance — see `[[project_aliax]]` memory). Any `prisma db push` or test data created while running the dev server locally acts on the real production database. Every verification step below uses disposable, clearly-named test data (emails like `newsletter-test-terapeuta@example.com`) that gets deleted at the end, and **Task 1's migration step requires explicit user confirmation before running**, because it changes the schema of the live shared database.

---

### Task 1: Prisma schema — `NewsletterSubscriber` model

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the enum and model**

Find the `enum CategoryAudience { ... }` block (around line 740) and the `model Category` block just above it. Add the new enum and model right after `enum CategoryAudience`, so it reads:

```prisma
enum CategoryAudience {
  PACIENTES
  TERAPEUTAS
}

enum SubscriberStatus {
  PENDING
  CONFIRMED
  UNSUBSCRIBED
}

model NewsletterSubscriber {
  id           String            @id @default(cuid())
  email        String
  audience     CategoryAudience
  status       SubscriberStatus  @default(PENDING)
  confirmToken String?           @unique
  confirmedAt  DateTime?
  createdAt    DateTime          @default(now())

  @@unique([email, audience])
  @@index([confirmToken])
}
```

- [ ] **Step 2: Generate the Prisma client (does not touch the database)**

Run: `cd backend && npx prisma generate`
Expected: `✔ Generated Prisma Client` with no errors. This only regenerates TypeScript types locally — it does not touch the database.

- [ ] **Step 3: STOP — confirm before touching the shared production database**

Before running the next step, tell the user in chat:

> "Voy a aplicar el cambio de schema (`NewsletterSubscriber`) directo a la base de datos compartida de producción con `prisma db push`, porque este proyecto no tiene una base de datos de desarrollo separada. ¿Confirmas que proceda?"

Wait for an explicit yes. Do not run Step 4 without it.

- [ ] **Step 4: Apply the schema change**

Run: `cd backend && npx prisma db push`
Expected: `🚀 Your database is now in sync with your Prisma schema.` — do NOT use `prisma migrate dev` (it fails with P3006 against this Neon instance, per `[[project_aliax]]` memory).

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add NewsletterSubscriber model and SubscriberStatus enum"
```

---

### Task 2: `env.ts` — new audience variable

**Files:**
- Modify: `backend/src/config/env.ts:37`

- [ ] **Step 1: Add `RESEND_AUDIENCE_ID_PACIENTES`**

Right after this existing line:

```ts
  RESEND_AUDIENCE_ID: process.env.RESEND_AUDIENCE_ID || '',
```

add:

```ts
  RESEND_AUDIENCE_ID_PACIENTES: process.env.RESEND_AUDIENCE_ID_PACIENTES || '',
  API_BASE_URL: process.env.API_BASE_URL || 'https://api.aliax.io',
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/env.ts
git commit -m "feat: add RESEND_AUDIENCE_ID_PACIENTES env var"
```

---

### Task 3: Generalize `audienceService.ts` to accept which audience to use

**Files:**
- Modify: `backend/src/services/audienceService.ts`

- [ ] **Step 1: Replace the whole file**

The current file hardcodes a single `getAudienceId()`. Replace its contents with:

```ts
import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export type AudienceTarget = 'GENERAL' | 'PACIENTES';

export function resolveAudienceId(target: AudienceTarget): string {
  const id = target === 'PACIENTES' ? env.RESEND_AUDIENCE_ID_PACIENTES : env.RESEND_AUDIENCE_ID;
  if (!id) throw new Error(`Audience de Resend no configurada para "${target}"`);
  return id;
}

// ── Contacts ───────────────────────────────────────────────────────

export async function addContact(email: string, name: string, target: AudienceTarget = 'GENERAL'): Promise<void> {
  if (!resend) return;
  const audienceId = resolveAudienceId(target);
  const [firstName, ...rest] = name.trim().split(' ');
  const result = await resend.contacts.create({
    audienceId,
    email,
    firstName: firstName || name,
    lastName: rest.join(' ') || undefined,
    unsubscribed: false,
  });
  if (result.error) {
    // Ignore "already exists" errors
    if (!result.error.message?.toLowerCase().includes('already')) {
      console.warn('[Audience] addContact error:', result.error.message);
    }
  }
}

export async function removeContact(email: string, target: AudienceTarget = 'GENERAL'): Promise<void> {
  if (!resend) return;
  try {
    const audienceId = resolveAudienceId(target);
    // Mark as unsubscribed (Resend requires the contact id, so we update via email)
    await resend.contacts.update({
      audienceId,
      email,
      unsubscribed: true,
    });
  } catch (err: any) {
    console.warn('[Audience] removeContact warning:', err?.message);
  }
}

// ── Broadcasts ─────────────────────────────────────────────────────

export interface BroadcastOptions {
  name: string;       // Internal name, not shown to recipients
  subject: string;
  html: string;
  target?: AudienceTarget;
}

export async function sendBroadcast(opts: BroadcastOptions): Promise<{ id: string }> {
  if (!resend) throw new Error('Resend no configurado');
  const audienceId = resolveAudienceId(opts.target ?? 'GENERAL');

  // 1. Create the broadcast
  const created = await resend.broadcasts.create({
    audienceId,
    from: env.RESEND_FROM_EMAIL,
    name: opts.name,
    subject: opts.subject,
    html: opts.html,
  });

  if (!created.data?.id) {
    throw new Error('No se pudo crear el broadcast en Resend');
  }

  // 2. Send it
  await resend.broadcasts.send(created.data.id);

  return { id: created.data.id };
}

export async function getBroadcasts(): Promise<any[]> {
  if (!resend) return [];
  try {
    const result = await resend.broadcasts.list();
    return result.data?.data ?? [];
  } catch {
    return [];
  }
}
```

Note the old `getAudienceId()` export is gone — Step 2 finds and fixes every caller.

- [ ] **Step 2: Find every caller that will break**

Run: `cd backend && grep -rn "addContact\|removeContact\|sendBroadcast\|getAudienceId" src/routes/*.ts`

You'll see `src/routes/admin.ts` calling `addContact(user.email, user.name)` and `sendBroadcast({ name, subject, html })` with no target — that's fine, they default to `'GENERAL'`, matching today's behavior exactly. Task 8 updates `admin.ts` to actually pass a target. No other file calls these functions yet.

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors (the default-param backward compatibility means `admin.ts` still compiles unchanged until Task 8).

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/audienceService.ts
git commit -m "refactor: generalize audienceService to support multiple Resend audiences"
```

---

### Task 4: Validation schema for subscribing

**Files:**
- Modify: `backend/src/utils/validation.ts`

- [ ] **Step 1: Add the schema**

Add at the end of the file:

```ts
export const subscribeNewsletterSchema = z.object({
  email: z.string().email(),
  audience: z.enum(['PACIENTES', 'TERAPEUTAS']),
});
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/validation.ts
git commit -m "feat: add subscribeNewsletterSchema"
```

---

### Task 5: Email templates — confirmation email + article-as-newsletter

**Files:**
- Modify: `backend/src/services/emailService.ts`

- [ ] **Step 1: Add two entries to the `emailTemplates` object**

Open `backend/src/services/emailService.ts`, find the end of the `emailTemplates = { ... }` object (the closing `};` — search for `};` after the last existing template, e.g. after `adminTranscriptionError` or whichever is last). Add these two entries as new properties inside the object, before its closing `};`:

```ts

  // Confirmación de suscripción al newsletter de Revista (double opt-in)
  newsletterConfirm: (data: { email: string; confirmUrl: string; audience: 'PACIENTES' | 'TERAPEUTAS' }) => ({
    to: data.email,
    subject: 'Confirma tu suscripción a Revista Aliax',
    html: baseTemplate('Confirma tu suscripción', `
      ${heading('Un último paso')}
      ${subtext(
        data.audience === 'TERAPEUTAS'
          ? 'Confirma tu correo para empezar a recibir los artículos nuevos de Revista Aliax para terapeutas.'
          : 'Confirma tu correo para empezar a recibir los artículos nuevos de Revista Aliax sobre salud mental.'
      )}
      ${ctaButton('Confirmar suscripción', data.confirmUrl)}
      ${subtext('Si tú no pediste esto, puedes ignorar este correo: no se te suscribirá a nada.')}
    `),
  }),

  // HTML pre-llenado para "Enviar como newsletter" desde el CMS de Revista
  articleNewsletter: (data: { title: string; excerpt: string; coverImage: string | null; articleUrl: string }) => ({
    subject: data.title,
    html: baseTemplate(data.title, `
      ${data.coverImage ? `<img src="${data.coverImage}" alt="" style="width:100%;border-radius:12px;margin-bottom:20px;display:block;">` : ''}
      ${heading(data.title)}
      ${subtext(data.excerpt)}
      ${ctaButton('Leer artículo completo', data.articleUrl)}
    `),
  }),
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/emailService.ts
git commit -m "feat: add newsletterConfirm and articleNewsletter email templates"
```

---

### Task 6: Public subscribe/confirm/unsubscribe routes

**Files:**
- Create: `backend/src/routes/newsletter.ts`

- [ ] **Step 1: Write the route file**

```ts
import { Router } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { subscribeNewsletterSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { addContact, removeContact, type AudienceTarget } from '../services/audienceService';
import { emailTemplates, sendEmail } from '../services/emailService';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

function toAudienceTarget(audience: 'PACIENTES' | 'TERAPEUTAS'): AudienceTarget {
  return audience === 'PACIENTES' ? 'PACIENTES' : 'GENERAL';
}

// POST /api/newsletter/subscribe: public, rate-limited by IP+email per day
router.post('/subscribe', async (req, res, next) => {
  try {
    const { email, audience } = subscribeNewsletterSchema.parse(req.body);

    const ip = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const today = new Date().toISOString().split('T')[0];
    const rlKey = `newsletter-subscribe:${ip}:${today}`;
    const existingLimit = await prisma.rateLimit.findUnique({ where: { key: rlKey } });
    if (existingLimit && existingLimit.count >= 5) {
      throw new AppError(429, 'Demasiados intentos. Vuelve a intentarlo más tarde.');
    }
    await prisma.rateLimit.upsert({
      where: { key: rlKey },
      update: { count: { increment: 1 } },
      create: { key: rlKey, count: 1, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email_audience: { email, audience } },
    });

    if (existing?.status === 'CONFIRMED') {
      // Ya confirmado: responder éxito sin reenviar nada.
      return res.json({ ok: true });
    }

    const confirmToken = crypto.randomBytes(24).toString('hex');
    const subscriber = existing
      ? await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { status: 'PENDING', confirmToken },
        })
      : await prisma.newsletterSubscriber.create({
          data: { email, audience, status: 'PENDING', confirmToken },
        });

    const confirmUrl = `${env.API_BASE_URL}/api/newsletter/confirm/${subscriber.confirmToken}`;
    const tpl = emailTemplates.newsletterConfirm({ email, confirmUrl, audience });
    // Se espera el envio: sin await, en produccion la funcion serverless puede congelarse
    // justo despues de responder y el correo nunca sale (confirmado en vivo 2026-11-05).
    await sendEmail(tpl.to, tpl.subject, tpl.html);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/newsletter/confirm/:token: public, link from the confirmation email
router.get('/confirm/:token', async (req, res, next) => {
  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: req.params.token },
    });
    if (!subscriber) {
      return res.redirect(`${env.FRONTEND_URL}/revista?newsletter=invalido`);
    }
    if (subscriber.status === 'UNSUBSCRIBED') {
      // Un link de confirmacion viejo no debe poder revivir a alguien ya dado de baja.
      return res.redirect(`${env.FRONTEND_URL}/revista?newsletter=invalido`);
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    await addContact(subscriber.email, subscriber.email, toAudienceTarget(subscriber.audience));

    res.redirect(`${env.FRONTEND_URL}/revista?newsletter=confirmado`);
  } catch (err) {
    next(err);
  }
});

// GET /api/newsletter/unsubscribe/:token: public
router.get('/unsubscribe/:token', async (req, res, next) => {
  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: req.params.token },
    });
    if (!subscriber) {
      return res.redirect(`${env.FRONTEND_URL}/revista?newsletter=invalido`);
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED' },
    });

    await removeContact(subscriber.email, toAudienceTarget(subscriber.audience));

    res.redirect(`${env.FRONTEND_URL}/revista?newsletter=baja`);
  } catch (err) {
    next(err);
  }
});

export default router;
```

Note: `confirmToken` doubles as the unsubscribe token too (same link shape, one less field) — once confirmed it stays on the row, so `/unsubscribe/:token` keeps working after confirmation.

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors. If you see `Property 'email_audience' does not exist`, it means Task 1 Step 2 (`npx prisma generate`) wasn't run after the schema change — re-run it.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/newsletter.ts
git commit -m "feat: add public newsletter subscribe/confirm/unsubscribe routes"
```

---

### Task 7: Register the new routes (both entry points)

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/api/index.ts`

- [ ] **Step 1: `src/index.ts` — dev entry point**

Find:

```ts
import articleRoutes from './routes/articles';
```

Add right after it:

```ts
import newsletterRoutes from './routes/newsletter';
```

Find:

```ts
app.use('/api/articles', articleRoutes);
```

Add right after it:

```ts
app.use('/api/newsletter', newsletterRoutes);
```

- [ ] **Step 2: `api/index.ts` — Vercel production entry point**

Find:

```ts
  const articleRoutes = require('../src/routes/articles').default;
```

Add right after it:

```ts
  const newsletterRoutes = require('../src/routes/newsletter').default;
```

Find:

```ts
  app.use('/api/articles', articleRoutes);
```

Add right after it:

```ts
  app.use('/api/newsletter', newsletterRoutes);
```

This is the exact pattern every other route follows in this file — both entry points must be updated, or production silently won't have the route (this has bitten this project before: see `[[project_aliax_revista_blog]]` memory on the review-routes bug).

- [ ] **Step 3: Verify both compile**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Start the dev server and smoke-test**

Run: `cd backend && PORT=4000 npm run dev` (background/separate terminal)
Then: `curl -s -X POST http://localhost:4000/api/newsletter/subscribe -H "Content-Type: application/json" -d '{"email":"newsletter-test-terapeuta@example.com","audience":"TERAPEUTAS"}'`
Expected: `{"ok":true}`. Check the server log for `[Email] Resend no configurado...` (if `RESEND_API_KEY` isn't set locally) or a real send log — either way, no stack trace.

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts backend/api/index.ts
git commit -m "feat: register newsletter routes in both entry points"
```

---

### Task 8: Admin newsletter endpoints — accept an audience target

**Files:**
- Modify: `backend/src/routes/admin.ts`

- [ ] **Step 1: Read the current block**

Run: `grep -n "POST /api/admin/newsletter\|GET /api/admin/newsletter\|POST /api/admin/newsletter/sync" backend/src/routes/admin.ts`
Read the three route handlers found (`POST /newsletter`, `GET /newsletter`, `POST /newsletter/sync`) to copy their exact current indentation before editing.

- [ ] **Step 2: Update `POST /newsletter` to accept `audience`**

Replace:

```ts
router.post('/newsletter', async (req, res, next) => {
  try {
    const { subject, html, name } = req.body as {
      subject: string;
      html: string;
      name?: string;
    };

    if (!subject?.trim() || !html?.trim()) {
      return res.status(400).json({ error: 'Asunto y HTML son requeridos' });
    }

    const broadcastName = name?.trim() || `Newsletter ${new Date().toISOString().slice(0, 10)}`;
    const result = await sendBroadcast({ name: broadcastName, subject, html });

    res.json({ ok: true, broadcastId: result.id });
  } catch (err: any) {
    next(err);
  }
});
```

with:

```ts
router.post('/newsletter', async (req, res, next) => {
  try {
    const { subject, html, name, audience } = req.body as {
      subject: string;
      html: string;
      name?: string;
      audience?: 'GENERAL' | 'PACIENTES';
    };

    if (!subject?.trim() || !html?.trim()) {
      return res.status(400).json({ error: 'Asunto y HTML son requeridos' });
    }

    const broadcastName = name?.trim() || `Newsletter ${new Date().toISOString().slice(0, 10)}`;
    const result = await sendBroadcast({ name: broadcastName, subject, html, target: audience === 'PACIENTES' ? 'PACIENTES' : 'GENERAL' });

    res.json({ ok: true, broadcastId: result.id });
  } catch (err: any) {
    next(err);
  }
});
```

- [ ] **Step 3: Update `POST /newsletter/sync` to pass an explicit target**

Replace the whole handler:

```ts
router.post('/newsletter/sync', async (_req, res, next) => {
  try {
    if (!env.RESEND_AUDIENCE_ID) {
      return res.status(400).json({ error: 'RESEND_AUDIENCE_ID no configurado en las variables de entorno' });
    }

    const users = await prisma.user.findMany({
      select: { email: true, name: true },
    });

    let added = 0;
    let failed = 0;
    for (const user of users) {
      try {
        await addContact(user.email, user.name);
        added++;
      } catch (err: any) {
        console.error('[Sync] failed for', user.email, err?.message);
        failed++;
      }
    }

    res.json({ ok: true, added, failed, total: users.length });
  } catch (err) {
    next(err);
  }
});
```

with:

```ts
router.post('/newsletter/sync', async (_req, res, next) => {
  try {
    if (!env.RESEND_AUDIENCE_ID) {
      return res.status(400).json({ error: 'RESEND_AUDIENCE_ID no configurado en las variables de entorno' });
    }

    const users = await prisma.user.findMany({
      select: { email: true, name: true },
    });

    let added = 0;
    let failed = 0;
    for (const user of users) {
      try {
        await addContact(user.email, user.name, 'GENERAL');
        added++;
      } catch (err: any) {
        console.error('[Sync] failed for', user.email, err?.message);
        failed++;
      }
    }

    res.json({ ok: true, added, failed, total: users.length });
  } catch (err) {
    next(err);
  }
});
```

(`/newsletter/sync` only ever syncs registered Aliax users — those are always therapists today, so it stays hardcoded to `'GENERAL'`; it doesn't need an `audience` request param. The only change is the third argument on `addContact`.)

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/admin.ts
git commit -m "feat: let admin newsletter broadcast target either Resend audience"
```

---

### Task 9: "Send as newsletter" preview endpoint for articles

**Files:**
- Modify: `backend/src/routes/articles.ts`

- [ ] **Step 1: Import the email template helper**

Find the top-of-file imports (around line 1-11) and add:

```ts
import { emailTemplates } from '../services/emailService';
import { env } from '../config/env';
```

- [ ] **Step 2: Add the route**

Find the existing `router.get('/:id', ...)` handler (around line 186) and add this new route right after it:

```ts

// GET /api/articles/:id/newsletter-preview: Subject+HTML to pre-fill the Newsletter form (auth, admin)
router.get('/:id/newsletter-preview', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) throw new AppError(404, 'Articulo no encontrado');
    if (article.status !== 'PUBLISHED') throw new AppError(400, 'Solo se puede enviar un articulo publicado');

    const tpl = emailTemplates.articleNewsletter({
      title: article.title,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      articleUrl: `${env.FRONTEND_URL}/revista/${article.slug}`,
    });

    res.json({ subject: tpl.subject, html: tpl.html, name: `Articulo: ${article.title}` });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/articles.ts
git commit -m "feat: add newsletter-preview endpoint for published articles"
```

---

### Task 10: Frontend hook — `getNewsletterPreview`

**Files:**
- Modify: `frontend/src/hooks/useArticles.ts`

- [ ] **Step 1: Add the function**

Find `const publishArticle = useCallback(...)` (around line 139) and add this new function right before it:

```ts
  const getNewsletterPreview = useCallback(async (id: string): Promise<{ subject: string; html: string; name: string }> => {
    try {
      const res = await api.get(`/articles/${id}/newsletter-preview`);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al generar la vista previa del newsletter'));
    }
  }, []);
```

- [ ] **Step 2: Export it**

Find the hook's `return { ... }` block (around line 220) and add `getNewsletterPreview,` to it, e.g.:

```ts
  return {
    listCategories, createCategory, updateCategory,
    listArticles, getArticle, createArticle, updateArticle,
    publishArticle, unpublishArticle, deleteArticle,
    createBlock, updateBlock, deleteBlock, swapBlockOrder,
    publishSiteChanges, getRebuildStatus, getNewsletterPreview,
  };
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc -b`
Expected: no errors. (Remember: `tsc --noEmit` alone is a no-op in this project's frontend — always use `tsc -b`, per `[[feedback_aliax_frontend_tsc_noemit]]` memory.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useArticles.ts
git commit -m "feat: add getNewsletterPreview to useArticles hook"
```

---

### Task 11: "Enviar como newsletter" button in the CMS

**Files:**
- Modify: `frontend/src/components/admin/AdminRevista.tsx`

- [ ] **Step 1: Accept a callback prop**

Find:

```ts
interface Props {
  C: Colors;
}

export default function AdminRevista({ C }: Props) {
  const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle, publishSiteChanges, getRebuildStatus } = useArticles();
```

Replace with:

```ts
interface Props {
  C: Colors;
  onSendAsNewsletter: (preview: { subject: string; html: string; name: string }) => void;
}

export default function AdminRevista({ C, onSendAsNewsletter }: Props) {
  const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle, publishSiteChanges, getRebuildStatus, getNewsletterPreview } = useArticles();
```

- [ ] **Step 2: Add the button**

Find the "Despublicar"/"Publicar" button block (around line 283-300, ends with `{article.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}\n</button>`) and add this new button right after its closing `</button>`, before the "Borrar" button:

```tsx
                      {article.status === 'PUBLISHED' && (
                        <button
                          onClick={async () => {
                            try {
                              const preview = await getNewsletterPreview(article.id);
                              onSendAsNewsletter(preview);
                            } catch (err: any) {
                              toast(err.message, 'error');
                            }
                          }}
                          style={{
                            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                            border: 'none', background: C.accentLight, color: C.accent, cursor: 'pointer',
                          }}
                        >
                          Enviar como newsletter
                        </button>
                      )}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc -b`
Expected: an error here is expected and correct right now — `AdminPanel.tsx` doesn't pass `onSendAsNewsletter` yet. Confirm the error specifically names the missing prop (not something else), then move to Task 12 to fix it.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/AdminRevista.tsx
git commit -m "feat: add Enviar como newsletter button to published articles"
```

---

### Task 12: Wire it up + audience selector in AdminPanel

**Files:**
- Modify: `frontend/src/pages/AdminPanel.tsx`

- [ ] **Step 1: Add audience state**

Find:

```ts
  // Newsletter (Resend Broadcasts)
  const [nlSubject, setNlSubject] = useState('');
  const [nlHtml, setNlHtml] = useState('');
  const [nlName, setNlName] = useState('');
```

Replace with:

```ts
  // Newsletter (Resend Broadcasts)
  const [nlSubject, setNlSubject] = useState('');
  const [nlHtml, setNlHtml] = useState('');
  const [nlName, setNlName] = useState('');
  const [nlAudience, setNlAudience] = useState<'GENERAL' | 'PACIENTES'>('GENERAL');
```

- [ ] **Step 2: Pass the audience when sending**

Find:

```ts
  const handleSendNewsletter = async () => {
    if (!nlSubject.trim() || !nlHtml.trim()) return;
    const confirmed = window.confirm(`¿Enviar este newsletter a TODA la audiencia en Resend?\n\nEsto es irreversible.`);
    if (!confirmed) return;
    setSendingNl(true);
    setNlResult(null);
    try {
      const res = await api.post('/admin/newsletter', { subject: nlSubject, html: nlHtml, name: nlName || undefined });
      setNlResult({ ok: true, broadcastId: res.data.broadcastId });
```

Replace with:

```ts
  const handleSendNewsletter = async () => {
    if (!nlSubject.trim() || !nlHtml.trim()) return;
    const audienceLabel = nlAudience === 'PACIENTES' ? 'Pacientes (suscriptores de Revista)' : 'Terapeutas (audiencia general)';
    const confirmed = window.confirm(`¿Enviar este newsletter a: ${audienceLabel}?\n\nEsto es irreversible.`);
    if (!confirmed) return;
    setSendingNl(true);
    setNlResult(null);
    try {
      const res = await api.post('/admin/newsletter', { subject: nlSubject, html: nlHtml, name: nlName || undefined, audience: nlAudience });
      setNlResult({ ok: true, broadcastId: res.data.broadcastId });
```

- [ ] **Step 3: Add the selector to the JSX, next to "Nombre interno"/"Asunto"**

Find:

```tsx
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Nombre interno</label>
                <input
                  type="text"
                  placeholder="Ej: Newsletter Marzo 2026"
                  value={nlName}
                  onChange={e => setNlName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Asunto del correo</label>
                <input
                  type="text"
                  placeholder="Ej: Tu competencia ya usa IA. ¿Y tú?"
                  value={nlSubject}
                  onChange={e => { setNlSubject(e.target.value); setNlResult(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
            </div>
```

Replace with (adds a third column for the audience selector):

```tsx
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Nombre interno</label>
                <input
                  type="text"
                  placeholder="Ej: Newsletter Marzo 2026"
                  value={nlName}
                  onChange={e => setNlName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Asunto del correo</label>
                <input
                  type="text"
                  placeholder="Ej: Tu competencia ya usa IA. ¿Y tú?"
                  value={nlSubject}
                  onChange={e => { setNlSubject(e.target.value); setNlResult(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.textMuted }}>Audiencia</label>
                <select
                  value={nlAudience}
                  onChange={e => setNlAudience(e.target.value as 'GENERAL' | 'PACIENTES')}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                  style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.text }}
                >
                  <option value="GENERAL">Terapeutas (audiencia general)</option>
                  <option value="PACIENTES">Pacientes (suscriptores de Revista)</option>
                </select>
              </div>
            </div>
```

- [ ] **Step 4: Pass the callback to `<AdminRevista />` and switch tabs on click**

Find:

```tsx
        {pageTab === 'revista' && <AdminRevista C={C} />}
```

Replace with:

```tsx
        {pageTab === 'revista' && (
          <AdminRevista
            C={C}
            onSendAsNewsletter={(preview) => {
              if (nlHtml.trim() && nlHtml !== preview.html) {
                const confirmed = window.confirm('Tienes contenido sin enviar en el newsletter. ¿Reemplazarlo con este articulo?');
                if (!confirmed) return;
              }
              setNlSubject(preview.subject);
              setNlHtml(preview.html);
              setNlName(preview.name);
              // El preview del articulo no trae la audiencia de su categoria todavia,
              // asi que siempre vuelve al default en vez de arrastrar la ultima seleccion manual.
              setNlAudience('GENERAL');
              setNlResult(null);
              setPageTab('comunicacion');
            }}
          />
        )}
```

- [ ] **Step 5: Verify it compiles**

Run: `cd frontend && npx tsc -b`
Expected: no errors now (this fixes the expected error from Task 11 Step 3).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/AdminPanel.tsx
git commit -m "feat: audience selector + Enviar como newsletter wiring in AdminPanel"
```

---

### Task 13: Public "Suscríbete" band on Revista pages

**Files:**
- Modify: `frontend/scripts/generate-blog.ts`

- [ ] **Step 1: Add `renderSubscribeBand()`**

Find `function renderTherapistCTA(): string {` (around line 139) and add this new function right before it:

```ts
function renderSubscribeBand(): string {
  return `<div style="background:#fff;border-radius:20px;padding:40px;text-align:center;margin:56px 0 0;box-shadow:0 10px 30px rgba(8,4,20,0.10)">
  <h3 style="font-size:22px;margin:0 0 8px">Suscríbete a Revista Aliax</h3>
  <p style="font-size:14px;color:#4b4b55;margin:0 0 20px;font-family:'DM Sans',sans-serif;font-weight:400">Recibe los artículos nuevos directo en tu correo.</p>
  <form id="ra-subscribe-form" style="display:flex;flex-direction:column;gap:12px;max-width:380px;margin:0 auto">
    <input id="ra-subscribe-email" type="email" required placeholder="tu@correo.com" style="padding:12px 16px;border-radius:12px;border:1px solid rgba(8,4,20,0.15);font-size:14px;font-family:'DM Sans',sans-serif">
    <div style="display:flex;gap:16px;justify-content:center;font-size:13px;color:#3f3f46;font-family:'DM Sans',sans-serif">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="ra-audience" value="TERAPEUTAS" checked> Soy terapeuta</label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="ra-audience" value="PACIENTES"> Busco ayuda psicológica</label>
    </div>
    <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#5b5b66;text-align:left;font-family:'DM Sans',sans-serif">
      <input id="ra-subscribe-consent" type="checkbox" required style="margin-top:2px">
      <span>Acepto recibir correos de Revista Aliax y el <a href="/privacidad">Aviso de Privacidad</a>.</span>
    </label>
    <button type="submit" style="padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700;border:none;cursor:pointer">Suscribirme</button>
    <p id="ra-subscribe-msg" style="font-size:13px;margin:0;min-height:18px"></p>
  </form>
</div>
<script>
(function(){
  var params = new URLSearchParams(location.search);
  var state = params.get('newsletter');
  var msgEl = document.getElementById('ra-subscribe-msg');
  if (state === 'confirmado' && msgEl) { msgEl.style.color = '#0d9488'; msgEl.textContent = '¡Listo! Ya estás suscrito.'; }
  if (state === 'baja' && msgEl) { msgEl.style.color = '#5b5b66'; msgEl.textContent = 'Te diste de baja correctamente.'; }
  if (state === 'invalido' && msgEl) { msgEl.style.color = '#dc2626'; msgEl.textContent = 'Ese enlace ya no es válido.'; }
  // Limpia el parametro de la URL para que un reload o un link compartido no repita el mensaje.
  if (state) { history.replaceState(null, '', location.pathname); }

  var form = document.getElementById('ra-subscribe-form');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var email = document.getElementById('ra-subscribe-email').value;
    var audience = document.querySelector('input[name="ra-audience"]:checked').value;
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    fetch('${API_URL}/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, audience: audience })
    }).then(function(r){ return r.json(); }).then(function(data){
      btn.disabled = false;
      btn.textContent = 'Suscribirme';
      if (data.ok) {
        msgEl.style.color = '#0d9488';
        msgEl.textContent = 'Revisa tu correo para confirmar tu suscripción.';
        form.reset();
      } else {
        msgEl.style.color = '#dc2626';
        msgEl.textContent = data.error || 'Algo salió mal, intenta de nuevo.';
      }
    }).catch(function(){
      btn.disabled = false;
      btn.textContent = 'Suscribirme';
      msgEl.style.color = '#dc2626';
      msgEl.textContent = 'Algo salió mal, intenta de nuevo.';
    });
  });
})();
</script>`;
}
```

- [ ] **Step 2: Add the band to the listing page**

Find (in `generateListingPage`):

```ts
  <h3 style="font-size:24px;margin-bottom:24px">Ultimos articulos</h3>
  <div class="ra-grid3">${cards}</div>
</div>
${renderPillsScript()}`;
```

Replace with:

```ts
  <h3 style="font-size:24px;margin-bottom:24px">Ultimos articulos</h3>
  <div class="ra-grid3">${cards}</div>
  ${renderSubscribeBand()}
</div>
${renderPillsScript()}`;
```

- [ ] **Step 3: Add the band to the article page**

Find (in `generateArticlePage`):

```ts
  ${blocksHtml}
  ${renderRelatedSection(related)}
</div>`;
```

Replace with:

```ts
  ${blocksHtml}
  ${renderRelatedSection(related)}
  ${renderSubscribeBand()}
</div>`;
```

- [ ] **Step 4: Verify it compiles and generates**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

Run: `cd frontend && VITE_API_URL="https://api.aliax.io/api" npx tsx scripts/generate-blog.ts`
Expected: `[Revista] Generados: N articulos, index, sitemap.xml, robots.txt` — then open `frontend/public/revista/index.html` and `frontend/public/revista/<slug>.html` in a local static server (`npx serve frontend/public`) and confirm the "Suscríbete" band renders at the bottom of both, matches the current light-mode visual style, and the email field + radio buttons + checkbox + button are all there and usable.

- [ ] **Step 5: Commit**

```bash
git add frontend/scripts/generate-blog.ts
git commit -m "feat: add Suscribete band to Revista listing and article pages"
```

---

### Task 14: Privacy policy — mention newsletter consent

**Files:**
- Modify: `frontend/src/pages/PrivacyPolicy.tsx:76`

- [ ] **Step 1: Add the line**

Find:

```tsx
              <li>Enviar correos transaccionales y de notificación a través de Resend</li>
```

Add right after it:

```tsx
              <li>Enviarte el newsletter de Revista Aliax, solo si te suscribes voluntariamente y confirmas tu correo; puedes darte de baja cuando quieras desde el enlace incluido en cada envío</li>
```

Code review follow-up also updated the existing Resend provider bullet (section 5) to name the new Audience/contacts data flow, not just the already-disclosed transactional-email one:

```tsx
              <li><strong>Resend</strong>: envío de correos electrónicos transaccionales y de notificación; si te suscribes al newsletter de Revista Aliax, tu correo también se almacena en una lista de contactos (Audience) de Resend para ese envío</li>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PrivacyPolicy.tsx
git commit -m "docs: mention newsletter consent in privacy policy"
```

---

### Task 15: End-to-end verification and cleanup

**Files:** none (verification only)

- [ ] **Step 1: Set up the new Resend Audience**

Tell the user: "Antes de probar de punta a punta, necesito que crees una nueva Audience en el dashboard de Resend (la llamaríamos algo como 'Revista — Pacientes') y me des su ID, para configurarlo como `RESEND_AUDIENCE_ID_PACIENTES` en Vercel (proyecto backend) y en tu `.env` local." Wait for the ID before continuing with real-audience verification; the subscribe/confirm flow for `TERAPEUTAS` can be verified without it since it reuses the existing `RESEND_AUDIENCE_ID`.

- [ ] **Step 2: Full double opt-in flow, both audiences**

With the backend dev server running (`PORT=4000 npm run dev`) and `RESEND_AUDIENCE_ID_PACIENTES` set:
1. `curl -s -X POST http://localhost:4000/api/newsletter/subscribe -H "Content-Type: application/json" -d '{"email":"newsletter-test-terapeuta@example.com","audience":"TERAPEUTAS"}'` — expect `{"ok":true}`, check the confirmation email arrived (or the dev log if Resend isn't configured locally).
2. Repeat with `"email":"newsletter-test-paciente@example.com","audience":"PACIENTES"`.
3. Get each `confirmToken` from the DB (`npx prisma studio` or a one-off disposable script), visit `http://localhost:4000/api/newsletter/confirm/<token>` in a browser for each, confirm it redirects to `/revista?newsletter=confirmado` and the subscriber's `status` is now `CONFIRMED` in the DB.
4. In the Resend dashboard, confirm `newsletter-test-terapeuta@example.com` landed in the **general** audience and `newsletter-test-paciente@example.com` landed in the **Pacientes** audience.
5. Re-POST `/subscribe` for the already-confirmed terapeuta email — expect `{"ok":true}` with no new confirmation email sent (check the dev log, no new `[Email] Sent` line for it).
6. Visit `http://localhost:4000/api/newsletter/unsubscribe/<token>` for the paciente test subscriber, confirm it redirects to `/revista?newsletter=baja` and they're marked `unsubscribed` in Resend.

- [ ] **Step 3: "Enviar como newsletter" flow**

1. In the CMS, publish a disposable test article.
2. Click "Enviar como newsletter" — confirm you land on the Comunicación tab with Asunto/Nombre/HTML pre-filled from the article.
3. Before sending for real, switch the Audiencia selector between both options and confirm the confirm() dialog text changes accordingly.
4. Send a real test to whichever audience has only your own test subscriber in it, and confirm the email arrives and renders correctly (cover image, excerpt, "Leer artículo completo" button pointing at the right `/revista/<slug>` URL).

- [ ] **Step 4: Clean up all test data**

1. Delete the disposable test article from the CMS.
2. Delete both `NewsletterSubscriber` test rows (`npx prisma studio` or a disposable script) and remove the two test contacts from both Resend audiences via the dashboard.
3. Confirm independently (re-query the DB, re-check the Resend dashboard) that nothing test-related is left over.

- [ ] **Step 5: Deploy**

Confirm with the user before each deploy (per established project convention), then:
1. Backend: `cd backend && npx vercel --prod` (and confirm the two new env vars — `RESEND_AUDIENCE_ID_PACIENTES`, optionally `API_BASE_URL` if it needs to differ from the `https://api.aliax.io` default — are set in the Vercel "backend" project before or right after deploying).
2. Frontend: from the repo root, `npx vercel --prod` (never from inside `frontend/` — see `[[project_aliax_revista_blog]]` memory gotcha #1).
3. Smoke test in production: subscribe with a real disposable email on `www.aliax.io/revista`, confirm it, confirm it shows up in the right Resend audience, then clean that one up too.
