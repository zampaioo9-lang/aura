# 2026-05-10 — Rediseño /book/:slug — Dark Glass

## Lo que se hizo

### BookingPage.tsx — rediseño completo

- Fondo dark: `linear-gradient(135deg, #080414, #0e0920, #080414)` + 2 orbs de luz difusa (radial-gradient)
- Botón "← Volver" (ArrowLeft de lucide) en la parte superior
- **Card del profesional** (glass card con blur):
  - Avatar circular con borde morado, o initials si no hay foto
  - Nombre (`profile.title`), profesión en `rgba(167,139,250,0.85)`
  - Badges: especialidad, country (con ícono MapPin), yearsExperience (con ícono Award)
- **Tarjetas de servicio** inline (no usa ServiceCard — ese queda solo para el dashboard):
  - Fondo glass oscuro con hover morado
  - Precio en `#a78bfa`
  - Botón "Reservar" con `linear-gradient(135deg, #6b63ff, #9333ea)`
- Pantallas de loading, error, y éxito también en dark
- CSS separado: `BookingPage.css` (no poluciona Landing.css)

### BookingForm.tsx — modal dark glass

- Overlay: `rgba(0,0,0,0.72)` + `backdropFilter: blur(4px)`
- Card: `rgba(12,9,28,0.97)` con blur 24px y borde `rgba(255,255,255,0.1)`
- Botón ✕ para cerrar en esquina superior derecha
- Inputs: fondo `rgba(255,255,255,0.06)`, borde morado al focus
- `colorScheme: 'dark'` en el date picker
- Slots de horario: dark idle + degradado púrpura al seleccionar
- PhoneInput con prop `isDark` (ya soportado)
- Botón "Confirmar" en degradado púrpura; "Cancelar" en ghost dark

### BookingPage.css — nuevo archivo

- Clases: `bp-wrap`, `bp-orb-1/2`, `bp-content`, `bp-back`
- `bp-pro-card`, `bp-avatar`, `bp-avatar-initials`, `bp-pro-name`, `bp-pro-profession`, `bp-pro-tags`, `bp-tag`
- `bp-services-title`, `bp-svc-card`, `bp-svc-name`, `bp-svc-meta`, `bp-svc-desc`, `bp-svc-right`, `bp-svc-price`, `bp-svc-btn`
- `bp-fullscreen`, `bp-success-card`, `bp-success-icon`, `bp-success-title`, `bp-success-sub`, `bp-success-btn`

### Login.tsx + Register.tsx — campo contraseña

- Añadido toggle "Ver contraseña" con íconos `Eye` / `EyeOff` (lucide-react)
- Input envuelto en `<div className="relative">` con botón absoluto a la derecha
- `type` alterna entre `"password"` y `"text"` según estado `showPassword`
- `tabIndex={-1}` en el botón para no interrumpir flujo de teclado
- `pr-10` en el input para que el texto no se tape con el ícono

### Register.tsx — textos actualizados (modelo freemium)

- Badge: `"14 días gratis · Sin tarjeta de crédito"` → `"Plan gratuito · Sin tarjeta de crédito"`
- Título: `"Empieza tu prueba gratuita"` → `"Crea tu cuenta gratis"`
- Subtítulo: `"Acceso completo durante 14 días, sin compromisos."` → `"Empieza a recibir reservas hoy, sin costo."`
- Botón: `"Comenzar prueba gratis"` → `"Crear cuenta gratis"`

## Estado

- Todo desplegado en producción (aliax.io)
- TypeScript limpio en todos los builds
