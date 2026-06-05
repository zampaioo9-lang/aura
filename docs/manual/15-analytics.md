# Módulo: Analytics

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `backend/src/routes/bookings.ts` | Endpoint `GET /api/bookings/analytics` |
| `backend/src/lib/planUtils.ts` | Lógica `isProUser()` |
| `frontend/src/pages/Dashboard.tsx` | Fetch de datos + componente `TabInicio` |
| `frontend/src/hooks/useFeature.ts` | Hook para override admin |

---

## ¿Qué muestra?

Un resumen estadístico de las reservas del profesional. Visible en la pestaña **Inicio** del Dashboard, dentro de la card "Resumen de reservas".

---

## Acceso por Plan

El módulo no bloquea ni devuelve 403 — en cambio, **degrada los datos** según el plan:

| Aspecto | Free | Pro |
|---------|------|-----|
| Rango temporal | Últimos 30 días | Sin límite (historial completo) |
| Registros máximos | 10 reservas | 500 reservas |
| `perDay` (desglose por día) | `null` | Últimos 30 días |
| `recentBookings` | 10 registros | 50 registros |

Usuarios Free también ven un nudge de upgrade: *"Mostrando últimas 10 reservas. Activa Pro para ver historial completo y tendencias."*

### Override admin

El admin puede habilitar analytics completo a un usuario Free activando el módulo `analytics` en el Panel de Administración. Internamente usa `useFeature('analytics')`.

---

## Endpoint

```
GET /api/bookings/analytics
Authorization: Bearer <token>  (requerido)
```

### Respuesta

```typescript
{
  isPro: boolean,
  totalBookings: number,
  byStatus: {
    PENDING: number,
    CONFIRMED: number,
    COMPLETED: number,
    CANCELLED: number,
  },
  byService: [
    {
      name: string,      // Nombre del servicio
      count: number,     // Total de sesiones completadas
      revenue: number,   // Ingresos (suma de precios)
      currency: string,  // "MXN", "USD", "ARS", etc.
    }
    // Ordenado de más popular a menos
  ],
  perDay: {
    "2026-05-01": 3,
    "2026-05-02": 1,
    // ... un key por cada día con reservas
  } | null,   // null si el usuario es Free
  recentBookings: Booking[],
}
```

### Algoritmo de cálculo

1. Obtiene todos los perfiles del usuario autenticado
2. Si Free: aplica filtro `createdAt >= hace 30 días`
3. Calcula `byStatus` contando todas las reservas por estado
4. Calcula `byService` sumando `count` y `revenue` solo para reservas `COMPLETED`, agrupando por `nombre::moneda`
5. Si Pro: calcula `perDay` iterando reservas de los últimos 30 días
6. Devuelve `recentBookings` (10 o 50 según plan)

---

## UI en el Dashboard

### Dónde está

`Dashboard.tsx` → componente `TabInicio` → bloque `analyticsBlock`

### Cómo se carga

```typescript
// Se ejecuta una vez al montar el Dashboard
useEffect(() => {
  api.get('/bookings/analytics')
    .then(res => setAnalytics(res.data))
    .catch(() => setAnalyticsError(true));
}, []);
```

Los datos se pasan como prop a `TabInicio`:

```tsx
<TabInicio
  analytics={analytics}
  analyticsError={analyticsError}
  isPro={isPro}
  // ...
/>
```

### Lo que se renderiza

1. **Grid de 4 contadores** de estado (Pendientes, Confirmadas, Completadas, Canceladas)
2. **Top 3 servicios** más solicitados — nombre, cantidad de sesiones, ingresos por moneda
3. **Nudge de upgrade** solo para usuarios Free

---

## isProUser — Lógica compartida

```typescript
// backend/src/lib/planUtils.ts
export function isProUser(user): boolean {
  if (user.isAdmin) return true;
  if (user.plan === 'LIFETIME') return true;
  if (user.plan === 'PRO') {
    return !user.planExpiresAt || user.planExpiresAt > new Date();
  }
  return false;
}
```

Esta función se usa tanto en el endpoint de analytics como en otros endpoints del backend para determinar el nivel de acceso.

---

## Flujo Completo

```
Dashboard monta
  → GET /api/bookings/analytics (con JWT)
  → Backend: isProUser() → determina nivel de acceso
  → Si Free: filtra 30 días, toma 10 registros, omite perDay
  → Si Pro:  sin filtro de fecha, toma 500, incluye perDay
  → Response: byStatus, byService, perDay?, recentBookings
  → setAnalytics(res.data)
  → TabInicio renderiza la card con los datos
  → Si Free: muestra nudge de upgrade
```
