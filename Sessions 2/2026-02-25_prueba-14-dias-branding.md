# Sesión 2026-02-25 (noche) — Prueba 14 días y branding Aliax.io

## Resumen
Implementación del mensaje de prueba gratuita de 14 días en landing, registro y dashboard. Corrección de branding (Aura → Aliax.io) y ajuste de los círculos de apariencia a color sólido.

---

## Cambios realizados

### 1. Corrección branding: Aura → Aliax.io
- `Login.tsx`: logo/link de "Aura" → "Aliax.io"
- `Register.tsx`: logo/link de "Aura" → "Aliax.io"

### 2. Dots de apariencia — color sólido
- Dashboard dot buttons: `background: t.accent` (revertido desde `t.darkGradient`)
- El gradiente queda solo para las tarjetas de la landing y el fondo del perfil mobile

### 3. Landing — CTA de prueba gratuita
- **Badge hero**: "Plataforma profesional todo-en-uno" → "14 días gratis · Sin tarjeta de crédito"
- **Botón hero**: "Comenzar gratis" → "Probar gratis 14 días"
- **Nota de confianza** debajo de los botones del hero: "Sin tarjeta de crédito · Cancela cuando quieras"
- **Botón CTA final**: "Crear mi perfil gratis" → "Empezar prueba gratis · 14 días"
- **Nota de confianza** debajo del CTA final (misma línea)

### 4. Register — Enfoque en prueba gratuita
- Badge encima del formulario: "✦ 14 días gratis · Sin tarjeta de crédito" (fondo indigo-50)
- Título: "Crear Cuenta" → "Empieza tu prueba gratuita"
- Subtexto: "Acceso completo durante 14 días, sin compromisos."
- Botón submit: "Crear Cuenta" → "Comenzar prueba gratis" / "Creando cuenta..."

### 5. Dashboard — Banner de prueba en tab Profesional (sin perfil)
Reemplazó el empty state minimalista por un banner convincente:
- Badge con color de acento: "⚡ Prueba gratuita · 14 días"
- Título: "Activa tu perfil profesional"
- Descripción: menciona sin tarjeta y cancelación libre
- Lista de 4 beneficios con ✓:
  - Perfil público con URL personalizada
  - Gestión de servicios y precios
  - Reservas online + notificaciones por WhatsApp
  - Selector de apariencia y colores
- Botón: "Crear mi perfil gratis" → `/profile/new`
- Nota de confianza al pie
- Importado `Zap` desde lucide-react en Dashboard.tsx

---

## Archivos modificados
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/Landing.tsx`
- `frontend/src/pages/Dashboard.tsx`

---

## Despliegues
- Frontend: `npx vercel --prod` → `https://www.aliax.io`
