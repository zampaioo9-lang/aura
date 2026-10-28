# Cursos publicados: ubicaciones públicas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer visibles las ofertas (talleres/cursos) publicadas de un profesional en las dos páginas públicas donde un visitante ya ve sus servicios (`BookingPage.tsx` y el perfil público vía `MinimalistTemplate.tsx`), y agregar un botón de copiar enlace junto a "Ver perfil público" en el Dashboard.

**Architecture:** 100% frontend. El endpoint público `GET /api/offerings/profile/:profileId` (filtra solo `PUBLISHED`) ya existe desde Fase 1 — cada página hace su propio fetch, mismo patrón que ya usan para `reviews`. Las tarjetas de oferta navegan a `/oferta/:id` (Fase 3, ya existe), nunca abren un modal de reserva.

**Tech Stack:** React + TypeScript, react-router-dom, axios (via `api` client existente).

---

## Important context for whoever implements this

- **No test suite en este repo.** Verificación empírica contra el dev server local con datos de prueba desechables (Task 4).
- `backend/src/routes/offerings.ts`'s `GET /profile/:profileId` ya existe y ya filtra `status: 'PUBLISHED'` — **no se toca nada del backend en este plan**.
- `MinimalistTemplate.tsx` ya importa `GraduationCap` de `lucide-react` (usado en otro lado del archivo) — no hace falta agregarlo al import.
- **Descubrimiento importante durante la planeación**: el `copyUrl`/`copiedId` que ya existen en `Dashboard.tsx` (usados en la tarjeta "Comparte tu perfil") **NO están en el mismo componente** que el sidebar "Ver perfil público" — pertenecen a un componente distinto definido más abajo en el mismo archivo (la función `Dashboard()` termina en la línea 1048; `copyUrl` se define después de esa línea, en otro componente). Por eso Task 3 no reutiliza esa función directamente — define un handler local equivalente dentro de `Dashboard()`, usando el `toast` que esa función ya tiene disponible (`const { toast } = useToast();`, línea 202) en vez de un state de checkmark con temporizador.

---

### Task 1: `MinimalistTemplate.tsx` — mostrar ofertas publicadas en el perfil público

**Files:**
- Modify: `frontend/src/components/templates/MinimalistTemplate.tsx`

- [ ] **Step 1: Agregar el fetch de ofertas**

Encuentra este bloque (el `useEffect` que trae las reseñas, dentro de `MinimalistTemplate`):

```typescript
  const [reviewData, setReviewData] = useState<{
    reviews: { id: string; rating: number; comment: string | null; clientName: string; createdAt: string }[];
    averageRating: number | null;
    reviewCount: number;
  }>({ reviews: [], averageRating: null, reviewCount: 0 });
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  useEffect(() => {
    if (!profile.id) return;
    api.get(`/reviews/profile/${profile.id}`)
      .then(res => setReviewData(res.data))
      .catch(() => {})
      .finally(() => setReviewsLoaded(true));
  }, [profile.id]);
```

Agrega justo después (mismo patrón, para ofertas):

```typescript
  const [offerings, setOfferings] = useState<any[]>([]);

  useEffect(() => {
    if (!profile.id) return;
    api.get(`/offerings/profile/${profile.id}`)
      .then(res => setOfferings(res.data))
      .catch(() => {});
  }, [profile.id]);
```

- [ ] **Step 2: Agregar la seccion al layout mobile**

Encuentra este bloque exacto (sección "Servicios" del layout mobile):

```tsx
          {activeServices.length > 0 && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Servicios</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
                {activeServices.map((s: any) => (
                  <BoardServiceCard key={s.id} service={s} onBook={onBook} C={C} mobile />
                ))}
              </div>
            </div>
          )}
```

Agrega justo después:

```tsx
          {offerings.length > 0 && (
            <div style={{ ...sectionCard, padding: '18px 20px' }}>
              <SectionLabel>Talleres y Cursos</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
                {offerings.map((o: any) => (
                  <BoardOfferingCard key={o.id} offering={o} navigate={navigate} C={C} mobile />
                ))}
              </div>
            </div>
          )}
```

- [ ] **Step 3: Agregar la seccion al layout desktop**

Encuentra este bloque exacto (sección "Servicios" del layout desktop):

```tsx
        {activeServices.length > 0 && (
          <div style={sectionCard}>
            <SectionLabel>Servicios</SectionLabel>
            <div style={{
              display: 'grid',
              gridTemplateColumns: activeServices.length === 1
                ? 'minmax(200px, 320px)'
                : 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 14,
              marginTop: 14,
            }}>
              {activeServices.map((s: any) => (
                <BoardServiceCard key={s.id} service={s} onBook={onBook} C={C} />
              ))}
            </div>
          </div>
        )}
```

