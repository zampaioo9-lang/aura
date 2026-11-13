# Captura de Leads en Matching con IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un paso de captura de nombre/WhatsApp en el flujo de Matching con IA de `/explorar`, justo antes de revelar los terapeutas sugeridos, y conectar esa captura con la reserva real de citas (`/book/:slug`) y con una vista de solo lectura en el Admin.

**Architecture:** Se crea `MatchLead`, un modelo Prisma nuevo, persistido desde que se calcula el match (`ai-matching.ts`) — así el lead existe aunque la persona nunca dé su nombre. El frontend (`Explorar.tsx`) agrega dos pantallas dentro del modal de matching que ya existe: un gate de contacto antes de revelar resultados, y una pantalla de confirmación de la situación antes de mandar a la reserva real. Los datos capturados viajan a `BookingForm` vía `sessionStorage` + dos nuevos props, `initialValues` y `matchLeadId` (sin tocar el resto de su lógica interna de envío). El `Booking` resultante queda enlazado al mismo lead. El Admin lista todos los leads con terapeuta elegido (`GET /admin/match-leads`) y los filtra por perfil dentro del panel de cada usuario — mismo patrón que ya usa para "Correos enviados".

**Tech Stack:** Express + Prisma (Neon/Postgres) en backend, React + TypeScript (Vite) en frontend. Sin framework de tests (ni Jest ni Vitest en este repo) — verificación vía `npx tsc -b` en frontend, scripts desechables con `npx tsx` en `backend/scripts/`, y pruebas manuales con curl/navegador contra servidores locales (`npm run dev` en ambos) apuntando a la base de datos de producción compartida (Neon no tiene entorno de desarrollo separado — cualquier fila de prueba se crea y se borra en la misma tarea).

---

## Task 1: Modelo de datos — `MatchLead` + enlace con `Booking`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261112120000_add_match_lead/migration.sql`

- [ ] **Step 1: Agregar el campo `matchLeadId` y su relación al modelo `Booking`**

En `backend/prisma/schema.prisma`, dentro de `model Booking { ... }`, después de la línea `cancellationReason String?` (y antes de la línea en blanco que sigue), agrega:

```prisma
  cancellationReason String?
  matchLeadId        String?       @unique
```

Y después de la línea `review        Review?` (antes de la línea en blanco y los `@@index`), agrega:

```prisma
  review        Review?
  matchLead     MatchLead?     @relation(fields: [matchLeadId], references: [id])
```

- [ ] **Step 2: Agregar la relación inversa en `Profile`**

Dentro de `model Profile { ... }`, justo después de la línea `bookings          Booking[]`, agrega:

```prisma
  bookings          Booking[]
  matchLeads        MatchLead[]
```

- [ ] **Step 3: Crear el modelo `MatchLead`**

Justo después de la llave de cierre de `model Booking { ... }` (antes de `model BookingSettings {`), agrega un modelo completo nuevo:

```prisma
model MatchLead {
  id                String     @id @default(uuid())
  answers           Json
  matchedProfileIds String[]
  name              String?
  whatsapp          String?
  selectedProfileId String?
  createdAt         DateTime   @default(now())
  contactedAt       DateTime?
  selectedAt        DateTime?

  selectedProfile Profile? @relation(fields: [selectedProfileId], references: [id])
  booking         Booking?

  @@index([selectedProfileId])
}
```

- [ ] **Step 4: Sincronizar el esquema con la base de datos**

`prisma migrate dev` no funciona contra Neon en este proyecto (falla con P3006 en shell no interactivo). El patrón ya usado en este repo es `db push` + migración manual + `migrate resolve`.

Run: `cd backend && npx prisma db push`
Expected: termina con `Your database is now in sync with your Prisma schema.` y regenera el cliente de Prisma.

- [ ] **Step 5: Crear el archivo de migración manual**

