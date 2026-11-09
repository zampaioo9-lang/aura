# Nombre completo en suscripción de Revista + panel de Suscriptores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La caja de suscripción pública de Revista Aliax pide nombre completo (obligatorio) además de correo, y el Admin tiene una sub-pestaña "Suscriptores" (dentro de "Revista") para ver, filtrar, exportar y dar de baja a los suscritos.

**Architecture:** Se agrega `fullName` al modelo `NewsletterSubscriber` (Prisma + `db push`), se propaga por la ruta pública existente (`POST /newsletter/subscribe`) y se usa como nombre real del contacto en Resend. Se agregan 3 endpoints nuevos de solo-admin en `backend/src/routes/admin.ts` (listar, exportar CSV, dar de baja) y una sub-pestaña nueva en `AdminRevista.tsx` que los consume a través de `useArticles.ts`.

**Tech Stack:** Express + Prisma + TypeScript (backend ya existente), React + TypeScript + axios (frontend ya existente). Sin librerías nuevas.

**Nota sobre pruebas:** este backend no tiene suite de pruebas automatizadas ni ambiente de desarrollo separado (mismo patrón que el resto del proyecto, ver `docs/superpowers/plans/2026-11-04-revista-aliax-fase2-newsletter.md`). Verificación por tarea: `npx tsc -b` (backend y frontend) compila sin errores; la verificación funcional real es manual y end-to-end en la Tarea 8.

---

### Task 1: Agregar `fullName` al modelo `NewsletterSubscriber`

**Files:**
- Modify: `backend/prisma/schema.prisma:751-761`

- [ ] **Step 1: Agregar el campo**

En `backend/prisma/schema.prisma`, el modelo actual es:

```prisma
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

Reemplazar por (se agrega `fullName` justo después de `id`):

```prisma
model NewsletterSubscriber {
  id           String            @id @default(cuid())
  fullName     String
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

- [ ] **Step 2: Aplicar el cambio de schema con `db push`**

Run (desde `backend/`): `npx prisma db push`

Cuando pregunte por una columna `NOT NULL` sin default en una tabla con filas existentes, Prisma ofrece rellenar con un valor temporal o cancelar. Si pide confirmación interactiva y el entorno no la soporta, correr en su lugar:

```bash
npx prisma db execute --stdin <<'EOF'
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "fullName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NewsletterSubscriber" ALTER COLUMN "fullName" DROP DEFAULT;
EOF
npx prisma db push
```

(El segundo `db push` solo confirma que el schema de Prisma y la DB ya coinciden, no debería pedir nada más.)

Expected: `npx prisma db push` termina con "The database is already in sync with the Prisma schema" (o equivalente de éxito), sin pedir más confirmaciones.

- [ ] **Step 3: Regenerar el cliente de Prisma**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add fullName to NewsletterSubscriber"
```

---

### Task 2: Validación — `fullName` obligatorio en el schema de suscripción

**Files:**
- Modify: `backend/src/utils/validation.ts` (bloque `subscribeNewsletterSchema`)

- [ ] **Step 1: Agregar el campo al schema de Zod**

El bloque actual:

```typescript
export const subscribeNewsletterSchema = z.object({
  email: z.string().trim().email(),
  audience: z.enum(['PACIENTES', 'TERAPEUTAS']),
});
```

Reemplazar por:

```typescript
export const subscribeNewsletterSchema = z.object({
  fullName: z.string().trim().min(2, 'El nombre es obligatorio'),
  email: z.string().trim().email(),
  audience: z.enum(['PACIENTES', 'TERAPEUTAS']),
});
```

- [ ] **Step 2: Verificar que compila**

Run (desde `backend/`): `npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/validation.ts
git commit -m "feat: require fullName in subscribeNewsletterSchema"
```

---

### Task 3: Guardar `fullName` en la ruta pública y usarlo como nombre real en Resend

**Files:**
- Modify: `backend/src/routes/newsletter.ts:18-67` (ruta `POST /subscribe`)
- Modify: `backend/src/routes/newsletter.ts:70-96` (ruta `GET /confirm/:token`)

- [ ] **Step 1: Guardar `fullName` al crear/actualizar el suscriptor**

En `POST /subscribe`, el bloque actual:

```typescript
    const { email, audience } = subscribeNewsletterSchema.parse(req.body);
```

Reemplazar por:

```typescript
    const { fullName, email, audience } = subscribeNewsletterSchema.parse(req.body);
```

Más abajo, el bloque actual:

```typescript
    const confirmToken = crypto.randomBytes(24).toString('hex');
    const subscriber = existing
      ? await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { status: 'PENDING', confirmToken },
        })
      : await prisma.newsletterSubscriber.create({
          data: { email, audience, status: 'PENDING', confirmToken },
        });
