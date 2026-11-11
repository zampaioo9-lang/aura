# Páginas de marketing por audiencia (SEO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dividir el Home de Aliax en 3 páginas (Home-repartidor, `/para-psicologos`, `/busco-terapia`), con header contextual por audiencia, footer unificado y metadata SEO propia por página.

**Architecture:** React Router SPA (Vite). Se migra el contenido cinematográfico actual del Home a un archivo nuevo (`ParaPsicologos.tsx`) sin tocar su JSX; el Home se reescribe corto; se crea `BuscoTerapia.tsx` desde cero; `LandingHeader.tsx` pasa de un array fijo de navegación a uno dependiente de la ruta actual (`useLocation().pathname`); `SiteFooter.tsx` gana los 2 enlaces nuevos más `Revista` (hoy ausente); el sitemap estático (`generate-blog.ts`) se actualiza con las 2 rutas nuevas.

**Tech Stack:** React 19 + TypeScript + Vite, react-router-dom, react-helmet-async (ya usado en `PsicologosDirectory.tsx`), Tailwind + inline styles (patrón mixto ya usado en `Landing.tsx`/`LandingHeader.tsx`), lucide-react para iconos.

**Nota sobre testing:** este proyecto no tiene suite automatizada (patrón ya establecido — ver memoria `feedback_qa_eficiente_produccion`). La verificación de cada tarea es: `npx tsc -b` sin errores + revisión visual manual en `npm run dev` (desktop y mobile). No hay pasos de "escribir test" en este plan.

---

### Task 1: Crear `ParaPsicologos.tsx` migrando el Home actual tal cual

**Files:**
- Create: `frontend/src/pages/ParaPsicologos.tsx`
- Read first (no modificar todavía): `frontend/src/pages/Landing.tsx` (180 líneas, contenido a migrar)

- [ ] **Step 1: Copiar el contenido íntegro de `Landing.tsx` a `ParaPsicologos.tsx`**

Lee `frontend/src/pages/Landing.tsx` completo (180 líneas) y cópialo sin cambios a un archivo nuevo `frontend/src/pages/ParaPsicologos.tsx`, con estos 2 cambios únicamente:

1. Renombrar `export default function Landing()` → `export default function ParaPsicologos()`.
2. Agregar metadata SEO con `Helmet` (import nuevo + bloque al inicio del `return`, envolviendo el `<main>` existente en un Fragment).

El `import` nuevo va justo debajo de los imports existentes:

```tsx
import { Helmet } from 'react-helmet-async';
```

El `return` actual es:

```tsx
  return (
    <main className="relative w-screen h-dvh overflow-hidden text-white">
```

Cámbialo a (el resto del `<main>...</main>` existente queda exactamente igual, solo se envuelve):

```tsx
  return (
    <>
      <Helmet>
        <title>Aliax para Psicólogos: automatiza tu nota clínica con IA</title>
        <meta name="description" content="Crea tu perfil profesional gratis, gestiona tu agenda y automatiza tus notas clínicas con IA. La plataforma para psicólogos y terapeutas en México y LATAM." />
        <meta property="og:title" content="Aliax para Psicólogos: automatiza tu nota clínica con IA" />
        <meta property="og:description" content="Crea tu perfil profesional gratis, gestiona tu agenda y automatiza tus notas clínicas con IA." />
        <link rel="canonical" href="https://www.aliax.io/para-psicologos" />
      </Helmet>
      <main className="relative w-screen h-dvh overflow-hidden text-white">
```

Y el cierre del archivo (hoy termina en `</main>\n  );\n}`) pasa a:

```tsx
      </main>
    </>
  );
}
```

Todo lo que está entre `<main ...>` y `</main>` (el contenido completo de las 4 pantallas, `HeroAvatar`, `SoapTiles`, etc.) se copia **sin ningún cambio**.

- [ ] **Step 2: Verificar compilación**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ParaPsicologos.tsx
git commit -m "feat: crear ParaPsicologos.tsx con el contenido migrado del Home actual"
```

---

### Task 2: Header contextual (`LandingHeader.tsx`)

**Files:**
- Modify: `frontend/src/components/landing/LandingHeader.tsx` (133 líneas, reescritura completa del archivo)

- [ ] **Step 1: Reemplazar todo el contenido de `LandingHeader.tsx`**

El array `NAV` fijo se reemplaza por 3 arrays + una función que elige según la ruta actual. El botón "Reservar demo" (antes incondicional) ahora solo se muestra en el contexto `/para-psicologos`. El contenido completo nuevo del archivo:

```tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, CalendarClock } from 'lucide-react';

