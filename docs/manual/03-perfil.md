# Módulo: Perfil Profesional

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/ProfileCreate.tsx` | Crear perfil por primera vez |
| `frontend/src/pages/ProfileEditor.tsx` | Editar perfil existente |
| `frontend/src/pages/PublicProfile.tsx` | Vista pública del perfil |
| `frontend/src/components/templates/MinimalistTemplate.tsx` | Template visual del perfil |
| `frontend/src/schemas/profileSchema.ts` | Validación Zod + listas PROFESSIONS |
| `backend/src/routes/profiles.ts` | CRUD de perfiles |

---

## Crear Perfil (`/profile/new`)

### Campos del formulario

| Campo | Requerido | Notas |
|-------|-----------|-------|
| URL del perfil (slug) | ✅ | Solo a-z, 0-9, guiones. Ej: `aliax.io/maria-garcia` |
| Nombre completo | ✅ | Aparece como título en el perfil público |
| Profesión | ✅ | Dropdown con 5 opciones (ver abajo) |
| Enfoque o Modelo terapéutico | — | Multi-select, 26 opciones |
| Especialidad | — | Texto libre |
| Años de experiencia | — | Número |
| País | — | Selector con portal (escapa overflow) |
| Ciudad | — | Selector dinámico por país |
| Biografía | — | Máx 500 caracteres |
| WhatsApp / Teléfono | — | Con selector de código de país |
| Foto de perfil | — | Subida a Cloudinary |
| Template | — | Minimalist (gratis) o Premium (Pro/override) |
| Publicar inmediatamente | — | Checkbox, default: true |

### PROFESSIONS (lista canónica)
```
Psicólogo/a · Psicoterapeuta · Psiquiatra · Neuropsicólogo/a · Trabajador/a Social
```
Definida en `frontend/src/schemas/profileSchema.ts`. Debe sincronizarse con `AccountSettings.tsx`.

### THERAPEUTIC_APPROACHES (26 enfoques)
```
Cognitivo-conductual (TCC), Mindfulness / ACT, Terapia de aceptación y compromiso,
Terapia esquemática, Psicoanalítico, Psicodinámico, Psicología del self,
Humanista, Gestalt, Existencial, Logoterapia, Psicología positiva,
Sistémico, Narrativo, Terapia breve centrada en soluciones (TBCS),
Breve estratégico, Constelaciones familiares, Terapia de pareja,
Terapia familiar, Terapia infantil, Terapia de juego,
EMDR, Integrativo, Hipnosis ericksoniana, Psicodrama, Otro
```

### Tema visual
ProfileCreate detecta `localStorage.aliax_theme` y `localStorage.aliax_accent` para aplicar el tema correcto. Soporta modo oscuro y claro completamente.

---

## Editar Perfil (`/profile/edit/:id`)

ProfileEditor tiene más campos que ProfileCreate:

- Colores primarios del perfil (con ProGate para colores premium)
- Sección "Perfil terapéutico" (solo si la profesión es salud mental)
  - Enfoques terapéuticos
  - Problemáticas que trabaja
  - Poblaciones con las que trabaja
  - Modalidad (presencial, online, ambas)
  - Precio por sesión + moneda + duración
  - Idiomas
  - ¿Acepta factura?
  - Estilo de trabajo (texto libre, máx 1000 chars)
- Cédula / Matrícula Profesional
- Universidad y grado

---

## Templates de Perfil

| Template | Plan |
|----------|------|
| Minimalist | Free (siempre disponible) |
| Bold | Pro o override `templates_premium` |
| Elegant | Pro o override `templates_premium` |
| Creative | Pro o override `templates_premium` |
| Carbono | Pro o override `templates_premium` |

En ProfileCreate y ProfileEditor, los botones de template Premium muestran 🔒 y están deshabilitados para usuarios sin acceso.

---

## Perfil Público (`/:slug`)

La ruta `/:slug` carga el perfil público del profesional. Muestra:
- Foto, nombre, profesión, especialidad, bio
- Servicios activos con precios
- Formulario de reserva (BookingForm)
- Redes sociales
- Template seleccionado (MinimalistTemplate u otros)

**Nota:** La ruta `/:slug` es la ÚLTIMA en el router de React para no entrar en conflicto con rutas como `/dashboard`, `/pricing`, etc.

---

## API Endpoints

```
GET    /api/profiles         → Mis perfiles (auth requerido)
POST   /api/profiles         → Crear perfil
PUT    /api/profiles/:id     → Actualizar perfil
DELETE /api/profiles/:id     → Eliminar perfil
GET    /api/profiles/:slug   → Perfil público (sin auth)
```

### Campos enviados al crear/actualizar
```json
{
  "slug": "maria-garcia",
  "title": "Dra. María García",
  "profession": "Psicoterapeuta",
  "therapeuticApproaches": ["Cognitivo-conductual (TCC)", "Gestalt"],
  "specialty": "Terapia de pareja",
  "yearsExperience": 8,
  "country": "México",
  "city": "Ciudad de México",
  "bio": "...",
  "phone": "+525512345678",
  "template": "MINIMALIST",
  "published": true,
  "avatar": "https://cloudinary.com/..."
}
```
