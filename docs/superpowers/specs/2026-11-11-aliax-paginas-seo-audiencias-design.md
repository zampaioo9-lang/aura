# Páginas de marketing por audiencia + navegación contextual

## Contexto

César notó que su competencia (AgendeTerapia) aparece en Google con "sitelinks" (sub-enlaces debajo del resultado principal: "¿Por qué AgendeTerapia?", "Talleres", etc.), mientras que Aliax solo muestra un resultado simple. Investigando el código se confirmó la causa real: el Home actual (`Landing.tsx`) es una sola página, 100% enfocada en psicólogos ("Automatiza tu nota clínica"), sin ninguna página dedicada a la otra audiencia (personas que buscan terapia), y sin navegación entre páginas de contenido más allá de Precios/Revista ya existentes.

**Importante, acordado explícitamente con César:** los sitelinks de Google **no se pueden construir ni garantizar directamente** — son una decisión del algoritmo de Google basada en estructura del sitio + autoridad de la búsqueda de marca. Este trabajo construye la condición necesaria (páginas de contenido real, bien enlazadas, con metadata propia) pero no garantiza el resultado. El beneficio que sí se garantiza: cada página nueva puede aparecer como **resultado propio** en búsquedas específicas sobre esa audiencia (ej. "busco terapia online", "plataforma para psicólogos"), independientemente de si los sitelinks llegan a aparecer o no.

## Goal

1. Separar el sitio en dos audiencias claras, cada una con su propia página de contenido.
2. El Home deja de ser el pitch completo para psicólogos y pasa a ser un "repartidor" corto entre las dos audiencias.
3. Navegación (header) contextual: muestra enlaces relevantes según qué audiencia estás viendo.
4. Footer y metadata SEO consistentes en todas las páginas, para reforzar el enlazado interno real.

## Páginas y rutas

- **`/`** (Home, reescrito): versión corta — titular neutral + 2 botones grandes: "Soy psicólogo" (→ `/para-psicologos`) y "Busco terapia" (→ `/busco-terapia`). Reemplaza el contenido actual de `Landing.tsx`.
- **`/para-psicologos`** (nueva): contiene **exactamente** el contenido que hoy vive en `/` (toda la experiencia cinematográfica de scroll: Hero, SoapTiles, SecondScreen, ThirdScreen, FourthScreen) — se migra el archivo tal cual, sin reescribir una sola línea de copy o lógica, solo se renombra el componente/ruta.
- **`/busco-terapia`** (nueva, contenido nuevo): ver sección "Contenido de /busco-terapia" abajo.

`App.tsx` gana las rutas `/para-psicologos` y `/busco-terapia`; `/` sigue apuntando a `Landing` pero con el contenido nuevo y corto.

## Header contextual (`LandingHeader.tsx`)

El array `NAV` actual (fijo para todo el sitio) se vuelve dependiente de la ruta actual (`useLocation().pathname`), con 3 variantes:

- **En `/`:** sin enlaces de contenido — solo el botón "Entrar" (y los 2 CTAs grandes viven en el body de la página, no en el header).
- **Dentro de `/para-psicologos` (o cualquier ruta que empiece así):** Precios · Revista · Reservar demo · Entrar. Nota: ya NO incluye "Encontrar psicólogo" (ese enlace pasa a ser exclusivo del contexto `/busco-terapia`) — es el único cambio real respecto al header de hoy.
- **Dentro de `/busco-terapia` (o cualquier ruta que empiece así):** Encontrar psicólogo · Revista · Entrar.

El patrón de `Revista` como `<a href>` externo (no `<Link>`) se mantiene igual en las 3 variantes — ver `project_aliax_navbar_revista_link_bug`.

**Nota importante:** `LandingHeader` también se usa hoy en otras páginas fuera de este proyecto (Pricing, Explorar, Login, ForgotPassword, ResetPassword). Esas páginas deben seguir mostrando exactamente el menú que tenían antes (Encontrar psicólogo · Precios · Revista · Demo · Entrar) — solo `/` cambia a mostrar el header vacío del nuevo repartidor.

## Footer (`SiteFooter.tsx`)

El footer **no cambia según el contexto** — siempre muestra todos los enlaces, para que Google pueda rastrear el sitio completo sin importar en qué página esté el header contextual. Se actualiza `LINKS` para incluir las 5 páginas: Para psicólogos, Busco terapia, Encontrar psicólogo, Precios, Revista (hoy falta Revista en el footer — se agrega), más Privacidad/Login/Registro que ya existen.

## Contenido de `/busco-terapia`

Página nueva, estructura corta (sin FAQ ni sección "Por qué Aliax" por ahora — se puede ampliar después si hace falta):

1. **Hero** — titular + subtítulo + CTA directo a "Buscar psicólogo" (→ `/explorar`).
2. **Sección "Encuentra tu psicólogo"** — explica brevemente qué se puede filtrar en el directorio (enfoque terapéutico, modalidad online/presencial, ciudad) y enlaza a `/explorar`. Funciona como enlace interno real hacia esa página, no solo decorativo.
3. **Sección "Lee antes de empezar"** — enlaza 2-3 artículos curados de la Revista relevantes para alguien considerando terapia (ej. "Cómo elegir psicólogo: 7 pasos"). Enlaces estáticos con `<a href>` (Revista es sitio externo, mismo patrón que el navbar — nunca `<Link>`).
4. **CTA final** — repite el botón hacia `/explorar`.

No se promete terapia gratuita en ningún punto — el directorio es gratis de usar, el costo de las sesiones lo define cada psicólogo (ver `feedback_cesar_ofertas_gratuitas`).

## SEO: metadata por página

Cada una de las 3 páginas (`/`, `/para-psicologos`, `/busco-terapia`) usa `<Helmet>` (`react-helmet-async`, ya usado en `PsicologosDirectory.tsx`) con `<title>` y `<meta name="description">` únicos, enfocados en la intención de búsqueda de esa audiencia específica — no genéricos ni repetidos entre páginas.

## Sitemap

`frontend/scripts/generate-blog.ts` genera `public/sitemap.xml` a partir de un array hardcodeado `staticRoutes` (línea ~409: `['', '/explorar', '/pricing', '/revista']`). Se agregan `/para-psicologos` y `/busco-terapia` a ese array — es la única fuente del sitemap, no se edita `sitemap.xml` a mano (ver `feedback_sitemap_fuente_unica`).

## Fuera de alcance

- No se garantiza la aparición de sitelinks en Google — eso depende enteramente del algoritmo de Google, fuera de nuestro control.
- No se reescribe ni se toca el copy/diseño del contenido migrado a `/para-psicologos`.
- No se agregan secciones de FAQ o "Por qué Aliax" en esta ronda.
- No se toca `Pricing.tsx` ni el sitio de Revista — solo se enlazan mejor desde header/footer.
- No se construye ningún mecanismo de A/B testing ni analítica nueva para medir conversión de estas páginas.

## Testing / verificación

Sin suite automatizada (patrón ya establecido en el proyecto). Verificación manual:
- `npx tsc -b` en frontend.
- Abrir `/`, `/para-psicologos`, `/busco-terapia` en desktop y mobile — confirmar que el header muestra la variante correcta en cada una, y que el contenido de `/para-psicologos` es pixel-idéntico al Home actual (antes del cambio).
- Confirmar que el footer muestra las 5 páginas en las 3 rutas.
- `view-source` de cada página para confirmar `<title>`/`<meta description>` únicos.
- Confirmar que `/para-psicologos` y `/busco-terapia` aparecen en `public/sitemap.xml` generado tras el build.
