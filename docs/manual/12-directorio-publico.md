# Módulo: Directorio Público y Páginas Públicas

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/Landing.tsx` | Página principal (home) |
| `frontend/src/pages/Explorar.tsx` | Directorio con filtros avanzados |
| `frontend/src/pages/PsicologosDirectory.tsx` | Directorio SEO-friendly por país/ciudad/enfoque |
| `frontend/src/pages/PublicProfile.tsx` | Perfil público del profesional |
| `frontend/src/pages/BookingPage.tsx` | Página de reserva desde perfil público |

---

## Landing Page (`/`)

### Contenido
- Hero section con mensaje principal y CTA de registro
- Video promocional (opcional, si está configurado)
- Directorio de profesionales destacados filtrado por país/ciudad
- Secciones informativas sobre el producto

---

## Explorar (`/explorar`)

Directorio filtrable con búsqueda avanzada.

### Filtros disponibles
- Enfoque terapéutico
- Problemática que trabaja
- Población atendida (adultos, adolescentes, niños, parejas...)
- País / Ciudad
- Modalidad (presencial, online, ambas)

---

## Directorio de Psicólogos (`/psicologos`)

Páginas SEO-optimizadas con rutas jerárquicas:

```
/psicologos                              → Directorio general
/psicologos/:countryCode                 → Por país (ej: /psicologos/mx)
/psicologos/:countryCode/:citySlug       → Por ciudad (ej: /psicologos/mx/cdmx)
/psicologos/:countryCode/:citySlug/:approach → Por enfoque terapéutico
```

Estas páginas tienen metadatos SEO dinámicos para posicionar en búsquedas como "psicólogos en CDMX", "terapia de pareja en Buenos Aires", etc.

---

## Perfil Público (`/:slug`)

### Contenido
- Foto de perfil, nombre, profesión, especialidad
- Bio del profesional
- Años de experiencia, ciudad, país
- Enfoques terapéuticos (tags)
- Modalidad y precio por sesión
- Servicios activos con precios y duración
- Botón de reserva → `BookingPage` o `BookingForm`
- Links a redes sociales
- Cédula profesional (si está registrada)

### Template visual
El perfil usa el template seleccionado por el profesional:
- `MINIMALIST` — diseño limpio con fondo blanco/oscuro
- `BOLD`, `ELEGANT`, `CREATIVE`, `CARBONO` — diseños Pro

### Ruta
La ruta `/:slug` es la ÚLTIMA en App.tsx para no interferir con rutas conocidas. Antes de mostrar el perfil, verifica que el slug existe y el perfil está publicado.

---

## Página de Reserva (`/book/:slug`)

Página dedicada a reservar con un profesional específico.

### Flujo
1. Carga el perfil del profesional por slug
2. Muestra los servicios disponibles
3. Cliente selecciona servicio → calendario con fechas disponibles
4. Selecciona horario → formulario con datos del cliente
5. Confirma → `POST /api/bookings`
6. Recibe confirmación + email

El componente `BookingForm` también puede abrirse como modal desde el perfil público directamente.

---

## Páginas de Landing Especializadas

Para demostrar el producto a diferentes nichos:

| Ruta | Archivo | Nicho |
|------|---------|-------|
| `/barberia` | `LandingBarberia.tsx` | Barberías (paleta dorada) |
| `/salon` | `LandingSalon.tsx` | Salones de belleza (paleta rosada) |

Estas páginas tienen el mismo flujo pero con branding diferente. No son el foco principal del producto.

---

## Página de Únete (`/unete`)

Página de onboarding con íconos de múltiples profesiones, diseñada para convertir visitantes del directorio en profesionales registrados.
