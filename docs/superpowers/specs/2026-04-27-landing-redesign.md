# Landing Redesign — aliax.io

**Fecha:** 2026-04-27  
**Estado:** Aprobado  

---

## Objetivo

Rediseñar la página principal de `www.aliax.io` para reflejar el nuevo modelo freemium, presentar el directorio público como propuesta de valor, e incorporar una sección de precios directamente en la landing. El diseño debe sentirse como un producto SaaS moderno y premium.

---

## Decisiones de diseño

| Decisión | Selección |
|---|---|
| Estructura | B — Profesionales primero, Directorio como sección diferenciada |
| Estilo visual | C — Premium / Glassmorphism |
| Tipografía display | Bebas Neue (Google Fonts) |
| Tipografía body/UI | Urbanist (Google Fonts) |
| Reemplaza | Space Grotesk + Plus Jakarta Sans |

---

## Tipografía

Importar desde Google Fonts:
```
Bebas Neue (400)
Urbanist (300, 400, 500, 600, 700, 800)
```

Variables CSS a actualizar en `index.css`:
```css
--font-display: 'Bebas Neue', sans-serif;   /* headings grandes */
--font-hero:    'Bebas Neue', sans-serif;   /* hero h1 */
--font-body:    'Urbanist', sans-serif;     /* todo lo demás */
```

Notas de uso:
- Bebas Neue: solo para `h1` de secciones y hero. Siempre `letter-spacing: 2px`, `font-weight: 400` (es la única que tiene).
- Urbanist: nav, body, botones, labels, subtítulos, footer.
- El resto de la app (dashboard, booking page) **no cambia** de tipografía — solo Landing.tsx.

---

## Secciones — orden y contenido

### 1. Nav
- Logo: punto pulsante morado + "Aliax.io" en Urbanist bold
- Links: `Explorar profesionales` · `Precios` · `Iniciar sesión`
- CTA: `Crear cuenta gratis` (pill morado)
- **Sin cambios de lógica**, solo actualizar tipografía y estilos

### 2. Hero — Para profesionales
**Layout:** dos columnas en desktop, una columna en móvil.

**Columna izquierda:**
- Badge: punto pulsante + "Gratis para siempre · Sin tarjeta"
- `h1` Bebas Neue: "TU AGENDA / PROFESIONAL, / SIN CAOS"
- Subtitle Urbanist: "Crea tu perfil, publica tus servicios y recibe reservas automáticas. Tus clientes reservan, tú te concentras en tu trabajo."
- CTA primario: "Crear mi perfil gratis →" (botón degradado `#8b5cf6 → #6366f1`, `border-radius: 10px`)
- CTA secundario: "Explorar directorio" (glass button: `bg rgba(255,255,255,0.05)`, `border rgba(255,255,255,0.1)`)
- Microcopy: "Sin tarjeta de crédito · Cancela cuando quieras"

**Columna derecha:**
- Floating pill: punto verde pulsante + "48 reservas este mes"
- Glass card de perfil de muestra (efecto vidrio: `backdrop-blur(16px)`, `bg rgba(255,255,255,0.06)`, `border rgba(255,255,255,0.1)`):
  - Avatar con inicial, nombre, profesión, ciudad
  - Badge PRO (morado)
  - Chips de servicios
  - Botón "Reservar cita" degradado
- Floating notification: ✓ "Nueva reserva confirmada" con hora y "WhatsApp enviado"

**Cambios respecto a landing actual:**
- Eliminar badge "14 días gratis · Sin tarjeta de crédito"
- Eliminar CTA "Probar gratis 14 días"
- Eliminar layout de una columna centrada → pasar a dos columnas
- Agregar glass card con perfil de muestra (estática, no dinámica)

### 3. Stats strip
Barra horizontal con 4 stats:
- `∞` — Reservas activas
- `$0` — Para siempre
- `4` — Templates únicos
- `24/7` — Tu perfil disponible

Números en Bebas Neue, labels en Urbanist uppercase. Sin cambios lógicos respecto a la landing actual, solo tipografía y 4to stat.

### 4. Cómo funciona
3 pasos para el profesional. **Copy actualizado:**
- Paso 3: eliminar "ambos reciben notificación por WhatsApp" → "Comparte tu link y empieza a recibir reservas."
- Mantener estructura visual de íconos y conectores

### 5. Directorio — Encuentra tu profesional ⭐ NUEVA
**Fondo diferenciado:** `linear-gradient(160deg, #06101e, #080e1c, #06091a)` con `border-top/bottom: 1px solid rgba(59,130,246,0.12)`. Indica visualmente que esta sección es "para clientes".

**Contenido:**
- Eyebrow badge: punto azul pulsante + "Directorio público · Gratis para todos"
- `h2` Bebas Neue: "ENCUENTRA TU PROFESIONAL IDEAL"
- Subtitle: "Psicólogos, barberos, nutricionistas y más. Reserva directamente desde su perfil."
- Buscador: input profesión + input ciudad + botón "Buscar"
  - Al hacer submit: `navigate('/explorar?profession=X&city=Y')`
- Chips de profesiones rápidas (8): Psicólogo/a, Barbero/a, Nutricionista, Entrenador/a Personal, Médico/a, Estilista, Coach, Fisioterapeuta
  - Al hacer clic: `navigate('/explorar?profession=X')`
- Grid 3 columnas desktop / 2 tablet / 1 móvil
- Fetch a `GET /api/profiles/directory?limit=6` al montar el componente (sin auth)
  - Si devuelve resultados → mostrar hasta 6 cards reales
  - Si falla o devuelve vacío → mostrar 3 cards hardcodeadas de muestra (María González - Psicóloga CDMX, Rodrigo Estilo - Barbero Monterrey, Laura - Nutricionista Guadalajara)
