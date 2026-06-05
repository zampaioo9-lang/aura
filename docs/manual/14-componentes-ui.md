# Componentes UI Compartidos

## Ubicación
`frontend/src/components/`

---

## CountrySelect / CitySelect

Selectores de país y ciudad con **portal** (escapa overflow de contenedores con `overflow: hidden`).

```tsx
<CountrySelect
  value={country}
  onChange={setCountry}
  isDark={C.isDark}
  accent={C.accent}
/>

<CitySelect
  country={country}      // ISO2 del país seleccionado
  value={city}
  onChange={setCity}
  isDark={C.isDark}
  accent={C.accent}
/>
```

- `isDark` — adapta el estilo al tema oscuro
- `accent` — color de acento del tema actual
- CitySelect requiere `country` para cargar las ciudades correspondientes

---

## PhoneInput

Input de teléfono con selector de código de país.

```tsx
<PhoneInput
  value={phone}
  onChange={setPhone}
  isDark={C.isDark}
  accent={C.accent}
/>
```

---

## ProGate

Componente que bloquea contenido Pro y muestra un CTA de upgrade.

```tsx
// Bloquea si no tiene plan Pro Y no tiene el override
<ProGate feature="agenda" isPro={isPro} featureOverrides={featureOverrides}>
  <SchedulingConfig />
</ProGate>
```

Muestra un banner con candado y botón "Ver planes" si el acceso está bloqueado.

---

## useFeature Hook

```typescript
import { useFeature } from '../hooks/useFeature';

const canAccessHC = useFeature('historia_clinica');
// true si isPro=true O featureOverrides.historia_clinica=true
```

---

## Temas de Color (accentThemes)

Sistema de temas definido en el Dashboard. El objeto `C` (Colors) se pasa como prop a todos los sub-componentes.

### Estructura del objeto C
```typescript
const C = {
  sideBg: string,      // Fondo sidebar
  navBg: string,       // Fondo nav móvil
  mainBg: string,      // Fondo contenido principal
  tabsBg: string,      // Fondo de pestañas
  border: string,      // Color de bordes
  cardBg: string,      // Fondo de tarjetas
  cardShadow: string,  // Sombra de tarjetas
  text: string,        // Color de texto principal
  muted: string,       // Texto secundario
  accent: string,      // Color de acento (botones, íconos activos)
  accentLight: string, // Acento con opacidad baja
  isDark: boolean,     // ¿Modo oscuro?
};
```

### Temas disponibles

| Clave | Nombre | Plan |
|-------|--------|------|
| `teal` | Aguamarina | Free (default) |
| `ocean` | Océano | Free |
| `emerald` | Esmeralda | Pro |
| `violet` | Violeta | Pro |
| `rose` | Rosa | Pro |
| `amber` | Ámbar | Pro |
| `slate` | Pizarra | Pro |

Los temas Pro muestran 🔒 en el selector del sidebar. Si el usuario no tiene acceso y selecciona uno Pro, se resetea a `teal` automáticamente.

---

## WizardAccentContext

Context que proporciona tokens de color a los componentes del wizard de Historia Clínica.

```typescript
// frontend/src/components/patients/WizardAccentContext.ts
const { accent, accentLight, isDark } = useWizardAccent();
```

Se inicializa en `PatientWizard` y `CoupleWizard` con los valores del tema activo del profesional.

---

## MinimalistTemplate

Template principal del perfil público. Acepta todos los datos del perfil y los renderiza con diseño limpio.

```tsx
<MinimalistTemplate
  profile={profile}
  services={services}
  accentColor={profile.primaryColor}
  isDark={profile.isDarkMode}
  onBooking={(service) => openBookingModal(service)}
/>
```

---

## Componentes de Availability

En `frontend/src/components/availability/`:

| Componente | Descripción |
|-----------|-------------|
| `WeeklySchedule.tsx` | Selector de horarios por día de la semana |
| `DatePicker.tsx` | Calendario para seleccionar fechas |
| `TimeSlotPicker.tsx` | Lista de slots de hora disponibles |
| `BlockDateForm.tsx` | Formulario para bloquear fechas |