Create `backend/prisma/migrations/20261112120000_add_match_lead/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "MatchLead" (
    "id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "matchedProfileIds" TEXT[],
    "name" TEXT,
    "whatsapp" TEXT,
    "selectedProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactedAt" TIMESTAMP(3),
    "selectedAt" TIMESTAMP(3),

    CONSTRAINT "MatchLead_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "matchLeadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_matchLeadId_key" ON "Booking"("matchLeadId");

-- CreateIndex
CREATE INDEX "MatchLead_selectedProfileId_idx" ON "MatchLead"("selectedProfileId");

-- AddForeignKey
ALTER TABLE "MatchLead" ADD CONSTRAINT "MatchLead_selectedProfileId_fkey" FOREIGN KEY ("selectedProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_matchLeadId_fkey" FOREIGN KEY ("matchLeadId") REFERENCES "MatchLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 6: Marcar la migración como aplicada**

Run: `npx prisma migrate resolve --applied 20261112120000_add_match_lead`
Expected: `Migration 20261112120000_add_match_lead marked as applied.`

- [ ] **Step 7: Verificar con un script desechable**

Create `backend/scripts/verify-tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.matchLead.create({
    data: { answers: { q1: 'test', q2: 'test', q3: 'test', q4: '', q5: 'test' }, matchedProfileIds: [] },
  });
  console.log('Created:', lead.id);
  const found = await prisma.matchLead.findUnique({ where: { id: lead.id } });
  console.log('Found:', found?.id === lead.id);
  await prisma.matchLead.delete({ where: { id: lead.id } });
  console.log('Deleted OK');
}

main().finally(() => prisma.$disconnect());
```

Run: `npx tsx scripts/verify-tmp.ts`
Expected: imprime `Created: <uuid>`, `Found: true`, `Deleted OK` sin errores.

Then delete the file: `rm scripts/verify-tmp.ts` (es desechable, no se commitea).

- [ ] **Step 8: Commit**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax"
git add backend/prisma/schema.prisma backend/prisma/migrations/20261112120000_add_match_lead
git commit -m "feat: agregar modelo MatchLead y enlace opcional con Booking"
```

---

## Task 2: Crear el `MatchLead` al calcular el match

**Files:**
- Modify: `backend/src/routes/ai-matching.ts:125`

- [ ] **Step 1: Crear el lead justo antes de responder, e incluir su id en la respuesta**

En `backend/src/routes/ai-matching.ts`, reemplaza la línea 125 (`res.json({ matches: enriched });`) por:

```typescript
    const lead = await prisma.matchLead.create({
      data: {
        answers,
        matchedProfileIds: enriched.map(m => m.profileId),
      },
    });

    res.json({ matches: enriched, leadId: lead.id });
```

- [ ] **Step 2: Verificar manualmente con el servidor local**

Run (en una terminal): `cd backend && npm run dev`
Run (en otra terminal, con el servidor corriendo):

```bash
curl -s -X POST http://localhost:4000/api/ai-matching/match \
  -H "Content-Type: application/json" \
  -d '{"answers":{"q1":"ansiedad y estres laboral","q2":"En linea","q3":"Para mi","q4":"","q5":"no se"}}'
```

Expected: JSON con `"matches": [...]` y un campo `"leadId": "<uuid>"`.

- [ ] **Step 3: Confirmar en la base de datos y limpiar**

Create `backend/scripts/verify-tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.matchLead.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
  console.log('Last lead:', leads[0]);
  if (leads[0]) await prisma.matchLead.delete({ where: { id: leads[0].id } });
  console.log('Cleaned up');
}

main().finally(() => prisma.$disconnect());
```

Run: `npx tsx scripts/verify-tmp.ts`
Expected: muestra el lead recién creado por el curl del Step 2 (con las respuestas enviadas), y confirma `Cleaned up`.

Then delete the file: `rm scripts/verify-tmp.ts`

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/ai-matching.ts
git commit -m "feat: crear MatchLead al calcular el match con IA"
```

---

## Task 3: Endpoint para guardar nombre/WhatsApp del lead (el gate)

**Files:**
- Modify: `backend/src/utils/validation.ts`
- Modify: `backend/src/routes/ai-matching.ts`

- [ ] **Step 1: Agregar el schema de validación**

En `backend/src/utils/validation.ts`, agrega al final del archivo:

```typescript
export const matchLeadContactSchema = z.object({
  name: z.string().min(2, 'Nombre minimo 2 caracteres').max(100, 'Nombre maximo 100 caracteres'),
  whatsapp: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Formato: +34612345678'),
});

export const matchLeadSelectSchema = z.object({
  profileId: z.string().min(1, 'profileId es requerido'),
});
```

- [ ] **Step 2: Agregar el endpoint `PATCH /ai-matching/leads/:id/contact`**

En `backend/src/routes/ai-matching.ts`, agrega el import al inicio del archivo (junto a los demás imports):

```typescript
import { matchLeadContactSchema, matchLeadSelectSchema } from '../utils/validation';
```

Y antes de `export default router;`, agrega:

```typescript
router.patch('/leads/:id/contact', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, whatsapp } = matchLeadContactSchema.parse(req.body);

    const lead = await prisma.matchLead.findUnique({ where: { id } });
    if (!lead) throw new AppError(404, 'Lead no encontrado');

    const updated = await prisma.matchLead.update({
      where: { id },
      data: { name, whatsapp, contactedAt: new Date() },
    });

    res.json({ id: updated.id });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Verificar manualmente**

