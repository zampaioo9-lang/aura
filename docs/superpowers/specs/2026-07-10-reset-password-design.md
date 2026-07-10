# Reseteo de Contraseña — Diseño

**Fecha:** 2026-07-10
**Proyecto:** Aliax (aura)
**Objetivo:** Dar a los usuarios una forma de recuperar su cuenta si olvidan la contraseña ("Olvidé mi contraseña" self-service), y dar al admin una forma de forzar un reseteo para un usuario específico desde el AdminPanel — sin que el admin llegue a ver ni escribir la contraseña real de nadie.

---

## Contexto

Verificado en el código real (2026-07-10): hoy no existe ningún mecanismo de recuperación de contraseña en Aliax. `backend/src/routes/auth.ts` solo tiene `register`, `login`, `GET /me` y `PATCH /me` — este último cambia la contraseña pero **requiere conocer la contraseña actual** (`backend/src/routes/auth.ts:127-133`), así que no sirve si el usuario la olvidó. `backend/src/routes/admin.ts` no tiene ningún endpoint relacionado a contraseñas. `Login.tsx` no tiene ningún link de "olvidé mi contraseña". Es un gap real, no una regresión.

---

## Decisiones de diseño

**Token de reseteo: JWT, sin migración de Prisma.** Se reutiliza la infraestructura de `authService.ts` (`signToken`/`verifyToken`, mismo mecanismo que ya usan login/registro) en vez de agregar columnas `resetToken`/`resetTokenExpiresAt` al modelo `User`. Motivo: `prisma migrate dev` falla contra Neon (P3006, ya documentado en memoria del proyecto) y requiere `db push` + SQL manual — para esta feature, un JWT autocontenido evita ese punto de fricción por completo sin sacrificar seguridad.

**Efecto de "un solo uso" sin tabla de tokens:** el JWT lleva un campo `pwv` (password-version), una huella corta (`sha256(currentPasswordHash).slice(0,16)`) del hash de contraseña vigente al momento de emitir el token. Al validar el token, se recalcula la huella contra el hash de contraseña ACTUAL del usuario en base de datos — si no coincide (porque la contraseña ya cambió, por este link o por cualquier otro medio), el token se rechaza como inválido. Esto da invalidación automática tras el primer uso exitoso, sin necesitar guardar ni borrar nada en la base de datos.

**Reseteo desde el AdminPanel usa el mismo mecanismo que el self-service** (decisión explícita del usuario): el admin nunca ve ni escribe la contraseña real de un usuario. El botón del admin simplemente dispara el mismo correo de reseteo, dirigido a ese usuario.

**Expiración del token: 30 minutos** (decisión explícita del usuario).

**Email de confirmación tras el cambio exitoso: sí** (decisión explícita del usuario) — buena práctica de seguridad: si alguien más resetea la contraseña sin que el dueño real lo sepa, este correo se lo hace notar.

**No revelar si un email existe:** `POST /forgot-password` siempre responde el mismo mensaje genérico, exista o no el email — evita que alguien use el endpoint para enumerar qué correos están registrados en Aliax.

**Auto-login tras reseteo exitoso:** `POST /reset-password` responde con un JWT nuevo (`{ token, user }`), igual que `register`/`login` — el usuario queda logueado de inmediato tras cambiar su contraseña, sin tener que volver a iniciar sesión a mano.

---

## 1. Backend — `authService.ts`

Dos funciones nuevas, junto a `signToken`/`verifyToken` existentes:

```typescript
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

`hashFragment` no es criptográficamente sensible por sí sola — es una huella de "¿cambió la contraseña?", no un secreto ni una forma de derivar la contraseña real (opera sobre el hash bcrypt ya irreversible, nunca sobre la contraseña en texto plano).

---

## 2. Backend — `emailService.ts`

Dos templates nuevos en `emailTemplates`, siguiendo el patrón visual exacto de `welcome` (`baseTemplate`, `heading`, `subtext`, `ctaButton`):

```typescript
passwordReset: (data: { userName: string; userEmail: string; resetUrl: string }) => ({
  to: data.userEmail,
  subject: 'Restablece tu contraseña de Aliax',
  html: baseTemplate('Restablece tu contraseña', `
    ${heading(`Hola ${data.userName}`)}
    ${subtext('Recibimos una solicitud para restablecer la contraseña de tu cuenta en Aliax. Si fuiste tú, haz clic en el siguiente botón para elegir una nueva contraseña.')}
    ${ctaButton('Restablecer contraseña', data.resetUrl)}
    <p style="margin-top:20px;color:#a1a1aa;font-size:13px;">Este enlace expira en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual seguirá funcionando.</p>
  `),
}),

