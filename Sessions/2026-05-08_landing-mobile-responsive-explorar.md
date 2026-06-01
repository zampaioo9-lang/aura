# 2026-05-08 — Landing mobile responsive + Explorar search bar

## Lo que se hizo

### Landing.tsx / Landing.css — modo mobile

- Título más grande en mobile: `clamp(2.6rem, 10vw, 3.4rem)`
- Separación entre badge "Gratis para siempre" y el h1: clase `ln-hero-body` con `padding-top: 32px` en mobile
- Botones de nav (Explorar / Login): padding y fontSize aumentados (`8px 16px`, `fontSize: 12`)
- Pills row (Reservas automáticas, etc.): `marginTop: 8` para separar del botón CTA
- Botón "Crear perfil gratis": morado más oscuro y sólido
  - Final: `linear-gradient(135deg, rgba(62,55,180,0.97), rgba(90,20,160,0.97))`

### Explorar.tsx / Explorar.css — search bar mobile

- Eliminado ícono de lupa dentro del campo Profesión (solo queda en botón Buscar)
- En mobile (≤640px): se oculta el campo Ciudad y el separador
- Placeholder cambia dinámicamente: `isMobile ? 'Profesión o Ciudad' : 'Profesión'`
- Hook `isMobile` con `window.addEventListener('resize')`
- Texto "← ALIAX.IO": más grande (`fontSize: 14`) y más visible (`opacity 0.68`)
- Contenido del hero: `marginBottom: '12vh'` para subir los textos dentro del hero centrado

## Pendiente para mañana

- **Página de reserva del profesional** (`/book/:slug`) — rediseño completo
  - Estado actual (screenshot guardado): fondo gris claro, título negro "Reservar con Psi. Maryori Marreros", tarjetas blancas con borde redondeado, precio en morado, sin imagen/avatar, sin contexto del profesional
  - Es la página que abre al dar clic en una tarjeta del directorio Explorar
  - Prioridad: mejorar diseño visual al estilo dark/glass de la landing, mantener funcionalidad de reserva intacta
  - Screenshot de referencia: `C:\Users\zampa\OneDrive\Imágenes\Screenshots\Captura de pantalla 2026-05-09 000117.png`
