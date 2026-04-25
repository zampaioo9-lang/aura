# Sesión 2026-02-25 (tarde) — Landing mobile, scroll y selector de apariencia

## Resumen
Optimización de la landing en mobile (nav y scroll), nueva sección de "Apariencia" en la landing, y definición de las 4 paletas definitivas del selector de color del Dashboard.

---

## Cambios realizados

### 1. Landing — Botones de nav en mobile
- `LogIn` importado desde lucide-react
- "Iniciar sesión": icono `LogIn` visible solo en mobile (`sm:hidden`), texto oculto en mobile (`hidden sm:inline`)
- "Crear cuenta": icono `UserPlus` visible solo en mobile; botón redondo en mobile (`rounded-full`), pill en desktop (`sm:rounded-full`)

### 2. Landing — Performance scroll en mobile
**Problema**: `position: fixed` + múltiples `filter: blur()` grandes causaban repaint en cada frame de scroll.

**Solución**:
- Background container: `absolute sm:fixed` (deja de ser fixed en mobile)
- Todos los elementos blur grandes (`blur-[140px]`, `blur-[120px]`, `blur-[100px]`): `hidden sm:block`
- Añadido gradiente estático simple para mobile (sin blur)
- Feature cards: quitado `backdrop-blur-sm` en mobile (`sm:backdrop-blur-sm`)
- CTA blur: `hidden sm:block`
- Root div: `style={{ isolation: 'isolate' }}`

### 3. Landing — Sección "Apariencia"
Reemplazó la sección de templates (4 cards estáticas de colores distintos). Muestra las 4 paletas del selector de Dashboard con mini preview de perfil.

- Título: "Tu color. Tu identidad."
- Subtítulo: "Apariencia"
- Grid 2 columnas mobile / 4 columnas desktop
- Cada card: fondo con `darkGradient` de la paleta, avatar placeholder, botón "Reservar" con `accent`, label + dot en el footer

### 4. Dashboard — ACCENT_THEMES definitivos
4 paletas con gradientes para los dot-buttons del selector de apariencia:

| id | label | accent |
|---|---|---|
| `profesional` | Profesional | rgb(107,99,255) — **default** |
| `bold` | Bold | rgb(222,182,7) |
| `elegante` | Elegante | rgb(62,153,201) |
| `creative` | Creative | rgb(217,72,240) |

- Default en `localStorage`: `'profesional'` (antes `'purple'`)
- Dot buttons: `background: t.darkGradient` (antes `t.accent` sólido)
- `darkGradient` y `lightGradient` definidos para cada paleta

---

## Archivos modificados
- `frontend/src/pages/Landing.tsx`
- `frontend/src/pages/Dashboard.tsx`

---

## Despliegues
- Frontend: `npx vercel --prod` → `https://www.aliax.io`