Con el servidor local corriendo (`npm run dev` en `backend/`), usa el `leadId` devuelto por un POST a `/ai-matching/match` (como en la Task 2) para probar:

```bash
curl -s -X PATCH http://localhost:4000/api/ai-matching/leads/<leadId>/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan Perez","whatsapp":"+5215512345678"}'
```

Expected: `{"id":"<leadId>"}`. Prueba también con un WhatsApp sin el formato `+`, por ejemplo `"5215512345678"` — expected: error 400 con el mensaje `Formato: +34612345678`.

Borra el lead de prueba. Create `backend/scripts/verify-tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.matchLead.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
  if (leads[0]) await prisma.matchLead.delete({ where: { id: leads[0].id } });
  console.log('Cleaned up:', leads[0]?.id);
}

main().finally(() => prisma.$disconnect());
```

Run: `npx tsx scripts/verify-tmp.ts`, luego `rm scripts/verify-tmp.ts`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/utils/validation.ts backend/src/routes/ai-matching.ts
git commit -m "feat: endpoint para guardar nombre/WhatsApp del MatchLead"
```

---

## Task 4: Endpoint para guardar el terapeuta elegido

**Files:**
- Modify: `backend/src/routes/ai-matching.ts`

- [ ] **Step 1: Agregar el endpoint `PATCH /ai-matching/leads/:id/select`**

En `backend/src/routes/ai-matching.ts`, antes de `export default router;` (después del endpoint de la Task 3), agrega:

```typescript
router.patch('/leads/:id/select', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { profileId } = matchLeadSelectSchema.parse(req.body);

    const lead = await prisma.matchLead.findUnique({ where: { id } });
    if (!lead) throw new AppError(404, 'Lead no encontrado');

    const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { id: true } });
    if (!profile) throw new AppError(404, 'Perfil no encontrado');

    const updated = await prisma.matchLead.update({
      where: { id },
      data: { selectedProfileId: profileId, selectedAt: new Date() },
    });

    res.json({ id: updated.id });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Verificar manualmente**

Igual patrón que la Task 3: crear un lead (POST a `/match`), llamar `PATCH /leads/:id/select` con un `profileId` real existente en la base de datos (puedes obtener uno con `curl http://localhost:4000/api/profiles/directory?limit=1`), confirmar `{"id": "..."}`, y probar con un `profileId` inventado para confirmar el 404.

Limpiar el lead de prueba. Create `backend/scripts/verify-tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.matchLead.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
  if (leads[0]) await prisma.matchLead.delete({ where: { id: leads[0].id } });
  console.log('Cleaned up:', leads[0]?.id);
}

main().finally(() => prisma.$disconnect());
```

Run: `npx tsx scripts/verify-tmp.ts`, luego `rm scripts/verify-tmp.ts`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/ai-matching.ts
git commit -m "feat: endpoint para guardar el terapeuta elegido en el MatchLead"
```

---

## Task 5: Vincular la reserva real con el `MatchLead`

**Files:**
- Modify: `backend/src/utils/validation.ts:86-103` (`bookingSchema`)
- Modify: `backend/src/services/bookingService.ts:259-321` (`createBooking`)

- [ ] **Step 1: Aceptar `matchLeadId` opcional en el schema de reservas**

En `backend/src/utils/validation.ts`, dentro de `bookingSchema`, después de la línea `startTime: z.string().regex(...)`, agrega:

```typescript
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
  matchLeadId: z.string().optional(),
