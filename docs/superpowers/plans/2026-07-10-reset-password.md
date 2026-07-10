# Reseteo de Contraseña Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un usuario recupere el acceso a su cuenta si olvida su contraseña (self-service, por email), y que el admin fuerce un reseteo para un usuario específico desde el AdminPanel, sin ver ni escribir la contraseña real de nadie.

**Architecture:** Token JWT autofirmado (reutiliza `authService.ts`, sin migración de Prisma) que incluye una huella del hash de contraseña actual (`pwv`) para invalidarse automáticamente en cuanto la contraseña cambia. Dos endpoints públicos (`forgot-password`, `reset-password`) en `auth.ts` y uno protegido en `admin.ts` que reutiliza la misma lógica de generación de token y envío de correo.

**Tech Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL (Neon) en backend; React + Vite + TypeScript en frontend; Resend para email; JWT (`jsonwebtoken`) ya en uso para auth.

**Nota sobre verificación:** este proyecto no tiene framework de tests (`backend/package.json` y `frontend/package.json` no tienen Jest/Vitest/Mocha configurados). Cada tarea reemplaza "escribir test → correrlo" por: `npx tsc --noEmit` para verificar tipos, y un script de verificación manual desechable (ejecutado con `npx tsx`, borrado al terminar) para probar el comportamiento real contra la base de datos/servidor — mismo patrón ya usado en este mismo proyecto de Claude para PsiqueCreativa.

**Spec de referencia:** `docs/superpowers/specs/2026-07-10-reset-password-design.md`

---

### Task 1: Backend — funciones de token en `authService.ts`

**Files:**
- Modify: `backend/src/services/authService.ts`

- [ ] **Paso 1: Agregar las funciones nuevas**

Añadir al final de `backend/src/services/authService.ts` (después de `verifyToken`, sin tocar lo existente):

```typescript
import crypto from 'crypto';

function hashFragment(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function signResetToken(userId: string, currentPasswordHash: string): string {
  const pwv = hashFragment(currentPasswordHash);
  return jwt.sign({ userId, purpose: 'reset', pwv }, env.JWT_SECRET, { expiresIn: '30m' });
}

export function verifyResetToken(token: string): { userId: string; pwv: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; purpose: string; pwv: string };
    if (payload.purpose !== 'reset') return null;
    return { userId: payload.userId, pwv: payload.pwv };
  } catch {
    return null;
  }
}

export function matchesCurrentPassword(pwv: string, currentPasswordHash: string): boolean {
  return pwv === hashFragment(currentPasswordHash);
}
```

El import de `crypto` va junto a los imports existentes de `bcryptjs`/`jsonwebtoken` al principio del archivo, no dentro de la función.

- [ ] **Paso 2: Verificar tipos**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Paso 3: Verificar el comportamiento con un script desechable**

Crear `backend/verify-tmp.ts`:

```typescript
import { signResetToken, verifyResetToken, matchesCurrentPassword } from './src/services/authService';

const fakeHash = '$2a$12$fakehashfortest1234567890';
const otherHash = '$2a$12$differenthash0987654321';

const token = signResetToken('user123', fakeHash);
console.log('Token generado:', token.slice(0, 20) + '...');

const payload = verifyResetToken(token);
console.log('Payload decodificado:', payload);
console.assert(payload?.userId === 'user123', 'FAIL: userId no coincide');

const matchesOriginal = matchesCurrentPassword(payload!.pwv, fakeHash);
console.log('¿Coincide con el hash original?', matchesOriginal);
console.assert(matchesOriginal === true, 'FAIL: debería coincidir con el hash original');

const matchesChanged = matchesCurrentPassword(payload!.pwv, otherHash);
console.log('¿Coincide con un hash distinto (simulando que la contraseña ya cambió)?', matchesChanged);
console.assert(matchesChanged === false, 'FAIL: NO debería coincidir con un hash distinto');

const invalidToken = verifyResetToken('token-basura-invalido');
console.log('Token inválido devuelve:', invalidToken);
console.assert(invalidToken === null, 'FAIL: un token inválido debe devolver null');

console.log('✓ Todo correcto si no hay mensajes FAIL arriba.');
```