interface Props {
  onNavigate?: (ratio: number) => void;
}

interface NavItem {
  label: string;
  to: string;
  external?: boolean;
}

// Revista vive fuera del router de React: son paginas HTML estaticas generadas por
// scripts/generate-blog.ts (prerender para SEO), sin ruta registrada en App.tsx. Un
// <Link> de react-router-dom navegaria del lado del cliente, no encontraria ruta y caeria
// en el catch-all "/:slug" (PublicProfile), mostrando "Perfil no encontrado" -- por eso
// este item usa <a href> normal (recarga completa) en vez de <Link>.
const NAV_HOME: NavItem[] = [];

const NAV_PARA_PSICOLOGOS: NavItem[] = [
  { label: 'Precios', to: '/pricing' },
  { label: 'Revista', to: '/revista', external: true },
];

const NAV_BUSCO_TERAPIA: NavItem[] = [
  { label: 'Encontrar psicólogo', to: '/explorar' },
  { label: 'Revista', to: '/revista', external: true },
];

function getNav(pathname: string): NavItem[] {
  if (pathname.startsWith('/para-psicologos')) return NAV_PARA_PSICOLOGOS;
  if (pathname.startsWith('/busco-terapia')) return NAV_BUSCO_TERAPIA;
  return NAV_HOME;
}

