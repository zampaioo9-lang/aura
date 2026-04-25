# Freemium + Directorio — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Aliax de modelo trial-to-pay a freemium permanente con WhatsApp como gancho premium y un directorio público con SEO para adquisición orgánica.

**Architecture:** Se elimina el bloqueo por suscripción del dashboard y se introduce un nuevo middleware `requirePro` que solo actúa en features premium. El directorio es un endpoint público + página React con rutas SEO-friendly. Las imágenes múltiples por servicio usan un campo `images String[]` en el modelo Service.

**Tech Stack:** Node.js + Express + Prisma (PostgreSQL) + React + Vite + TypeScript + Tailwind CSS, desplegado en Vercel.

---

## Mapa de archivos

| Archivo | Cambio |
|---|---|
| `backend/src/middleware/requireActiveSubscription.ts` | Reemplazar por `requirePro` |
| `backend/src/middleware/requirePro.ts` | **Nuevo** — solo bloquea si no es Pro |
| `backend/src/lib/planUtils.ts` | **Nuevo** — helper `isProUser()` |
| `backend/src/routes/services.ts` | Quitar `requireActiveSubscription`, añadir guard de imágenes |
| `backend/src/routes/profiles.ts` | Quitar `requireActiveSubscription`, añadir guard de template y endpoint /directory |
| `backend/src/services/bookingService.ts` | Solo enviar WhatsApp si usuario es Pro |
| `backend/src/jobs/trialExpiryJob.ts` | Desactivar el unpublish automático de perfiles |
| `backend/prisma/schema.prisma` | Añadir `images String[]` al modelo Service |
| `backend/src/routes/bookings.ts` | Añadir endpoint `/analytics` |
| `frontend/src/context/AuthContext.tsx` | Añadir `isPro: boolean` |
| `frontend/src/pages/Pricing.tsx` | Reescribir con estructura Free / Pro |
| `frontend/src/pages/Dashboard.tsx` | Quitar bloqueo de suscripción, añadir nudges de upgrade |
| `frontend/src/pages/Explorar.tsx` | **Nueva** — directorio público |
| `frontend/src/App.tsx` | Añadir ruta `/explorar` |
| `frontend/src/pages/ServicesDashboard.tsx` | Soporte multi-imagen por servicio |

---

## FASE 1 — Freemium: acceso libre + Pro gates

---

### Tarea 0: Extender AppError con campo `code` opcional

**Archivos:**
- Modificar: `backend/src/middleware/errorHandler.ts`

- [ ] **Paso 0.1: Añadir `code` opcional a AppError**

Reemplazar el contenido de `errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return res.status(400).json({ error: 'Datos invalidos', details: messages });
  }

  console.error('Unhandled error:', err.message, err.stack);
  return res.status(500).json({ error: 'Internal server error' });
}
```

- [ ] **Paso 0.2: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npm run build 2>&1 | tail -10
```

- [ ] **Paso 0.3: Commit**

```bash
git add backend/src/middleware/errorHandler.ts
git commit -m "feat: add optional code field to AppError"
```

---

### Tarea 1: Crear helper `isProUser` en el backend

**Archivos:**
- Crear: `backend/src/lib/planUtils.ts`

- [ ] **Paso 1.1: Crear el archivo**

```typescript
// backend/src/lib/planUtils.ts
export interface PlanUser {
  plan?: string | null;
  planExpiresAt?: Date | null;
  isAdmin?: boolean;
}

export function isProUser(user: PlanUser): boolean {
  if (user.isAdmin) return true;
  if (!user.plan) return false;
  if (user.plan === 'LIFETIME') return true;
  if (user.plan === 'PRO') {
    return user.planExpiresAt === null || user.planExpiresAt > new Date();
  }
  return false;
}
```

- [ ] **Paso 1.2: Commit**

```bash
git add backend/src/lib/planUtils.ts
git commit -m "feat: add isProUser helper"
```

---

### Tarea 2: Crear middleware `requirePro`

**Archivos:**
- Crear: `backend/src/middleware/requirePro.ts`

- [ ] **Paso 2.1: Crear el archivo**

```typescript
// backend/src/middleware/requirePro.ts
import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';
import { isProUser } from '../lib/planUtils';

const prisma = new PrismaClient();