Run: `cd backend && npx tsx verify-tmp.ts`
Expected: se imprime el token, el payload con `userId: 'user123'`, `true`, `false`, `null`, y la línea final `✓ Todo correcto` sin ningún `Assertion failed`.

- [ ] **Paso 4: Borrar el script desechable**

Run: `cd backend && rm verify-tmp.ts`

- [ ] **Paso 5: Commit**

```bash
cd backend
git add src/services/authService.ts
git commit -m "feat: add JWT-based password reset token functions"
```

---

### Task 2: Backend — templates de email en `emailService.ts`

**Files:**
- Modify: `backend/src/services/emailService.ts`

- [ ] **Paso 1: Agregar los dos templates nuevos**

Dentro del objeto `emailTemplates` (`backend/src/services/emailService.ts`), agregar estas dos entradas nuevas (junto a `welcome`, mismo nivel — verificar la coma final de la entrada anterior antes de agregar):

```typescript
  // Solicitud de reseteo de contraseña (self-service o forzado por admin)
  passwordReset: (data: {
    userName: string;
    userEmail: string;
    resetUrl: string;
  }) => ({
    to: data.userEmail,
    subject: 'Restablece tu contraseña de Aliax',
    html: baseTemplate('Restablece tu contraseña', `
      ${heading(`Hola ${data.userName}`)}
      ${subtext('Recibimos una solicitud para restablecer la contraseña de tu cuenta en Aliax. Si fuiste tú, haz clic en el siguiente botón para elegir una nueva contraseña.')}
      ${ctaButton('Restablecer contraseña', data.resetUrl)}
      <p style="margin-top:24px;color:#a1a1aa;font-size:13px;">Este enlace expira en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual seguirá funcionando.</p>
    `),
  }),

  // Confirmación tras cambio exitoso de contraseña
  passwordChanged: (data: {
    userName: string;
    userEmail: string;
  }) => ({
    to: data.userEmail,
    subject: 'Tu contraseña de Aliax fue actualizada',
    html: baseTemplate('Contraseña actualizada', `
      ${heading(`Hola ${data.userName}`)}
      ${subtext('Tu contraseña de Aliax se actualizó correctamente. Ya puedes iniciar sesión con tu nueva contraseña.')}
      <p style="margin-top:24px;color:#a1a1aa;font-size:13px;">Si no fuiste tú quien hizo este cambio, contáctanos de inmediato respondiendo a este correo.</p>
    `),
  }),
```

- [ ] **Paso 2: Verificar tipos**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Paso 3: Verificar que el HTML se genera sin errores**

Crear `backend/verify-tmp.ts`:

```typescript
import { emailTemplates } from './src/services/emailService';

const reset = emailTemplates.passwordReset({
  userName: 'Ana Test',
  userEmail: 'ana@example.com',
  resetUrl: 'https://www.aliax.io/reset-password?token=abc123',
});
console.log('Subject:', reset.subject);
console.assert(reset.html.includes('abc123'), 'FAIL: el link no aparece en el HTML');
console.assert(reset.html.includes('Ana Test'), 'FAIL: el nombre no aparece en el HTML');

const changed = emailTemplates.passwordChanged({
  userName: 'Ana Test',
  userEmail: 'ana@example.com',
});
console.log('Subject:', changed.subject);
console.assert(changed.html.includes('Ana Test'), 'FAIL: el nombre no aparece en el HTML');

console.log('✓ Todo correcto si no hay mensajes FAIL arriba.');
```

Run: `cd backend && npx tsx verify-tmp.ts`
Expected: imprime los 2 subjects y `✓ Todo correcto`, sin `FAIL`.

- [ ] **Paso 4: Borrar el script desechable**

Run: `cd backend && rm verify-tmp.ts`

- [ ] **Paso 5: Commit**

```bash
cd backend
git add src/services/emailService.ts
git commit -m "feat: add password reset email templates"
```

---

### Task 3: Backend — endpoints `forgot-password` y `reset-password` en `auth.ts`

**Files:**
- Modify: `backend/src/routes/auth.ts`

- [ ] **Paso 1: Agregar los imports necesarios**

En `backend/src/routes/auth.ts`, la línea 4 ya importa `hashPassword, comparePassword, signToken` de `authService`. Cambiarla a:

```typescript
import { hashPassword, comparePassword, signToken, signResetToken, verifyResetToken, matchesCurrentPassword } from '../services/authService';
```

Y agregar el import de `env` (no está importado hoy en este archivo):

```typescript
import { env } from '../config/env';
```

- [ ] **Paso 2: Agregar los dos endpoints**

Agregar antes de `export default router;` (al final del archivo, después de `PATCH /api/auth/me`):

```typescript
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = signResetToken(user.id, user.password);
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
      const tpl = emailTemplates.passwordReset({ userName: user.name, userEmail: user.email, resetUrl });
      sendEmail(tpl.to, tpl.subject, tpl.html).catch(() => {});
    }

    // Misma respuesta exista o no el email — no revela qué correos están registrados
    res.json({ message: 'Si el correo existe en Aliax, te enviamos un enlace para restablecer tu contraseña.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = z.object({
      token: z.string(),
      newPassword: z.string().min(6),
    }).parse(req.body);

    const payload = verifyResetToken(token);
    if (!payload) throw new AppError(400, 'Este enlace no es válido o ya expiró. Solicita uno nuevo.');

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !matchesCurrentPassword(payload.pwv, user.password)) {
      throw new AppError(400, 'Este enlace ya no es válido. Solicita uno nuevo.');
    }

    const hashed = await hashPassword(newPassword);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
      select: { id: true, email: true, name: true, isAdmin: true },
    });

    const tpl = emailTemplates.passwordChanged({ userName: user.name, userEmail: user.email });
    sendEmail(tpl.to, tpl.subject, tpl.html).catch(() => {});

    const authToken = signToken(updated.id);
    res.json({ token: authToken, user: updated });
  } catch (err) {
    next(err);
  }
});
```

No hace falta registrar estas rutas en `src/index.ts` ni en `api/index.ts` — `authRoutes` ya está montado en `/api/auth` en ambos archivos, y estos son solo nuevos handlers dentro del mismo router.

- [ ] **Paso 3: Verificar tipos**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Paso 4: Verificar en vivo contra el servidor de desarrollo**

Levantar el backend si no está corriendo: `cd backend && npm run dev` (déjalo corriendo en segundo plano).

Crear un usuario de prueba desechable:

```bash
curl -s -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test Reset","email":"test-reset-verify@aliax.io","password":"passwordOriginal123"}'
```
Expected: `{"token":"...","user":{"id":"...","email":"test-reset-verify@aliax.io","name":"Test Reset"}}` — guarda el `id` del usuario que aparece aquí, lo necesitas más abajo.

Probar `forgot-password` con el email de prueba y con uno inexistente — ambos deben responder igual:

```bash
curl -s -X POST http://localhost:4000/api/auth/forgot-password -H "Content-Type: application/json" -d '{"email":"test-reset-verify@aliax.io"}'
curl -s -X POST http://localhost:4000/api/auth/forgot-password -H "Content-Type: application/json" -d '{"email":"no-existe-nadie-con-este-correo@aliax.io"}'
```
Expected: ambas respuestas son exactamente `{"message":"Si el correo existe en Aliax, te enviamos un enlace para restablecer tu contraseña."}`. En la terminal donde corre `npm run dev` debe aparecer una línea `[Email] ...` para la primera llamada (el usuario sí existe) y NINGUNA línea de email para la segunda (el usuario no existe, nunca se intenta enviar).

Generar un token real para probar `reset-password` (no viene en la respuesta del paso anterior a propósito — se prueba con un script que reproduce lo que haría el endpoint):

Crear `backend/verify-tmp.ts` (usa el `id` del usuario de prueba creado arriba):

```typescript
import { PrismaClient } from '@prisma/client';
import { signResetToken } from './src/services/authService';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'test-reset-verify@aliax.io' } });
  if (!user) throw new Error('Usuario de prueba no encontrado — corre el curl de register primero');
  const token = signResetToken(user.id, user.password);
  console.log('TOKEN:', token);
}

main().finally(() => prisma.$disconnect());
```

Run: `cd backend && npx tsx verify-tmp.ts`
Expected: imprime una línea `TOKEN: eyJ...` — copia ese valor completo.

Usar el token para resetear la contraseña:

```bash
curl -s -X POST http://localhost:4000/api/auth/reset-password -H "Content-Type: application/json" -d '{"token":"PEGA_EL_TOKEN_AQUI","newPassword":"nuevaPassword456"}'
```
Expected: responde `{"token":"...","user":{"id":"...","email":"test-reset-verify@aliax.io","name":"Test Reset","isAdmin":false}}` (un JWT de sesión nuevo). En la terminal del servidor debe aparecer otra línea `[Email] ...` (el correo de confirmación).

Verificar que el login con la contraseña VIEJA ya no funciona y con la NUEVA sí:

```bash
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test-reset-verify@aliax.io","password":"passwordOriginal123"}'
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test-reset-verify@aliax.io","password":"nuevaPassword456"}'
```
Expected: la primera responde `401` con `{"error":"Invalid credentials"}`; la segunda responde `200` con un token válido.

Reusar el MISMO token de reseteo una segunda vez (debe fallar, porque la contraseña ya cambió):

```bash
curl -s -X POST http://localhost:4000/api/auth/reset-password -H "Content-Type: application/json" -d '{"token":"PEGA_EL_MISMO_TOKEN_DE_ANTES","newPassword":"otraPassword789"}'
```
Expected: `400` con `{"error":"Este enlace ya no es válido. Solicita uno nuevo."}`.

- [ ] **Paso 5: Borrar el script desechable y el usuario de prueba**

```bash
cd backend && rm verify-tmp.ts
```

Crear y correr un script para borrar el usuario de prueba de la base de datos real:

```typescript
// backend/verify-tmp.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const deleted = await prisma.user.delete({ where: { email: 'test-reset-verify@aliax.io' } });
  console.log('Usuario de prueba borrado:', deleted.email);
}
main().finally(() => prisma.$disconnect());
```

Run: `cd backend && npx tsx verify-tmp.ts && rm verify-tmp.ts`
Expected: imprime `Usuario de prueba borrado: test-reset-verify@aliax.io`.

- [ ] **Paso 6: Commit**

```bash
cd backend
git add src/routes/auth.ts
git commit -m "feat: add forgot-password and reset-password endpoints"
```

---

### Task 4: Backend — endpoint de reseteo forzado en `admin.ts`

**Files:**
- Modify: `backend/src/routes/admin.ts`

- [ ] **Paso 1: Agregar el import de `signResetToken`**

`backend/src/routes/admin.ts` ya importa `sendEmail, emailTemplates` de `emailService` (línea 5) y `env` (línea 7). Agregar `authService` a los imports:

```typescript
import { signResetToken } from '../services/authService';
```

- [ ] **Paso 2: Agregar el endpoint**

Agregar junto a `POST /users/:id/welcome-email` (mismo bloque, después de él):

```typescript
// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const token = signResetToken(user.id, user.password);
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const tpl = emailTemplates.passwordReset({ userName: user.name, userEmail: user.email, resetUrl });
    const result = await sendEmail(tpl.to, tpl.subject, tpl.html);

    res.json({ success: result.success, email: user.email });
  } catch (err) {
    next(err);
  }
});
```

No hace falta agregar `authMiddleware`/`adminMiddleware` a esta ruta — `admin.ts` ya los aplica a nivel de router (`router.use(authMiddleware); router.use(adminMiddleware);`, líneas 13-14), cubre automáticamente cualquier ruta nueva del archivo.

- [ ] **Paso 3: Verificar tipos**

Run: `cd backend && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Paso 4: Verificar en vivo contra el servidor de desarrollo**

Necesitas un token de un usuario ADMIN real para probar esta ruta (está protegida). Usa tu propia cuenta admin de Aliax para loguearte y obtener un token:

```bash
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"TU_EMAIL_ADMIN","password":"TU_PASSWORD_ADMIN"}'
```
Expected: responde con un `token`. Guárdalo.

Crear de nuevo un usuario de prueba desechable (igual que en la Task 3):

```bash
curl -s -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test Admin Reset","email":"test-admin-reset-verify@aliax.io","password":"passwordOriginal123"}'
```
Expected: responde con el `user.id` — guárdalo.

Llamar al endpoint de admin con ese `id`, usando el token de admin:

```bash
curl -s -X POST http://localhost:4000/api/admin/users/PEGA_EL_ID_AQUI/reset-password -H "Authorization: Bearer PEGA_EL_TOKEN_ADMIN_AQUI"
```
Expected: `{"success":true,"email":"test-admin-reset-verify@aliax.io"}`. En la terminal del servidor debe aparecer una línea `[Email] ...` confirmando el envío.

Verificar que sin token de admin la ruta rechaza la solicitud:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/api/admin/users/PEGA_EL_ID_AQUI/reset-password
```
Expected: `401`.

