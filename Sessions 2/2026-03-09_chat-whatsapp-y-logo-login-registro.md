# 2026-03-09 — Se añadió chat de WhatsApp de atención al cliente y nuevo logo a Login/Registro

## 1. Chat flotante de WhatsApp

- Creado `frontend/src/components/WhatsAppWidget.tsx`
- Botón verde flotante en esquina inferior derecha, visible en todas las páginas
- Número: +52 4492123720 (formato URL: `524492123720`)
- Al hacer clic abre WhatsApp con mensaje predefinido: "Hola, tengo una pregunta sobre Aliax.io 👋"
- Al hacer hover muestra tooltip: "¿Tienes dudas? Escríbenos"
- Animación de escala al hover
- Agregado en `App.tsx` dentro de `<ToastProvider>` para que aparezca en todas las rutas

## 2. Logo en Login y Registro

- Reemplazado el ícono `<Sparkles>` por el logo SVG de Aliax en las páginas `/login` y `/register`
- Creado `frontend/public/logo-aliax-nobg.svg` — versión sin fondo oscuro
  - Fondo transparente
  - Anillos concéntricos y letra "A" en color morado (#6c63ff)
  - Visible sobre fondos claros
- Tamaño final: 72×72px (ajustado por el usuario en VS Code)
- El usuario aprendió el flujo de edición: Ctrl+S en VS Code → `vercel --prod` en terminal

## 3. Favicon actualizado

- `index.html` ahora apunta a `/logo-aliax.svg` (con fondo oscuro) para el favicon del explorador
- Google tardará unos días en actualizar el ícono en sus resultados de búsqueda

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/components/WhatsAppWidget.tsx` | CREADO — botón flotante WhatsApp |
| `frontend/src/App.tsx` | Import + `<WhatsAppWidget />` dentro de ToastProvider |
| `frontend/public/logo-aliax-nobg.svg` | CREADO — logo sin fondo |
| `frontend/src/pages/Login.tsx` | Logo SVG en lugar de Sparkles, tamaño 72px |
| `frontend/src/pages/Register.tsx` | Logo SVG en lugar de Sparkles, tamaño 72px |
| `frontend/index.html` | Favicon → `/logo-aliax.svg` |