passwordChanged: (data: { userName: string; userEmail: string }) => ({
  to: data.userEmail,
  subject: 'Tu contraseña de Aliax fue actualizada',
  html: baseTemplate('Contraseña actualizada', `
    ${heading(`Hola ${data.userName}`)}
    ${subtext('Tu contraseña de Aliax se actualizó correctamente. Ya puedes iniciar sesión con tu nueva contraseña.')}
    <p style="margin-top:20px;color:#a1a1aa;font-size:13px;">Si no fuiste tú quien hizo este cambio, contáctanos de inmediato respondiendo a este correo.</p>
  `),
}),
```

---

## 3. Backend — endpoints

### `POST /api/auth/forgot-password` (público, agregado a `auth.ts`)

```typescript
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = signResetToken(user.id, user.password);
      const resetUrl = `https://www.aliax.io/reset-password?token=${token}`;
      const tpl = emailTemplates.passwordReset({ userName: user.name, userEmail: user.email, resetUrl });
      sendEmail(tpl.to, tpl.subject, tpl.html).catch(() => {});
    }

    // Misma respuesta exista o no el email — no revela qué correos están registrados
    res.json({ message: 'Si el correo existe en Aliax, te enviamos un enlace para restablecer tu contraseña.' });
  } catch (err) {
    next(err);
  }
});
```

### `POST /api/auth/reset-password` (público, agregado a `auth.ts`)

```typescript
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

### `POST /api/admin/users/:id/reset-password` (autenticado como admin, agregado a `admin.ts`)

Sigue el mismo patrón que `POST /users/:id/welcome-email` (`admin.ts:257-272`):

```typescript
router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const token = signResetToken(user.id, user.password);
    const resetUrl = `https://www.aliax.io/reset-password?token=${token}`;
    const tpl = emailTemplates.passwordReset({ userName: user.name, userEmail: user.email, resetUrl });
    const result = await sendEmail(tpl.to, tpl.subject, tpl.html);

    res.json({ success: result.success, email: user.email });
  } catch (err) {
    next(err);
  }
});
```

A diferencia de `forgot-password` (público), aquí sí se espera el resultado del envío (`await`, no fire-and-forget) porque el admin necesita saber si realmente se envió, para poder avisarle al usuario por otro medio si Resend falla.

---

## 4. Frontend — páginas nuevas

### `ForgotPassword.tsx`

Formulario de un campo (email), mismo layout/estilo visual que `Login.tsx`. Al enviar, llama a `POST /auth/forgot-password` y muestra el mensaje genérico de confirmación devuelto por el backend (nunca "ese correo no existe"). Link "Volver a iniciar sesión" hacia `/login`.

### `ResetPassword.tsx`

Lee `token` de la query string (`useSearchParams`). Formulario con "Nueva contraseña" + "Confirmar contraseña" (validación local: coinciden, mínimo 6 caracteres, igual que la regla ya usada en `PATCH /me`). Al enviar, llama a `POST /auth/reset-password`:
- Éxito → guarda el `token`/`user` devueltos (mismo `localStorage`/contexto que usa `Login.tsx` tras loguearse) y redirige a `/dashboard`.
- Error (token inválido/expirado) → mensaje claro + link "Solicitar un enlace nuevo" hacia `/forgot-password`.

### `Login.tsx`

Se agrega un link "¿Olvidaste tu contraseña?" debajo del campo de contraseña, hacia `/forgot-password` — sin tocar el resto del formulario existente.

### `App.tsx`

Dos rutas nuevas, registradas con `React.lazy()` + `<Suspense>`, mismo patrón que el resto de páginas:

```tsx
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```

### `AdminPanel.tsx`

Botón "Resetear contraseña" en las acciones por usuario de la tabla de Usuarios (junto al botón existente de reenviar correo de bienvenida). Al hacer clic, llama a `POST /admin/users/:id/reset-password` y muestra confirmación ("Se envió el enlace de reseteo a {email}") o error si `sendEmail` falló.

---

## 5. Manejo de errores

- Email no registrado en `forgot-password` → misma respuesta genérica que si sí existiera (sección "Decisiones de diseño").
- Token con firma inválida, `purpose` incorrecto, expirado, o `pwv` que ya no coincide (contraseña cambiada desde que se emitió) → 400 con mensaje "Este enlace no es válido o ya expiró. Solicita uno nuevo." — el frontend siempre ofrece pedir uno nuevo.
- Falla el envío de email en `forgot-password` (Resend caído) → no se informa al usuario (ya se le dio la respuesta genérica antes del envío, patrón *fire-and-forget* igual que el correo de bienvenida en `register`). Aceptado como consistente con el resto del código.
- Falla el envío de email en el reseteo forzado por admin → SÍ se informa al admin (`await` + `result.success` en la respuesta), porque el admin necesita saber si debe avisarle al usuario por otro medio.
- Sin rate-limiting en `forgot-password` — el proyecto no tiene infraestructura de rate-limiting en ningún endpoint hoy; agregarla sería introducir un patrón nuevo sin precedente. Ver "Fuera de alcance".

---

## 6. Fuera de alcance (explícitamente)

- Rate-limiting / protección anti-abuso en `forgot-password` — nice-to-have futuro, no hay precedente de esto en el proyecto.
- Invalidación manual de tokens desde el AdminPanel antes de que expiren — con el diseño de token JWT + `pwv`, el token ya se auto-invalida en cuanto la contraseña cambia; invalidar un token que aún no se ha usado (sin cambiar la contraseña) requeriría volver a la Opción B (tabla de tokens en base de datos), descartada en "Decisiones de diseño".
- Notificación adicional separada de "un admin reseteó tu contraseña" — el correo `passwordReset` que recibe el usuario ya cumple esa función (es el mismo correo sin importar quién lo disparó).
- Historial/log de reseteos (quién, cuándo) — no se pidió, y no hay un patrón de logging equivalente para otras acciones de admin sobre usuarios individuales (`block`, `grant-pro`, etc.) hoy en el código.