Verificar con un `id` que no existe:

```bash
curl -s -X POST http://localhost:4000/api/admin/users/id-que-no-existe/reset-password -H "Authorization: Bearer PEGA_EL_TOKEN_ADMIN_AQUI"
```
Expected: `404` con `{"error":"Usuario no encontrado"}`.

- [ ] **Paso 5: Borrar el usuario de prueba**

Crear `backend/verify-tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const deleted = await prisma.user.delete({ where: { email: 'test-admin-reset-verify@aliax.io' } });
  console.log('Usuario de prueba borrado:', deleted.email);
}
main().finally(() => prisma.$disconnect());
```

Run: `cd backend && npx tsx verify-tmp.ts && rm verify-tmp.ts`
Expected: imprime `Usuario de prueba borrado: test-admin-reset-verify@aliax.io`.

- [ ] **Paso 6: Commit**

```bash
cd backend
git add src/routes/admin.ts
git commit -m "feat: add admin-triggered password reset endpoint"
```

---

### Task 5: Frontend — `resetPassword` en `AuthContext.tsx`

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`

- [ ] **Paso 1: Agregar el método al tipo del contexto**

En `AuthContextType` (línea ~29), agregar junto a `register`:

```typescript
  resetPassword: (token: string, newPassword: string) => Promise<void>;
