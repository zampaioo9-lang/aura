# Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescribir `Landing.tsx` con estilo glassmorphism, tipografía Bebas Neue + Urbanist, sección de directorio con fetch real, y sección de pricing embebida.

**Architecture:** Landing.tsx es una reescritura completa — misma ruta `/`, misma lógica de auth. Se agrega `useEffect` para fetch del directorio (con fallback estático) y `useState` para el loading de Stripe. Todos los demás archivos de la app permanecen intactos.

**Tech Stack:** React + TypeScript + Tailwind v4 + lucide-react · Google Fonts (Bebas Neue, Urbanist) · react-router-dom · api client existente

---

## File Map

| Archivo | Acción |
|---|---|
| `frontend/index.html` | Modificar — reemplazar import de fuentes en `<head>` |
| `frontend/src/index.css` | Modificar — actualizar variables `--font-*` |
| `frontend/src/pages/Landing.tsx` | Reescritura completa |

---

### Task 1: Actualizar tipografía global

**Files:**
- Modify: `frontend/index.html:31`
- Modify: `frontend/src/index.css:8-10`

- [ ] **Step 1: Reemplazar import de fuentes en index.html**

Buscar la línea actual (aprox línea 31):
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```
Reemplazar con:
```html
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Urbanist:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Actualizar variables de fuente en index.css**

En `frontend/src/index.css`, reemplazar dentro del bloque `@theme`:
```css
  --font-display: 'Bebas Neue', sans-serif;
  --font-body: 'Urbanist', sans-serif;
  --font-hero: 'Bebas Neue', sans-serif;
```

- [ ] **Step 3: Arrancar el dev server y verificar que no hay errores de compilación**

```bash
cd "frontend" && npm run dev
```
Abrir `http://localhost:5173`. El dashboard y otras páginas deben seguir funcionando (usan las mismas variables CSS). El cambio de fuente se verá hasta que reescribamos Landing.tsx.

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html frontend/src/index.css
git commit -m "style: replace fonts with Bebas Neue + Urbanist for landing redesign"
```

---

### Task 2: Landing.tsx — Imports + Nav + Hero

**Files:**
- Rewrite: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Reemplazar todo el contenido de Landing.tsx con la estructura base + Nav + Hero**

```tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Zap, Bell, Image, BarChart2, Globe,
  Shield, Star, Check, ArrowRight, UserPlus, Layers, Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

// ─── Types ────────────────────────────────────────────────────────
interface DirectoryProfile {
  id: string;
  slug: string;
  title: string;
  profession: string;
  bio?: string;
  avatar?: string;
  country?: string;
  isPro: boolean;
  services: { id: string; name: string; price: number; currency: string }[];
}

// ─── Static data ──────────────────────────────────────────────────
const QUICK_PROFESSIONS = [
  'Psicólogo/a', 'Barbero/a', 'Nutricionista', 'Entrenador/a Personal',
  'Médico/a General', 'Estilista', 'Coach de Vida', 'Fisioterapeuta',
];

const SAMPLE_PROFILES: DirectoryProfile[] = [
  {
    id: 's1', slug: '#', title: 'María González', profession: 'Psicóloga Clínica',
    country: 'CDMX', isPro: true, bio: 'Especialista en ansiedad y terapia de pareja.',
    services: [{ id: '1', name: 'Terapia individual', price: 800, currency: 'MXN' },
               { id: '2', name: 'Pareja', price: 1000, currency: 'MXN' }],
  },
  {
    id: 's2', slug: '#', title: 'Rodrigo Estilo', profession: 'Barbero Profesional',
    country: 'Monterrey', isPro: true, bio: 'Cortes modernos y degradados. Portfolio de +200 trabajos.',
    services: [{ id: '3', name: 'Corte clásico', price: 180, currency: 'MXN' },
               { id: '4', name: 'Degradado', price: 220, currency: 'MXN' }],
  },
  {
    id: 's3', slug: '#', title: 'Laura Nutrición', profession: 'Nutricionista',
    country: 'Guadalajara', isPro: false, bio: 'Planes personalizados para pérdida de peso y salud.',
    services: [{ id: '5', name: 'Plan nutricional', price: 600, currency: 'MXN' }],
  },
];

const FREE_FEATURES = [
  '1 perfil profesional público',
  'Servicios y reservas ilimitados',
  'Notificaciones por email',
  'Hasta 3 fotos por servicio',
  '2 templates (Minimalist y Bold)',
  'Listado en el directorio de Aliax',
];

