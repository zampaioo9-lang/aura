# Módulo: Mi Cuenta (AccountSettings)

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/AccountSettings.tsx` | Configuración completa de la cuenta |

---

## Uso

AccountSettings puede usarse de dos formas:
1. **Como pestaña del Dashboard** — `<AccountSettings asTab tabIsDark={...} />`
2. **Como página independiente** — ruta `/account`

---

## Secciones

### 1. Datos Personales
- Nombre completo
- Bio personal (max 500 chars)
- Email (con verificación de disponibilidad)
- Cambio de contraseña (requiere contraseña actual)

### 2. WhatsApp / Teléfono
- Número que recibe notificaciones de citas
- Link de verificación rápida a wa.me/...

### 3. Redes Sociales
- Facebook (URL completa)
- Instagram (@usuario)
- LinkedIn (URL de perfil)

### 4. Perfil Profesional *(solo para profesionales)*

Aparece solo si el usuario tiene al menos un perfil creado. Edita directamente el primer perfil activo.

| Campo | Tipo |
|-------|------|
| Profesión | Dropdown (mismas 5 opciones que ProfileCreate) |
| Cédula / Matrícula | Texto libre |
| Enfoque o Modelo terapéutico | Multi-select (26 enfoques) |
| Especialidad | Texto libre |
| Años de experiencia | Número |
| País | CountrySelect con portal |
| Ciudad | CitySelect dinámico |

### 5. País y Ciudad
Separados de la sección profesional para usuarios sin perfil.

---

## Listas Hardcodeadas en AccountSettings

**PROFESSIONS** — array local en `AccountSettings.tsx`:
```
Psicólogo/a · Psicoterapeuta · Psiquiatra · Neuropsicólogo/a · Trabajador/a Social
```

**THERAPEUTIC_APPROACHES** — array local en `AccountSettings.tsx`:
```
(26 enfoques, mismo que ProfileCreate.tsx)
```

⚠️ Si se modifica una lista, actualizar **ambos** archivos (`AccountSettings.tsx` Y `ProfileCreate.tsx`).

---

## Guardado

AccountSettings guarda los datos del perfil (no de la cuenta de usuario) llamando a `PUT /api/profiles/:id` cuando detecta que hay un `primaryProfile`. Los datos de usuario (nombre, email, etc.) se guardan en `PATCH /api/auth/me`.

El callback `onProfileSaved` permite al Dashboard refrescar la lista de perfiles (importante para `isPairTherapist`).

---

## Tema Visual

AccountSettings detecta `tabIsDark` cuando se usa como tab del Dashboard, y computa `accentHex` desde `localStorage.aliax_accent` para aplicar colores consistentes con el resto del dashboard.

Los componentes internos reciben:
- `isDark: boolean`
- `accentRgb: string` → pasado como `accent` a CountrySelect y PhoneInput