```

- [ ] **Step 2: Aceptar y guardar `matchLeadId` en `createBooking`**

En `backend/src/services/bookingService.ts`, en la firma de `createBooking` (línea 259), agrega el campo al tipo:

```typescript
export async function createBooking(data: {
  profileId: string;
  serviceId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientNotes?: string;
  date: string;
  startTime: string;
  matchLeadId?: string;
}) {
```

Y en el `prisma.booking.create({ data: { ... } })` (línea ~304-316), agrega el campo:

```typescript
      endTime,
      status: 'PENDING',
      matchLeadId: data.matchLeadId || null,
```

- [ ] **Step 3: Verificar manualmente**

Con el servidor local corriendo, crea una reserva real de prueba pasando un `matchLeadId` de un lead de prueba creado antes (usa un `profileId`/`serviceId` reales de la base de datos — puedes consultarlos con `GET /api/profiles/directory`). Confirma con un script desechable (`backend/scripts/verify-tmp.ts`) que el `Booking` creado tiene el `matchLeadId` correcto:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const booking = await prisma.booking.findFirst({ where: { matchLeadId: { not: null } }, orderBy: { createdAt: 'desc' } });
  console.log('Booking con matchLeadId:', booking?.id, booking?.matchLeadId);
  if (booking) await prisma.booking.delete({ where: { id: booking.id } });
  console.log('Cleaned up');
}

main().finally(() => prisma.$disconnect());
```

Expected: imprime el id del booking y el `matchLeadId` esperado, luego `Cleaned up`. Borra también el `MatchLead` de prueba usado. Elimina el script al terminar.

- [ ] **Step 4: Commit**

```bash
git add backend/src/utils/validation.ts backend/src/services/bookingService.ts
git commit -m "feat: vincular Booking con el MatchLead que lo origino"
```

---

## Task 6: Endpoint de Admin para listar los leads

**Files:**
- Modify: `backend/src/routes/admin.ts`

- [ ] **Step 1: Agregar el endpoint**

En `backend/src/routes/admin.ts`, agrega en cualquier punto después de la configuración de `router.use(adminMiddleware);` (por ejemplo, junto a los demás `router.get('/users...')`):

```typescript
// GET /api/admin/match-leads — leads del Matching con IA que ya eligieron un terapeuta
router.get('/match-leads', async (_req, res, next) => {
  try {
    const leads = await prisma.matchLead.findMany({
      where: { selectedProfileId: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: { select: { id: true, status: true, date: true, startTime: true } },
      },
    });
    res.json(leads);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Verificar manualmente**

Con el servidor local corriendo y un token de admin real (ver cómo otras tareas de este repo obtienen uno — un admin desechable creado directo en la base de datos, nunca credenciales reales del usuario):

```bash
curl -s http://localhost:4000/api/admin/match-leads -H "Authorization: Bearer <token-admin>"
```

Expected: `[]` si no hay leads con terapeuta elegido, o una lista de leads con `name`, `whatsapp`, `answers`, `selectedProfileId`, `booking`.

Prueba creando un lead de prueba con `selectedProfileId` seteado. Create `backend/scripts/verify-tmp.ts` (reemplaza `<profileId-real>` por un id real obtenido de `GET /api/profiles/directory?limit=1`):

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.matchLead.create({
    data: {
      answers: { q1: 'test admin view', q2: 'test', q3: 'test', q4: '', q5: 'test' },
      matchedProfileIds: [],
      name: 'Prueba Admin',
      whatsapp: '+5215512345678',
      selectedProfileId: '<profileId-real>',
      selectedAt: new Date(),
    },
  });
  console.log('Created:', lead.id);
}

main().finally(() => prisma.$disconnect());
```

Run: `npx tsx scripts/verify-tmp.ts`, repite el curl de arriba y confirma que aparece, luego borra el lead con el mismo patrón de limpieza usado en la Task 4 (`findMany` + `delete` por el id más reciente) y elimina el script.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/admin.ts
git commit -m "feat: endpoint admin para listar leads de Matching con terapeuta elegido"
```

---

## Task 7: Gate de nombre/WhatsApp en el modal de Matching

**Files:**
- Modify: `frontend/src/pages/Explorar.tsx`

- [ ] **Step 1: Agregar estado nuevo para el lead y el gate**

En `Explorar.tsx`, dentro de `export default function Explorar()`, junto a los demás `useState` de matching (después de la línea `const [matchCity, setMatchCity] = useState('');`), agrega:

```typescript
  const [matchLeadId, setMatchLeadId]   = useState<string | null>(null);
  const [leadName, setLeadName]         = useState('');
  const [leadWhatsapp, setLeadWhatsapp] = useState('');
  const [leadError, setLeadError]       = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
```

- [ ] **Step 2: Reiniciar ese estado al abrir el modal**

En la función `openMatch`, agrega las líneas de reinicio:

```typescript
  const openMatch = () => {
    setShowMatch(true); setMatchStep(0);
    setMatchAnswers({ q1: '', q2: '', q3: '', q4: '', q5: '' });
    setMatchCountry(''); setMatchCity('');
    setMatchResults(null);
    setMatchLeadId(null); setLeadName(''); setLeadWhatsapp(''); setLeadError('');
  };
```

- [ ] **Step 3: Guardar el `leadId` y pasar por el gate en vez de ir directo a resultados**

Reemplaza `handleMatchSubmit` completo:

```typescript
  const handleMatchSubmit = async () => {
    setMatchStep(5);
    try {
      const { data } = await api.post('/ai-matching/match', { answers: matchAnswers });
      setMatchResults(data.matches);
      setMatchLeadId(data.leadId);
      setMatchStep(6); // gate de nombre/whatsapp, antes de revelar resultados
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudo procesar el matching. Intenta de nuevo.';
      alert(msg);
      setMatchStep(4);
    }
  };

  const handleLeadContact = async () => {
    setLeadError('');
    const digits = leadWhatsapp.replace(/\D/g, '');
    if (digits.length < 8) { setLeadError('WhatsApp inválido'); return; }
    if (leadName.trim().length < 2) { setLeadError('Escribe tu nombre'); return; }
    setSubmittingLead(true);
    try {
      await api.patch(`/ai-matching/leads/${matchLeadId}/contact`, { name: leadName.trim(), whatsapp: leadWhatsapp });
      setMatchStep(7); // ahora sí, revelar resultados
    } catch (err: any) {
      setLeadError(err?.response?.data?.error || 'No se pudo guardar tu información. Intenta de nuevo.');
    } finally {
      setSubmittingLead(false);
    }
  };
```

- [ ] **Step 4: Renderizar el paso del gate (nuevo `matchStep === 6`)**

En el JSX, justo antes del bloque `{/* Step: resultados */}` (el que hoy empieza con `{matchStep === 6 && matchResults && (`), agrega el nuevo paso del gate:

```tsx
            {/* Step: gate de contacto */}
            {matchStep === 6 && (
              <div>
                <h3 style={{ color: '#111827', fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>
                  Encontramos {matchResults?.length ?? 0} terapeutas compatibles contigo
                </h3>
                <p style={{ color: 'rgba(31,41,55,0.5)', fontSize: 13, margin: '0 0 20px' }}>
                  Déjanos tu nombre y WhatsApp para mostrártelos
                </p>

                <input
                  type="text"
                  value={leadName}
                  onChange={e => setLeadName(e.target.value)}
                  placeholder="Tu nombre"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 12,
                    background: '#eef7f5', border: 'none', color: '#111827', fontSize: 16,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <input
                  type="tel"
                  value={leadWhatsapp}
                  onChange={e => setLeadWhatsapp(e.target.value)}
                  placeholder="WhatsApp, ej. +5215512345678"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                    background: '#eef7f5', border: 'none', color: '#111827', fontSize: 16,
                    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {leadError && (
                  <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{leadError}</p>
                )}

                <button onClick={handleLeadContact} disabled={submittingLead} style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: '#2dd4bf', color: '#fff', fontSize: 14, fontWeight: 600,
                  fontFamily: 'inherit', cursor: submittingLead ? 'wait' : 'pointer', marginTop: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {submittingLead ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                  Ver mis resultados
                </button>
              </div>
            )}
```

- [ ] **Step 5: Mover el paso de resultados a `matchStep === 7`**

Cambia la condición del bloque de resultados existente de `{matchStep === 6 && matchResults && (` a `{matchStep === 7 && matchResults && (` (solo esa línea cambia por ahora; el contenido interno de las tarjetas se modifica en la Task 8).

- [ ] **Step 6: Verificación visual manual**

Run: `cd frontend && npm run dev`, abre `http://localhost:5173/explorar`, da clic en "Comenzar", responde las 5 preguntas. Expected: después de "Analizando compatibilidad...", aparece la nueva pantalla "Encontramos N terapeutas compatibles contigo" pidiendo nombre y WhatsApp, **antes** de ver cualquier nombre de terapeuta. Prueba con un WhatsApp de menos de 8 dígitos — expected: error "WhatsApp inválido" sin avanzar. Con datos válidos, confirma que avanza y muestra las tarjetas de siempre.

- [ ] **Step 7: Revisión de tipos**

Run: `npx tsc -b` (desde `frontend/`)
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Explorar.tsx
git commit -m "feat: gate de nombre/WhatsApp antes de revelar resultados del Matching"
```

---

## Task 8: Confirmación de la situación + redirección a la reserva real

**Files:**
- Modify: `frontend/src/pages/Explorar.tsx`

- [ ] **Step 1: Importar `useNavigate`**

Cambia la línea de import de react-router-dom:

```typescript
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
```

- [ ] **Step 2: Agregar estado para la tarjeta elegida y la situación confirmada**

Junto a los demás estados de matching, agrega:

```typescript
  const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null);
  const [confirmedSituation, setConfirmedSituation] = useState('');
  const [submittingSelect, setSubmittingSelect] = useState(false);
```

Y dentro del componente, obtén `navigate`:

```typescript
  const navigate = useNavigate();
```

- [ ] **Step 3: Cambiar las tarjetas de resultado de `<Link>` a selección**

En el bloque de resultados (ahora `matchStep === 7`), reemplaza el `<Link key={m.profileId} to={...} onClick={closeMatch} ...>` que envuelve cada tarjeta por un `<div>` con `onClick`, quitando la navegación directa:

```tsx
                  {matchResults.map((m, i) => (
                    <div
                      key={m.profileId}
                      onClick={() => { setSelectedResult(m); setConfirmedSituation(matchAnswers.q1); setMatchStep(8); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{
                        background: '#f7faf9', border: 'none',
                        boxShadow: '0 2px 10px rgba(15,23,22,0.08)',
                        borderRadius: 14, padding: '14px 16px', transition: 'box-shadow 0.2s',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                      }}>
```

(El resto del contenido interno de la tarjeta —avatar, nombre, score, razón— no cambia; solo se reemplaza el elemento contenedor `<Link ...> ... </Link>` por `<div onClick={...}> ... </div>` como arriba. Recuerda cerrar con `</div>` en vez de `</Link>` al final de cada tarjeta.)

- [ ] **Step 4: Renderizar el paso de confirmación (nuevo `matchStep === 8`)**

Después del bloque de resultados (`matchStep === 7`), agrega:

```tsx
            {/* Step: confirmar situación antes de agendar */}
            {matchStep === 8 && selectedResult && (
              <div>
                <h3 style={{ color: '#111827', fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>
                  Agenda con {selectedResult.profile.title}
                </h3>
                <p style={{ color: 'rgba(31,41,55,0.5)', fontSize: 13, margin: '0 0 16px' }}>
                  Esto es lo que le compartiremos para que ya sepa de qué quieres hablar. Puedes editarlo.
                </p>

                <textarea
                  value={confirmedSituation}
                  onChange={e => setConfirmedSituation(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    background: '#eef7f5', border: 'none',
                    color: '#111827', fontSize: 15, fontFamily: 'inherit', resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box', marginBottom: 16,
                  }}
                />

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setMatchStep(7)} style={{
                    flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(13,148,136,0.25)',
                    background: 'transparent', color: 'rgba(13,100,88,0.75)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
                  }}>← Volver</button>
                  <button
                    disabled={submittingSelect}
                    onClick={async () => {
                      setSubmittingSelect(true);
                      try {
                        await api.patch(`/ai-matching/leads/${matchLeadId}/select`, { profileId: selectedResult.profileId });
                        sessionStorage.setItem(`matchLeadData:${selectedResult.profile.slug}`, JSON.stringify({
                          clientName: leadName,
                          clientPhone: leadWhatsapp,
                          notes: confirmedSituation,
                          matchLeadId,
                        }));
                        closeMatch();
                        navigate(`/book/${selectedResult.profile.slug}`);
                      } catch {
                        setSubmittingSelect(false);
                      }
                    }}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                      background: '#2dd4bf', color: '#fff', fontSize: 14, fontWeight: 600,
                      fontFamily: 'inherit', cursor: submittingSelect ? 'wait' : 'pointer',
                    }}
                  >
                    {submittingSelect ? 'Un momento...' : 'Continuar a la reserva'}
                  </button>
                </div>
              </div>
            )}
```

- [ ] **Step 5: Verificación visual manual**

Con `npm run dev` corriendo en `frontend/` y `backend/`, repite el flujo completo: cuestionario → gate → resultados → clic en una tarjeta. Expected: aparece la pantalla "Agenda con <nombre>" con la respuesta a la pregunta 1 precargada y editable. Al dar clic en "Continuar a la reserva", el navegador va a `/book/<slug>` de ese terapeuta. Confirma en las DevTools (Application → Session Storage) que quedó guardada la clave `matchLeadData:<slug>` con `clientName`, `clientPhone` y `notes` correctos, antes de que la Task 9 la consuma.

- [ ] **Step 6: Revisión de tipos**

Run: `npx tsc -b` (desde `frontend/`)
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Explorar.tsx
git commit -m "feat: confirmar situacion y redirigir a la reserva real tras elegir terapeuta"
```

---

## Task 9: `BookingForm` acepta valores iniciales y el id del lead que originó la reserva

**Files:**
- Modify: `frontend/src/components/BookingForm.tsx:8-32,95-116`

- [ ] **Step 1: Agregar los props `initialValues` y `matchLeadId`**

En `BookingFormProps` (línea 8), agrega:

```typescript
interface BookingFormProps {
  profileId: string;
  serviceId: string;
  serviceName: string;
  primaryColor?: string;
  initialValues?: { clientName?: string; clientPhone?: string; notes?: string };
  matchLeadId?: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

- [ ] **Step 2: Usar `initialValues` al inicializar el estado del formulario**

Cambia la firma de la función y el `useState` inicial (líneas 24-32):

```typescript
export default function BookingForm({ profileId, serviceId, serviceName, primaryColor = '#2dd4bf', initialValues, matchLeadId, onClose, onSuccess }: BookingFormProps) {
  const [form, setForm] = useState({
    clientName: initialValues?.clientName ?? '',
    clientEmail: '',
    clientPhone: initialValues?.clientPhone ?? '',
    date: '',
    startTime: '',
    notes: initialValues?.notes ?? '',
  });
```

- [ ] **Step 3: Enviar `matchLeadId` al crear la reserva**

En `handleSubmit` (líneas 101-109), agrega `matchLeadId` al body del `api.post`:

```typescript
      await api.post('/bookings', {
        profileId, serviceId,
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone || undefined,
        clientNotes: form.notes || undefined,
        date: form.date,
        startTime: form.startTime,
        matchLeadId: matchLeadId || undefined,
      });
```

- [ ] **Step 4: Verificación de tipos**

Run: `npx tsc -b` (desde `frontend/`)
Expected: sin errores. No hay verificación visual en esta tarea porque `initialValues`/`matchLeadId` todavía no los pasa ningún llamador — eso ocurre en la Task 10.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/BookingForm.tsx
git commit -m "feat: BookingForm acepta valores iniciales y matchLeadId precargados"
```

---

## Task 10: `BookingPage` lee los datos del Matching y los precarga

**Files:**
- Modify: `frontend/src/pages/BookingPage.tsx:14-15,224-233`

- [ ] **Step 1: Agregar estado para los valores iniciales**

Junto a los demás `useState` (después de la línea 15, `const [success, setSuccess] = useState(false);`), agrega:

```typescript
  const [initialValues, setInitialValues] = useState<{ clientName?: string; clientPhone?: string; notes?: string } | undefined>(undefined);
  const [matchLeadId, setMatchLeadId] = useState<string | undefined>(undefined);
```

- [ ] **Step 2: Leer y limpiar `sessionStorage` al tener el `slug`**

Agrega un nuevo `useEffect`, junto a los demás (después del que hace `api.get('/profiles/${slug}')`):

```typescript
  useEffect(() => {
    if (!slug) return;
    const key = `matchLeadData:${slug}`;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setInitialValues(parsed);
        setMatchLeadId(parsed.matchLeadId || undefined);
      } catch { /* dato corrupto, se ignora */ }
      sessionStorage.removeItem(key);
    }
  }, [slug]);
```

- [ ] **Step 3: Pasar los props a `BookingForm`**

En el render de `<BookingForm ... />` (líneas 224-233), agrega las líneas `initialValues={initialValues}` y `matchLeadId={matchLeadId}`:

```tsx
      {selectedService && (
        <BookingForm
          profileId={profile.id}
          serviceId={selectedService.id}
          serviceName={selectedService.name}
          primaryColor={profile.customization?.primaryColor || '#2dd4bf'}
          initialValues={initialValues}
          matchLeadId={matchLeadId}
          onClose={() => setSelectedService(null)}
          onSuccess={() => { setSuccess(true); setSelectedService(null); }}
        />
      )}
```

- [ ] **Step 4: Verificación visual manual, flujo completo**

Repite el flujo de principio a fin: `/explorar` → cuestionario → gate → elegir un terapeuta → confirmar situación → llegar a `/book/<slug>` → elegir un servicio. Expected: el formulario de reserva ya trae el nombre, el WhatsApp y las notas precargados (editables), y la clave `matchLeadData:<slug>` ya no está en Session Storage (se limpió al leerla).

Completa la reserva con datos de prueba. Confirma que el `Booking` creado quedó enlazado al lead usando el mismo script de la Task 5 Step 3 (`prisma.booking.findFirst({ where: { matchLeadId: { not: null } }, ... })`) — debe mostrar el `matchLeadId` correcto, no `null`. Ese mismo script ya borra el `Booking` de prueba al final; borra también el `MatchLead` de prueba con el patrón de limpieza de la Task 3.

- [ ] **Step 5: Revisión de tipos**

Run: `npx tsc -b` (desde `frontend/`)
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/BookingPage.tsx
git commit -m "feat: precargar datos del Matching en la pagina real de reserva"
```

---

## Task 11: Vista "Leads de Matching" en el Admin

**Files:**
- Modify: `frontend/src/pages/AdminPanel.tsx`

- [ ] **Step 1: Definir el tipo y el estado de los leads**

Junto a la declaración de `interface UserRow { ... }`, agrega un tipo nuevo:

```typescript
interface MatchLeadRow {
  id: string;
  answers: { q1: string; q2: string; q3: string; q4: string; q5: string };
  name: string | null;
  whatsapp: string | null;
  selectedProfileId: string | null;
  createdAt: string;
  booking: { id: string; status: string; date: string; startTime: string } | null;
}
```

Junto a los demás `useState` del componente principal del Admin (cerca de donde se declara `annLogs`), agrega:

```typescript
  const [matchLeads, setMatchLeads] = useState<MatchLeadRow[]>([]);
```

- [ ] **Step 2: Cargar los leads al montar, igual que `annLogs`**

Junto al `useEffect` que ya hace `api.get('/admin/announcement-logs')` (línea ~715), agrega:

```typescript
    api.get('/admin/match-leads').then(r => setMatchLeads(r.data)).catch(() => {});
```

- [ ] **Step 3: Renderizar la sección dentro del panel de cada usuario**

Dentro del tab `'comunicacion'` (`userDetailTab === 'comunicacion'`), justo después del bloque "Correos enviados a este usuario" que termina en `})()}` (línea ~1851, antes del comentario `{/* Welcome email status & send button */}`), agrega:

```tsx
                            {/* Leads de Matching que eligieron a este terapeuta */}
                            {(() => {
                              const profileIds = u.profiles.map(p => p.id);
                              const leads = matchLeads.filter(l => l.selectedProfileId && profileIds.includes(l.selectedProfileId));
                              if (leads.length === 0) return null;
                              return (
                                <div className="rounded-lg px-3 py-3 mt-3" style={{ background: C.subCard, boxShadow: C.subCardShadow }}>
                                  <p className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: C.textMuted }}>
                                    <Sparkles className="w-3.5 h-3.5" /> Leads de Matching ({leads.length})
                                  </p>
                                  <div className="space-y-2">
                                    {leads.map(lead => {
                                      const dateStr = new Date(lead.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                      return (
                                        <div key={lead.id} className="text-xs" style={{ borderBottom: `1px solid ${C.cardBorder}`, paddingBottom: 8 }}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium" style={{ color: C.text }}>{lead.name ?? 'Sin nombre'} · {lead.whatsapp ?? 'Sin WhatsApp'}</span>
                                            <span style={{ color: C.textFaint }}>{dateStr}</span>
                                          </div>
                                          <p className="mb-1" style={{ color: C.textFaint }}>{lead.answers.q1}</p>
                                          <span className="px-2 py-0.5 rounded-full font-medium" style={{
                                            background: lead.booking ? 'rgba(45,212,191,0.12)' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,50,60,0.07)'),
                                            color: lead.booking ? '#2dd4bf' : C.textFaint,
                                          }}>
                                            {lead.booking ? `Cita agendada (${lead.booking.status})` : 'Sin cita todavía'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

```

(`Sparkles` ya está disponible si `AdminPanel.tsx` lo importa de `lucide-react`; si no, agrégalo al import existente de `lucide-react` en la parte superior del archivo.)

- [ ] **Step 4: Verificar que `Sparkles` esté importado**

Busca el import de `lucide-react` al inicio de `AdminPanel.tsx`. Si `Sparkles` no aparece en la lista, agrégalo junto a los demás iconos importados de ese paquete.

- [ ] **Step 5: Verificación visual manual**

Con datos de prueba: crea un `MatchLead` con `selectedProfileId` apuntando a un perfil real que ya tengas visible en el Admin (el mismo script de la Task 6 Step 2 sirve tal cual, cambiando `<profileId-real>` por el id de ese perfil). Entra al Admin → Usuarios → expande ese terapeuta → pestaña Comunicación. Expected: aparece "Leads de Matching (1)" con el nombre, WhatsApp, la respuesta de la pregunta 1, fecha, y "Sin cita todavía". Borra el lead de prueba al terminar con el mismo script de limpieza usado en tareas anteriores (`findMany` ordenado por `createdAt` desc + `delete` por id).

- [ ] **Step 6: Revisión de tipos**

Run: `npx tsc -b` (desde `frontend/`)
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/AdminPanel.tsx
git commit -m "feat: mostrar Leads de Matching en el panel de cada terapeuta del Admin"
```

---

## Despliegue

Este plan no incluye el despliegue a producción (`vercel --prod` en `backend/` y en la raíz, por separado — ver `[[project_aliax]]`) ni la migración de Prisma contra la base de datos de producción compartida vía `db push` + resolve, igual que se hizo en desarrollo. Ambos pasos se confirman con el usuario por separado antes de ejecutarse, una vez que todas las tareas de este plan estén completas y revisadas.
