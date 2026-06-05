# Módulo: Analytics

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `backend/src/routes/bookings.ts` | Endpoint `GET /api/bookings/analytics` |
| `backend/src/lib/planUtils.ts` | Lógica `isProUser()` |
| `frontend/src/pages/Dashboard.tsx` | Fetch, `BarChartSVG`, `MOCK_PER_DAY`, `analyticsBlock` |
| `frontend/src/hooks/useFeature.ts` | Hook para override admin |

---

## ¿Dónde está?

Dashboard → pestaña **Inicio** → card **"Analytics"** (al final de la página).

---

## Lo que muestra

### Header
- Título **"Analytics"** con badge verde **"Pro"** si el usuario tiene plan activo
- Si es Free: link **"Ver todo con Pro →"** en lugar del badge
- Subtítulo **"Últimos 30 días"** en la esquina derecha

### Sección 1 — Contadores de estado
4 chips con los totales de reservas por estado:

| Contador | Color |
|----------|-------|
| Pendientes | Ámbar |
| Confirmadas | Azul |
| Completadas | Verde |
| Canceladas | Rojo |

### Sección 2 — Gráfica de barras (SVG inline)
Reservas por día de los últimos 30 días.

- **Pro:** Gráfica real con datos `perDay` del backend. Tooltip al hover muestra fecha y cantidad.
- **Free:** Gráfica bloqueada — datos mock con blur + overlay con candado y link "Activa Pro para ver tendencias".

### Sección 3 — Servicios más solicitados
Top 3 servicios con mayor cantidad de sesiones completadas:
- Nombre del servicio
- Cantidad de sesiones y total de ingresos (`N sesiones · $X MXN`)
- Barra de progreso horizontal relativa al servicio más popular (ese tiene 100%)

### Footer (solo Free)
*"Mostrando últimas 10 reservas. Activa Pro para ver historial completo."*

---

## Acceso por Plan

El módulo no bloquea con 403 — **degrada los datos** según el plan:

| Aspecto | Free | Pro |
|---------|------|-----|
| Rango temporal | Últimos 30 días | Sin límite |
| Registros máximos | 10 | 500 |
| `perDay` (gráfica) | bloqueada (mock) | real |
| `recentBookings` | 10 registros | 50 registros |

### Override admin
El admin puede desbloquear Analytics completo a un usuario Free activando la key `analytics` en el Panel de Administración → control de módulos del usuario.

---

## Componentes en Dashboard.tsx

### `MOCK_PER_DAY`
Constante de módulo (calculada una sola vez al cargar). Array fijo de 30 días con valores de ejemplo. Se usa para renderizar la gráfica bloqueada a usuarios Free — evita regenerar valores en cada render.

```typescript
const MOCK_PER_DAY: Record<string, number> = (() => {
  const vals = [1,0,2,3,1,0,2,1,4,2,0,1,3,2,1,0,2,3,1,2,0,1,2,1,3,0,2,1,3,2];
  // genera entries de los últimos 30 días con esos valores
})();
```

### `BarChartSVG`
Componente SVG puro (sin dependencias externas). Recibe:

```typescript
function BarChartSVG({ perDay, accent, muted }: {
  perDay: Record<string, number>;  // { "YYYY-MM-DD": count }
  accent: string;                  // color de acento del tema
  muted: string;                   // color de texto secundario
})
```

- `viewBox` responsivo — se adapta al ancho del contenedor
- Barras en color `accent` con opacidad 0.5, sube a 1.0 en hover
- Línea de base del eje X
- Etiquetas de fecha cada 5 días + última entrada
- Tooltip flotante sobre la barra hover: `"5 jun: 3 reservas"`
- Si `entries.length === 0`: mensaje "Sin reservas en los últimos 30 días."

### `analyticsBlock`
JSX constante dentro de `TabInicio`. Se renderiza en dos lugares:
- Desktop: columna izquierda del layout de dos columnas
- Móvil: al final del contenido de la pestaña Inicio

---

## Endpoint Backend

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
  byService: Array<{
    name: string,      // Nombre del servicio
    count: number,     // Sesiones completadas
    revenue: number,   // Ingresos totales (suma de precios)
    currency: string,  // "MXN", "USD", "ARS", etc.
  }>,                  // Ordenado descendente por count
  perDay: Record<string, number> | null,  // null si Free
  recentBookings: Booking[],
}
```

### Algoritmo de cálculo

1. Obtiene todos los perfiles del usuario autenticado
2. Si Free: filtra `createdAt >= hace 30 días`
3. `byStatus` — conteo de todas las reservas por estado
4. `byService` — suma `count` y `revenue` de reservas `COMPLETED`, agrupa por `nombre::moneda`, ordena por count
5. Si Pro: `perDay` — conteo por fecha ISO de los últimos 30 días
6. `recentBookings` — 10 (Free) o 50 (Pro)

---

## isProUser

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

Usada tanto en el endpoint de analytics como en otros endpoints del backend.

---

## Flujo Completo

```
Dashboard monta
  → GET /api/bookings/analytics (JWT)
  → Backend: isProUser() → nivel de acceso
  → Free: 30 días, 10 registros, perDay: null
  → Pro:  sin límite, 500 registros, perDay: { fecha: count }
  → setAnalytics(res.data)
  → TabInicio → analyticsBlock renderiza:
      Header "Analytics" + badge Pro / link upgrade
      4 contadores de estado
      BarChartSVG (real si Pro, blur+lock si Free)
      Top 3 servicios con barra de progreso
      Footer nudge (solo Free)
```
