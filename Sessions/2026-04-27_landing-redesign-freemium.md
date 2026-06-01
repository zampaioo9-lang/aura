# 2026-04-27 — Landing redesign freemium

## Objetivo
Rediseñar la landing de `www.aliax.io` para reflejar el nuevo modelo freemium: eliminar mensajes de "14 días gratis", posicionar el directorio público como propuesta de valor dual (profesionales + clientes), y agregar sección de precios embebida.

---

## Decisiones de diseño aprobadas

| Aspecto | Selección |
|---|---|
| Estructura | B — Profesionales primero, Directorio como sección diferenciada |
| Estilo visual | C — Premium / Glassmorphism |
| Tipografía display | Bebas Neue (Google Fonts, solo weight 400) |
| Tipografía body/UI | Urbanist (Google Fonts, 300–800) |
| Reemplaza | Space Grotesk + Plus Jakarta Sans |

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/index.html` | Fuentes Google Fonts → Bebas Neue + Urbanist; OG tags actualizados |
| `frontend/src/index.css` | Variables `--font-display`, `--font-body`, `--font-hero` + `body { font-family }` |
| `frontend/src/pages/Landing.tsx` | Reescritura completa (838 líneas) |

---

## Secciones implementadas (Landing.tsx)

1. **Nav** — punto pulsante morado con 2 anillos expansivos (`32px` + `20px`, duración 2s, delay escalonado), links, pill "Crear cuenta gratis"
2. **Hero** — dos columnas desktop / una columna mobile; badge "Gratis para siempre · Sin tarjeta"; h1 Bebas Neue "TU AGENDA PROFESIONAL, SIN CAOS"; glass card con perfil de muestra (María González, PRO); floating notification y pill de reservas
3. **Stats strip** — 4 valores: ∞ / $0 / 4 / 24/7
4. **Cómo funciona** — 3 pasos, paso 3 "Comparte tu link" (sin mención de WhatsApp)
5. **Directorio** — fondo azul/índigo diferenciado; search form con contenedor glass y bordes azules; 8 chips de profesiones; grid 3 columnas con fetch real a `GET /api/profiles/directory?limit=6` + fallback a 3 cards estáticas; cards Pro con borde morado, cards Free con borde blanco visible
6. **Features** — 4 cards Pro (Bell/Image/BarChart2/Globe) con badge PRO + hover glow; 3 cards Free (Shield/Star/Bell) sin badge
7. **Pricing** — Free $0 vs Pro $9 USD/mes; lógica Stripe (no auth→/register, no Pro→checkout, isPro→"Ya tienes Pro activo"); cupón CONFIANZA20 display-only (20% off, 12 meses, caduca 5 Jun 2026, $7.20/mes efectivo)
8. **Templates** — 4 cards: Minimalist y Bold (Free), Elegant y Creative (badge PRO)
9. **CTA Final** — "TU PRÓXIMO CLIENTE / TE ESTÁ BUSCANDO"; botón "Crear perfil gratis →"
10. **Footer** — logo + 5 links (Explorar, Precios, Iniciar sesión, Registrarse, Privacidad) + copyright

---

## Cambios posteriores al deploy inicial

### Logo — anillos de pulso más expansivos
- Antes: un anillo `animate-ping` `inset-0` del mismo tamaño que el punto (12px)
- Ahora: dos anillos concéntricos — exterior 32px (opacidad 15%, 2s), interior 20px (opacidad 25%, delay 0.5s) → efecto sonar doble

### Sección directorio — inputs y cards más vivos
- **Inputs:** contenedor glass `rgba(255,255,255,0.04)` con borde azul; cada input fondo `rgba(255,255,255,0.1)` + borde `rgba(59,130,246,0.4)` + glow de foco; iconos en azul; placeholder 50%
- **Chips de profesión:** fondo `rgba(255,255,255,0.05)` + borde blanco 20% + texto 65%
- **Cards Free:** fondo `rgba(255,255,255,0.08)` + borde blanco 20% + box-shadow; botón "Ver perfil" azul en vez de transparente
- **Cards Pro:** borde morado 55% + shadow morada + fondo más saturado
- **Textos internos:** profesión 35%→65%, bio 35%→55%, chips de servicios 35%→60%

---

## Datos estáticos hardcodeados en Landing.tsx

```ts
SAMPLE_PROFILES = [
  { title: 'María González', profession: 'Psicóloga Clínica', country: 'CDMX', isPro: true },
  { title: 'Rodrigo Estilo', profession: 'Barbero Profesional', country: 'Monterrey', isPro: true },
  { title: 'Laura Nutrición', profession: 'Nutricionista', country: 'Guadalajara', isPro: false },
]

FREE_FEATURES = [
  '1 perfil profesional público', 'Servicios y reservas ilimitados',
  'Notificaciones por email', 'Hasta 3 fotos por servicio',
  '2 templates (Minimalist y Bold)', 'Listado en el directorio de Aliax',
]

PRO_FEATURES (highlight=true → badge inline PRO):
  'Notificaciones WhatsApp al cliente y a ti' ★
  'Hasta 20 fotos por servicio' ★
  'Analytics completos y tendencias' ★
  'Posición destacada en el directorio' ★
  'Los 4 templates (incluye Elegant y Creative)'
  'Hasta 3 perfiles'
  'Recordatorio automático 24h por WhatsApp'
```

---

## Commits del día

```
d654242 style(landing): directorio inputs y cards mas vivos y contrastados
67f6dd1 style(landing): logo pulse rings more expansive with layered animation
fix(landing): responsive movil y og tags actualizados         ← Task 8
feat(landing): templates con badge Pro, CTA final y footer completo  ← Task 7
feat(landing): seccion pricing embebida con logica Stripe y cupon CONFIANZA20  ← Task 6
feat(landing): seccion features con 4 forzadores Pro + 3 free  ← Task 5
feat(landing): seccion directorio con fetch real y fallback estatico  ← Task 4
feat(landing): stats strip + seccion como funciona actualizada  ← Task 3
feat(landing): nav + hero glassmorphism con glass card de perfil  ← Task 2
style: use var(--font-body) in body rule instead of hardcoded Plus Jakarta Sans
style: replace fonts with Bebas Neue + Urbanist for landing redesign  ← Task 1
```

---

## Specs y plan

- Spec: `docs/superpowers/specs/2026-04-27-landing-redesign.md`
- Plan: `docs/superpowers/plans/2026-04-27-landing-redesign.md`

---

## Producción

- URL: **https://www.aliax.io**
- Último deploy: 2026-04-27 (~20:30h)
- Branch: `feature/landing-redesign` mergeado a `master`