const PRO_FEATURES: { text: string; highlight: boolean }[] = [
  { text: 'Notificaciones WhatsApp al cliente y a ti', highlight: true },
  { text: 'Hasta 20 fotos por servicio', highlight: true },
  { text: 'Analytics completos y tendencias', highlight: true },
  { text: 'Posición destacada en el directorio', highlight: true },
  { text: 'Los 4 templates (incluye Elegant y Creative)', highlight: false },
  { text: 'Hasta 3 perfiles', highlight: false },
  { text: 'Recordatorio automático 24h por WhatsApp', highlight: false },
];

// ─── Component ────────────────────────────────────────────────────
export default function Landing() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [searchProf, setSearchProf] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [loadingStripe, setLoadingStripe] = useState(false);

  useEffect(() => {
    api.get('/profiles/directory?limit=6')
      .then(r => {
        setProfiles(r.data.profiles?.length > 0 ? r.data.profiles : SAMPLE_PROFILES);
      })
      .catch(() => setProfiles(SAMPLE_PROFILES));
  }, []);

  const handleDirectorySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchProf) params.set('profession', searchProf);
    if (searchCity) params.set('city', searchCity);
    navigate(`/explorar?${params}`);
  };

  const handleStripe = async () => {
    if (!user) { navigate('/register'); return; }
    setLoadingStripe(true);
    try {
      const res = await api.post('/subscriptions/stripe/checkout', { interval: 'MONTHLY' });
      window.location.href = res.data.url;
    } catch {
      setLoadingStripe(false);
    }
  };

  return (
    <div className="bg-aura-950 text-white font-body min-h-screen overflow-x-hidden">

      {/* ─── Ambient background ─── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(99,51,234,0.6) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* ─── 1. Nav ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5">
          {/* Pulsing dot */}
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 rounded-full bg-amber-glow animate-ping opacity-60" />
            <div className="relative w-3 h-3 rounded-full bg-amber-glow shadow-[0_0_8px_rgba(147,51,234,0.8)]" />
          </div>
          <span className="text-lg font-semibold text-white tracking-wide" style={{ fontFamily: 'Urbanist, sans-serif' }}>
            Aliax.io
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/explorar" className="text-sm text-white/40 hover:text-white/70 transition-colors px-3 py-2">
            Explorar profesionales
          </Link>
          <Link to="/pricing" className="text-sm text-white/40 hover:text-white/70 transition-colors px-3 py-2">
            Precios
          </Link>
          <Link to="/login" className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2">
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="ml-2 px-4 py-2 text-sm font-semibold text-amber-soft bg-amber-wash border border-amber-glow/20 rounded-full hover:bg-amber-wash-strong hover:border-amber-glow/40 transition-all"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </nav>

      {/* ─── 2. Hero ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">

        {/* Left col */}
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-wash border border-amber-glow/20 text-amber-soft text-xs font-medium mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-glow shadow-[0_0_6px_rgba(147,51,234,0.9)]" />
            Gratis para siempre · Sin tarjeta
          </div>

          <h1
            className="text-white mb-6 leading-none"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(52px, 7vw, 80px)', letterSpacing: '2px' }}
          >
            TU AGENDA<br />
            <span style={{ background: 'linear-gradient(95deg, #a855f7 0%, #818cf8 50%, #6ee7b7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PROFESIONAL,
            </span><br />
            SIN CAOS
          </h1>

          <p className="text-white/45 text-lg leading-relaxed mb-10 max-w-md">
            Crea tu perfil, publica tus servicios y recibe reservas automáticas.
            Tus clientes reservan, tú te concentras en tu trabajo.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-white rounded-xl transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 6px 28px rgba(99,51,234,0.45)', fontFamily: 'Urbanist, sans-serif', fontSize: '15px' }}
            >
              Crear mi perfil gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/explorar"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-white/50 font-medium text-sm rounded-xl hover:text-white/80 transition-colors border border-white/10 bg-white/[0.03]"
            >
              Explorar directorio
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/25">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>

        {/* Right col — glass card */}
        <div className="relative h-72 md:h-80 hidden md:block">
          {/* Stats pill */}
          <div
            className="absolute -top-2 -left-6 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 z-10"
            style={{ background: 'rgba(22,20,40,0.9)', backdropFilter: 'blur(10px)' }}
          >
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
            <span className="text-sm text-white/60"><span className="text-white font-semibold">48</span> reservas este mes</span>
          </div>

          {/* Main glass profile card */}
          <div
            className="absolute inset-x-0 top-8 rounded-2xl border border-white/10 p-5"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 border-2 border-white/10"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(99,102,241,0.5))' }}
              >
                M
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">María González</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-soft border border-amber-glow/40 bg-amber-wash">
                    <Zap className="h-2.5 w-2.5" /> PRO
                  </span>
                </div>
                <p className="text-white/40 text-xs mt-0.5">Psicóloga · CDMX</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['Terapia individual', 'Ansiedad', 'Parejas'].map(s => (
                <span key={s} className="px-2 py-1 rounded-md text-xs text-white/40 border border-white/8 bg-white/[0.04]">{s}</span>
              ))}
            </div>
            <div
              className="w-full py-2.5 rounded-xl text-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 16px rgba(99,51,234,0.4)' }}
            >
              Reservar cita
            </div>
          </div>

          {/* Floating notification */}
          <div
            className="absolute -bottom-2 -right-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 min-w-[210px] z-10"
            style={{ background: 'rgba(22,20,40,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base border border-green-500/30 bg-green-500/10">✓</div>
            <div>
              <p className="text-white text-xs font-semibold">Nueva reserva confirmada</p>
              <p className="text-white/35 text-[11px]">Lun 28, 10:00 AM · WhatsApp enviado</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PLACEHOLDER SECTIONS — se completan en tasks siguientes ─── */}
      <div className="h-40 flex items-center justify-center text-white/10 text-sm">... más secciones próximamente ...</div>

      {/* ─── 10. Footer (mínimo temporal) ─── */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 text-center">
        <p className="text-xs text-white/15">&copy; {new Date().getFullYear()} Aliax.io. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}
```

- [ ] **Step 2: Verificar en el dev server**

Abrir `http://localhost:5173`. Verificar:
- Nav visible con punto pulsante morado
- Hero en dos columnas (desktop)
- Glass card con efecto vidrio visible
- Notificación flotante y pill de stats posicionados correctamente
- En móvil (< 768px): solo columna izquierda, glass card oculta
- No hay errores en consola

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): nav + hero glassmorphism con glass card de perfil"
```

---

### Task 3: Landing.tsx — Stats strip + Cómo funciona

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Reemplazar el div placeholder por Stats strip + Cómo funciona**

Buscar `{/* ─── PLACEHOLDER SECTIONS` y reemplazarlo con:

```tsx
      {/* ─── 3. Stats strip ─── */}
      <div className="relative z-10 border-t border-b border-white/[0.05] bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-wrap justify-center gap-x-12 gap-y-4">
          {[
            { value: '∞', label: 'Reservas activas' },
            { value: '$0', label: 'Para siempre' },
            { value: '4', label: 'Templates únicos' },
            { value: '24/7', label: 'Tu perfil disponible' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div
                className="text-3xl text-amber-glow"
                style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '1px' }}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-white/25 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. Cómo funciona ─── */}
      <section id="como-funciona" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Proceso</p>
          <h2
            className="text-white mb-4"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px, 5vw, 52px)', letterSpacing: '2px' }}
          >
            TRES PASOS. LISTO.
          </h2>
          <p className="text-white/40 max-w-md mx-auto">De cero a recibir reservas en minutos.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              step: '01', icon: UserPlus,
              title: 'Crea tu cuenta',
              desc: 'Regístrate en segundos. Sin tarjeta, sin compromisos. Tu espacio profesional te espera.',
            },
            {
              step: '02', icon: Layers,
              title: 'Arma tu perfil',
              desc: 'Elige un template, agrega tus servicios, precios y configura tu disponibilidad semanal.',
            },
            {
              step: '03', icon: Send,
              title: 'Comparte tu link',
              desc: 'Publica tu perfil y comparte el link. Tus clientes reservan y reciben confirmación al instante.',
            },
          ].map(({ step, icon: Icon, title, desc }, i) => (
            <div key={step} className="relative text-center md:text-left group">
              {i < 2 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/10 to-transparent" />
              )}
              <div className="inline-flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-amber-wash-strong border border-amber-glow/10 flex items-center justify-center group-hover:border-amber-glow/30 transition-all duration-500">
                    <Icon className="h-7 w-7 text-amber-glow" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-mono text-amber-glow/40 font-bold">{step}</span>
                </div>
              </div>
              <h3 className="text-white font-semibold text-lg mb-3" style={{ fontFamily: 'Urbanist, sans-serif' }}>{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto md:mx-0">{desc}</p>
            </div>
          ))}
        </div>
      </section>
