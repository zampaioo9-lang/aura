# Sesión 2026-02-25 (noche 2) — Trial 14 días: backend, banner y bloqueo

## Resumen
Implementación completa del sistema de prueba gratuita de 14 días: campo en DB, cron job de notificación WhatsApp, banner en Dashboard con estados dinámicos y pantalla de bloqueo del tab Profesional al vencer.

---

## Cambios realizados

### 1. Backend — Schema Prisma
- Añadido campo `trialEndsAt DateTime?` al modelo `User`
- Migración aplicada con `npx prisma db push`

### 2. Backend — auth.ts
- **Register**: al crear usuario se setea `trialEndsAt = now + 14 días`
- **GET /me**: añadido `trialEndsAt: true` al `select`
- **PATCH /me**: añadido `trialEndsAt: true` al `select` de respuesta

### 3. Backend — trialExpiryJob.ts (nuevo)
- Cron diario a las 9:00 AM: `0 9 * * *`
- Busca usuarios con `trialEndsAt` entre inicio y fin del día actual
- Por cada usuario: obtiene número WhatsApp (`socialLinks.whatsapp || phone`)
- Envía mensaje de texto plano via `sendWhatsApp`:
  > "Hola {nombre} 👋 Tu período de prueba gratuita de Aliax.io ha finalizado hoy. Para seguir recibiendo reservas... 👉 https://www.aliax.io/dashboard"
- Registrado en `index.ts` con `startTrialExpiryJob()`

### 4. Frontend — AuthContext.tsx
- Añadido `trialEndsAt?: string | null` a la interfaz `User`

### 5. Frontend — Dashboard.tsx: banner de trial
Ubicación: entre `</nav>` y el layout mobile/desktop. Solo visible cuando `trialEndsAt` existe y quedan ≤ 7 días.

| Estado | Fondo | Texto |
|---|---|---|
| 4–7 días | Azul sutil / slate dark | "Tu prueba gratuita vence en X días" |
| 1–3 días | Ámbar | "Tu prueba gratuita vence en X días" |
| Hoy | Ámbar urgente | "Tu prueba vence hoy" |
| Expirado | Rojo | "Tu período de prueba ha finalizado" + link "Activar plan" |

### 6. Frontend — Dashboard.tsx: bloqueo tab Profesional
- Calculado `trialExpired` (booleano) a nivel del componente
- Ambas instancias de `<TabProfesional>` (mobile + desktop) reemplazadas condicionalmente:
  ```tsx
  trialExpired ? <TrialExpiredScreen C={C} /> : <TabProfesional ... />
  ```
- Nuevo componente `TrialExpiredScreen`: card con 🔒, título, descripción y botón "Activar plan profesional" → `mailto:soporte@aliax.io`

### 7. Fix: Prisma client regeneración
- El `vercel.json` del backend bundlea `node_modules/.prisma/**` (cliente local)
- El `prisma generate` local fallaba con EPERM (DLL en uso por procesos Node)
- Solución: matar todos los procesos `node.exe`, luego `prisma generate` exitoso
- Redeploy del backend con cliente regenerado

---

## Archivos modificados
- `backend/prisma/schema.prisma`
- `backend/src/routes/auth.ts`
- `backend/src/jobs/trialExpiryJob.ts` ← nuevo
- `backend/src/index.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/pages/Dashboard.tsx`

---

## Nota operativa
Para testear el banner/bloqueo: abrir Prisma Studio (`npx prisma studio` en `/backend`), editar `trialEndsAt` del usuario a una fecha pasada, cerrar sesión y volver a entrar en el Dashboard.

**Importante**: antes de `prisma generate`, asegurarse de que no haya procesos Node corriendo (incluido Prisma Studio), ya que bloquean el DLL en Windows.

---

## Despliegues
- Backend: `npx vercel --prod` → `https://api.aliax.io`
- Frontend: `npx vercel --prod` → `https://www.aliax.io`
