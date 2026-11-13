# Captura de leads en el Matching con IA (Explorar)

## Contexto y problema

Hoy el flujo de Matching con IA (`/explorar`, 5 preguntas → sugerencia de 2-3 terapeutas) es completamente anónimo y efímero:

- El frontend (`Explorar.tsx`) nunca pide nombre ni contacto antes de mostrar resultados.
- El backend (`backend/src/routes/ai-matching.ts`) no persiste las respuestas del cuestionario en ningún lado — lo único que guarda es un contador de rate-limit por IP/día. En cuanto se cierra la pestaña, no queda ningún rastro de quién preguntó, qué describió de su situación, ni a qué perfil dio clic.
- El único punto del sitio donde hoy se pide algún dato de contacto es al llegar al formulario real de reserva de cita (`/book/:slug`, `BookingForm.tsx`), el paso de mayor compromiso de todo el recorrido.
- No existe ninguna herramienta de analítica (Google Analytics, GTM, Pixel, Vercel Analytics, etc.) en el frontend — no hay forma de medir dónde se cae la gente en este embudo.

Resultado: cualquier persona con intención real de buscar terapia que complete el cuestionario de matching, vea sus opciones, y no llegue a completar una reserva real, se pierde sin dejar ningún dato que permita darle seguimiento.

## Objetivo

Capturar nombre y WhatsApp de quien usa el Matching con IA, en el punto del recorrido con mejor equilibrio entre confianza ya ganada (ya respondió el cuestionario) y compromiso aún bajo (todavía no se le pide elegir fecha de cita), y dejar un registro visible en el Admin de: la situación que describió (pregunta 1), su nombre y WhatsApp, y con qué terapeuta terminó agendando (si lo hizo).

## Flujo de usuario

1. Clic en "Comenzar" en `/explorar` → cuestionario de 5 preguntas (sin cambios).
2. Al enviar la última pregunta, el backend calcula el match **y crea un registro `MatchLead`** (todavía sin nombre/WhatsApp) con las respuestas del cuestionario y los perfiles sugeridos. El frontend recibe el `id` de ese lead junto con los resultados.
3. En vez de mostrar las 3 tarjetas de inmediato, aparece una pantalla de **gate obligatorio**: "Encontramos N terapeutas compatibles contigo — déjanos tu nombre y WhatsApp para mostrártelos". Dos campos: nombre y WhatsApp (reutilizando el mismo componente `PhoneInput` y su validación ya usados en `Register.tsx`/`ProfileCreate.tsx`). Sin este paso no se revela ningún nombre ni foto de terapeuta.
4. Al confirmar, se actualiza el `MatchLead` con nombre/WhatsApp y se muestran las 3 tarjetas (igual que hoy: foto, nombre, score de compatibilidad, razón).
5. Si la persona cierra el modal antes del paso 4 sin dar sus datos, el `MatchLead` queda anónimo para siempre — sirve solo como dato agregado (qué está buscando la gente), sin forma de contactarla.
6. Al dar clic en "Agenda conmigo" sobre una tarjeta específica (en vez de ir directo a `/book/:slug`): se actualiza el `MatchLead` con el terapeuta elegido (`selectedProfileId`), y aparece una pantalla de confirmación mostrando su propia respuesta a la pregunta 1 ("por qué buscas terapia"), editable, bajo el mensaje "esto es lo que le compartiremos a tu terapeuta". Esta pantalla reemplaza el envío silencioso de ese texto — la persona confirma o ajusta antes de que se comparta.
7. Al confirmar esa pantalla, se redirige a `/book/<slug>` (la página real de reservas, ya existente) llevando nombre, WhatsApp y el texto de situación confirmado.
8. En `/book/<slug>`, el flujo de reserva real (elegir servicio, fecha, hora) sigue exactamente igual que hoy — la única diferencia es que `BookingForm` llega con esos tres campos precargados en vez de vacíos.
9. Si la persona completa la reserva real, el `Booking` resultante queda vinculado al mismo `MatchLead`, para que el Admin pueda distinguir intención (eligió un terapeuta) de resultado (llegó a tener una cita real agendada).

## Modelo de datos

### Nuevo modelo `MatchLead` (Prisma)

```prisma
model MatchLead {
  id                String   @id @default(uuid())
  answers           Json     // { q1, q2, q3, q4, q5 } tal cual se envían hoy a /ai-matching/match
  matchedProfileIds String[] // ids de los perfiles sugeridos, en el orden mostrado
  name              String?
  whatsapp          String?
  selectedProfileId String?  // última elección de "Agenda conmigo"; se sobreescribe si cambia de opinión
  createdAt         DateTime @default(now())
  contactedAt       DateTime? // cuándo pasó el gate (name/whatsapp no nulos)
  selectedAt        DateTime? // cuándo eligió un terapeuta

  selectedProfile Profile? @relation(fields: [selectedProfileId], references: [id])
  booking         Booking?
}
```

Se guarda como JSON (no columnas separadas por pregunta) para no requerir una migración si las preguntas del cuestionario cambian más adelante.

### Cambio en `Booking` (ya existente)

Se agrega una relación opcional de vuelta al lead que lo originó:

```prisma
model Booking {
  // ...campos existentes sin cambios...
  matchLeadId String?    @unique
  matchLead   MatchLead? @relation(fields: [matchLeadId], references: [id])
}
```

Es opcional porque la mayoría de las citas seguirán creándose sin pasar por el Matching (alguien que entra directo a un perfil, o un terapeuta que agenda manualmente a un paciente existente).

