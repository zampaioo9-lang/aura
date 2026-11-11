# Tarjeta de suscripción a Revista Aliax en el Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los usuarios logueados de Aliax ven en su Dashboard una tarjeta fija para suscribirse a Revista Aliax (audiencia Terapeutas), sin volver a escribir su nombre/correo, que cambia a un estado "✓ Ya estás suscrito" una vez confirmada la suscripción por correo.

**Architecture:** `GET /api/auth/me` expone un campo nuevo `newsletterSubscribed` (consulta a `NewsletterSubscriber` por `email_audience`). Un componente nuevo `RevistaSubscribeCard` reutiliza el endpoint público ya existente `POST /api/newsletter/subscribe` (mismo doble opt-in que la caja de los artículos), y se inserta en `TabInicio` (dentro de `Dashboard.tsx`) justo debajo de las tarjetas de "compartir perfil" existentes, tanto en escritorio como en móvil.

**Tech Stack:** Express + Prisma + TypeScript (backend ya existente), React + TypeScript + axios (frontend ya existente). Sin librerías nuevas.

**Nota sobre pruebas:** este proyecto no tiene suite de pruebas automatizadas (mismo patrón que el resto de Aliax — ver `docs/superpowers/plans/2026-11-09-revista-newsletter-nombre-suscriptores.md`). Verificación por tarea: `npx tsc -b` (backend y frontend) compila sin errores; la verificación funcional real es manual y end-to-end en la Tarea 5.

---

### Task 1: `newsletterSubscribed` en `GET /api/auth/me`

**Files:**
- Modify: `backend/src/routes/auth.ts:91-103`

- [ ] **Step 1: Agregar la consulta y el campo a la respuesta**

El handler actual es:

```ts
// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, phone: true, bio: true, avatar: true, socialLinks: true, isAdmin: true, createdAt: true, trialEndsAt: true, plan: true, planInterval: true, planExpiresAt: true, blocked: true, featureOverrides: true, clinicoTrialEndsAt: true, trialAudioSecondsUsed: true, trialAiNotesUsed: true },
    });
    if (!user) throw new AppError(404, 'User not found');
    res.json(user);
  } catch (err) {
    next(err);
  }
});
```

Reemplazar por:

```ts
// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, phone: true, bio: true, avatar: true, socialLinks: true, isAdmin: true, createdAt: true, trialEndsAt: true, plan: true, planInterval: true, planExpiresAt: true, blocked: true, featureOverrides: true, clinicoTrialEndsAt: true, trialAudioSecondsUsed: true, trialAiNotesUsed: true },
    });
    if (!user) throw new AppError(404, 'User not found');

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email_audience: { email: user.email, audience: 'TERAPEUTAS' } },
      select: { status: true },
    });

    res.json({ ...user, newsletterSubscribed: subscriber?.status === 'CONFIRMED' });
  } catch (err) {
    next(err);
  }
});
```

No se necesita ningún import nuevo (`prisma` ya está definido arriba del archivo).

- [ ] **Step 2: Verificar que compila**

Run (desde `backend/`): `npx tsc -b`
Expected: termina sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/auth.ts
git commit -m "feat: expose newsletterSubscribed in GET /api/auth/me"
```

---

### Task 2: Tipo `User` en `AuthContext.tsx`

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx:4-21`

- [ ] **Step 1: Agregar el campo al tipo**

La interfaz actual es:

```ts
interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  socialLinks?: Record<string, string>;
  isAdmin?: boolean;
  trialEndsAt?: string | null;
  plan?: string | null;
  planInterval?: string | null;
  planExpiresAt?: string | null;
  blocked?: boolean;
  featureOverrides?: Record<string, boolean>;
  clinicoTrialEndsAt?: string | null;
  trialAudioSecondsUsed?: number;
  trialAiNotesUsed?: number;
}
```

Agregar `newsletterSubscribed?: boolean;` como último campo, antes del `}`:

```ts
interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  socialLinks?: Record<string, string>;
  isAdmin?: boolean;
  trialEndsAt?: string | null;
  plan?: string | null;
  planInterval?: string | null;
  planExpiresAt?: string | null;
  blocked?: boolean;
  featureOverrides?: Record<string, boolean>;
  clinicoTrialEndsAt?: string | null;
  trialAudioSecondsUsed?: number;
  trialAiNotesUsed?: number;
  newsletterSubscribed?: boolean;
}
```

