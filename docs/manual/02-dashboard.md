# Módulo: Dashboard

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/Dashboard.tsx` | Panel principal del profesional |
| `frontend/src/pages/AccountSettings.tsx` | Tab "Mi cuenta" dentro del dashboard |
| `frontend/src/pages/Pacientes.tsx` | Tab "Pacientes" |

---

## Layout

El Dashboard tiene dos layouts:

**Desktop:** Sidebar izquierdo fijo + panel de contenido flotante con bordes redondeados.

**Móvil:** Bottom navigation bar + contenido a pantalla completa.

---

## Tabs del Dashboard

| Tab | ID | Descripción |
|-----|-----|------------|
| Inicio | `inicio` | Resumen de actividad, reservas recientes, analytics, CTA para crear perfil |
| Mis Citas | `citas` | Lista de reservas pendientes, confirmadas, historial |
| Reseñas | `resenas` | Valoraciones de clientes (en desarrollo) |
| Configurar Agenda | `agenda` | Embed de SchedulingConfig/SchedulingPanel |
| Pacientes | `pacientes` | Módulo de gestión de pacientes |
| Mi Cuenta | `cuenta` | AccountSettings como tab embebido |

---

## Sidebar

El sidebar izquierdo contiene:

1. **Avatar del profesional** — clickeable para subir foto (Cloudinary)
2. **Nombre y plan** (Free/Pro badge)
3. **Navegación por sección**
4. **Mi Perfil** → Link a perfil público
5. **Preferencias** → Selector de color de tema (7 opciones)
6. **Ver planes** → Link a /pricing
7. **Cerrar sesión**

### Selector de Color (Preferencias)

7 círculos de color en una fila. Los colores Pro muestran un 🔒 badge en la esquina inferior derecha. Si el usuario no es Pro (y no tiene `featureOverrides.colores_premium`), no puede seleccionar colores Pro y el sistema resetea a aguamarina automáticamente.

---

## Tab Inicio

Muestra:
- Saludo con el nombre del profesional
- **CTA para crear perfil** (si no tiene ninguno) — botón enlaza a `/profile/new`
- Grid de 4 stats: Reservas pendientes+confirmadas, Completadas, Servicios, Perfiles
- **Analytics de reservas** (últimas 10) — visible para todos
- Lista de reservas confirmadas próximas
- Si tiene perfil: card con link a perfil público + botón de copiar URL

---

## Temas de Color

Los temas se computan en Dashboard y se pasan como objeto `C` (Colors) a todos los sub-componentes:

```typescript
const C = {
  sideBg, navBg, mainBg, tabsBg,
  border, cardBg, cardShadow,
  text, muted, accent, accentLight,
  isDark: boolean
};
```

`accentTheme.darkGradient` se usa como fondo del shell completo en modo oscuro.

---

## Módulos Protegidos por Plan

Desde Dashboard se pasan los flags de acceso a los componentes hijos:

```typescript
// Pacientes recibe isPro OR override
<Pacientes isPro={(isPro ?? false) || canPacientes} />

// Colores: Pro circle se desbloquea si canColoresPremium
const isLocked = t.pro && !canColoresPremium;

// Analytics: siempre visible, solo el upsell link cambia
```

Ver `docs/manual/08-admin-control.md` para detalle de feature overrides.

---

## Flujo de Perfil

Si el usuario no tiene ningún perfil:
- Tab Inicio muestra una card CTA
- Sidebar móvil muestra botón "+Perfil"
- Todos enlazan a `/profile/new` → carga `ProfileCreate`

Si ya tiene perfil:
- `/profile/new` → `ProfileCreate` (para crear uno adicional)
- `/profile/edit/:id` → `ProfileEditor`
