# Módulo: Autenticación

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/Login.tsx` | Formulario de login |
| `frontend/src/pages/Register.tsx` | Formulario de registro |
| `frontend/src/context/AuthContext.tsx` | Estado global del usuario autenticado |
| `backend/src/routes/auth.ts` | Endpoints de autenticación |
| `backend/src/middleware/auth.ts` | Middleware JWT para rutas protegidas |
| `backend/src/middleware/adminAuth.ts` | Middleware de rol admin |
| `backend/src/services/authService.ts` | Lógica JWT (sign, verify) |

---

## Flujo de Registro

1. Usuario llena: nombre, email, contraseña, teléfono (opcional), profesión
2. `POST /api/auth/register` crea el User en DB
3. Se genera un JWT y se devuelve al cliente
4. Token se guarda en `localStorage` con key `aura_token`
5. `AuthContext` carga los datos del usuario vía `GET /api/auth/me`

Si el usuario viene del formulario de registro y ya tiene datos de profesión prefillados, se guardan en `localStorage` con key `aliax_register_prefill` para autocompletar ProfileCreate.

---

## Flujo de Login

1. `POST /api/auth/login` → valida email + contraseña (bcrypt)
2. Devuelve `{ token, user }`
3. Token se guarda en `localStorage`
4. Si el usuario está **bloqueado** (`blocked: true`), el middleware retorna 403

---

## AuthContext — Lo que expone

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isPro: boolean;                              // plan activo y vigente
  featureOverrides: Record<string, boolean>;  // módulos desbloqueados por admin
  login: (email, password) => Promise<void>;
  register: (name, email, password, phone?) => Promise<void>;
  logout: () => void;
  updateAccount: (data) => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}
```

`isPro` es `true` si:
- `user.plan === 'LIFETIME'`
- `user.plan === 'PRO'` y `planExpiresAt` no ha vencido (o es null)
- `user.isAdmin === true`

---

## Middleware de Auth

`authMiddleware` en cada request autenticado:
1. Extrae el Bearer token del header
2. Verifica JWT con `verifyToken()`
3. **Consulta la DB** para verificar que el usuario no esté bloqueado (`blocked: true`)
4. Si bloqueado → `403 "Cuenta suspendida. Contacta al administrador."`
5. Si OK → setea `req.userId` y llama `next()`

---

## Rutas Protegidas

```
GET  /api/auth/me          → datos del usuario actual
PATCH /api/auth/me         → actualizar nombre, bio, email, redes, contraseña
```

El tipo `User` retornado por `/me` incluye:
- Datos básicos: id, email, name, phone, bio, socialLinks
- Plan: plan, planInterval, planExpiresAt, trialEndsAt
- Admin: isAdmin
- Control: blocked, featureOverrides

---

## Protección de Rutas en Frontend

```tsx
// En App.tsx
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
```

La ruta `/admin` requiere además `user.isAdmin === true`.