- [ ] **Step 2: Verificar que compila**

Run (desde `frontend/`): `npx tsc -b`
Expected: termina sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/AuthContext.tsx
git commit -m "feat: add newsletterSubscribed to User type"
```

---

### Task 3: Crear el componente `RevistaSubscribeCard`

**Files:**
- Create: `frontend/src/components/dashboard/RevistaSubscribeCard.tsx`

- [ ] **Step 1: Crear el archivo completo**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle } from 'lucide-react';
import api from '../../api/client';

interface Colors {
  isDark: boolean;
  accent: string;
  muted: string;
  text: string;
  border: string;
}

interface RevistaSubscribeCardProps {
  C: Colors;
  name: string;
  email: string;
  newsletterSubscribed?: boolean;
}

export default function RevistaSubscribeCard({ C, name, email, newsletterSubscribed }: RevistaSubscribeCardProps) {
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = async () => {
    if (!consent || status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await api.post('/newsletter/subscribe', {
        fullName: name,
        email,
        audience: 'TERAPEUTAS',
      });
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Algo salió mal, intenta de nuevo.');
    }
  };

  const cardStyle: React.CSSProperties = {
    background: C.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: '16px 18px',
    marginTop: 12,
  };

  if (newsletterSubscribed) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <CheckCircle style={{ width: 16, height: 16, color: C.accent, flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: C.isDark ? 'white' : C.text, margin: 0 }}>
            Ya estás suscrito a Revista Aliax
          </p>
        </div>
        <Link to="/revista" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.accent, textDecoration: 'none' }}>
          Ver la Revista →
        </Link>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Mail style={{ width: 16, height: 16, color: C.accent, flexShrink: 0 }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: C.isDark ? 'white' : C.text, margin: 0 }}>
          Suscríbete a Revista Aliax
        </p>
      </div>
      <p style={{ fontSize: 11, color: C.muted, margin: '0 0 10px' }}>
        Recibe los artículos nuevos y compártelos con tus pacientes.
      </p>

      {status === 'sent' ? (
        <p style={{ fontSize: 12, color: C.accent, margin: 0 }}>
          Revisa tu correo ({email}) para confirmar tu suscripción.
        </p>
      ) : (
        <>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: C.muted, marginBottom: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              Acepto recibir correos de Revista Aliax y el{' '}
              <Link to="/privacidad" style={{ color: C.accent }}>Aviso de Privacidad</Link>.
            </span>
          </label>
          <button
            onClick={handleSubscribe}
            disabled={!consent || status === 'sending'}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
              background: `linear-gradient(135deg, ${C.accent}, #2dd4bf)`,
              color: 'white', fontSize: 12, fontWeight: 600,
              cursor: consent ? 'pointer' : 'not-allowed',
              opacity: consent && status !== 'sending' ? 1 : 0.5,
            }}
          >
            {status === 'sending' ? 'Enviando...' : 'Suscribirme'}
          </button>
          {status === 'error' && (
            <p style={{ fontSize: 11, color: '#dc2626', margin: '6px 0 0' }}>{errorMsg}</p>
          )}
        </>
      )}
    </div>
  );
}
```

Nota: la interfaz `Colors` se declara local a este archivo (mismo patrón ya usado en `frontend/src/components/dashboard/ProfessionalCalendar.tsx:7-17`) con solo los campos que este componente usa, en vez de importar el tipo completo desde `Dashboard.tsx`.

- [ ] **Step 2: Verificar que compila**

Run (desde `frontend/`): `npx tsc -b`
Expected: termina sin errores. (El componente aún no se usa en ningún lado — eso es normal, no debe dar error de "no usado" porque es `export default` de su propio módulo.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/RevistaSubscribeCard.tsx
git commit -m "feat: create RevistaSubscribeCard component"
```

---

