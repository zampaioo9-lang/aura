# Cursos publicados: ubicaciones públicas — Design Spec

**Fecha:** 2026-10-28
**Depende de:** Fases 1-5 de Talleres/Cursos/Webinars (CRUD, checkout, dashboard de gestión), todas completas y en producción.

## Resumen

Hoy, una oferta publicada (`status: PUBLISHED`) solo es visible en su página de detalle (`/oferta/:id`, Fase 3), pero ese link no está enlazado desde ningún lado — ni en el perfil público del profesional, ni en la página a la que lleva la tarjeta de un profesional en Explorar, ni hay forma fácil de copiarlo desde el panel. Esta fase cierra ese hueco agregando una sección "Talleres y Cursos" en las dos páginas públicas donde un visitante ya ve los servicios del profesional, y un botón de copiar enlace en el Dashboard.

El endpoint público necesario (`GET /api/offerings/profile/:profileId`, ya filtra solo `PUBLISHED`) **ya existe desde Fase 1** — esta fase es 100% frontend.

## Alcance

### 1. `frontend/src/components/templates/MinimalistTemplate.tsx`

Este componente (no `PublicProfile.tsx`, que solo delega) renderiza el perfil público real, con dos layouts paralelos (mobile y desktop) que ya tienen cada uno su propia sección "Servicios" condicionada a `activeServices.length > 0`.

- Nuevo `useEffect` keyed en `profile.id` que llama `GET /api/offerings/profile/${profile.id}` y guarda el resultado en un state `offerings`.
- Nueva sección **"Talleres y Cursos"**, agregada inmediatamente después de la sección "Servicios" existente, duplicada en ambos layouts (mobile: grid de 1 columna; desktop: `repeat(auto-fill, minmax(190px, 1fr))`, mismo patrón exacto que `activeServices`).
- Oculta por completo si `offerings.length === 0` (mismo patrón que `activeServices.length > 0`).
- Nuevo componente `BoardOfferingCard` (hermano de `BoardServiceCard`, mismo archivo), con: imagen de portada (o inicial del título si no hay), título (2 líneas máx, igual que el de servicio), badge de tipo ("Taller en vivo" / "Curso grabado"), precio en USD. Al hacer clic, navega a `/oferta/${offering.id}` (no abre ningún modal — a diferencia de `onBook` de servicios, que abre `BookingForm`).

### 2. `frontend/src/pages/BookingPage.tsx`

- Mismo `useEffect` que fetchea `GET /api/offerings/profile/${profile.id}` en cuanto `profile.id` está disponible (mismo patrón que el `useEffect` de reviews que ya existe ahí).
- Nueva sección "Talleres y Cursos" debajo de la lista de servicios existente, mismo estilo visual (`bp-svc-card` reutilizado), pero el botón dice **"Ver detalles"** en vez de "Reservar", y en vez de `setSelectedService(...)` hace `navigate(`/oferta/${o.id}`)` — el pago de una oferta no es una reserva de cita, ya tiene su propio flujo de checkout en `/oferta/:id` (Fase 3).
- Oculta por completo si no hay ofertas publicadas.

### 3. `frontend/src/pages/Dashboard.tsx`

- Junto al link "Ver perfil público" de la columna izquierda (línea ~918-924), se agrega un botón de copiar enlace, reutilizando la función `copyUrl(slug, id)` y el state `copiedId` que **ya existen** en este archivo (se usan hoy en la tarjeta "Comparte tu perfil" del tab Inicio) — mismo ícono `Copy`/checkmark, mismo comportamiento. Se llama `copyUrl(profiles[0].slug, profiles[0].id)`, usando el id del profile como clave (igual que los otros usos existentes), así que si el profesional copia desde cualquiera de los lugares que ya muestran este botón para el mismo perfil, todos muestran el checkmark a la vez — comportamiento correcto, no un bug.
- El link "Ver perfil público" (ícono `ExternalLink`) se mantiene exactamente igual; el botón de copiar se agrega como un elemento hermano, no reemplaza nada.

## Fuera de alcance (explícito)

- Cualquier cambio al endpoint `GET /api/offerings/profile/:profileId` (ya hace exactamente lo necesario).
- Cualquier cambio a `/oferta/:id` (`OfferingPublic.tsx`) — ya existe y funciona, es solo el destino de los nuevos links.
- Explorar.tsx / PsicologosDirectory.tsx en sí mismas no se tocan — la tarjeta de un profesional ya navega a `/book/:slug` (`BookingPage.tsx`), que es justo el archivo que se modifica.
- Otros templates de perfil público (no existen hoy; solo hay `MinimalistTemplate`).

## Verificación

Sin suite de tests en este repo. Verificación empírica: crear una oferta publicada de prueba para un profesional, confirmar que aparece en `/book/:slug`, en `/:slug` (perfil público, en ambos layouts mobile/desktop), que el clic en cualquiera de las dos lleva a `/oferta/:id`, y que el botón de copiar enlace en el Dashboard copia la URL correcta y muestra el checkmark. Confirmar también que un profesional sin ofertas publicadas no ve ninguna sección nueva en ninguna de las dos páginas.