```

- [ ] **Step 2: Verificar en dev server**

- Stats strip visible con 4 valores en Bebas Neue morado
- Sección "Cómo funciona" con 3 pasos e íconos
- Paso 3 no menciona WhatsApp

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): stats strip + seccion como funciona actualizada"
```

---

### Task 4: Landing.tsx — Sección Directorio

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Agregar sección directorio después de "Cómo funciona"**

Inmediatamente después del cierre `</section>` de "Cómo funciona", agregar:

```tsx
      {/* ─── 5. Directorio ─── */}
      <section
        className="relative z-10 py-24"
        style={{
          background: 'linear-gradient(160deg, #06101e 0%, #080e1c 50%, #06091a 100%)',
          borderTop: '1px solid rgba(59,130,246,0.12)',
          borderBottom: '1px solid rgba(59,130,246,0.12)',
        }}
      >
        {/* Blue ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5 text-xs font-medium"
              style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)', color: '#7dd3fc' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
              Directorio público · Gratis para todos
            </div>
            <h2
              className="text-white mb-4"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px, 5vw, 52px)', letterSpacing: '2px' }}
            >
              ENCUENTRA TU{' '}
              <span style={{ background: 'linear-gradient(90deg, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                PROFESIONAL IDEAL
              </span>
            </h2>
            <p className="text-white/40 max-w-md mx-auto">
              Psicólogos, barberos, nutricionistas y más. Reserva directamente desde su perfil.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleDirectorySearch} className="flex gap-3 max-w-2xl mx-auto mb-6 flex-wrap">
            <div className="flex-[2] min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                placeholder="Profesión (ej: Psicólogo, Barbero...)"
                value={searchProf}
                onChange={e => setSearchProf(e.target.value)}
                className="w-full pl-9 pr-3 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <div className="flex-1 min-w-[130px] relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                placeholder="Ciudad"
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                className="w-full pl-9 pr-3 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
            >
              Buscar
            </button>
          </form>

          {/* Quick profession chips */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {QUICK_PROFESSIONS.map(p => (
              <button
                key={p}
                onClick={() => navigate(`/explorar?profession=${encodeURIComponent(p)}`)}
                className="px-3.5 py-1.5 rounded-full text-xs transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => {
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.4)';
                  (e.target as HTMLButtonElement).style.color = '#7dd3fc';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Profile cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {profiles.slice(0, 6).map(profile => (
              <Link
                key={profile.id}
                to={profile.slug === '#' ? '/explorar' : `/book/${profile.slug}`}
                className="block rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 no-underline"
                style={{
                  background: profile.isPro
                    ? 'linear-gradient(160deg, rgba(147,51,234,0.07) 0%, rgba(255,255,255,0.03) 100%)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${profile.isPro ? 'rgba(147,51,234,0.3)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.title}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white/10" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 border-2 border-white/10"
                      style={{ background: 'rgba(147,51,234,0.35)' }}
                    >
                      {profile.title?.[0] ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white font-semibold text-sm">{profile.title}</span>
                      {profile.isPro && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-amber-soft bg-amber-wash border border-amber-glow/40">
                          <Zap className="h-2 w-2" /> PRO
                        </span>
                      )}
                    </div>
                    <p className="text-white/35 text-xs mt-0.5">{profile.profession}</p>
                    {profile.country && (
                      <p className="text-white/25 text-[11px] mt-0.5 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />{profile.country}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-white/35 text-xs leading-relaxed mb-3 line-clamp-2">{profile.bio}</p>
                )}

                {/* Services */}
                {profile.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {profile.services.slice(0, 2).map(s => (
                      <span key={s.id} className="px-2 py-0.5 rounded-md text-[10px] text-white/35 bg-white/[0.05] border border-white/[0.07]">
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div
                  className="w-full py-2 rounded-lg text-center text-xs font-semibold"
                  style={profile.isPro
                    ? { background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', boxShadow: '0 3px 12px rgba(99,51,234,0.3)' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  {profile.isPro ? 'Reservar cita' : 'Ver perfil'}
                </div>
              </Link>
            ))}
          </div>

          {/* Ver todos */}
          <div className="text-center">
            <Link
              to="/explorar"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#7dd3fc' }}
            >
              Ver todos los profesionales →
            </Link>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Verificar en dev server**

- Sección con fondo azul/índigo diferenciado visible
- Search form funcional (al enviar redirige a /explorar con params)
- Chips de profesiones redirigen a /explorar?profession=X
- Cards reales si el API responde, o las 3 de muestra si falla
- Cards Pro con borde morado y badge ⚡ PRO

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): seccion directorio con fetch real y fallback estatico"
```