### Task 4: Conectar la tarjeta en `Dashboard.tsx` (escritorio + móvil)

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` (import, firma de `TabInicio`, 2 call sites, 2 puntos de inserción en el JSX)

- [ ] **Step 1: Importar el componente**

En `frontend/src/pages/Dashboard.tsx`, junto a los demás imports de `components/dashboard/` (línea 20-21):

```ts
import ProfessionalCalendar from '../components/dashboard/ProfessionalCalendar';
import NewBookingModal from '../components/dashboard/NewBookingModal';
```

Agregar debajo:

```ts
import RevistaSubscribeCard from '../components/dashboard/RevistaSubscribeCard';
```

- [ ] **Step 2: Agregar las 2 props nuevas a `TabInicio`**

La firma actual (línea 1103) es:

```ts
function TabInicio({ profiles, bookings, userName, C, dashStats, dashStatsError, analyticsPeriod, onPeriodChange, isLoadingStats, isPro, twoCol = false, onGoToAccount, onGoToAgenda }: {
  profiles: Profile[];
  bookings: Booking[];
  userName?: string;
  C: Colors;
  dashStats: DashStats | null;
  dashStatsError: boolean;
  analyticsPeriod: AnalyticsPeriod;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  isLoadingStats: boolean;
  isPro: boolean;
  twoCol?: boolean;
  onGoToAccount: () => void;
  onGoToAgenda: () => void;
}) {
```

Reemplazar por (se agregan `userEmail` y `newsletterSubscribed`):

```ts
function TabInicio({ profiles, bookings, userName, userEmail, newsletterSubscribed, C, dashStats, dashStatsError, analyticsPeriod, onPeriodChange, isLoadingStats, isPro, twoCol = false, onGoToAccount, onGoToAgenda }: {
  profiles: Profile[];
  bookings: Booking[];
  userName?: string;
  userEmail?: string;
  newsletterSubscribed?: boolean;
  C: Colors;
  dashStats: DashStats | null;
  dashStatsError: boolean;
  analyticsPeriod: AnalyticsPeriod;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  isLoadingStats: boolean;
  isPro: boolean;
  twoCol?: boolean;
  onGoToAccount: () => void;
  onGoToAgenda: () => void;
}) {
```

- [ ] **Step 3: Pasar las props nuevas en los 2 lugares donde se usa `<TabInicio`**

Llamada de móvil (línea 717), actual:

```tsx
                <TabInicio profiles={profiles} bookings={bookings} userName={user?.name} C={C} dashStats={dashStats} dashStatsError={dashStatsError} analyticsPeriod={analyticsPeriod} onPeriodChange={setAnalyticsPeriod} isLoadingStats={isLoadingStats} isPro={isPro ?? false} onGoToAccount={() => goMobile('cuenta')} onGoToAgenda={() => goMobile('agenda')} />
```

Reemplazar por:

```tsx
                <TabInicio profiles={profiles} bookings={bookings} userName={user?.name} userEmail={user?.email} newsletterSubscribed={user?.newsletterSubscribed} C={C} dashStats={dashStats} dashStatsError={dashStatsError} analyticsPeriod={analyticsPeriod} onPeriodChange={setAnalyticsPeriod} isLoadingStats={isLoadingStats} isPro={isPro ?? false} onGoToAccount={() => goMobile('cuenta')} onGoToAgenda={() => goMobile('agenda')} />
```

Llamada de escritorio (línea 1018), actual:

```tsx
                <TabInicio profiles={profiles} bookings={bookings} userName={user?.name} C={C} dashStats={dashStats} dashStatsError={dashStatsError} analyticsPeriod={analyticsPeriod} onPeriodChange={setAnalyticsPeriod} isLoadingStats={isLoadingStats} isPro={isPro ?? false} twoCol onGoToAccount={() => goTab('cuenta')} onGoToAgenda={() => goTab('agenda')} />
```

Reemplazar por:

```tsx
                <TabInicio profiles={profiles} bookings={bookings} userName={user?.name} userEmail={user?.email} newsletterSubscribed={user?.newsletterSubscribed} C={C} dashStats={dashStats} dashStatsError={dashStatsError} analyticsPeriod={analyticsPeriod} onPeriodChange={setAnalyticsPeriod} isLoadingStats={isLoadingStats} isPro={isPro ?? false} twoCol onGoToAccount={() => goTab('cuenta')} onGoToAgenda={() => goTab('agenda')} />
```

- [ ] **Step 4: Insertar la tarjeta en el layout de escritorio**

Dentro de `TabInicio`, el bloque de escritorio (columna lateral "Comparte tu perfil") termina así:

```tsx
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }
```

Reemplazar por (se agrega la tarjeta justo después de cerrar la tarjeta "Comparte tu perfil", dentro de la misma columna de 300px):

```tsx
                  </div>
                ))}
              </div>
            </div>
            <RevistaSubscribeCard
              C={C}
              name={userName ?? ''}
              email={userEmail ?? ''}
              newsletterSubscribed={newsletterSubscribed}
            />
          </div>
        )}
        </div>
      </div>
    );
  }
