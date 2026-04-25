# 2026-03-13 — SEO landings Barbería & Salón + OG WhatsApp

## Resumen
Optimización SEO de las dos landings de nicho de Aliax.io y configuración de previews para WhatsApp.

## Lo que se hizo

### 1. Open Graph / Preview WhatsApp
**Problema:** SPA → todos los paths servían el mismo `index.html` con los mismos meta tags. WhatsApp siempre mostraba el preview genérico.

**Solución — Vite MPA (Multi-Page App):**
- Creado `frontend/barberia.html` y `frontend/salon.html` al root del proyecto con OG tags únicos
- Actualizado `vite.config.ts` para incluirlos como entry points:
  ```ts
  build: { rollupOptions: { input: { main, barberia, salon } } }
  ```
- Actualizado `frontend/vercel.json` para rutearlos antes del catch-all:
  ```json
  { "source": "/barberia", "destination": "/barberia.html" },
  { "source": "/salon",    "destination": "/salon.html" },
  { "source": "/(.*)",     "destination": "/index.html" }
  ```

**Imágenes OG generadas** con sharp + SVG → PNG (script en `/tmp/oggen/generate.cjs`):
- `public/og-barberia.png` — fondo oscuro, gradiente dorado, "Tu barberia, siempre llena."
- `public/og-salon.png` — fondo oscuro, gradiente rosa, "Tu salon, siempre reservado."

### 2. Keywords SEO en páginas
Palabras clave objetivo:
- Barbería: "sistema de reservas para barberías", "agenda online para barbería", "citas en línea", "app para barbería México"
- Salón: "software de reservas para salón de belleza", "agenda online salón", "gestionar citas", "estética"

**Cambios en LandingBarberia.tsx:**
- Hero `<p>`: empieza con "Sistema de reservas en línea para barberías"
- `<h2>` pain: "¿Por qué tu barbería necesita una agenda online?"
- `<h2>` how-it-works: "Configura tu agenda online en 5 minutos"
- `<h2>` features: "Software de reservas hecho para barberías"
- CTA `<p>`: "El sistema de reservas para barberías más fácil de configurar"
- `alt` imagen barbero: "Barbero profesional usando sistema de reservas en línea para barbería"
- Soluciones cards: "Citas en línea para tu barbería, 24/7" / "Agenda digital para barberos"

**Cambios en LandingSalon.tsx:**
- Hero `<p>`: empieza con "Software de reservas para salón de belleza"
- `<h2>` pain: "El caos que frena a tu salón de belleza"
- `<h2>` how-it-works: "Configura tu agenda online en 3 pasos"
- `<h2>` features: "Sistema de citas diseñado para salones de belleza y estéticas"
- CTA `<p>`: "El software de reservas para salones de belleza más fácil de usar"

**Cambios en barberia.html / salon.html:**
- `<title>` con keyword principal antes del nombre de marca
- `<meta description>` con 2-3 keywords principales de forma natural

## Regla aplicada
Keyword al inicio del `<h2>` o `<p>` tiene más peso para Google. Títulos de página con keyword antes del nombre de marca.

## Archivos modificados
- `frontend/vite.config.ts`
- `frontend/vercel.json`
- `frontend/barberia.html` (nuevo)
- `frontend/salon.html` (nuevo)
- `frontend/public/og-barberia.png` (nuevo)
- `frontend/public/og-salon.png` (nuevo)
- `frontend/src/pages/LandingBarberia.tsx`
- `frontend/src/pages/LandingSalon.tsx`

## Deploy
`cd aura && vercel --prod` — en producción en www.aliax.io
