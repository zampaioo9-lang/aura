# 2026-03-09 — Páginas indexadas en Google

## Resumen
Se configuró Google Search Console y se preparó el sitio para indexación en Google.

## Pasos realizados

### 1. sitemap.xml
- Creado en `frontend/public/sitemap.xml`
- Incluye las páginas principales:
  - `https://www.aliax.io/` (priority 1.0)
  - `https://www.aliax.io/unete` (priority 0.9)
  - `https://www.aliax.io/pricing` (priority 0.8)
  - `https://www.aliax.io/register` (priority 0.7)
  - `https://www.aliax.io/privacidad` (priority 0.3)

### 2. robots.txt
- Creado en `frontend/public/robots.txt`
- Permite rastreo completo
- Apunta a `https://www.aliax.io/sitemap.xml`

### 3. Meta tags SEO en /unete
- Título: "Únete a Aliax.io — Plataforma para profesionales independientes"
- Descripción optimizada para barberos, estilistas, entrenadores, México
- Keywords: agenda citas online, barbero agenda digital, reservas online México
- Open Graph tags para redes sociales

### 4. Google Search Console
- Propiedad agregada: `https://www.aliax.io`
- Verificación mediante etiqueta HTML en `index.html`:
  ```html
  <meta name="google-site-verification" content="RDgx4imf2ECydJ5hjtaR1G0utJ_FFQ0B0KSiXGFEMOY" />
  ```
- Sitemap enviado: `sitemap.xml`
- Indexación solicitada para `/unete`, `/` y `/pricing`

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/public/sitemap.xml` | CREADO |
| `frontend/public/robots.txt` | CREADO |
| `frontend/src/pages/Unete.tsx` | Meta tags SEO con useEffect |
| `frontend/index.html` | Meta tag de verificación Google |

## Seguimiento
- En 1-7 días Google indexará las páginas
- Monitorear en Search Console → "Cobertura" y "Rendimiento"