export default function LandingHeader({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const NAV = getNav(location.pathname);
  const showDemo = location.pathname.startsWith('/para-psicologos');

  const logoContent = (
    <>
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Anillos expansivos */}
        {([0, 0.65, 1.3] as number[]).map((delay, i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1.5px solid #9b87f5',
            animation: `aliax-ring 1.95s ease-out ${delay}s infinite`,
            opacity: 0,
          }} />
        ))}
        {/* A */}
        <span style={{ fontFamily: 'Michroma, sans-serif', fontWeight: 700, color: '#9b87f5', fontSize: 15, lineHeight: 1, position: 'relative', zIndex: 1 }}>A</span>
      </div>
      <div className="hidden sm:flex flex-col leading-none gap-[3px]">
        <span className="text-white text-[13px] font-medium tracking-wide" style={{ fontFamily: 'Michroma, sans-serif' }}>ALIAX</span>
        <span className="text-white/50 text-[10px]" style={{ fontFamily: 'Manrope, sans-serif' }}>Salud Mental</span>
      </div>
    </>
  );

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-16 md:py-8">
      {/* Logo */}
      {onNavigate ? (
        <button onClick={() => onNavigate(0)} className="flex items-center gap-3">
          {logoContent}
        </button>
      ) : (
        <Link to="/" className="flex items-center gap-3 no-underline">
          {logoContent}
        </Link>
      )}

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV.map(l => l.external ? (
          <a key={l.to} href={l.to}
            className="text-white text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-white hover:text-[#0f0a1a] transition-all duration-300"
            style={{ fontFamily: 'Manrope, sans-serif' }}>
            {l.label}
          </a>
        ) : (
          <Link key={l.to} to={l.to}
            className="text-white text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-white hover:text-[#0f0a1a] transition-all duration-300"
            style={{ fontFamily: 'Manrope, sans-serif' }}>
            {l.label}
          </Link>
        ))}
        {showDemo && (
          <a href="https://www.aliax.io/demo"
            className="ml-1 inline-flex items-center gap-1.5 text-[#2dd4bf] border border-[#2dd4bf]/50 text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-[#2dd4bf]/10 transition-all duration-300"
            style={{ fontFamily: 'Manrope, sans-serif' }}>
            <CalendarClock size={13} />
            Reservar demo
          </a>
        )}
        <Link to="/login"
          className="ml-2 text-[#0f0a1a] bg-[#9b87f5] text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-white transition-all duration-300"
          style={{ fontFamily: 'Manrope, sans-serif' }}>
          Entrar
        </Link>
      </nav>

      {/* Mobile burger */}
      <button onClick={() => setOpen(true)}
        className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
        <Menu size={18} className="text-white" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-[#0f0a1a]/95 backdrop-blur-xl z-[100] flex flex-col">
          <div className="flex justify-end p-6">
            <button onClick={() => setOpen(false)}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
              <X size={18} className="text-white" />
            </button>
          </div>
          <div className="flex flex-col mt-8 px-6 gap-1">
            {NAV.map(l => l.external ? (
              <a key={l.to} href={l.to} onClick={() => setOpen(false)}
                className="py-4 px-6 border-b border-white/5 text-white text-[16px] uppercase tracking-widest"
                style={{ fontFamily: 'Manrope, sans-serif' }}>
                {l.label}
              </a>
            ) : (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className="py-4 px-6 border-b border-white/5 text-white text-[16px] uppercase tracking-widest"
                style={{ fontFamily: 'Manrope, sans-serif' }}>
                {l.label}
              </Link>
            ))}
            {showDemo && (
              <a href="https://www.aliax.io/demo" onClick={() => setOpen(false)}
                className="py-4 px-6 border-b border-white/5 text-[#2dd4bf] text-[16px] uppercase tracking-widest flex items-center gap-2"
                style={{ fontFamily: 'Manrope, sans-serif' }}>
                <CalendarClock size={16} />
                Reservar demo
              </a>
            )}
            <Link to="/login" onClick={() => setOpen(false)}
              className="py-4 px-6 text-[#9b87f5] text-[16px] uppercase tracking-widest font-semibold"
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
```

**Importante:** `useLocation()` requiere que el componente se renderice dentro de un `<BrowserRouter>`. `LandingHeader` ya se usa hoy dentro de `Landing.tsx` (que vive dentro de `<Routes>` en `App.tsx`), así que esto ya se cumple — no requiere cambios en `App.tsx` para este paso.

- [ ] **Step 2: Verificar compilación**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/LandingHeader.tsx
git commit -m "feat: header contextual segun audiencia (Home/para-psicologos/busco-terapia)"
```

**Corrección post-revisión:** la primera versión de `getNav()` hacía caer a `NAV_HOME` (vacío) cualquier ruta no reconocida, lo cual rompía silenciosamente el header de 5 páginas ya en producción que también usan `LandingHeader` sin pasarle contexto (`Pricing.tsx`, `Explorar.tsx`, `Login.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`). Se corrigió agregando `NAV_DEFAULT` (el menú que esas páginas ya tenían: Encontrar psicólogo · Precios · Revista + demo) como fallback, y haciendo que `/` sea el único caso explícito para `NAV_HOME`.

---

### Task 3: Footer unificado (`SiteFooter.tsx`)

**Files:**
- Modify: `frontend/src/components/landing/SiteFooter.tsx` (44 líneas, reescritura completa)

- [ ] **Step 1: Reemplazar todo el contenido de `SiteFooter.tsx`**

Agrega "Soy psicólogo", "Busco terapia" y "Revista" (hoy ausente) a `LINKS`, y soporta enlaces externos (mismo patrón `external` que `LandingHeader.tsx`, porque Revista es un sitio estático fuera del router — ver comentario en Task 2):

```tsx
import { Link } from 'react-router-dom';

interface FooterLink {
  label: string;
  to: string;
  external?: boolean;
}

const LINKS: FooterLink[] = [
  { label: 'Soy psicólogo', to: '/para-psicologos' },
  { label: 'Busco terapia', to: '/busco-terapia' },
  { label: 'Encontrar psicólogo', to: '/explorar' },
  { label: 'Precios', to: '/pricing' },
  { label: 'Revista', to: '/revista', external: true },
  { label: 'Iniciar sesión', to: '/login' },
  { label: 'Registrarse', to: '/register' },
  { label: 'Privacidad', to: '/privacidad' },
];

export default function SiteFooter() {
  return (
    <footer style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '32px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}>
        <span style={{ fontFamily: 'Michroma, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          ALIAX
        </span>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {LINKS.map(l => l.external ? (
            <a
              key={l.to}
              href={l.to}
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.to}
              to={l.to}
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          &copy; {new Date().getFullYear()} Aliax.io. Todos los derechos reservados.
        </span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/SiteFooter.tsx
git commit -m "feat: footer con las 5 paginas (agrega Soy psicologo, Busco terapia, Revista)"
```

---

### Task 4: Reescribir el Home (`Landing.tsx`) como repartidor corto

**Files:**
- Modify: `frontend/src/pages/Landing.tsx` (reescritura completa — el contenido viejo ya vive en `ParaPsicologos.tsx` desde Task 1)

- [ ] **Step 1: Reemplazar todo el contenido de `Landing.tsx`**

```tsx
// frontend/src/pages/Landing.tsx
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';

export default function Landing() {
  return (
    <>
      <Helmet>
        <title>Aliax — Psicólogos y terapia en México y LATAM</title>
        <meta name="description" content="Aliax conecta a psicólogos con las personas que buscan terapia. Encuentra tu psicólogo ideal o crea tu perfil profesional gratis." />
        <meta property="og:title" content="Aliax — Psicólogos y terapia en México y LATAM" />
        <meta property="og:description" content="Aliax conecta a psicólogos con las personas que buscan terapia." />
        <link rel="canonical" href="https://www.aliax.io/" />
      </Helmet>

      <div className="relative min-h-screen text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)' }}>
        <LandingHeader />

        {/* Teal glow top-right */}
        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.15) 0%, transparent 70%)' }} />
        {/* Purple glow bottom-left */}
        <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />

        <main className="relative z-10 max-w-[720px] mx-auto text-center px-6" style={{ paddingTop: 180, paddingBottom: 120 }}>
          <p className="text-[#2dd4bf] text-[12px] uppercase tracking-[0.2em] font-medium" style={{ fontFamily: 'Manrope, sans-serif', marginBottom: 16 }}>
            Salud mental en México y LATAM
          </p>
          <h1 className="font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px' }}>
            Terapia y psicólogos, en un solo lugar
          </h1>
          <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 48px' }}>
            Aliax conecta a psicólogos con las personas que buscan terapia. Elige tu camino para continuar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch max-w-[420px] mx-auto">
            <Link
              to="/para-psicologos"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:brightness-110"
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', boxShadow: '0 8px 24px rgba(45,212,191,0.3)' }}
            >
              Soy psicólogo <ArrowRight size={16} />
            </Link>
            <Link
              to="/busco-terapia"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold border border-white/20 bg-white/5 hover:border-[#2dd4bf] transition-all duration-300"
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15 }}
            >
              Busco terapia <ArrowRight size={16} />
            </Link>
          </div>
        </main>

        <div className="relative z-10">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat: Home reescrito como repartidor corto de audiencias"
```

---

### Task 5: Crear `BuscoTerapia.tsx`

**Files:**
- Create: `frontend/src/pages/BuscoTerapia.tsx`

- [ ] **Step 1: Crear el archivo con el contenido completo**

Usa los 2 artículos reales ya publicados en la Revista relevantes para esta audiencia (confirmado contra la base de datos — `como-elegir-psicologo-7-pasos-para-encontrar-al-indicado` y `autoestima-y-limites-en-pareja-como-cuidarte-sin-perder-la-relacion`; los otros 2 artículos publicados hoy están orientados a terapeutas, no se usan aquí):

```tsx
// frontend/src/pages/BuscoTerapia.tsx
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Search, BookOpen } from 'lucide-react';
import LandingHeader from '../components/landing/LandingHeader';
import SiteFooter from '../components/landing/SiteFooter';

const ARTICLES = [
  {
    title: 'Cómo elegir psicólogo: 7 pasos para encontrar al indicado',
    excerpt: 'Decidir ir a terapia ya es un paso grande. Y justo después aparece la segunda pregunta: ¿con quién?',
    href: '/revista/como-elegir-psicologo-7-pasos-para-encontrar-al-indicado',
  },
  {
    title: 'Autoestima y límites en pareja: cómo cuidarte sin perder la relación',
    excerpt: 'Poner límites no es alejar a tu pareja, es decirle quién eres y qué necesitas.',
    href: '/revista/autoestima-y-limites-en-pareja-como-cuidarte-sin-perder-la-relacion',
  },
];

export default function BuscoTerapia() {
  return (
    <>
      <Helmet>
        <title>Busco terapia: encuentra tu psicólogo ideal | Aliax</title>
        <meta name="description" content="Encuentra un psicólogo verificado en México y LATAM. Filtra por enfoque terapéutico, modalidad online o presencial, y agenda tu sesión directamente." />
        <meta property="og:title" content="Busco terapia: encuentra tu psicólogo ideal | Aliax" />
        <meta property="og:description" content="Encuentra un psicólogo verificado en México y LATAM. Filtra por enfoque terapéutico, modalidad y ciudad." />
        <link rel="canonical" href="https://www.aliax.io/busco-terapia" />
      </Helmet>

      <div className="relative min-h-screen text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0e2633 50%, #0a1a1a 100%)' }}>
        <LandingHeader />

        <div className="absolute top-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.15) 0%, transparent 70%)' }} />

        <main className="relative z-10 max-w-[900px] mx-auto px-6" style={{ paddingTop: 160, paddingBottom: 100 }}>
          {/* Hero */}
          <section className="text-center" style={{ marginBottom: 80 }}>
            <p className="text-[#2dd4bf] text-[12px] uppercase tracking-[0.2em] font-medium" style={{ fontFamily: 'Manrope, sans-serif', marginBottom: 16 }}>
              Busco terapia
            </p>
            <h1 className="font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px' }}>
              Encuentra tu psicólogo ideal
            </h1>
            <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 40px' }}>
              Perfiles verificados, filtra por enfoque terapéutico, modalidad y ciudad. Agenda directo con el psicólogo, sin intermediarios.
            </p>
            <Link
              to="/explorar"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:brightness-110"
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', boxShadow: '0 8px 24px rgba(45,212,191,0.3)' }}
            >
              Buscar psicólogo <ArrowRight size={16} />
            </Link>
          </section>

          {/* Encuentra tu psicólogo */}
          <section className="grid md:grid-cols-[auto_1fr] gap-4 items-start" style={{ marginBottom: 64, padding: 28, borderRadius: 20, background: 'rgba(255,255,255,0.04)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
            <Search size={28} className="text-[#2dd4bf]" />
            <div>
              <h2 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, margin: '0 0 8px' }}>Encuentra tu psicólogo</h2>
              <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                En el directorio de Aliax puedes filtrar por enfoque terapéutico (cognitivo-conductual, sistémico, psicoanalítico y más), modalidad (online o presencial) y ciudad, para encontrar al psicólogo que mejor encaja contigo.
              </p>
              <Link to="/explorar" className="text-[#2dd4bf] font-medium inline-flex items-center gap-1" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14 }}>
                Ver directorio <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* Lee antes de empezar */}
          <section style={{ marginBottom: 64 }}>
            <h2 className="font-semibold text-center" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 20, margin: '0 0 24px' }}>Lee antes de empezar</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {ARTICLES.map(a => (
                <a key={a.href} href={a.href} className="block transition-all duration-300 hover:brightness-110" style={{ padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.04)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', textDecoration: 'none', color: 'inherit' }}>
                  <BookOpen size={20} className="text-[#2dd4bf]" style={{ marginBottom: 12 }} />
                  <h3 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, margin: '0 0 8px', color: '#fff' }}>{a.title}</h3>
                  <p className="text-white/50" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{a.excerpt}</p>
                </a>
              ))}
            </div>
          </section>

          {/* CTA final */}
          <section className="text-center">
            <Link
              to="/explorar"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-semibold transition-all duration-300 hover:brightness-110"
              style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', boxShadow: '0 8px 24px rgba(45,212,191,0.3)' }}
            >
              Buscar psicólogo <ArrowRight size={16} />
            </Link>
          </section>
        </main>

        <div className="relative z-10">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/BuscoTerapia.tsx
git commit -m "feat: crear pagina Busco Terapia"
```

---

### Task 6: Registrar las rutas nuevas (`App.tsx`)

**Files:**
- Modify: `frontend/src/App.tsx:7` (imports) y `frontend/src/App.tsx:70` (rutas)

- [ ] **Step 1: Agregar los 2 imports lazy**

El import de `Landing` está en la línea 7:

```tsx
const Landing = lazy(() => import('./pages/Landing'));
```

Justo debajo, agrega:

```tsx
const Landing = lazy(() => import('./pages/Landing'));
const ParaPsicologos = lazy(() => import('./pages/ParaPsicologos'));
const BuscoTerapia = lazy(() => import('./pages/BuscoTerapia'));
```

- [ ] **Step 2: Agregar las 2 rutas**

La ruta de Home está en la línea 70:

```tsx
              <Route path="/" element={<Landing />} />
```

Justo debajo, agrega:

```tsx
              <Route path="/" element={<Landing />} />
              <Route path="/para-psicologos" element={<ParaPsicologos />} />
              <Route path="/busco-terapia" element={<BuscoTerapia />} />
```

(Debe quedar antes del catch-all `<Route path="/:slug" element={<PublicProfile />} />` al final de la lista — ya lo está, por ser agregado junto a `/`, muy por encima de esa línea.)

- [ ] **Step 3: Verificar compilación**

Run: `cd frontend && npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: registrar rutas /para-psicologos y /busco-terapia"
```

---

### Task 7: Sitemap (`generate-blog.ts`)

**Files:**
- Modify: `frontend/scripts/generate-blog.ts:409`

- [ ] **Step 1: Agregar las 2 rutas nuevas a `staticRoutes`**

La línea actual (409):

```ts
  const staticRoutes = ['', '/explorar', '/pricing', '/revista'];
```

Cámbiala a:

```ts
  const staticRoutes = ['', '/explorar', '/pricing', '/revista', '/para-psicologos', '/busco-terapia'];
```

- [ ] **Step 2: Verificar que el sitemap se regenera correctamente**

Run: `cd frontend && npm run build`
Expected: el build termina sin errores, y el log muestra `[Revista] Generados: 4 articulos, index, sitemap.xml, robots.txt` (o el conteo de artículos vigente).

Abre `frontend/public/sitemap.xml` tras el build y confirma que aparecen las 2 líneas nuevas:
```
<url><loc>https://www.aliax.io/para-psicologos</loc></url>
<url><loc>https://www.aliax.io/busco-terapia</loc></url>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/scripts/generate-blog.ts
git commit -m "feat: agregar nuevas paginas al sitemap generado"
```

**Corrección post-ejecución:** `frontend/public/sitemap.xml` está en `.gitignore` desde el commit `bc4bf8c` (2026-10-28) — es un artefacto generado en cada build, nunca se commitea al repo (ver `feedback_sitemap_fuente_unica`). Solo se commitea el script `generate-blog.ts`; el sitemap.xml regenerado se verifica localmente pero no entra a git.

---

### Task 8: Verificación manual end-to-end

**Files:** ninguno (solo verificación, sin cambios de código)

- [ ] **Step 1: Levantar el entorno de desarrollo**

Run: `cd frontend && npm run dev`

- [ ] **Step 2: Verificar cada página en desktop**

Abrir en el navegador:
- `/` — debe mostrar el Home corto con los 2 botones "Soy psicólogo" / "Busco terapia", header sin enlaces de contenido (solo "Entrar").
- `/para-psicologos` — debe verse **pixel-idéntico** a como se veía el Home antes de este cambio (misma animación de scroll, mismo contenido), header con Precios · Revista · Reservar demo · Entrar.
- `/busco-terapia` — nueva página, header con Encontrar psicólogo · Revista · Entrar. Confirmar que los 2 artículos de la Revista enlazan correctamente (abren `/revista/<slug>` en una pestaña nueva/recarga completa, no un 404 de React Router).

- [ ] **Step 3: Verificar en mobile**

Repetir el Step 2 con el viewport en modo móvil (DevTools → Toggle device toolbar), confirmando que el menú hamburguesa de `LandingHeader` muestra los mismos enlaces contextuales que en desktop.

- [ ] **Step 4: Verificar footer en las 3 páginas**

Confirmar que el footer de `/`, `/para-psicologos` y `/busco-terapia` muestra siempre las 8 entradas de `LINKS` (incluyendo Revista, que antes faltaba), sin importar el header contextual de cada una.

- [ ] **Step 5: Verificar metadata SEO**

En cada una de las 3 páginas, abrir "Ver código fuente" (view-source) y confirmar que `<title>` y `<meta name="description">` son únicos y corresponden al contenido de esa página (no el título genérico de `index.html`).

- [ ] **Step 6: Reportar resultado**

Si todo lo anterior pasa, el feature está completo. Si algo no coincide (ej. `/para-psicologos` se ve distinto al Home original), es un bug de la migración del Task 1 — revisar que no se haya alterado nada del JSX original al copiarlo.