---

### Task 5: Landing.tsx — Sección Features

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Agregar sección features después del cierre `</section>` del directorio**

```tsx
      {/* ─── 6. Features ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Por qué Aliax</p>
          <h2
            className="text-white mb-4"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px, 5vw, 52px)', letterSpacing: '2px' }}
          >
            TODO LO QUE NECESITAS
          </h2>
          <p className="text-white/40 max-w-lg mx-auto">
            Herramientas para profesionales independientes. Las más poderosas, reservadas para Pro.
          </p>
        </div>

        {/* Pro features — 4 cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            {
              icon: Bell,
              title: 'WhatsApp al instante',
              desc: 'Notificaciones automáticas para ti y tus clientes. Sin no-shows.',
              accent: 'from-emerald-500/20 to-teal-500/20',
              border: 'hover:border-emerald-500/30',
              iconColor: 'text-emerald-400',
              iconBg: 'bg-emerald-500/10',
            },
            {
              icon: Image,
              title: 'Portfolio de fotos',
              desc: 'Hasta 20 fotos por servicio. Muestra tu trabajo como se merece.',
              accent: 'from-amber-500/20 to-orange-500/20',
              border: 'hover:border-amber-500/30',
              iconColor: 'text-amber-400',
              iconBg: 'bg-amber-500/10',
            },
            {
              icon: BarChart2,
              title: 'Analytics y tendencias',
              desc: 'Descubre qué servicios te dejan más. Toma decisiones con datos.',
              accent: 'from-blue-500/20 to-indigo-500/20',
              border: 'hover:border-blue-500/30',
              iconColor: 'text-blue-400',
              iconBg: 'bg-blue-500/10',
            },
            {
              icon: Globe,
              title: 'Directorio destacado',
              desc: 'Aparece primero en el directorio. Los clientes te encuentran en Google.',
              accent: 'from-violet-500/20 to-fuchsia-500/20',
              border: 'hover:border-violet-500/30',
              iconColor: 'text-violet-400',
              iconBg: 'bg-violet-500/10',
            },
          ].map(({ icon: Icon, title, desc, accent, border, iconColor, iconBg }) => (
            <div
              key={title}
              className={`group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-500 hover:bg-white/[0.04] hover:-translate-y-1 ${border}`}
            >
              {/* Pro badge */}
              <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-amber-soft bg-amber-wash border border-amber-glow/30">
                PRO
              </div>
              {/* Hover glow */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`inline-flex p-2.5 rounded-xl ${iconBg} ${iconColor} mb-4`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-white font-semibold mb-2" style={{ fontFamily: 'Urbanist, sans-serif' }}>{title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Free features — 3 small cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Shield, label: 'Perfil público con link único' },
            { icon: Star, label: 'Reservas ilimitadas · siempre gratis' },
            { icon: Bell, label: 'Notificaciones por email incluidas' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 text-sm text-white/35">
              <Icon className="h-4 w-4 text-amber-glow/40 shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </section>
```