Agrega justo después:

```tsx
        {offerings.length > 0 && (
          <div style={sectionCard}>
            <SectionLabel>Talleres y Cursos</SectionLabel>
            <div style={{
              display: 'grid',
              gridTemplateColumns: offerings.length === 1
                ? 'minmax(200px, 320px)'
                : 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 14,
              marginTop: 14,
            }}>
              {offerings.map((o: any) => (
                <BoardOfferingCard key={o.id} offering={o} navigate={navigate} C={C} />
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 4: Crear el componente `BoardOfferingCard`**

Encuentra el final de la función `BoardServiceCard` (termina justo antes de `function AvailabilityWidget`):

```tsx
          <button
            onClick={() => onBook(s.id)}
            style={{ flexShrink: 0, background: C.accent, color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailabilityWidget({ activeDays, byDay, C }: { activeDays: number[]; byDay: Record<number, { startTime: string; endTime: string }[]>; C: any }) {
```

Agrega el nuevo componente justo entre el cierre de `BoardServiceCard` y la declaración de `AvailabilityWidget`:

```tsx
function BoardOfferingCard({ offering: o, navigate, C, mobile = false }: { offering: any; navigate: (path: string) => void; C: any; mobile?: boolean }) {
  void mobile;
  return (
    <div
      style={{
        borderRadius: 14, overflow: 'hidden',
        background: C.card,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 4px 18px rgba(0,0,0,0.38)',
        transition: 'transform .18s, box-shadow .18s',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.42)'; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = '0 2px 14px rgba(0,0,0,0.28)'; }}
    >
      <div style={{ height: 150, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
        {o.coverImage ? (
          <img src={o.coverImage} alt={o.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 800, color: C.accent, opacity: 0.55 }}>
            {o.title[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1, background: C.accentSoft }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {o.title}
        </p>
        <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 600, color: C.accent, background: 'rgba(45,212,191,0.15)', borderRadius: 6, padding: '2px 8px', letterSpacing: '0.3px' }}>
          {o.type === 'LIVE_WORKSHOP' ? 'Taller en vivo' : 'Curso grabado'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.accent, margin: 0, lineHeight: 1.1 }}>{formatPrice(o.priceUSD, 'USD')}</p>
          <button
            onClick={() => navigate(`/oferta/${o.id}`)}
            style={{ flexShrink: 0, background: C.accent, color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Ver detalles
          </button>
        </div>
      </div>
    </div>
  );
}
```

Nota: `navigate` ya está disponible en el componente `MinimalistTemplate` (línea `const navigate = useNavigate();` cerca del inicio) — se le pasa como prop a `BoardOfferingCard`, igual que `onBook` se le pasa a `BoardServiceCard`.

- [ ] **Step 5: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\cursos-ubicaciones-publicas\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/templates/MinimalistTemplate.tsx
git commit -m "feat: show published offerings on the public profile page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `BookingPage.tsx` — mostrar ofertas publicadas donde lleva la tarjeta de Explorar

**Files:**
- Modify: `frontend/src/pages/BookingPage.tsx`

- [ ] **Step 1: Agregar el fetch de ofertas**

Encuentra este bloque (el `useEffect` que trae las reseñas):

```typescript
  useEffect(() => {
    if (!profile?.id) return;
    api.get(`/reviews/profile/${profile.id}`)
      .then(res => {
        setReviews(res.data.reviews || []);
        setReviewStats({ averageRating: res.data.averageRating, reviewCount: res.data.reviewCount });
      })
      .catch(() => {})
      .finally(() => setReviewsLoaded(true));
  }, [profile?.id]);
```

Agrega justo después (mismo patrón, para ofertas), y declara el state nuevo junto a los demás `useState` de arriba:

Encuentra:

```typescript
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
```

Reemplaza con:

```typescript
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [offerings, setOfferings] = useState<any[]>([]);
```

Y después del `useEffect` de reviews, agrega:

```typescript
  useEffect(() => {
    if (!profile?.id) return;
    api.get(`/offerings/profile/${profile.id}`)
      .then(res => setOfferings(res.data))
      .catch(() => {});
  }, [profile?.id]);
```

- [ ] **Step 2: Agregar la seccion "Talleres y Cursos"**

Encuentra el cierre de la lista de servicios y el inicio de la sección de reseñas:

```tsx
        {/* Reviews */}
        {reviewsLoaded && (
```

Agrega justo antes (entre la lista de servicios y la de reseñas):

```tsx
        {/* Talleres y Cursos */}
        {offerings.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <p className="bp-services-title">Talleres y Cursos</p>
            <div>
              {offerings.map((o: any) => (
                <div key={o.id} className="bp-svc-card">
                  <div style={{ minWidth: 0 }}>
                    <p className="bp-svc-name">{o.title}</p>
                    <div className="bp-svc-meta">
                      {o.type === 'LIVE_WORKSHOP' ? 'Taller en vivo' : 'Curso grabado'}
                    </div>
                    {o.description && (
                      <p className="bp-svc-desc">{o.description}</p>
                    )}
                  </div>
                  <div className="bp-svc-right">
                    <span className="bp-svc-price">{formatPrice(o.priceUSD, 'USD')}</span>
                    <button
                      className="bp-svc-btn"
                      onClick={() => navigate(`/oferta/${o.id}`)}
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviewsLoaded && (
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\cursos-ubicaciones-publicas\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/pages/BookingPage.tsx
git commit -m "feat: show published offerings on BookingPage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `Dashboard.tsx` — boton de copiar enlace junto a "Ver perfil público"

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Agregar el handler de copiar, local a `Dashboard()`**

Encuentra la linea donde se obtiene `toast`, cerca del inicio de la función `Dashboard`:

```typescript
  const { toast } = useToast();
```

Deja esa línea igual, y busca el bloque de `useState` cercano:

```typescript
  const [accentId, setAccentId] = useState<string>(
    () => localStorage.getItem('aliax_accent') || 'aguamarina'
  );
```

Agrega justo después (handler simple, sin state nuevo -- usa el `toast` ya disponible en este componente para la confirmación, en vez del patron de checkmark+timeout que usa el componente separado de mas abajo en este mismo archivo, que no comparte scope con `Dashboard()`):

```typescript
  const copySidebarProfileLink = () => {
    if (profiles.length === 0) return;
    navigator.clipboard.writeText(`${window.location.origin}/${profiles[0].slug}`).then(() => {
      toast('Enlace copiado');
    });
  };
```

- [ ] **Step 2: Agregar el boton junto al link existente**

Encuentra este bloque exacto:

```tsx
            {profiles.length > 0 && (
              <a href={`/${profiles[0].slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <DashNavRow icon={<ExternalLink className="h-4 w-4" />} isActive={false} C={C} onClick={() => {}}>
                  Ver perfil público
                </DashNavRow>
              </a>
            )}
```

Reemplaza con:

```tsx
            {profiles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <a href={`/${profiles[0].slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                  <DashNavRow icon={<ExternalLink className="h-4 w-4" />} isActive={false} C={C} onClick={() => {}}>
                    Ver perfil público
                  </DashNavRow>
                </a>
                <button
                  onClick={copySidebarProfileLink}
                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 8, color: C.muted, display: 'flex', alignItems: 'center' }}
                  title="Copiar enlace"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\cursos-ubicaciones-publicas\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add copy-link button next to Ver perfil publico in sidebar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Verificación manual en navegador

Sin suite de tests en este repo, y los tres cambios son puramente de UI (ningún endpoint nuevo) -- la verificación es un recorrido manual en el navegador contra el dev server local, con una oferta de prueba publicada.

- [ ] **Step 1: Confirmar un puerto libre y levantar ambos dev servers**

```bash
netstat -ano | grep ":4560\|:5190"
```
Expected: sin salida (puertos libres). Si alguno esta ocupado, usa otro puerto libre en los comandos de abajo.

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\cursos-ubicaciones-publicas\backend"
PORT=4560 npm run dev > /tmp/pub-cursos-backend.log 2>&1 &
disown
sleep 8
curl -s -o /dev/null -w "health: %{http_code}\n" http://localhost:4560/api/health
```
Expected: `health: 200`.

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\cursos-ubicaciones-publicas\frontend"
VITE_API_URL=http://localhost:4560/api npm run dev -- --port 5190 > /tmp/pub-cursos-frontend.log 2>&1 &
disown
sleep 6
curl -s -o /dev/null -w "frontend: %{http_code}\n" http://localhost:5190/
```
Expected: `frontend: 200`.

- [ ] **Step 2: Crear datos de prueba (profesional Pro + perfil + una oferta PUBLISHED) via Prisma**

Guardar como `backend/setup-pub-test.tmp.ts`, correr con `npx tsx setup-pub-test.tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { hashPassword } from './src/services/authService';

const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now().toString(36);
  const password = await hashPassword('TestPub!2026');
  const user = await prisma.user.create({
    data: { email: `pub-test-${suffix}@example.com`, password, name: 'Pub Test', plan: 'PRO' },
  });
  const profile = await prisma.profile.create({
    data: { userId: user.id, slug: `pub-test-${suffix}`, title: 'Pub Test Profile', profession: 'Psicologo', published: true },
  });
  const offering = await prisma.offering.create({
    data: {
      profileId: profile.id, type: 'RECORDED_COURSE', title: 'Curso visible de prueba',
      description: 'Descripcion de prueba', priceUSD: 79, status: 'PUBLISHED',
    },
  });

  console.log(JSON.stringify({
    email: user.email, slug: profile.slug, offeringId: offering.id,
    userId: user.id, profileId: profile.id,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
```

(`published: true` es correcto -- confirmado contra `backend/prisma/schema.prisma`, `Profile.published` es un `Boolean @default(false)`.)

- [ ] **Step 3: Confirmar que la oferta aparece en `BookingPage.tsx`**

```bash
curl -s http://localhost:4560/api/offerings/profile/<profileId>
```
Expected: `200`, un array con la oferta creada.

Navegar en el navegador a `http://localhost:5190/book/<slug>` y confirmar visualmente que aparece la sección "Talleres y Cursos" con la tarjeta "Curso visible de prueba", precio "$79.00" (o formato equivalente de `formatPrice`), badge "Curso grabado". Click en "Ver detalles" debe navegar a `/oferta/<offeringId>`.

- [ ] **Step 4: Confirmar que la oferta aparece en el perfil público (`/:slug`)**

Navegar a `http://localhost:5190/<slug>`. Confirmar visualmente la sección "Talleres y Cursos" en el layout de escritorio (ventana ancha) y en el layout mobile (angostar la ventana a <768px o usar DevTools responsive). Click en la tarjeta debe navegar a `/oferta/<offeringId>`.

- [ ] **Step 5: Confirmar que un perfil SIN ofertas publicadas no muestra la seccion**

Crear un segundo profesional de prueba sin ninguna oferta (o simplemente usar cualquier perfil existente que no tenga ofertas PUBLISHED) y confirmar que ni `/book/<slug>` ni `/<slug>` muestran ninguna sección "Talleres y Cursos".

- [ ] **Step 6: Confirmar el boton de copiar enlace en el Dashboard**

Iniciar sesion con la cuenta de prueba (`pub-test-<suffix>@example.com` / `TestPub!2026`), ir al Dashboard, y en la columna izquierda bajo "Mi perfil" confirmar que junto a "Ver perfil público" aparece un icono de copiar. Click en el icono debe mostrar un toast "Enlace copiado" y copiar `http://localhost:5190/<slug>` al portapapeles (confirmar pegando en cualquier campo de texto).

- [ ] **Step 7: Limpiar datos de prueba**

Guardar como `backend/cleanup-pub-test.tmp.ts`, correr con `npx tsx cleanup-pub-test.tmp.ts <profileId> <userId>`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const profileId = process.argv[2];
  const userId = process.argv[3];
  await prisma.offering.deleteMany({ where: { profileId } });
  await prisma.profile.delete({ where: { id: profileId } });
  await prisma.user.delete({ where: { id: userId } });
  console.log('cleanup done');
  const u = await prisma.user.findUnique({ where: { id: userId } });
  const p = await prisma.profile.findUnique({ where: { id: profileId } });
  console.log(JSON.stringify({ residualUser: u, residualProfile: p }));
}
main().finally(() => prisma.$disconnect());
```

Confirmar en la salida que `residualUser` y `residualProfile` son `null` antes de seguir. Si se creo un segundo profesional de prueba en el Step 5, limpiarlo tambien.

- [ ] **Step 8: Detener ambos dev servers y borrar archivos temporales**

```bash
rm -f backend/setup-pub-test.tmp.ts backend/cleanup-pub-test.tmp.ts /tmp/pub-cursos-backend.log /tmp/pub-cursos-frontend.log
```

Encontrar y detener los procesos de ambos dev servers (via `Get-CimInstance Win32_Process`, confirmando que el `CommandLine` pertenece a este worktree antes de matarlos), y confirmar con `netstat` que los puertos 4560 y 5190 quedan libres.

---

### Task 5: Revisión final y cierre de rama

- [ ] **Step 1:** Dispatch del agente `superpowers:code-reviewer` sobre el diff completo de la rama contra `master`, con atención a: que las tres páginas oculten correctamente la sección cuando `offerings.length === 0` (sin dejar un `<div>` vacío o un título huérfano), que `BoardOfferingCard` no rompa el layout existente de `BoardServiceCard` en ninguna de las dos variantes (mobile/desktop), y que ningún campo de `Offering` que no deba exponerse públicamente (ya filtrado por el propio endpoint, pero vale la pena confirmar) se esté mostrando.
- [ ] **Step 2:** Corregir lo que el reviewer encuentre, re-verificar empíricamente lo que haya cambiado.
- [ ] **Step 3:** Usar `superpowers:finishing-a-development-branch` para presentar las 4 opciones de cierre.