```

- [ ] **Step 5: Insertar la tarjeta en el layout de móvil**

El final del layout móvil de `TabInicio` es:

```tsx
      )}
      {analyticsBlock}
    </div>
  );
}
```

Reemplazar por (misma condición `profiles.length > 0` que ya envuelve la tarjeta "Comparte este link con tus clientes"):

```tsx
      )}
      {profiles.length > 0 && (
        <RevistaSubscribeCard
          C={C}
          name={userName ?? ''}
          email={userEmail ?? ''}
          newsletterSubscribed={newsletterSubscribed}
        />
      )}
      {analyticsBlock}
    </div>
  );
}
```

- [ ] **Step 6: Verificar que compila**

Run (desde `frontend/`): `npx tsc -b`
Expected: termina sin errores.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: show RevistaSubscribeCard in dashboard (desktop + mobile)"
```

---

### Task 5: Verificación manual end-to-end

No hay suite automatizada — esta tarea es la verificación funcional real, con una cuenta de prueba (no la de un usuario real), dada de baja al final.

- [ ] **Step 1: Levantar servidores locales**

Backend (desde `backend/`, apuntando al `.env` que ya usa la base de datos compartida de producción — mismo patrón que el resto del proyecto):

```bash
PORT=4000 npm run dev
```

Frontend (desde `frontend/`):

```bash
npm run dev
```

- [ ] **Step 2: Iniciar sesión con una cuenta de prueba**

Entrar a `http://localhost:5173/dashboard` con una cuenta de prueba (no la cuenta real de César ni de un terapeuta real). Abrir las DevTools → pestaña Network → confirmar que la respuesta de `GET /auth/me` incluye `"newsletterSubscribed": false` (asumiendo que esa cuenta no estaba suscrita antes).

- [ ] **Step 3: Confirmar que la tarjeta aparece en escritorio**

Con la ventana ancha (escritorio), confirmar que debajo de la tarjeta "Comparte tu perfil" aparece la tarjeta "Suscríbete a Revista Aliax" con el checkbox y el botón "Suscribirme" deshabilitado hasta marcar el checkbox.

- [ ] **Step 4: Confirmar que la tarjeta aparece en móvil**

Con las DevTools en modo responsive (o la ventana angosta), confirmar que debajo de "Comparte este link con tus clientes" aparece la misma tarjeta.

- [ ] **Step 5: Suscribirse**

Marcar el checkbox de consentimiento, dar clic en "Suscribirme". Confirmar que el botón pasa a "Enviando..." y luego aparece el mensaje "Revisa tu correo (...) para confirmar tu suscripción."

- [ ] **Step 6: Confirmar desde el correo**

Revisar la bandeja de la cuenta de prueba, abrir el correo de confirmación de Revista Aliax, dar clic en el enlace. Debe redirigir a `/revista?newsletter=confirmado`.

- [ ] **Step 7: Confirmar el cambio de estado en el Dashboard**

Recargar `http://localhost:5173/dashboard`. La tarjeta debe mostrar ahora "✓ Ya estás suscrito a Revista Aliax" con el enlace "Ver la Revista →", tanto en escritorio como en móvil.

- [ ] **Step 8: Limpiar el registro de prueba**

Desde el Admin de Aliax (cuenta de administrador) → Revista → Suscriptores, buscar el correo de la cuenta de prueba y dar clic en "Dar de baja" (panel ya construido en `[[project_aliax_revista_suscriptores_admin]]`). Confirmar que el estado pasa a "Baja".

- [ ] **Step 9: Detener los servidores locales**

Cerrar los procesos de `npm run dev` del backend y del frontend.