- [ ] **Step 2: Verificar en dev server**

- 4 cards Pro con badge PRO en esquina superior derecha
- 3 cards Free sin badge, más discretas
- Hover glow funciona en cards Pro

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): seccion features con 4 forzadores Pro + 3 free"
```

---

### Task 6: Landing.tsx — Sección Pricing

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Agregar sección pricing después del cierre `</section>` de features**

```tsx
      {/* ─── 7. Pricing ─── */}
      <section
        className="relative z-10 py-24"
        style={{ background: 'linear-gradient(160deg, #080414 0%, #0e0920 50%, #080414 100%)' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(147,51,234,0.1) 0%, transparent 65%)' }} />

        <div className="relative max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-5 text-amber-soft bg-amber-wash border border-amber-glow/20">
              Planes
            </div>
            <h2
              className="text-white mb-4"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: 1 }}
            >
              EMPIEZA GRATIS.<br />
              <span className="text-amber-glow">CRECE</span> CUANDO QUIERAS.
            </h2>
            <p className="text-white/40 max-w-sm mx-auto">
              Tu perfil y tus reservas son siempre gratis. Activa Pro cuando necesites más.
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-5 mb-8">

            {/* Free */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
              <div className="flex items-center gap-2 mb-4 text-white/40 text-xs font-bold uppercase tracking-widest">
                🎁 &nbsp;Gratuito
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span
                  className="text-white"
                  style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '52px', letterSpacing: '1px', lineHeight: 1 }}
                >
                  $0
                </span>
              </div>
              <p className="text-white/30 text-sm mb-5">Para siempre · Sin tarjeta</p>
              <div className="h-px bg-white/[0.07] mb-5" />
              <ul className="space-y-3 mb-6">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                    <Check className="h-4 w-4 text-[#6b63ff] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => user ? navigate('/dashboard') : navigate('/register')}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-amber-soft transition-colors hover:bg-amber-wash-strong"
                style={{ border: '1px solid rgba(107,99,255,0.4)', background: 'transparent', fontFamily: 'Urbanist, sans-serif' }}
              >
                {user ? 'Ir al dashboard' : 'Crear cuenta gratis'}
              </button>
            </div>

            {/* Pro */}
            <div
              className="rounded-2xl p-7 relative"
              style={{ background: 'linear-gradient(135deg, rgba(107,99,255,0.12) 0%, rgba(147,51,234,0.08) 100%)', border: '1.5px solid rgba(107,99,255,0.4)' }}
            >
              <div
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap"
                style={{ background: 'linear-gradient(90deg, #6b63ff, #9333ea)' }}
              >
                RECOMENDADO
              </div>
              <div className="flex items-center gap-2 mb-4 text-amber-soft text-xs font-bold uppercase tracking-widest">
                ⚡ &nbsp;Pro
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-white/50 text-xl font-bold self-start mt-2">$</span>
                <span
                  className="text-white"
                  style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '52px', letterSpacing: '1px', lineHeight: 1 }}
                >
                  9
                </span>
                <span className="text-white/40 text-base">USD / mes</span>
              </div>
              <p className="text-white/40 text-sm mb-5">Todo lo del plan gratuito, más:</p>
              <div className="h-px bg-white/[0.07] mb-5" />
              <ul className="space-y-3 mb-6">
                {PRO_FEATURES.map(f => (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm text-white/60">
                    <Check className="h-4 w-4 text-[#9333ea] flex-shrink-0 mt-0.5" />
                    <span>
                      {f.text}
                      {f.highlight && (
                        <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-soft bg-amber-wash border border-amber-glow/30 align-middle">
                          PRO
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {isPro ? (
                <div className="w-full py-3.5 rounded-xl text-sm font-bold text-center text-amber-soft bg-amber-wash">
                  ✓ Ya tienes Pro activo
                </div>
              ) : (
                <button
                  onClick={handleStripe}
                  disabled={loadingStripe}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #6b63ff, #9333ea)', boxShadow: '0 6px 24px rgba(107,99,255,0.35)', fontFamily: 'Urbanist, sans-serif' }}
                >
                  {loadingStripe ? 'Redirigiendo...' : 'Activar Pro — $9/mes'}
                </button>
              )}
              <p className="text-center text-xs text-white/25 mt-2">Cancela en cualquier momento</p>
            </div>
          </div>

          {/* Coupon strip */}
          <div
            className="flex items-center gap-4 rounded-2xl px-5 py-4"
            style={{ background: 'rgba(240,168,48,0.07)', border: '1px solid rgba(240,168,48,0.2)' }}
          >
            <span className="text-2xl flex-shrink-0">🏷️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-200 mb-1">Descuento de lanzamiento — 20% off por 12 meses</p>
              <p className="text-xs text-white/35">Solo $7.20 USD/mes el primer año. Máximo 20 canjes. Caduca 5 Jun 2026.</p>
            </div>
            <div
              className="flex-shrink-0 px-4 py-2 rounded-xl text-yellow-200 font-bold text-lg"
              style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '2px', background: 'rgba(240,168,48,0.15)', border: '1px solid rgba(240,168,48,0.3)' }}
            >
              CONFIANZA20
            </div>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Verificar en dev server**

- Título en Bebas Neue mayúsculas con "CRECE" en morado
- Card Free con botón correcto según estado de auth
- Card Pro con lógica: usuario no auth → /register, no Pro → Stripe checkout, Pro → mensaje "Ya tienes Pro activo"
- Strip del cupón CONFIANZA20 visible

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): seccion pricing embebida con logica Stripe y cupon CONFIANZA20"
```

---

### Task 7: Landing.tsx — Templates + CTA Final + Footer

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Agregar las 3 secciones finales, reemplazando el footer temporal**

Buscar el footer temporal `{/* ─── 10. Footer (mínimo temporal)` y reemplazar con:

```tsx
      {/* ─── 8. Templates ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-glow/60 font-semibold mb-4">Apariencia</p>
          <h2
            className="text-white mb-4"
            style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px, 5vw, 52px)', letterSpacing: '2px' }}
          >
            TU COLOR. TU IDENTIDAD.
          </h2>
          <p className="text-white/40 max-w-md mx-auto">
            Elige el color de tu perfil con un clic. Cuatro paletas diseñadas para destacar.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Minimalist', gradient: 'linear-gradient(160deg,#2d2b6e,#4c46a8)', accent: 'rgb(107,99,255)', pro: false },
            { name: 'Bold', gradient: 'linear-gradient(160deg,#3d2f00,#7a5f00)', accent: 'rgb(222,182,7)', pro: false },
            { name: 'Elegant', gradient: 'linear-gradient(160deg,#0c3d5e,#1b6fa8)', accent: 'rgb(62,153,201)', pro: true },
            { name: 'Creative', gradient: 'linear-gradient(160deg,#500650,#9d1fa8)', accent: 'rgb(217,72,240)', pro: true },
          ].map(t => (
            <div key={t.name} className="group rounded-2xl border border-white/[0.05] overflow-hidden hover:border-white/15 transition-all duration-500 hover:-translate-y-1 relative">
              {t.pro && (
                <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-soft bg-amber-wash border border-amber-glow/30">
                  PRO
                </div>
              )}
              <div style={{ background: t.gradient }} className="p-5 h-44 flex flex-col items-center justify-between">
                <div className="flex flex-col items-center gap-2 pt-2">
                  <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40" />
                  <div className="text-white text-xs font-semibold opacity-90">Profesional</div>
                  <div className="text-white/60 text-[10px]">Especialidad</div>
                </div>
                <div className="h-7 w-24 rounded-lg text-white text-[10px] font-semibold flex items-center justify-center" style={{ background: t.accent }}>
                  Reservar
                </div>
              </div>
              <div className="bg-white/[0.03] px-5 py-4 flex items-center justify-between">
                <div className="text-white text-sm font-medium" style={{ fontFamily: 'Urbanist, sans-serif' }}>{t.name}</div>
                <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ background: t.accent }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 9. CTA Final ─── */}
      <section className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-20" />
        </div>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative">
            <div className="hidden sm:block absolute inset-0 -top-20 mx-auto w-96 h-96 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.08) 0%, transparent 70%)' }} />
            <h2
              className="relative text-white mb-6"
              style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(44px, 6vw, 68px)', letterSpacing: '2px', lineHeight: 1.05 }}
            >
              TU PRÓXIMO CLIENTE<br />
              <span style={{ background: 'linear-gradient(95deg, #a855f7, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                TE ESTÁ BUSCANDO
              </span>
            </h2>
            <p className="relative text-white/40 max-w-md mx-auto mb-10 text-lg">
              Crea tu perfil hoy. Es gratis para siempre.
            </p>
            <Link
              to="/register"
              className="relative inline-flex items-center gap-2 px-8 py-4 text-white font-bold rounded-full transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                boxShadow: '0 6px 40px rgba(99,51,234,0.45)',
                fontFamily: 'Urbanist, sans-serif',
                fontSize: '16px',
              }}
            >
              Crear perfil gratis →
            </Link>
            <p className="relative mt-4 text-xs text-white/25">Sin tarjeta de crédito · Cancela cuando quieras</p>
          </div>
        </div>
      </section>

      {/* ─── 10. Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-glow/50" />
            <span className="text-sm text-white/20 font-semibold" style={{ fontFamily: 'Urbanist, sans-serif' }}>Aliax.io</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/20">
            <Link to="/explorar" className="hover:text-white/50 transition-colors">Explorar profesionales</Link>
            <Link to="/pricing" className="hover:text-white/50 transition-colors">Precios</Link>
            <Link to="/login" className="hover:text-white/50 transition-colors">Iniciar sesión</Link>
            <Link to="/register" className="hover:text-white/50 transition-colors">Registrarse</Link>
            <Link to="/privacy" className="hover:text-white/50 transition-colors">Privacidad</Link>
          </div>
          <p className="text-xs text-white/15">&copy; {new Date().getFullYear()} Aliax.io.</p>
        </div>
      </footer>
```

- [ ] **Step 2: Verificar en dev server — revisión completa de toda la landing**

Revisar en orden:
1. Nav — punto pulsante, links correctos
2. Hero — dos columnas, glass card, notificación flotante
3. Stats strip — 4 valores en Bebas Neue
4. Cómo funciona — 3 pasos, paso 3 sin mencionar WhatsApp
5. Directorio — fondo azul, búsqueda funcional, chips, cards
6. Features — 4 Pro + 3 Free
7. Pricing — Free $0 y Pro $9, cupón CONFIANZA20
8. Templates — Elegant y Creative con badge PRO
9. CTA Final — Bebas Neue, gradiente verde/morado
10. Footer — todos los links

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): templates con badge Pro, CTA final y footer completo"
```

---

### Task 8: Responsive móvil + OG tags + Deploy

**Files:**
- Modify: `frontend/index.html` (OG tags)
- Verify: `frontend/src/pages/Landing.tsx` (responsive)

- [ ] **Step 1: Verificar responsive en móvil (< 768px)**

En DevTools (Chrome), activar vista móvil (375px). Verificar:
- Nav: el link "Explorar profesionales" puede estar oculto en pantallas muy pequeñas — si la barra se rompe, reducir a solo mostrar "Precios" y los dos botones en mobile (los otros links opcionales). Ajustar con clase `hidden sm:inline` si es necesario.
- Hero: una sola columna, glass card no visible (`hidden md:block` ya aplicado)
- Stats strip: `flex-wrap` permite que los 4 stats se acomoden
- Directorio: grid de 1 columna en mobile (`sm:grid-cols-2`)
- Features: grid de 2 columnas en mobile para Pro cards
- Pricing: una sola columna (`md:grid-cols-2`)
- Templates: 2 columnas en mobile (`grid-cols-2`)

Si algún elemento se desborda, agregar `overflow-x-hidden` o ajustar paddings.

- [ ] **Step 2: Actualizar OG tags en index.html**

Buscar y actualizar:
```html
<title>Aliax.io — Tu agenda profesional, sin caos</title>
<meta name="description" content="Crea tu perfil profesional, publica tus servicios y recibe reservas automáticas. Gratis para siempre. Con directorio público para encontrar profesionales." />
<meta property="og:title" content="Aliax.io — Tu agenda profesional, sin caos" />
<meta property="og:description" content="Crea tu perfil, publica tus servicios y recibe reservas. Gratis para siempre." />
```

- [ ] **Step 3: Commit final**

```bash
git add frontend/src/pages/Landing.tsx frontend/index.html
git commit -m "fix(landing): responsive movil y og tags actualizados"
```

- [ ] **Step 4: Deploy a producción**

```bash
cd "Mis proyectos/aura" && vercel --prod
```

Confirmar `www.aliax.io` mostrando la nueva landing. Revisar en móvil real si es posible.

---

## Checklist de cobertura del spec

| Requisito del spec | Tarea |
|---|---|
| Bebas Neue + Urbanist | Task 1 |
| Nav con punto pulsante | Task 2 |
| Hero dos columnas + glass card | Task 2 |
| Badge "Gratis para siempre" | Task 2 |
| CTA "Crear mi perfil gratis" | Task 2 |
| CTA secundario "Explorar directorio" | Task 2 |
| Stats strip con 4 valores | Task 3 |
| Cómo funciona - paso 3 sin WhatsApp | Task 3 |
| Sección Directorio con fondo azul | Task 4 |
| Fetch real + fallback estático | Task 4 |
| Cards Pro primero con badge y glow | Task 4 |
| Search form → /explorar?params | Task 4 |
| Chips → /explorar?profession=X | Task 4 |
| Features: 4 Pro + 3 Free | Task 5 |
| Badge PRO en cards Pro | Task 5 |
| Pricing embebido en landing | Task 6 |
| Título Bebas Neue mayúsculas | Task 6 |
| Labels PRO inline en Pro features | Task 6 |
| Lógica Stripe (no auth/no Pro/Pro activo) | Task 6 |
| Cupón CONFIANZA20 visible | Task 6 |
| Templates con badge PRO en Elegant/Creative | Task 7 |
| CTA Final copy actualizado | Task 7 |
| Footer con todos los links | Task 7 |
| Responsive móvil | Task 8 |
| OG tags actualizados | Task 8 |
| Deploy | Task 8 |