## Backend

- `POST /ai-matching/match` (ya existente): además de calcular y devolver los matches, ahora también crea el `MatchLead` (sin nombre/WhatsApp) y agrega su `id` a la respuesta. El rate-limit por IP/día que ya existe no cambia.
- `PATCH /ai-matching/leads/:id/contact` (nuevo): recibe `{ name, whatsapp }`, valida formato de WhatsApp (mismo patrón que `Register.tsx`), actualiza el lead y marca `contactedAt`.
- `PATCH /ai-matching/leads/:id/select` (nuevo): recibe `{ profileId }`, actualiza `selectedProfileId` y `selectedAt`.
- `POST /bookings` (ya existente): acepta un campo opcional `matchLeadId` en el body; si viene, se guarda en el `Booking` creado.
- `GET /admin/profiles/:profileId/match-leads` (nuevo, protegido por auth de admin): lista los `MatchLead` cuyo `selectedProfileId` sea ese perfil, con su `booking` incluido si existe, ordenados por fecha descendente.

## Frontend

### `Explorar.tsx`

- Nuevo paso en la máquina de estados del modal de matching, entre "cargando" (`matchStep 5`) y "resultados" (`matchStep 6`): el gate de nombre/WhatsApp. Los resultados (`matchStep 6`) solo se renderizan después de pasar este paso.
- Al dar clic en una tarjeta / "Agenda conmigo": en vez de navegar directo a `/${slug}` (comportamiento actual), se muestra la pantalla de confirmación de la situación (precargada con `answers.q1`, editable) y, al confirmar, se llama a `PATCH /ai-matching/leads/:id/select` y se navega a `/book/:slug` llevando los datos necesarios para precargar el formulario (vía `sessionStorage`, ya que es una navegación entre páginas distintas, no solo cambio de estado interno).

### `BookingForm.tsx`

- Nuevo prop opcional `initialValues?: { clientName?: string; clientPhone?: string; notes?: string }` que, si viene, inicializa el `useState` del formulario en vez de arrancar vacío. No cambia ninguna otra lógica existente (validación, envío, etc.).

### `BookingPage.tsx`

- Al montar, si existe un paquete de datos del Matching en `sessionStorage` (guardado por `Explorar.tsx` en el paso anterior) para el mismo `slug`, lo lee, lo pasa como `initialValues` a `BookingForm`, y lo borra de `sessionStorage` tras usarlo (para que no se reutilice en una visita posterior no relacionada).

### `AdminPanel.tsx`

- Dentro del panel expandido de cada terapeuta en la vista "Usuarios" (mismo lugar donde hoy aparece "Correos enviados (N)"), nueva sub-sección "Leads de Matching (N)": por cada lead, muestra fecha, nombre, WhatsApp, la respuesta a la pregunta 1, y si tiene una cita real vinculada (con fecha/estado) o sigue solo como intención.

## Medición (sin herramientas externas)

Como el `MatchLead` se crea desde que se calcula el match (no solo al completar todo el flujo), se puede medir el embudo completo con conteos simples sobre esa misma tabla, sin integrar ninguna herramienta de analítica de terceros:

- Leads creados (total) = llegaron a ver que había resultados.
- Leads con `contactedAt` no nulo = pasaron el gate.
- Leads con `selectedAt` no nulo = eligieron un terapeuta específico.
- Leads con `booking` no nulo = terminaron con una cita real agendada.

Esto permite, con una consulta a la base de datos, saber en el futuro si el gate está costando conversión frente a lo que gana en cobertura de leads — sin necesidad de decidirlo hoy a ciegas.

## Decisiones de alcance explícitas (para no repetir la duda más adelante)

- Solo se guarda la **última** elección de terapeuta por lead. Si la persona da clic en "Agenda conmigo" de un perfil, se arrepiente, y elige otro, se sobreescribe `selectedProfileId`/`selectedAt` — no se guarda un historial de múltiples intentos.
- El gate pide **solo nombre y WhatsApp**, no correo. El correo se sigue pidiendo únicamente si la persona llega a completar la reserva real en `/book/:slug`, igual que hoy.
- El límite de 3 búsquedas de matching por IP al día (ya existente) no cambia.
- No se construye ningún sistema de pagos ni cuentas de paciente nuevas — este diseño reutiliza el `Booking` y el `BookingForm` que ya existen; lo único nuevo es el `MatchLead` y su conexión con ellos.
- Si el perfil elegido (`selectedProfileId`) se borra o despublica después de que el lead lo eligió, el registro del lead se conserva tal cual (el admin lo seguirá viendo con ese id, aunque el perfil ya no exista) — no se limpia ni se reasigna automáticamente.

## Riesgos / cosas a vigilar después de desplegar

- El gate es un paso de fricción nuevo justo antes de la recompensa (ver los nombres). Es una apuesta razonada (la persona ya invirtió el esfuerzo del cuestionario), pero no hay certeza sin datos reales — por eso el punto de "Medición" de arriba debe revisarse en las primeras semanas para confirmar que no está hundiendo la tasa de quienes terminan el cuestionario y llegan a ver resultados.
- Mostrar la pregunta 1 tal cual antes de compartirla con el terapeuta puede exponer un texto sensible escrito en un momento de menor cuidado (un cuestionario anónimo) — por eso el paso 6 del flujo la muestra editable y pide confirmación explícita, en vez de reenviarla en silencio.