export async function requirePro(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, plan: true, planExpiresAt: true },
    });

    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    if (!isProUser(user)) {
      return res.status(403).json({
        error: 'Esta función requiere el plan Pro.',
        code: 'PRO_REQUIRED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Paso 2.2: Commit**

```bash
git add backend/src/middleware/requirePro.ts
git commit -m "feat: add requirePro middleware"
```

---

### Tarea 3: Liberar rutas de servicios (quitar requireActiveSubscription)

**Archivos:**
- Modificar: `backend/src/routes/services.ts`

- [ ] **Paso 3.1: Reemplazar la línea de middleware global**

Buscar:
```typescript
router.use(authMiddleware, requireActiveSubscription);
```

Reemplazar por:
```typescript
router.use(authMiddleware);
```

También eliminar el import de `requireActiveSubscription` en la parte superior si queda sin uso:
```typescript
// Eliminar esta línea si existe:
import { requireActiveSubscription } from '../middleware/requireActiveSubscription';
```

- [ ] **Paso 3.2: Verificar que el servidor compila**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npm run build 2>&1 | tail -20
```

Esperado: sin errores de TypeScript.

- [ ] **Paso 3.3: Commit**

```bash
git add backend/src/routes/services.ts
git commit -m "feat: free tier - remove subscription gate from services"
```

---

### Tarea 4: Liberar rutas de perfiles y añadir guard de template

**Archivos:**
- Modificar: `backend/src/routes/profiles.ts`

- [ ] **Paso 4.1: Añadir imports necesarios al inicio del archivo**

Añadir después de los imports existentes:
```typescript
import { isProUser } from '../lib/planUtils';
```

- [ ] **Paso 4.2: Quitar requireActiveSubscription de PUT /me y DELETE /me**

Buscar en la ruta `PUT /api/profiles/me`:
```typescript
router.put('/me', authMiddleware, requireActiveSubscription, async (req: AuthRequest, res, next) => {
```
Reemplazar por:
```typescript
router.put('/me', authMiddleware, async (req: AuthRequest, res, next) => {
```

Buscar en la ruta `DELETE /api/profiles/me`:
```typescript
router.delete('/me', authMiddleware, requireActiveSubscription, async (req: AuthRequest, res, next) => {
```
Reemplazar por:
```typescript
router.delete('/me', authMiddleware, async (req: AuthRequest, res, next) => {
```

- [ ] **Paso 4.3: Añadir guard de template dentro de PUT /me**

Dentro del handler de `PUT /me`, justo después de hacer `profileSchema.partial().parse(req.body)`, añadir:

```typescript
// Guard: ELEGANT y CREATIVE solo para Pro
if (data.template && ['ELEGANT', 'CREATIVE'].includes(data.template)) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true, plan: true, planExpiresAt: true },
  });
  if (user && !isProUser(user)) {
    throw new AppError(403, 'Los templates Elegant y Creative requieren el plan Pro.', 'PRO_REQUIRED');
  }
}
```

- [ ] **Paso 4.4: Eliminar import de requireActiveSubscription si ya no se usa**

Buscar y eliminar:
```typescript
import { requireActiveSubscription } from '../middleware/requireActiveSubscription';
```

- [ ] **Paso 4.5: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npm run build 2>&1 | tail -20
```

- [ ] **Paso 4.6: Actualizar el guard de "máximo 1 perfil" a "máximo 3 para Pro"**

En `profiles.ts`, buscar el guard que limita la creación de perfiles (algo como):
```typescript
const existing = await prisma.profile.findMany({ where: { userId: req.userId } });
if (existing.length >= 1) {
  throw new AppError(400, 'Solo puedes tener 1 perfil activo.');
}
```

Reemplazar por:
```typescript
const user = await prisma.user.findUnique({
  where: { id: req.userId },
  select: { isAdmin: true, plan: true, planExpiresAt: true },
});
const maxProfiles = isProUser(user!) ? 3 : 1;
const existing = await prisma.profile.count({ where: { userId: req.userId } });
if (existing >= maxProfiles) {
  const msg = maxProfiles === 1
    ? 'El plan gratuito permite 1 perfil. Activa Pro para tener hasta 3.'
    : 'Has alcanzado el límite de 3 perfiles del plan Pro.';
  throw new AppError(403, msg, 'PRO_REQUIRED');
}
```

- [ ] **Paso 4.7: Commit**

```bash
git add backend/src/routes/profiles.ts
git commit -m "feat: free tier - remove subscription gate from profiles, add template guard"
```

---

### Tarea 5: Puerta Pro para WhatsApp en bookingService

**Archivos:**
- Modificar: `backend/src/services/bookingService.ts`

- [ ] **Paso 5.1: Añadir import de isProUser**

Al inicio del archivo, añadir:
```typescript
import { isProUser } from '../lib/planUtils';
```

- [ ] **Paso 5.2: Añadir la consulta del plan del profesional en createBooking**

Dentro de `createBooking`, buscar donde se obtiene el perfil. El perfil incluye `user`. Asegurarse de que el select del perfil incluya el plan del usuario:

Buscar el query del perfil (algo como):
```typescript
const profile = await prisma.profile.findUnique({
  where: { id: data.profileId },
  include: {
    user: { select: { ... } },
    ...
  },
});
```

Añadir `plan: true, planExpiresAt: true, isAdmin: true` al select del user:
```typescript
const profile = await prisma.profile.findUnique({
  where: { id: data.profileId },
  include: {
    user: {
      select: {
        name: true,
        email: true,
        phone: true,
        socialLinks: true,
        plan: true,
        planExpiresAt: true,
        isAdmin: true,
      },
    },
    services: false,
  },
});
```

- [ ] **Paso 5.3: Envolver el bloque de WhatsApp con la verificación Pro**

Buscar el bloque que empieza con:
```typescript
if (professionalPhone) {
  // Intentar con plantilla aprobada...
```

Envolverlo así:
```typescript
if (professionalPhone && isProUser(profile.user)) {
  // Intentar con plantilla aprobada...
  // ... todo el bloque existente sin cambios internos ...
} else if (professionalPhone && !isProUser(profile.user)) {
  console.log(`[WhatsApp] Skipped - user is not Pro. bookingId: ${booking.id}`);
}
```

- [ ] **Paso 5.4: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npm run build 2>&1 | tail -20
```

- [ ] **Paso 5.5: Commit**

```bash
git add backend/src/services/bookingService.ts backend/src/lib/planUtils.ts
git commit -m "feat: gate WhatsApp notifications behind Pro plan"
```

---

### Tarea 6: Desactivar el unpublish automático en trialExpiryJob

**Archivos:**
- Modificar: `backend/src/jobs/trialExpiryJob.ts`

- [ ] **Paso 6.1: Quitar el updateMany que despublica perfiles**

Buscar y eliminar el bloque:
```typescript
// Unpublish all profiles for expired users
if (users.length > 0) {
  await prisma.profile.updateMany({
    where: { userId: { in: users.map(u => u.id) } },
    data: { published: false },
  });
  console.log(`[CRON] Unpublished profiles for ${users.length} expired users`);
}
```

Reemplazar por:
```typescript
// Freemium: profiles remain published when trial ends
if (users.length > 0) {
  console.log(`[CRON] ${users.length} trials ended today — profiles stay published (freemium)`);
}
```

- [ ] **Paso 6.2: Commit**

```bash
git add backend/src/jobs/trialExpiryJob.ts
git commit -m "feat: freemium - keep profiles published after trial ends"
```

---

### Tarea 7: Añadir `isPro` al AuthContext del frontend

**Archivos:**
- Modificar: `frontend/src/context/AuthContext.tsx`

- [ ] **Paso 7.1: Añadir `isPro` a la interfaz AuthContextType**

Buscar:
```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateAccount: (data: UpdateAccountData) => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}
```

Reemplazar por:
```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isPro: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateAccount: (data: UpdateAccountData) => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}
```

- [ ] **Paso 7.2: Añadir campo `plan` y `planExpiresAt` a la interfaz User**

Buscar la interfaz `User` y verificar que tiene estos campos (ya los tiene según el código actual):
```typescript
interface User {
  // ... campos existentes ...
  plan?: string | null;
  planExpiresAt?: string | null;
}
```

Si no están, añadirlos.

- [ ] **Paso 7.3: Añadir la función isPro y exponerla en el contexto**

Dentro del componente `AuthProvider`, añadir justo antes del `return`:
```typescript
const isPro = (() => {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (!user.plan) return false;
  if (user.plan === 'LIFETIME') return true;
  if (user.plan === 'PRO') {
    if (!user.planExpiresAt) return true;
    return new Date(user.planExpiresAt) > new Date();
  }
  return false;
})();
```

Añadir `isPro` al value del Context:
```typescript
return (
  <AuthContext.Provider value={{ user, token, isPro, login, register, logout, updateAccount, refreshUser, loading }}>
    {children}
  </AuthContext.Provider>
);
```

- [ ] **Paso 7.4: Verificar que el frontend compila**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/frontend"
npm run build 2>&1 | tail -30
```

- [ ] **Paso 7.5: Commit**

```bash
git add frontend/src/context/AuthContext.tsx
git commit -m "feat: add isPro computed field to AuthContext"
```

---

### Tarea 8: Reescribir la página de Pricing

**Archivos:**
- Modificar: `frontend/src/pages/Pricing.tsx`

- [ ] **Paso 8.1: Reemplazar el contenido completo del archivo**

```typescript
// frontend/src/pages/Pricing.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const FREE_FEATURES = [
  '1 perfil profesional',
  'Servicios ilimitados',
  'Reservas ilimitadas',
  'Notificaciones por email',
  'Hasta 3 fotos por servicio',
  '2 templates (Minimalist y Bold)',
  'Listado en el directorio de Aliax',
];

const PRO_FEATURES = [
  'Todo lo del plan gratuito',
  'Notificaciones por WhatsApp al cliente y a ti',
  'Fotos ilimitadas por servicio',
  'Los 4 templates (incluye Elegant y Creative)',
  'Analytics completos y tendencias',
  'Posición destacada en el directorio',
  'Hasta 3 perfiles',
  'Recordatorio automático 24h por WhatsApp',
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isPro } = useAuth();
  const [loadingStripe, setLoadingStripe] = useState(false);

  const handleProStripe = async () => {
    if (!user) { navigate('/register'); return; }
    setLoadingStripe(true);
    try {
      const res = await api.post('/subscriptions/stripe/checkout', { interval: 'MONTHLY' });
      window.location.href = res.data.url;
    } catch {
      setLoadingStripe(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080414 0%, #0e0920 50%, #160d30 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '60px 20px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(147,51,234,0.15)',
          border: '1px solid rgba(147,51,234,0.3)',
          borderRadius: 20,
          padding: '6px 16px',
          color: '#a78bfa',
          fontSize: 13,
          marginBottom: 16,
        }}>
          Planes simples, sin sorpresas
        </div>
        <h1 style={{ color: '#f0ebff', fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>
          Empieza gratis. Crece cuando quieras.
        </h1>
        <p style={{ color: '#9d95b5', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
          Tu perfil, tus reservas y tus servicios son siempre gratis. El plan Pro agrega WhatsApp y más visibilidad cuando lo necesites.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 860 }}>
        {/* Free Card */}
        <div style={{
          flex: '1 1 360px', maxWidth: 400,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Gift size={20} color="#9d95b5" />
            <span style={{ color: '#9d95b5', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Gratuito</span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <span style={{ color: '#f0ebff', fontSize: 42, fontWeight: 800 }}>$0</span>
            <span style={{ color: '#6b6b80', fontSize: 16 }}> / siempre</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FREE_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#cdc0e0', fontSize: 14 }}>
                <Check size={16} color="#6b63ff" style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => user ? navigate('/dashboard') : navigate('/register')}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: 12,
              border: '1px solid rgba(107,99,255,0.4)',
              background: 'transparent', color: '#a78bfa',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {user ? 'Ir al dashboard' : 'Crear cuenta gratis'}
          </button>
        </div>

        {/* Pro Card */}
        <div style={{
          flex: '1 1 360px', maxWidth: 400,
          background: 'linear-gradient(135deg, rgba(107,99,255,0.15) 0%, rgba(147,51,234,0.1) 100%)',
          border: '2px solid rgba(107,99,255,0.5)',
          borderRadius: 20,
          padding: 32,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(90deg, #6b63ff, #9333ea)',
            borderRadius: 20, padding: '4px 16px',
            color: '#fff', fontSize: 12, fontWeight: 700,
          }}>
            RECOMENDADO
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Zap size={20} color="#a78bfa" />
            <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Pro</span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <span style={{ color: '#f0ebff', fontSize: 42, fontWeight: 800 }}>$9</span>
            <span style={{ color: '#9d95b5', fontSize: 16 }}> USD / mes</span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRO_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#cdc0e0', fontSize: 14 }}>
                <Check size={16} color="#9333ea" style={{ marginTop: 2, flexShrink: 0 }} />
                {f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div style={{
              width: '100%', padding: '13px 20px', borderRadius: 12,
              background: 'rgba(107,99,255,0.2)', color: '#a78bfa',
              fontSize: 15, fontWeight: 600, textAlign: 'center',
            }}>
              ✓ Ya tienes Pro activo
            </div>
          ) : (
            <button
              onClick={handleProStripe}
              disabled={loadingStripe}
              style={{
                width: '100%', padding: '13px 20px', borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(90deg, #6b63ff, #9333ea)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: loadingStripe ? 'not-allowed' : 'pointer',
                opacity: loadingStripe ? 0.7 : 1,
              }}
            >
              {loadingStripe ? 'Redirigiendo...' : 'Activar Pro — $9/mes'}
            </button>
          )}
          <p style={{ color: '#6b6b80', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
            Cancela en cualquier momento
          </p>
        </div>
      </div>

      {/* FAQ rápido */}
      <div style={{ maxWidth: 560, width: '100%', marginTop: 48, color: '#9d95b5', fontSize: 14, textAlign: 'center' }}>
        <p>¿Dudas? Escríbenos a <a href="mailto:hola@aliax.io" style={{ color: '#a78bfa' }}>hola@aliax.io</a></p>
      </div>
    </div>
  );
}
```

- [ ] **Paso 8.2: Verificar que el frontend compila**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/frontend"
npm run build 2>&1 | tail -30
```

- [ ] **Paso 8.3: Commit**

```bash
git add frontend/src/pages/Pricing.tsx
git commit -m "feat: rewrite Pricing page with Free/Pro freemium structure"
```

---

### Tarea 9: Deploy Fase 1

- [ ] **Paso 9.1: Deploy backend**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
vercel --prod
```

- [ ] **Paso 9.2: Deploy frontend**

```bash
cd "/c/Users/zampa/Mis proyectos/aura"
vercel --prod
```

- [ ] **Paso 9.3: Verificar en producción**
  - Registrar una cuenta nueva → debe entrar al dashboard sin bloqueo
  - Crear un perfil y servicio → debe funcionar sin suscripción
  - Visitar `/pricing` → ver las dos cards Free y Pro

---

## FASE 2 — Multi-imagen por servicio

---

### Tarea 10: Añadir campo `images` al modelo Service

**Archivos:**
- Modificar: `backend/prisma/schema.prisma`

- [ ] **Paso 10.1: Añadir campo `images` al modelo Service**

Buscar en `schema.prisma`:
```prisma
model Service {
  id              String   @id @default(uuid())
  profileId       String
  name            String
  description     String?
  image           String?
```

Añadir el campo `images` después de `image`:
```prisma
  image           String?
  images          String[] @default([])
```

- [ ] **Paso 10.2: Correr la migración**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npx prisma migrate dev --name add_service_images
```

Esperado: migración aplicada, archivo creado en `prisma/migrations/`.

- [ ] **Paso 10.3: Verificar que Prisma genera el cliente correctamente**

```bash
npx prisma generate
```

- [ ] **Paso 10.4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add images[] field to Service model"
```

---

### Tarea 11: Endpoints de gestión de imágenes en services

**Archivos:**
- Modificar: `backend/src/routes/services.ts`

- [ ] **Paso 11.1: Añadir imports necesarios**

Al inicio del archivo añadir:
```typescript
import { isProUser } from '../lib/planUtils';
```

- [ ] **Paso 11.2: Añadir endpoint POST /api/services/:id/images (añadir imagen)**

Añadir antes del último `export default router;`:

```typescript
// POST /api/services/:id/images — Add image URL to service images[]
router.post('/:id/images', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const service = await verifyServiceOwnership(req.params.id, req.userId!);

    const { url } = req.body;
    if (!url || typeof url !== 'string') throw new AppError(400, 'Se requiere una URL de imagen');

    // Check Pro limit: max 3 images for Free users
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, plan: true, planExpiresAt: true },
    });

    const currentImages: string[] = (service as any).images || [];

    if (!isProUser(user!) && currentImages.length >= 3) {
      throw new AppError(403, 'El plan gratuito permite máximo 3 fotos por servicio. Activa Pro para subir más.', 'PRO_REQUIRED');
    }

    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: { images: [...currentImages, url] },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id/images — Remove image URL from service images[]
router.delete('/:id/images', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const service = await verifyServiceOwnership(req.params.id, req.userId!);
    const { url } = req.body;
    if (!url) throw new AppError(400, 'Se requiere la URL de la imagen a eliminar');

    const currentImages: string[] = (service as any).images || [];
    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: { images: currentImages.filter(img => img !== url) },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Paso 11.3: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npm run build 2>&1 | tail -20
```

- [ ] **Paso 11.4: Commit**

```bash
git add backend/src/routes/services.ts
git commit -m "feat: add image gallery endpoints for services"
```

---

### Tarea 12: Frontend — galería de imágenes en ServicesDashboard

**Archivos:**
- Modificar: `frontend/src/pages/ServicesDashboard.tsx`

- [ ] **Paso 12.1: Añadir función de upload de imagen adicional al servicio**

Dentro de `ServicesDashboard.tsx`, añadir esta función (dentro del componente, antes del return):

```typescript
const handleAddServiceImage = async (serviceId: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const uploadRes = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const imageUrl = uploadRes.data.url;

    await api.post(`/services/${serviceId}/images`, { url: imageUrl });
    // Refrescar servicios
    await fetchServices();
  } catch (err: any) {
    const msg = err.response?.data?.error || 'Error al subir imagen';
    if (err.response?.data?.code === 'PRO_REQUIRED') {
      showToast('El plan gratuito permite máximo 3 fotos. Activa Pro en /pricing para subir más.', 'error');
    } else {
      showToast(msg, 'error');
    }
  }
};

const handleRemoveServiceImage = async (serviceId: string, imageUrl: string) => {
  try {
    await api.delete(`/services/${serviceId}/images`, { data: { url: imageUrl } });
    await fetchServices();
  } catch {
    showToast('Error al eliminar imagen', 'error');
  }
};
```

- [ ] **Paso 12.2: Añadir galería de imágenes en la UI de cada servicio**

Dentro del JSX donde se renderiza cada servicio (buscar donde aparece `service.image`), añadir debajo:

```tsx
{/* Galería de imágenes */}
<div style={{ marginTop: 8 }}>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
    {(service.images || []).map((img: string) => (
      <div key={img} style={{ position: 'relative' }}>
        <img
          src={img}
          alt=""
          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button
          onClick={() => handleRemoveServiceImage(service.id, img)}
          style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', border: 'none', borderRadius: '50%',
            width: 16, height: 16, fontSize: 10, color: 'white',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </div>
    ))}
    {/* Botón para añadir imagen */}
    <label style={{
      width: 56, height: 56, borderRadius: 6,
      border: '1px dashed rgba(107,99,255,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: '#6b63ff', fontSize: 20,
    }}>
      +
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleAddServiceImage(service.id, file);
          e.target.value = '';
        }}
      />
    </label>
  </div>
  <p style={{ color: '#6b6b80', fontSize: 11, margin: 0 }}>
    {(service.images || []).length}/3 fotos {isPro ? '(ilimitado con Pro)' : '— Pro para más'}
  </p>
</div>
```

- [ ] **Paso 12.3: Importar `useAuth` si no está ya en el archivo**

Añadir al inicio:
```typescript
import { useAuth } from '../context/AuthContext';
```

Y dentro del componente:
```typescript
const { isPro } = useAuth();
```

- [ ] **Paso 12.4: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/frontend"
npm run build 2>&1 | tail -30
```

- [ ] **Paso 12.5: Commit**

```bash
git add frontend/src/pages/ServicesDashboard.tsx
git commit -m "feat: add multi-image gallery to services"
```

---

### Tarea 13: Deploy Fase 2

- [ ] **Paso 13.1: Deploy backend (con la nueva migración)**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npx prisma migrate deploy
vercel --prod
```

- [ ] **Paso 13.2: Deploy frontend**

```bash
cd "/c/Users/zampa/Mis proyectos/aura"
vercel --prod
```

- [ ] **Paso 13.3: Verificar en producción**
  - Entrar a un servicio → ver la galería de imágenes
  - Subir 3 fotos con cuenta Free → funciona
  - Intentar subir la 4ta → ver mensaje de upgrade a Pro

---

## FASE 3 — Directorio público

---

### Tarea 14: Endpoint backend GET /api/profiles/directory

**Archivos:**
- Modificar: `backend/src/routes/profiles.ts`

- [ ] **Paso 14.1: Añadir el endpoint directorio (público, sin auth)**

Añadir ANTES de la ruta `/:slug` (importante: rutas específicas antes que las genéricas):

```typescript
// GET /api/profiles/directory — Public directory with filters
router.get('/directory', async (req, res, next) => {
  try {
    const { profession, city, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { published: true };
    if (profession) where.profession = { contains: profession, mode: 'insensitive' };
    if (city) where.country = { contains: city, mode: 'insensitive' };

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          profession: true,
          bio: true,
          avatar: true,
          country: true,
          specialty: true,
          user: {
            select: { plan: true, planExpiresAt: true },
          },
          services: {
            where: { isActive: true },
            select: { id: true, name: true, price: true, currency: true },
            take: 3,
          },
        },
        orderBy: [
          // Pro users first (workaround: orderBy createdAt desc, sorted in app)
          { createdAt: 'desc' },
        ],
        skip,
        take: limitNum,
      }),
      prisma.profile.count({ where }),
    ]);

    // Sort: Pro first, then Free
    const now = new Date();
    const sorted = profiles.sort((a, b) => {
      const aPro = a.user.plan === 'LIFETIME' ||
        (a.user.plan === 'PRO' && (!a.user.planExpiresAt || new Date(a.user.planExpiresAt) > now));
      const bPro = b.user.plan === 'LIFETIME' ||
        (b.user.plan === 'PRO' && (!b.user.planExpiresAt || new Date(b.user.planExpiresAt) > now));
      if (aPro && !bPro) return -1;
      if (!aPro && bPro) return 1;
      return 0;
    });

    res.json({
      profiles: sorted.map(p => ({
        ...p,
        isPro: p.user.plan === 'LIFETIME' ||
          (p.user.plan === 'PRO' && (!p.user.planExpiresAt || new Date(p.user.planExpiresAt) > now)),
        user: undefined,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Paso 14.2: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npm run build 2>&1 | tail -20
```

- [ ] **Paso 14.3: Commit**

```bash
git add backend/src/routes/profiles.ts
git commit -m "feat: add public directory endpoint with Pro sorting"
```

---

### Tarea 15: Página frontend Explorar.tsx

**Archivos:**
- Crear: `frontend/src/pages/Explorar.tsx`

- [ ] **Paso 15.1: Crear la página**

```typescript
// frontend/src/pages/Explorar.tsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Zap, Star } from 'lucide-react';
import api from '../api/client';
import { PROFESSION_CATEGORIES } from '../lib/professions';

interface DirectoryProfile {
  id: string;
  slug: string;
  title: string;
  profession: string;
  bio?: string;
  avatar?: string;
  country?: string;
  specialty?: string;
  isPro: boolean;
  services: { id: string; name: string; price: number; currency: string }[];
}

const POPULAR_PROFESSIONS = [
  'Psicólogo/a', 'Barbero/a', 'Nutricionista', 'Entrenador/a Personal',
  'Médico/a General', 'Estilista', 'Coach de Vida', 'Fisioterapeuta',
];

export default function Explorar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const profession = searchParams.get('profession') || '';
  const city = searchParams.get('city') || '';
  const [searchProfession, setSearchProfession] = useState(profession);
  const [searchCity, setSearchCity] = useState(city);

  const fetchDirectory = useCallback(async (prof: string, cit: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (prof) params.set('profession', prof);
      if (cit) params.set('city', cit);
      const res = await api.get(`/profiles/directory?${params}`);
      setProfiles(res.data.profiles);
      setTotal(res.data.total);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory(profession, city);
  }, [profession, city, fetchDirectory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      ...(searchProfession ? { profession: searchProfession } : {}),
      ...(searchCity ? { city: searchCity } : {}),
    });
  };

  const setQuickFilter = (prof: string) => {
    setSearchProfession(prof);
    setSearchParams({ profession: prof, ...(searchCity ? { city: searchCity } : {}) });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080414 0%, #0e0920 60%, #160d30 100%)',
      fontFamily: 'system-ui, sans-serif',
      padding: '0 0 60px',
    }}>
      {/* Header hero */}
      <div style={{
        padding: '48px 20px 32px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link to="/" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: 13, display: 'block', marginBottom: 16 }}>
          ← Volver a Aliax
        </Link>
        <h1 style={{ color: '#f0ebff', fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>
          Encuentra un profesional
        </h1>
        <p style={{ color: '#9d95b5', fontSize: 15, margin: '0 0 28px' }}>
          {total > 0 ? `${total} profesionales disponibles` : 'Busca por especialidad o ciudad'}
        </p>

        {/* Search form */}
        <form onSubmit={handleSearch} style={{
          display: 'flex', gap: 10, maxWidth: 600,
          margin: '0 auto 20px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 2, minWidth: 200, position: 'relative' }}>
            <Search size={16} color="#9d95b5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Profesión (ej: Psicólogo)"
              value={searchProfession}
              onChange={e => setSearchProfession(e.target.value)}
              style={{
                width: '100%', padding: '12px 12px 12px 38px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#f0ebff', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140, position: 'relative' }}>
            <MapPin size={16} color="#9d95b5" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Ciudad"
              value={searchCity}
              onChange={e => setSearchCity(e.target.value)}
              style={{
                width: '100%', padding: '12px 12px 12px 36px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#f0ebff', fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button type="submit" style={{
            padding: '12px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(90deg, #6b63ff, #9333ea)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Buscar
          </button>
        </form>

        {/* Quick filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {POPULAR_PROFESSIONS.map(p => (
            <button
              key={p}
              onClick={() => setQuickFilter(p)}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${profession === p ? 'rgba(107,99,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                background: profession === p ? 'rgba(107,99,255,0.2)' : 'transparent',
                color: profession === p ? '#a78bfa' : '#9d95b5',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9d95b5', padding: 40 }}>Buscando...</div>
        ) : profiles.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9d95b5', padding: 60 }}>
            <p style={{ fontSize: 16 }}>No encontramos profesionales con esos filtros.</p>
            <p style={{ fontSize: 13 }}>Intenta con otra profesión o ciudad.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {profiles.map(profile => (
              <Link
                key={profile.id}
                to={`/${profile.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${profile.isPro ? 'rgba(107,99,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 16,
                  padding: 20,
                  transition: 'border-color 0.2s, background 0.2s',
                  cursor: 'pointer',
                }}>
                  {/* Header con avatar y badge Pro */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.title}
                        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(107,99,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#a78bfa', fontSize: 18, fontWeight: 700, flexShrink: 0,
                      }}>
                        {profile.title[0]}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#f0ebff', fontWeight: 600, fontSize: 15 }}>{profile.title}</span>
                        {profile.isPro && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: 'rgba(107,99,255,0.2)',
                            border: '1px solid rgba(107,99,255,0.4)',
                            borderRadius: 20, padding: '2px 7px',
                            color: '#a78bfa', fontSize: 10, fontWeight: 700,
                          }}>
                            <Zap size={9} /> PRO
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#9d95b5', fontSize: 12, margin: '2px 0 0' }}>{profile.profession}</p>
                      {profile.country && (
                        <p style={{ color: '#6b6b80', fontSize: 11, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={10} /> {profile.country}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p style={{
                      color: '#9d95b5', fontSize: 13, margin: '0 0 10px',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {profile.bio}
                    </p>
                  )}

                  {/* Servicios preview */}
                  {profile.services.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {profile.services.slice(0, 2).map(s => (
                        <span key={s.id} style={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: 6, padding: '3px 8px',
                          color: '#cdc0e0', fontSize: 11,
                        }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Paso 15.2: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/frontend"
npm run build 2>&1 | tail -30
```

- [ ] **Paso 15.3: Commit**

```bash
git add frontend/src/pages/Explorar.tsx
git commit -m "feat: add Explorar directory page"
```

---

### Tarea 16: Añadir ruta /explorar y link de navegación

**Archivos:**
- Modificar: `frontend/src/App.tsx`

- [ ] **Paso 16.1: Importar Explorar y añadir la ruta**

En los imports:
```typescript
import Explorar from './pages/Explorar';
```

En el bloque `<Routes>`, añadir antes de `<Route path="/book/:slug"`:
```tsx
<Route path="/explorar" element={<Explorar />} />
```

- [ ] **Paso 16.2: Añadir link al directorio en Landing.tsx**

En `frontend/src/pages/Landing.tsx`, buscar el botón/link de navegación principal (la sección hero o el navbar) y añadir un link al directorio:

```tsx
<Link to="/explorar" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: 14 }}>
  Explorar profesionales →
</Link>
```

La ubicación exacta depende del layout de Landing.tsx — colocarlo en la sección de navegación o en la sección hero como call-to-action secundario.

- [ ] **Paso 16.3: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/frontend"
npm run build 2>&1 | tail -20
```

- [ ] **Paso 16.4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/Landing.tsx
git commit -m "feat: add /explorar route and nav link"
```

---

### Tarea 17: Deploy Fase 3

- [ ] **Paso 17.1: Deploy backend**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
vercel --prod
```

- [ ] **Paso 17.2: Deploy frontend**

```bash
cd "/c/Users/zampa/Mis proyectos/aura"
vercel --prod
```

- [ ] **Paso 17.3: Verificar en producción**
  - Visitar `https://www.aliax.io/explorar`
  - Buscar "Psicólogo" → ver resultados
  - Ver badge Pro en los usuarios con plan activo

---

## FASE 4 — Analytics Pro

---

### Tarea 18: Endpoint de analytics en backend

**Archivos:**
- Modificar: `backend/src/routes/bookings.ts`

- [ ] **Paso 18.1: Añadir imports necesarios**

```typescript
import { isProUser } from '../lib/planUtils';
```

- [ ] **Paso 18.2: Añadir endpoint GET /api/bookings/analytics**

Añadir antes del último `export default router;`:

```typescript
// GET /api/bookings/analytics — Pro: full analytics. Free: last 10 bookings summary
router.get('/analytics', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, plan: true, planExpiresAt: true },
    });

    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const profileIds = profiles.map(p => p.id);

    const isPro = isProUser(user!);

    // All bookings (Pro) or last 30 days (Free)
    const dateFilter = isPro ? {} : {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    };

    const bookings = await prisma.booking.findMany({
      where: { profileId: { in: profileIds }, ...dateFilter },
      include: { service: { select: { name: true, price: true, currency: true } } },
      orderBy: { createdAt: 'desc' },
      take: isPro ? undefined : 10,
    });

    // Revenue by service
    const byService: Record<string, { name: string; count: number; revenue: number; currency: string }> = {};
    for (const b of bookings) {
      if (b.status === 'COMPLETED') {
        const key = b.service.name;
        if (!byService[key]) byService[key] = { name: key, count: 0, revenue: 0, currency: b.service.currency };
        byService[key].count++;
        byService[key].revenue += Number(b.service.price);
      }
    }

    // Bookings by status
    const byStatus = {
      PENDING: bookings.filter(b => b.status === 'PENDING').length,
      CONFIRMED: bookings.filter(b => b.status === 'CONFIRMED').length,
      COMPLETED: bookings.filter(b => b.status === 'COMPLETED').length,
      CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
    };

    // Bookings per day (last 30 days) — Pro only
    const perDay: Record<string, number> = {};
    if (isPro) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      for (const b of bookings) {
        if (new Date(b.createdAt) >= thirtyDaysAgo) {
          const day = b.createdAt.toISOString().slice(0, 10);
          perDay[day] = (perDay[day] || 0) + 1;
        }
      }
    }

    res.json({
      isPro,
      totalBookings: bookings.length,
      byStatus,
      byService: Object.values(byService).sort((a, b) => b.count - a.count),
      perDay: isPro ? perDay : null,
      recentBookings: bookings.slice(0, isPro ? 50 : 10),
    });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Paso 18.3: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
npm run build 2>&1 | tail -20
```

- [ ] **Paso 18.4: Commit**

```bash
git add backend/src/routes/bookings.ts
git commit -m "feat: add analytics endpoint with Pro/Free tiers"
```

---

### Tarea 19: Sección Analytics en el Dashboard

**Archivos:**
- Modificar: `frontend/src/pages/Dashboard.tsx`

- [ ] **Paso 19.1: Añadir estado y fetch de analytics**

Dentro del componente `Dashboard`, añadir:

```typescript
const { isPro } = useAuth();
const [analytics, setAnalytics] = useState<any>(null);

useEffect(() => {
  api.get('/bookings/analytics')
    .then(res => setAnalytics(res.data))
    .catch(() => {});
}, []);
```

- [ ] **Paso 19.2: Añadir la sección de analytics en el JSX del dashboard**

En la sección/tab "inicio" del Dashboard, añadir una tarjeta de analytics. Buscar donde se muestran las estadísticas o métricas actuales y añadir después:

```tsx
{analytics && (
  <div style={{
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 20, marginTop: 16,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h3 style={{ color: '#f0ebff', fontSize: 16, fontWeight: 600, margin: 0 }}>Resumen de reservas</h3>
      {!isPro && (
        <Link to="/pricing" style={{
          fontSize: 12, color: '#a78bfa', textDecoration: 'none',
          background: 'rgba(107,99,255,0.15)',
          border: '1px solid rgba(107,99,255,0.3)',
          borderRadius: 20, padding: '3px 10px',
        }}>
          Ver todo con Pro →
        </Link>
      )}
    </div>

    {/* Stats grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
      {[
        { label: 'Pendientes', value: analytics.byStatus.PENDING, color: '#f59e0b' },
        { label: 'Confirmadas', value: analytics.byStatus.CONFIRMED, color: '#3b82f6' },
        { label: 'Completadas', value: analytics.byStatus.COMPLETED, color: '#10b981' },
        { label: 'Canceladas', value: analytics.byStatus.CANCELLED, color: '#ef4444' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
          padding: '12px 8px', textAlign: 'center',
        }}>
          <div style={{ color, fontSize: 24, fontWeight: 700 }}>{value}</div>
          <div style={{ color: '#6b6b80', fontSize: 11 }}>{label}</div>
        </div>
      ))}
    </div>

    {/* Servicios más reservados */}
    {analytics.byService.length > 0 && (
      <div>
        <p style={{ color: '#9d95b5', fontSize: 13, margin: '0 0 8px' }}>Servicios más solicitados:</p>
        {analytics.byService.slice(0, 3).map((s: any) => (
          <div key={s.name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ color: '#cdc0e0', fontSize: 13 }}>{s.name}</span>
            <span style={{ color: '#9d95b5', fontSize: 12 }}>{s.count} × ${s.revenue.toFixed(0)} {s.currency}</span>
          </div>
        ))}
      </div>
    )}

    {!isPro && (
      <p style={{ color: '#6b6b80', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
        Mostrando últimas 10 reservas. <Link to="/pricing" style={{ color: '#a78bfa' }}>Activa Pro</Link> para ver historial completo y tendencias.
      </p>
    )}
  </div>
)}
```

- [ ] **Paso 19.3: Asegurar que `Link` está importado**

Al inicio del archivo confirmar que existe:
```typescript
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
```

- [ ] **Paso 19.4: Verificar compilación**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/frontend"
npm run build 2>&1 | tail -30
```

- [ ] **Paso 19.5: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add analytics section to dashboard with Pro upgrade nudge"
```

---

### Tarea 20: Deploy Fase 4 (deploy final completo)

- [ ] **Paso 20.1: Deploy backend**

```bash
cd "/c/Users/zampa/Mis proyectos/aura/backend"
vercel --prod
```

- [ ] **Paso 20.2: Deploy frontend**

```bash
cd "/c/Users/zampa/Mis proyectos/aura"
vercel --prod
```

- [ ] **Paso 20.3: Verificar end-to-end en producción**
  - Registrar cuenta nueva → dashboard libre sin bloqueo
  - Ver analytics básicos → ver mensaje "Activa Pro para ver historial completo"
  - Ir a `/explorar` → ver directorio de profesionales
  - Ir a `/pricing` → ver cards Free y Pro
  - Subir 3 fotos a un servicio con cuenta Free → funciona
  - Intentar subir la 4ta → ver mensaje de upgrade

---

## Resumen de cambios por archivo

| Archivo | Qué cambia |
|---|---|
| `backend/src/lib/planUtils.ts` | **Nuevo** — `isProUser()` |
| `backend/src/middleware/requirePro.ts` | **Nuevo** — middleware Pro |
| `backend/src/middleware/requireActiveSubscription.ts` | Sin cambios (queda por si algo aún lo usa) |
| `backend/src/routes/services.ts` | Quita `requireActiveSubscription`, añade endpoints de imágenes |
| `backend/src/routes/profiles.ts` | Quita `requireActiveSubscription`, añade guard template, añade `/directory` |
| `backend/src/routes/bookings.ts` | Añade `/analytics` |
| `backend/src/services/bookingService.ts` | WhatsApp solo si Pro |
| `backend/src/jobs/trialExpiryJob.ts` | Quita unpublish automático |
| `backend/prisma/schema.prisma` | `images String[]` en Service |
| `frontend/src/context/AuthContext.tsx` | Añade `isPro: boolean` |
| `frontend/src/pages/Pricing.tsx` | Reescritura completa Free/Pro |
| `frontend/src/pages/Dashboard.tsx` | Analytics section + upgrade nudges |
| `frontend/src/pages/Explorar.tsx` | **Nueva** — directorio público |
| `frontend/src/pages/ServicesDashboard.tsx` | Galería multi-imagen |
| `frontend/src/App.tsx` | Ruta `/explorar` |
| `frontend/src/pages/Landing.tsx` | Link a `/explorar` |