- Cards Pro: borde morado, glow sutil, badge ⚡ PRO, botón degradado "Reservar cita" → `/book/:slug`
- Cards Free: borde sutil, sin badge, botón ghost "Ver perfil" → `/book/:slug`
- Botón "Ver todos los profesionales →" → `/explorar`

### 6. Por qué Aliax — Features
Grid responsive: 4 columnas desktop / 2 tablet / 2 móvil. Total 7 cards (4 Pro + 3 Free). Los 4 forzadores de upgrade (Pro):

| Feature | Icono | Plan | Copy |
|---|---|---|---|
| WhatsApp al instante | Bell / MessageCircle | Pro | "Notificaciones automáticas para ti y tus clientes. Sin no-shows." |
| Portfolio de fotos | Images | Pro | "Hasta 20 fotos por servicio. Muestra tu trabajo como se merece." |
| Analytics y tendencias | BarChart2 | Pro | "Descubre qué servicios te dejan más. Toma decisiones con datos." |
| Directorio destacado | Globe | Pro | "Aparece primero en el directorio. Los clientes te encuentran en Google." |

Cards Free también presentes:
| Feature | Plan |
|---|---|
| Perfil público con link único | Free |
| Reservas ilimitadas | Free |
| Notificaciones por email | Free |

Las 4 cards Pro tienen badge "PRO" en la esquina. Las Free no tienen badge especial.

### 7. Pricing ⭐ NUEVA EN LANDING
**Título Bebas Neue:** "EMPIEZA GRATIS. / CRECE CUANDO QUIERAS."

**Dos cards lado a lado:**

**Free — $0/siempre:**
- Features: 1 perfil, servicios ilimitados, reservas ilimitadas, email, 3 fotos/servicio, 2 templates, listado en directorio
- CTA: "Crear cuenta gratis" (ghost button morado)

**Pro — $9 USD/mes:**
- Badge "RECOMENDADO" en el top
- Features: todo Free + WhatsApp, 20 fotos, analytics, posición destacada, 4 templates, 3 perfiles, recordatorio 24h
- Features premium con badge PRO inline (morado)
- CTA: "Activar Pro — $9/mes" (botón degradado)
- Microcopy: "Cancela en cualquier momento"

**Strip del cupón:**
- Código `CONFIANZA20` · 20% off · 12 meses · caduca 5 Jun 2026
- Precio efectivo: $7.20 USD/mes el primer año
- El código es solo visual (no hay input — el usuario lo copia y lo aplica en Stripe checkout)

**Lógica de botones:**
- Si `user` no autenticado → `/register`
- Si `user` autenticado y no Pro → llama al endpoint de Stripe checkout (igual que Pricing.tsx actual)
- Si `user` ya es Pro → mostrar "✓ Ya tienes Pro activo" sin botón

### 8. Templates showcase
4 cards con mini-preview de color. **Cambio:** Elegant y Creative tienen badge "PRO" en la esquina inferior.

### 9. CTA Final
Glass card grande con glow. **Copy actualizado:**
- Título Bebas Neue: "TU PRÓXIMO CLIENTE / TE ESTÁ BUSCANDO"
- Subtitle: "Crea tu perfil hoy. Es gratis para siempre."
- Botón: "Crear perfil gratis →"
- Eliminar "Empezar prueba gratis · 14 días"

### 10. Footer
Agregar links que faltan:
- Logo + tagline
- Columna: Explorar profesionales · Precios
- Columna: Iniciar sesión · Registrarse · Privacidad
- Copyright

---

## Lo que se elimina de la landing actual

| Elemento actual | Reemplazado por |
|---|---|
| Badge "14 días gratis · Sin tarjeta" | "Gratis para siempre · Sin tarjeta" |
| CTAs "Probar gratis 14 días" / "Empezar prueba gratis · 14 días" | "Crear mi perfil gratis" / "Crear perfil gratis →" |
| Sección "Próximamente: Perfiles adicionales" | Absorbida en el plan Pro de la sección Pricing |
| WhatsApp mencionado como universal | Badge PRO en feature card y en sección Pricing |
| Hero de una columna centrado | Hero dos columnas con glass card |
| Stats: 3 items | Stats: 4 items (agrega 24/7) |

---

## Lo que NO cambia

- App completa (dashboard, booking, perfil, etc.) — solo Landing.tsx
- Lógica de autenticación y navegación
- Paleta de colores (aura-950, amber-glow = #9333ea, etc.)
- Estructura de archivos del proyecto
- Todos los endpoints del backend

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/Landing.tsx` | Reescritura completa |
| `frontend/src/index.css` | Actualizar `--font-display`, `--font-hero`, `--font-body` + import Google Fonts |

---

## Dependencias y riesgos

- **Fetch en landing**: la sección de directorio hace un `GET /api/profiles/directory?limit=6` sin autenticación. El endpoint ya existe y funciona. Si falla → mostrar cards estáticas de muestra.
- **Bebas Neue**: solo tiene `font-weight: 400`. No usar `font-weight: 700` en Bebas Neue (no tiene esa variante).
- **Stripe en landing**: el botón Pro de Pricing llama al mismo endpoint que `Pricing.tsx`. Importar `useAuth` y `api` en Landing.tsx. Manejar el estado `loadingStripe`.
- **Breakpoints móvil**: el hero de dos columnas colapsa a una columna en `< 768px`. La glass card va debajo del copy.