```

Reemplazar por:

```typescript
    const confirmToken = crypto.randomBytes(24).toString('hex');
    const subscriber = existing
      ? await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { fullName, status: 'PENDING', confirmToken },
        })
      : await prisma.newsletterSubscriber.create({
          data: { fullName, email, audience, status: 'PENDING', confirmToken },
        });
```

(Se actualiza `fullName` también en el caso `existing`, por si alguien se vuelve a suscribir con un nombre distinto al que puso la primera vez.)

- [ ] **Step 2: Usar el nombre real al agregar el contacto a Resend**

En `GET /confirm/:token`, la línea actual:

```typescript
    await addContact(subscriber.email, subscriber.email, toAudienceTarget(subscriber.audience));
```

Reemplazar por:

```typescript
    await addContact(subscriber.email, subscriber.fullName, toAudienceTarget(subscriber.audience));
```

- [ ] **Step 3: Verificar que compila**

Run (desde `backend/`): `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/newsletter.ts
git commit -m "feat: persist fullName and use it as the Resend contact name"
```

---

### Task 4: Endpoints de admin — listar, exportar CSV, dar de baja

**Files:**
- Modify: `backend/src/routes/admin.ts`

- [ ] **Step 1: Agregar el import de `removeContact`**

La línea actual (cerca del inicio del archivo):

```typescript
import { sendBroadcast, getBroadcasts, addContact } from '../services/audienceService';
```

Reemplazar por:

```typescript
import { sendBroadcast, getBroadcasts, addContact, removeContact, type AudienceTarget } from '../services/audienceService';
```

- [ ] **Step 2: Agregar los 3 endpoints nuevos**

Agregar este bloque completo justo después de la ruta `POST /newsletter/sync` existente (después de la línea `});` que la cierra, antes de `// GET /api/admin/users/:id/activity?days=30`):

```typescript
function toSubscriberAudienceTarget(audience: 'PACIENTES' | 'TERAPEUTAS'): AudienceTarget {
  return audience === 'PACIENTES' ? 'PACIENTES' : 'GENERAL';
}

function parseSubscriberAudienceFilter(raw: unknown): 'PACIENTES' | 'TERAPEUTAS' | undefined {
  return raw === 'PACIENTES' || raw === 'TERAPEUTAS' ? raw : undefined;
}

// GET /api/admin/newsletter/subscribers?audience=PACIENTES|TERAPEUTAS — list subscribers
router.get('/newsletter/subscribers', async (req, res, next) => {
  try {
    const audience = parseSubscriberAudienceFilter(req.query.audience);
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: audience ? { audience } : undefined,
      orderBy: { createdAt: 'desc' },
      select: { id: true, fullName: true, email: true, audience: true, status: true, createdAt: true, confirmedAt: true },
    });
    res.json(subscribers);
  } catch (err) {
    next(err);
  }
});

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// GET /api/admin/newsletter/subscribers/export?audience=PACIENTES|TERAPEUTAS — CSV download
router.get('/newsletter/subscribers/export', async (req, res, next) => {
  try {
    const audience = parseSubscriberAudienceFilter(req.query.audience);
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: audience ? { audience } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Nombre,Correo,Audiencia,Estado,Fecha de registro,Fecha de confirmacion';
    const rows = subscribers.map((s) =>
      [
        csvEscape(s.fullName),
        csvEscape(s.email),
        s.audience,
        s.status,
        s.createdAt.toISOString(),
        s.confirmedAt ? s.confirmedAt.toISOString() : '',
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="suscriptores-revista.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/newsletter/subscribers/:id/unsubscribe — manual unsubscribe by an admin
router.post('/newsletter/subscribers/:id/unsubscribe', async (req, res, next) => {
  try {
    const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { id: req.params.id } });
    if (!subscriber) return res.status(404).json({ error: 'Suscriptor no encontrado' });

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED' },
    });
    await removeContact(subscriber.email, toSubscriberAudienceTarget(subscriber.audience));

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Verificar que compila**

Run (desde `backend/`): `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/admin.ts
git commit -m "feat: add admin endpoints to list, export and unsubscribe newsletter subscribers"
```

---

### Task 5: Campo "Nombre completo" en el formulario público de suscripción

**Files:**
- Modify: `frontend/scripts/generate-blog.ts:141-203` (función `renderSubscribeBand`)

- [ ] **Step 1: Agregar el input de nombre**

La línea actual:

```typescript
    <input id="ra-subscribe-email" type="email" required placeholder="tu@correo.com" style="padding:12px 16px;border-radius:12px;border:1px solid rgba(8,4,20,0.15);font-size:14px;font-family:'DM Sans',sans-serif">