```

- [ ] **Paso 2: Implementar la función**

Agregar después de la función `register` (línea ~79), mismo patrón exacto:

```typescript
  const resetPassword = async (token: string, newPassword: string) => {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    localStorage.setItem('aura_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };
```

- [ ] **Paso 3: Exponerla en el Provider**

En el `return` del `AuthContext.Provider` (línea ~112), agregar `resetPassword` al value:

```typescript
    <AuthContext.Provider value={{ user, token, isPro, featureOverrides, login, register, resetPassword, logout, updateAccount, refreshUser, loading }}>
```

- [ ] **Paso 4: Verificar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores. (Nota: si `tsc -b --noEmit` da error de que `--noEmit` no es compatible con `-b` en este proyecto, usar `npx tsc --noEmit -p tsconfig.app.json` en su lugar — verificar cuál `tsconfig*.json` existe en `frontend/` antes de correrlo.)

- [ ] **Paso 5: Commit**

```bash
cd frontend
git add src/context/AuthContext.tsx
git commit -m "feat: add resetPassword to AuthContext"
```

---

### Task 6: Frontend — página `ForgotPassword.tsx`

**Files:**
- Create: `frontend/src/pages/ForgotPassword.tsx`

- [ ] **Paso 1: Crear la página**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';
import api from '../api/client';

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff',
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s',
};

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)', color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>
      <LandingHeader />
      <div style={{
        position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 500,
        background: 'radial-gradient(ellipse, rgba(45,212,191,0.10) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9b87f5', boxShadow: '0 0 10px rgba(155,135,245,0.9)' }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Aliax</span>
          </Link>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(45,212,191,0.15)',
          borderRadius: 20, padding: '36px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>¿Olvidaste tu contraseña?</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px' }}>
            Escribe tu email y te enviaremos un enlace para restablecerla
          </p>

          {sent ? (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.25)',
              borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5,
            }}>
              Si ese correo existe en Aliax, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10, fontSize: 13, color: 'rgba(248,113,113,0.9)',
                }}>
                  {error}
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
              <button type="submit" disabled={loading} style={{
                marginTop: 4, width: '100%', padding: '13px',
                background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            <Link to="/login" style={{ color: '#2dd4bf', textDecoration: 'none', fontWeight: 500 }}>
              ← Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json` (o el comando que haya funcionado en la Task 5, Paso 4).
Expected: sin errores. (Es normal que aún no compile del todo si `App.tsx` no importa esta página todavía — eso se resuelve en la Task 8. Si el único error es "declared but never used" sobre este archivo, está bien por ahora.)

- [ ] **Paso 3: Commit**

```bash
cd frontend
git add src/pages/ForgotPassword.tsx
git commit -m "feat: add ForgotPassword page"
```

---

### Task 7: Frontend — página `ResetPassword.tsx`

**Files:**
- Create: `frontend/src/pages/ResetPassword.tsx`

- [ ] **Paso 1: Crear la página**

```tsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff',
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s',
};

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]                 = useState(false);
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Este enlace no es válido. Solicita uno nuevo.');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)', color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>
      <LandingHeader />
      <div style={{
        position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 500,
        background: 'radial-gradient(ellipse, rgba(45,212,191,0.10) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9b87f5', boxShadow: '0 0 10px rgba(155,135,245,0.9)' }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Aliax</span>
          </Link>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(45,212,191,0.15)',
          borderRadius: 20, padding: '36px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>Elige tu nueva contraseña</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 28px' }}>
            Escribe y confirma tu nueva contraseña
          </p>

          {error && (
            <div style={{
              marginBottom: 20, padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, fontSize: 13, color: 'rgba(248,113,113,0.9)',
            }}>
              {error}
              {error.includes('válido') && (
                <>
                  {' '}
                  <Link to="/forgot-password" style={{ color: '#2dd4bf', fontWeight: 600 }}>
                    Solicitar un enlace nuevo
                  </Link>
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Nueva contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required minLength={6}
                  style={{ ...inp, paddingRight: 40 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Confirmar contraseña
              </label>
              <input
                type={showPwd ? 'text' : 'password'} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: 4, width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>
          </form>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <SiteFooter />
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar tipos**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: sin errores (mismas notas que en la Task 6, Paso 2).

- [ ] **Paso 3: Commit**

```bash
cd frontend
git add src/pages/ResetPassword.tsx
git commit -m "feat: add ResetPassword page"
```

---

### Task 8: Frontend — registrar rutas en `App.tsx`

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Paso 1: Agregar los imports lazy**

Junto a la línea 9 (`const Register = lazy(...)`), agregar:

```typescript
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
```

- [ ] **Paso 2: Agregar las rutas**

Junto a la línea 65 (`<Route path="/register" element={<Register />} />`), agregar:

```tsx
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
```

- [ ] **Paso 3: Verificar tipos**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: sin errores.

- [ ] **Paso 4: Verificar en el navegador**

Levantar el frontend si no está corriendo: `cd frontend && npm run dev`.

Abrir `http://localhost:5173/forgot-password` en el navegador — debe cargar la página (no un 404 de React Router ni pantalla en blanco).
Abrir `http://localhost:5173/reset-password?token=abc` — debe cargar la página también.

- [ ] **Paso 5: Commit**

```bash
cd frontend
git add src/App.tsx
git commit -m "feat: register forgot-password and reset-password routes"
```

---

### Task 9: Frontend — link "¿Olvidaste tu contraseña?" en `Login.tsx`

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Paso 1: Agregar el link**

En `Login.tsx`, dentro del `<div>` que envuelve el campo "Contraseña" (líneas 102-119), justo después del `</div>` que cierra el `position: 'relative'` del input (línea 118), agregar antes de cerrar el div exterior:

```tsx
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  style={{ ...inp, paddingRight: 40 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
```

(Esto reemplaza el bloque existente de las líneas 102-119 — el único cambio real es el `<div>` nuevo con el link, agregado después del `<div style={{ position: 'relative' }}>` y antes del cierre del `<div>` exterior del campo de contraseña.)

- [ ] **Paso 2: Verificar tipos**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: sin errores.

- [ ] **Paso 3: Verificar en el navegador**

Abrir `http://localhost:5173/login` — debe verse el link "¿Olvidaste tu contraseña?" debajo del campo de contraseña, alineado a la derecha. Hacer clic debe navegar a `/forgot-password`.

- [ ] **Paso 4: Commit**

```bash
cd frontend
git add src/pages/Login.tsx
git commit -m "feat: add forgot password link to Login page"
```

---

### Task 10: Frontend — botón "Resetear contraseña" en `AdminPanel.tsx`

**Files:**
- Modify: `frontend/src/pages/AdminPanel.tsx`

- [ ] **Paso 1: Agregar el estado**

Junto a la línea 354 (`const [sendingWelcome, setSendingWelcome] = useState<string | null>(null);`), agregar:

```typescript
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
```

- [ ] **Paso 2: Agregar la función handler**

Después de `handleSendWelcome` (líneas 635-645), agregar:

```typescript
  const handleResetPassword = async (userId: string, userEmail: string) => {
    const confirmed = window.confirm(`¿Enviar un enlace de reseteo de contraseña a ${userEmail}?`);
    if (!confirmed) return;
    setResettingPassword(userId);
    try {
      const res = await api.post(`/admin/users/${userId}/reset-password`);
      if (res.data.success) {
        alert(`Enlace de reseteo enviado a ${userEmail}`);
      } else {
        alert(`No se pudo enviar el correo a ${userEmail}. Avísale por otro medio.`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al enviar el enlace de reseteo');
    } finally {
      setResettingPassword(null);
    }
  };
```

- [ ] **Paso 3: Agregar el botón en la UI**

Justo después del bloque "Welcome email status & send button" (líneas 1323-1361, termina en el `</div>` de la línea 1361), agregar un bloque nuevo con el mismo estilo:

```tsx
                            {/* Reset password button */}
                            <div className="rounded-lg px-3 py-2 mt-3 flex items-center justify-between"
                              style={{ background: C.subCard, border: `1px solid ${C.cardBorder}` }}>
                              <div>
                                <p className="text-xs" style={{ color: C.textFaint }}>Contraseña</p>
                                <p className="text-sm" style={{ color: C.textMuted }}>
                                  Enviar enlace para que el usuario elija una nueva
                                </p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleResetPassword(u.id, u.email); }}
                                disabled={resettingPassword === u.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {resettingPassword === u.id ? 'Enviando...' : 'Resetear contraseña'}
                              </button>
                            </div>
```

`Send` ya está importado en este archivo (se usa en el botón de welcome email). No hace falta agregar ningún import nuevo.

- [ ] **Paso 4: Verificar tipos**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json`
Expected: sin errores.

- [ ] **Paso 5: Verificar en el navegador**

Loguearte como admin en `http://localhost:5173/admin`, expandir un usuario en la tabla de Usuarios — debe verse el nuevo bloque "Contraseña" con el botón "Resetear contraseña" debajo del bloque de "Email de bienvenida". Hacer clic debe mostrar el `confirm()` del navegador, y al aceptar, hacer la llamada real (puedes probarlo con el usuario de prueba que crees y luego borres, igual que en la Task 4 — o simplemente confirmar que aparece la alerta de éxito/error sin necesariamente completar el envío real).

- [ ] **Paso 6: Commit**

```bash
cd frontend
git add src/pages/AdminPanel.tsx
git commit -m "feat: add reset password button to AdminPanel user actions"
```

---

## Self-review del plan

**Cobertura de la spec:** los 3 endpoints (Task 3, 4), los 2 templates de email (Task 2), el token JWT con `pwv` (Task 1), las 2 páginas nuevas (Task 6, 7), el link en Login (Task 9), el botón en AdminPanel (Task 10), y el registro de rutas (Task 8) — cubren el 100% de las secciones 1-4 de la spec. La sección 5 (manejo de errores) está implementada inline en cada endpoint/página, no requiere una tarea aparte. La sección 6 (fuera de alcance) no requiere tareas.

**Consistencia de tipos:** `signResetToken(userId, currentPasswordHash)` se llama igual en Task 3 (`auth.ts`) y Task 4 (`admin.ts`) — mismo orden de argumentos. `verifyResetToken` devuelve `{ userId, pwv }` en Task 1 y se consume exactamente así en Task 3. `resetPassword(token, newPassword)` en `AuthContext` (Task 5) coincide con la llamada `resetPassword(token, newPassword)` en `ResetPassword.tsx` (Task 7). El endpoint `POST /auth/reset-password` (Task 3) responde `{ token, user }` y `AuthContext.resetPassword` (Task 5) lee exactamente `res.data.token`/`res.data.user`.
