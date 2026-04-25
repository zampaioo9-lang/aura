# 2026-02-25 — Sidebar gradiente + selector de apariencia

## Lo que se hizo

### Selector de color (accent themes)
- Añadida constante `ACCENT_THEMES` con 4 paletas: Índigo (default), Azure, Esmeralda, Rosa
- Cada paleta define `accent`, `accentDark`, `accentLight`, `darkGradient`, `lightGradient`
- State `accentId` persistido en `localStorage` bajo clave `aliax_accent`
- `C` (colores) ahora es dinámico: sobreescribe `accent` y `accentLight` según la paleta activa
- `profileGradient` también es dinámico, usa el gradiente de la paleta activa

### Sidebar desktop
- Fondo completo del `aside` usa `profileGradient` (toda la columna, no solo la tarjeta)
- Todos los textos y botones adaptados a blanco semi-transparente sobre el gradiente
- Esquinas redondeadas (`borderRadius: 16px`)
- Separado del navbar y del área de contenido con `padding: 12px` en el contenedor padre
- Tab bar con esquinas superiores redondeadas (`16px 16px 0 0`)
- Área de contenido con esquinas inferiores redondeadas (`0 0 16px 16px`)
- Botones "Editar perfil", "Modo oscuro" y "Apariencia" agrupados juntos (gap-3) al fondo
- Selector "Apariencia" siempre visible (para todos los tabs, no solo Profesional)

### Tarjeta de perfil mobile (Layer 1)
- Fondo completo usa `profileGradient` (antes solo la sección superior tenía gradiente)
- Bottom strip (Editar perfil, Apariencia, Cerrar sesión) también sobre el gradiente
- Selector "Apariencia" añadido permanentemente entre "Editar perfil" y "Cerrar sesión"

## Archivos modificados
- `frontend/src/pages/Dashboard.tsx`

## Commits
- `ab65cbd` feat(dashboard): gradient sidebar with accent color picker
- `374abd9` feat(dashboard): show accent picker for all tabs/views

## Deploys
- Ambos cambios desplegados exitosamente en https://www.aliax.io