```

Reemplazar por (se agrega el input de nombre justo antes, mismo estilo):

```typescript
    <input id="ra-subscribe-fullname" type="text" required placeholder="Tu nombre completo" style="padding:12px 16px;border-radius:12px;border:1px solid rgba(8,4,20,0.15);font-size:14px;font-family:'DM Sans',sans-serif">
    <input id="ra-subscribe-email" type="email" required placeholder="tu@correo.com" style="padding:12px 16px;border-radius:12px;border:1px solid rgba(8,4,20,0.15);font-size:14px;font-family:'DM Sans',sans-serif">
```

- [ ] **Step 2: Mandar el nombre en el POST**

El bloque actual:

```typescript
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
```

Reemplazar por:

```typescript
    var fullName = document.getElementById('ra-subscribe-fullname').value;
    var email = document.getElementById('ra-subscribe-email').value;
    var audience = document.querySelector('input[name="ra-audience"]:checked').value;
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    fetch('${API_URL}/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: fullName, email: email, audience: audience })
    }).then(function(r){ return r.json(); }).then(function(data){
```

- [ ] **Step 3: Verificar que compila**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores. (Este script se corre con `tsx` en el build, `tsc -b` solo revisa tipos.)

- [ ] **Step 4: Commit**

```bash
git add frontend/scripts/generate-blog.ts
git commit -m "feat: require full name in the public newsletter subscribe form"
```

---

### Task 6: Funciones del hook `useArticles` para el panel de Suscriptores

**Files:**
- Modify: `frontend/src/hooks/useArticles.ts`

- [ ] **Step 1: Agregar el tipo `Subscriber`**

Justo después de la interfaz `Article` (después de su llave de cierre `}`), agregar:

```typescript
export type SubscriberStatus = 'PENDING' | 'CONFIRMED' | 'UNSUBSCRIBED';

export interface Subscriber {
  id: string;
  fullName: string;
  email: string;
  audience: CategoryAudience;
  status: SubscriberStatus;
  createdAt: string;
  confirmedAt: string | null;
}
```

- [ ] **Step 2: Agregar las 3 funciones al hook**

Buscar el `return` final del hook (el bloque que lista `listArticles, getArticle, createArticle, ...`) y, justo antes de esa línea `return {`, agregar:

```typescript
  const listSubscribers = useCallback(async (audience?: CategoryAudience): Promise<Subscriber[]> => {
    try {
      const res = await api.get('/admin/newsletter/subscribers', { params: audience ? { audience } : undefined });
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al cargar los suscriptores'));
    }
  }, []);

  const exportSubscribersCsv = useCallback(async (audience?: CategoryAudience): Promise<void> => {
    try {
      const res = await api.get('/admin/newsletter/subscribers/export', {
        params: audience ? { audience } : undefined,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'suscriptores-revista.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al exportar los suscriptores'));
    }
  }, []);

  const unsubscribeSubscriber = useCallback(async (id: string): Promise<void> => {
    try {
      await api.post(`/admin/newsletter/subscribers/${id}/unsubscribe`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al dar de baja al suscriptor'));
    }
  }, []);
```

Y agregar los 3 nombres al objeto que retorna el hook, en la lista existente (ej. después de `getNewsletterPreview,`):

```typescript
    listSubscribers, exportSubscribersCsv, unsubscribeSubscriber,
```

- [ ] **Step 3: Verificar que compila**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useArticles.ts
git commit -m "feat: add subscriber list/export/unsubscribe functions to useArticles"
```

---

### Task 7: Sub-pestaña "Suscriptores" en `AdminRevista.tsx`

**Files:**
- Modify: `frontend/src/components/admin/AdminRevista.tsx`

- [ ] **Step 1: Importar lo nuevo**

La línea actual:

```typescript
import { Newspaper, Tag, Plus } from 'lucide-react';
import { useArticles, type Category, type CategoryAudience, type Article } from '../../hooks/useArticles';
```

Reemplazar por:

```typescript
import { Newspaper, Tag, Plus, Users, Download } from 'lucide-react';
import { useArticles, type Category, type CategoryAudience, type Article, type Subscriber } from '../../hooks/useArticles';
```

- [ ] **Step 2: Destructurar las nuevas funciones del hook**

La línea actual:

```typescript
  const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle, publishSiteChanges, getRebuildStatus, getNewsletterPreview } = useArticles();
```

Reemplazar por:

```typescript
  const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle, publishSiteChanges, getRebuildStatus, getNewsletterPreview, listSubscribers, exportSubscribersCsv, unsubscribeSubscriber } = useArticles();
```

- [ ] **Step 3: Agregar el estado del sub-tab y de suscriptores**

La línea actual:

```typescript
  const [subTab, setSubTab] = useState<'categorias' | 'articulos'>('articulos');
```

Reemplazar por:

```typescript
  const [subTab, setSubTab] = useState<'categorias' | 'articulos' | 'suscriptores'>('articulos');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberFilter, setSubscriberFilter] = useState<CategoryAudience | 'TODOS'>('TODOS');
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
```

- [ ] **Step 4: Agregar la carga de suscriptores**

Justo después de la función `loadRebuildStatus` existente (después de su llave de cierre `};`), agregar:

```typescript
  const loadSubscribers = async (filter: CategoryAudience | 'TODOS') => {
    setLoadingSubscribers(true);
    try {
      setSubscribers(await listSubscribers(filter === 'TODOS' ? undefined : filter));
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await exportSubscribersCsv(subscriberFilter === 'TODOS' ? undefined : subscriberFilter);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleUnsubscribe = async (subscriber: Subscriber) => {
    if (!window.confirm(`¿Dar de baja a ${subscriber.fullName || subscriber.email}?`)) return;
    try {
      await unsubscribeSubscriber(subscriber.id);
      toast('Suscriptor dado de baja', 'success');
      await loadSubscribers(subscriberFilter);
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };
```

- [ ] **Step 5: Disparar la carga cuando se entra al sub-tab o cambia el filtro**

Buscar el bloque de `useEffect` existentes (después de `useEffect(() => { loadRebuildStatus(); }, []);`) y agregar:

```typescript
  useEffect(() => {
    if (subTab === 'suscriptores') loadSubscribers(subscriberFilter);
  }, [subTab, subscriberFilter]);
```

- [ ] **Step 6: Agregar el botón de tab**

El bloque actual:

```typescript
        <button style={tabBtn(subTab === 'categorias')} onClick={() => setSubTab('categorias')}>
          <Tag size={15} /> Categorias
        </button>
      </div>
```

Reemplazar por:

```typescript
        <button style={tabBtn(subTab === 'categorias')} onClick={() => setSubTab('categorias')}>
          <Tag size={15} /> Categorias
        </button>
        <button style={tabBtn(subTab === 'suscriptores')} onClick={() => setSubTab('suscriptores')}>
          <Users size={15} /> Suscriptores
        </button>
      </div>
```

- [ ] **Step 7: Agregar el bloque de contenido del sub-tab**

Justo después del bloque `{subTab === 'articulos' && ( ... )}` completo (buscar su cierre, la línea `)}` que corresponde a esa apertura — es la última sección antes del cierre del `return (` principal del componente), agregar este bloque nuevo (antes del cierre final `</div>\n  );` del componente):

```typescript
      {subTab === 'suscriptores' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['TODOS', 'TERAPEUTAS', 'PACIENTES'] as const).map((f) => (
                <button key={f} style={tabBtn(subscriberFilter === f)} onClick={() => setSubscriberFilter(f)}>
                  {f === 'TODOS' ? 'Todos' : f === 'TERAPEUTAS' ? 'Terapeutas' : 'Pacientes'}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 600, cursor: exportingCsv ? 'not-allowed' : 'pointer' }}
            >
              <Download size={14} /> {exportingCsv ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.tableHdr }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Nombre</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Correo</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Audiencia</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Fecha</th>
                  <th style={{ padding: '10px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loadingSubscribers && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: C.textMuted }}>Cargando...</td></tr>
                )}
                {!loadingSubscribers && subscribers.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: C.textMuted }}>Sin suscriptores todavia</td></tr>
                )}
                {subscribers.map((s, i) => {
                  const audiencePill = s.audience === 'TERAPEUTAS'
                    ? { bg: 'rgba(13,148,136,0.12)', color: '#0d9488', label: 'Terapeuta' }
                    : { bg: 'rgba(139,92,246,0.12)', color: '#7c3aed', label: 'Paciente' };
                  const statusPill = s.status === 'CONFIRMED'
                    ? { bg: 'rgba(22,163,74,0.12)', color: '#16a34a', label: 'Confirmado' }
                    : s.status === 'PENDING'
                    ? { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Pendiente' }
                    : { bg: C.tableRowAlt, color: C.textMuted, label: 'Baja' };
                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? C.tableRow : C.tableRowAlt }}>
                      <td style={{ padding: '10px 16px', color: C.text }}>{s.fullName || 'Sin nombre'}</td>
                      <td style={{ padding: '10px 16px', color: C.text }}>{s.email}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: audiencePill.bg, color: audiencePill.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{audiencePill.label}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: statusPill.bg, color: statusPill.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{statusPill.label}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: C.textMuted }}>{new Date(s.createdAt).toLocaleDateString('es-MX')}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {s.status !== 'UNSUBSCRIBED' && (
                          <button
                            onClick={() => handleUnsubscribe(s)}
                            style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Dar de baja
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
```

- [ ] **Step 8: Verificar que compila**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/admin/AdminRevista.tsx
git commit -m "feat: add Suscriptores sub-tab to the Revista admin panel"
```

---

### Task 8: Verificación end-to-end en producción

No es código — son pasos de verificación manual, igual que se ha hecho para el resto de Revista (no hay ambiente de desarrollo separado).

- [ ] **Step 1: Fusionar y desplegar**

Fusionar la rama a `master`, `git push origin master`, y desplegar backend (`npx vercel --prod` desde `backend/`) y frontend (`npx vercel --prod` desde la raíz, recordando el paso extra de `vercel promote ... --scope cesars-projects-ddd06b7a` — ver `[[feedback_aliax_deploy_architecture]]`).

- [ ] **Step 2: Suscribirse de prueba con nombre real**

Ir a `https://www.aliax.io/revista`, llenar el formulario con un nombre de prueba real (ej. "Prueba Verificacion") y un correo propio, confirmar la suscripción desde el correo recibido.
Expected: el formulario no deja enviar sin nombre (campo `required`); el correo de confirmación llega; al confirmar, redirige a `/revista?newsletter=confirmado`.

- [ ] **Step 3: Confirmar que aparece en el Admin con el nombre correcto**

Entrar al Admin → Revista → Suscriptores. Buscar el registro de prueba.
Expected: aparece con el nombre completo correcto (no vacío, no el correo), audiencia correcta, estado "Confirmado".

- [ ] **Step 4: Probar el filtro por audiencia**

Cambiar entre "Todos", "Terapeutas", "Pacientes".
Expected: la lista se filtra correctamente en cada caso.

- [ ] **Step 5: Exportar CSV y revisar el contenido**

Dar clic en "Exportar CSV", abrir el archivo descargado.
Expected: contiene las columnas Nombre, Correo, Audiencia, Estado, Fecha de registro, Fecha de confirmacion, con el registro de prueba presente y el nombre legible (sin comillas/caracteres rotos).

- [ ] **Step 6: Dar de baja desde el Admin**

Dar clic en "Dar de baja" sobre el registro de prueba, confirmar.
Expected: el estado cambia a "Baja" en la tabla sin recargar manualmente; revisar en Resend (audiencia correspondiente) que el contacto ya no aparece.

- [ ] **Step 7: Limpiar el dato de prueba**

Si se quiere dejar la base limpia, borrar el registro de prueba directamente en Neon (SQL Editor): `DELETE FROM "NewsletterSubscriber" WHERE email = '<correo de prueba>';` — opcional, no bloqueante.

- [ ] **Step 8: Actualizar memoria del proyecto**

Agregar una nota a `project_aliax_revista_newsletter.md` (o archivo de memoria equivalente) documentando que el campo `fullName` ya es obligatorio y que el panel de Suscriptores existe en el Admin — para que sesiones futuras no vuelvan a investigar esto desde cero.
