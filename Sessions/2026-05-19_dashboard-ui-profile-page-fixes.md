# 2026-05-19 — Dashboard UI + Página pública del profesional

## Dashboard (Desktop)

### TabInicio — layout dos columnas
- Saludo "Hola, X 👋" movido fuera de la columna izquierda → ocupa ancho completo encima de ambas columnas
- Columna izquierda: `flex: 1` sin tope de ancho (antes `maxWidth: 480`)
- Columna derecha (Comparte tu perfil): `width: 300px`, card con gradiente accent
- Contenedor centrado con `maxWidth: 900, margin: 0 auto`

### Sidebar desktop
- Removido el divider entre avatar y secciones de nav
- Removido DashNavRow de tema claro/oscuro de "Preferencias" (ya está en navbar)
- "Ver planes" fontSize 12 → 14
- Sombra del board en modo claro más prominente

### Navbar
- Botón "Actualizar plan" (desktop only) → `/pricing`
- Toggle tema visible en todos los tamaños de pantalla
- Sin `borderBottom`

### Mobile Layer 2 (contenido)
- Revertido a `background: C.mainBg` (opaco) — evita transparencia con Layer 1 detrás

### TabInicio mobile
- Restaurado layout single-column original (sin dos columnas)
- `twoCol` prop: `true` solo en desktop, `false` (default) en mobile

---

## SchedulingConfig (Configurar Agenda)

### Iconos del menú lateral
- Reemplazados emojis (📅🗂️🚫⚙️🔔) por íconos Lucide SVG:
  - `CalendarDays`, `Layers`, `Ban`, `Settings2`, `Bell`
- Consistencia visual con el resto de la UI

### Esquinas del aside
- `.sc-panel`: `overflow: hidden` + `border-radius: 12px` no era suficiente
- Solución final: aside con `border-radius: 12px` propio + `border` en todos los lados + `gap: 10px` separación del panel main
- Las 4 esquinas del submenu son ahora visibles y redondeadas

---

## Página pública del profesional — MinimalistTemplate.tsx

### Desktop sidebar — header del profesional
- Layout cambiado de fila horizontal → columna centrada
- Foto: 62px → 120px, centrada
- Nombre debajo de la foto: fontSize 16 → 20, centrado
- Chip de profesión debajo del nombre: fontSize 11 → 13, centrado

### Mobile — bloque de información
- Añadido `borderRadius: 24` + `margin: 0 12px`
- `paddingTop: 16` al contenedor exterior (no margin en el bloque) para que en modo claro no aparezca franja de corte

### Mobile — widget de disponibilidad (horarios)
- Antes: `flex: 1` por columna → días cortados en pantalla angosta
- Ahora: scroll horizontal (`overflowX: auto`) + `width: 90px, flexShrink: 0` por columna
- **Fade hint**: gradiente derecho + círculo con flecha (accent) que desaparece al llegar al final del scroll
- `scrollbarWidth: none` para ocultar scrollbar
