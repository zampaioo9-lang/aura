# Fase 5: Dashboard de gestión "Mis Talleres y Cursos" — Design Spec

**Fecha:** 2026-10-28
**Depende de:** Fases 1-4 (CRUD de Offering/Module/Question/ScoringRule vía API, checkout de invitado, página de acceso del comprador), todas completas y en producción.
**Sigue a:** `docs/superpowers/plans/2026-10-27-talleres-cursos-webinars-fase4-acceso-comprador.md`, sección "Qué sigue después de esta Fase 4".

## Resumen

Hasta ahora, un profesional solo puede crear/editar/publicar sus ofertas (Talleres en vivo o Cursos grabados), con sus módulos, preguntas y reglas de puntaje, haciendo peticiones directas a la API (vía Postman o similar) — no existe ninguna pantalla en el panel para hacerlo. Esta fase construye esa pantalla: una nueva sección "Talleres y Cursos" dentro del Dashboard del profesional, donde puede ver sus ofertas, crearlas, editarlas módulo por módulo (incluyendo preguntas y reglas de puntaje de los cuestionarios), publicarlas/despublicarlas, y archivarlas.

Fuera de alcance de esta fase (decidido explícitamente): ver la lista de compradores por oferta y métricas de ingresos/conversión — eso queda para una Fase 6 posterior, porque requiere un endpoint nuevo de backend que hoy no existe y es una pieza independiente que se beneficia de diseñarse con datos reales ya circulando.

## Decisiones de alcance (ya acordadas)

1. **Ubicación: un tab nuevo en el sidebar del Dashboard**, no una ruta separada ni una pestaña del AdminPanel (el AdminPanel es exclusivo del administrador de la plataforma, no de cada profesional).
2. **Construcción incremental, no wizard lineal forzado.** El backend ya permite crear una oferta `DRAFT` vacía e irle agregando módulos/preguntas/reglas en cualquier orden; la UI refleja eso con un modal rápido de creación + una pantalla de "editor" libre, en vez de un wizard de pasos obligatorios tipo Historia Clínica.
3. **Edición de módulos vía modal** (como `ServiceFormModal`), con las preguntas y reglas de puntaje de un módulo `QUESTIONNAIRE` como sub-secciones dentro del mismo modal — no un acordeón inline ni un drawer lateral.
4. **Reordenar módulos con flechas arriba/abajo**, no drag & drop (evita agregar una librería nueva y funciona igual en mobile).
5. **Archivar es permanente** en esta fase — el botón dice "Archivar" (nunca "Eliminar"), con una advertencia explícita de que no se puede deshacer. No se agrega un endpoint para desarchivar.
6. **Editar una pregunta ya creada solo permite cambiar su texto.** Para cambiar su tipo u opciones, el profesional debe borrarla y crear una nueva. (Cambiar opciones de una pregunta con respuestas reales ya guardadas dejaría esas respuestas apuntando a opciones inexistentes — se evita todo ese riesgo aceptando esta limitación.)
7. **Reordenar módulos requiere un cambio chico de backend**: agregar el campo `order` a `updateModuleSchema` (hoy no se puede actualizar vía `PUT /modules/:moduleId`). Es el único cambio de backend de esta fase.

## Backend

### Cambio único: soporte para reordenar módulos

En `backend/src/utils/validation.ts`, `updateModuleSchema` gana un campo:

```typescript
export const updateModuleSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
  order: z.number().int().min(1).optional(),
});
```

No se necesita ningún cambio en la ruta `PUT /:offeringId/modules/:moduleId` (`backend/src/routes/offerings.ts`): ya hace `prisma.module.update({ where: { id: ... }, data })` pasando el objeto completo validado por el esquema, así que `order` se actualiza automáticamente en cuanto el esquema lo permite.

**Nota de diseño:** reordenar dos módulos adyacentes (ej. intercambiar el módulo en posición 2 con el de posición 3) requiere **dos** llamadas `PUT` separadas (una por cada módulo afectado), no una operación atómica. Esto es aceptable: no hay invariante de unicidad en `order` a nivel de base de datos (no hay `@@unique([offeringId, order])` en el schema), así que un estado intermedio con dos módulos compartiendo temporalmente el mismo `order` no rompe nada — el peor caso es que, si la segunda llamada falla a medio camino (ej. de red), el orden visual quede inconsistente hasta que el usuario reintente. No se agrega lógica de rollback para esto; es el mismo nivel de tolerancia a fallos ya aceptado en otras partes de este proyecto (ej. el `currentCount + 1` no-transaccional al crear un módulo).

Nada más cambia en el backend. Todo el resto de esta fase consume endpoints 100% existentes:

- `POST /api/offerings`, `GET /api/offerings/me`, `PUT /api/offerings/:id`, `PATCH /api/offerings/:id/publish`, `DELETE /api/offerings/:id`
- `POST /api/offerings/:offeringId/modules`, `PUT .../modules/:moduleId`, `DELETE .../modules/:moduleId`
- `POST .../modules/:moduleId/questions`, `PUT .../questions/:questionId` (solo `text`), `DELETE .../questions/:questionId`
- `POST .../modules/:moduleId/scoring-rules`, `PUT .../scoring-rules/:ruleId`, `DELETE .../scoring-rules/:ruleId`
- `POST /api/upload/image`, `POST /api/upload/video`, `POST /api/upload/pdf`

## Frontend

### Ubicación e integración con el Dashboard

- `frontend/src/pages/Dashboard.tsx`: el `type Tab` gana el valor `'talleres'`. Se agrega una entrada en el array `TABS` (sección "General" del sidebar), con un ícono (ej. `GraduationCap` de `lucide-react`) y label "Talleres y Cursos". Se agrega el bloque de render inline siguiendo el patrón exacto ya usado para `pacientes`:

```tsx
<div style={{ display: activeTab === 'talleres' ? undefined : 'none' }}>
  <TalleresCursos C={C} isActive={activeTab === 'talleres'} isPro={isPro ?? false} />
</div>
```

- **Gating por plan:** `TalleresCursos` recibe `isPro` (ya calculado en `Dashboard.tsx` a partir de `useAuth()`, el mismo booleano que ya gatea otras secciones Pro) y envuelve su contenido en `ProGate` si `!isPro`, mostrando el lock-overlay estándar con una invitación a "Ver planes". No se crea una `useFeature` key nueva porque el backend no tiene lógica de overrides para esta funcionalidad (`POST /api/offerings` usa `isProUser(user)`, que es estrictamente plan Pro/Clínico/Lifetime/Admin — no hay overrides por usuario como en otras features).

### Nuevo hook: `frontend/src/hooks/useOfferings.ts`

Mismo patrón que `frontend/src/hooks/useServices.ts`: expone interfaces TypeScript para `Offering`, `Module`, `Question`, `QuestionOption`, `ScoringRule` (reflejando los campos reales de Prisma), y funciones que envuelven cada endpoint de arriba (`fetchOfferings`, `createOffering`, `updateOffering`, `togglePublish`, `archiveOffering`, `createModule`, `updateModule`, `deleteModule`, `createQuestion`, `updateQuestion`, `deleteQuestion`, `createScoringRule`, `updateScoringRule`, `deleteScoringRule`), cada una devolviendo una Promise y lanzando el mensaje de error del backend (`err.response?.data?.error`) para que el componente lo muestre vía `useToast`.

### Nuevo componente: `frontend/src/pages/TalleresCursos.tsx`

**Vista de lista** (estado inicial al entrar al tab):

- Tabs de filtro: **Borradores** (`status === 'DRAFT'`) / **Publicadas** (`'PUBLISHED'`) / **Archivadas** (`'ARCHIVED'`), con conteo por tab — mismo patrón visual que los tabs Activos/Inactivos/Todos de `ServicesDashboard`.
- Cada oferta es una tarjeta: título, badge de tipo (Taller en vivo / Curso grabado), badge de estado con color, precio USD, "`_count.modules` módulos", "`_count.purchases` compras" (dato ya incluido en `GET /api/offerings/me`, aunque esta fase no construye una vista detallada de compradores), y tres acciones: **Editar** (entra al editor), **Publicar**/**Despublicar** (toggle), **Archivar**.
- Botón **"+ Nueva oferta"** en la esquina superior, deshabilitado solo si `!isPro` (cubierto igual por el `ProGate` que envuelve toda la sección).
- Al fallar `Publicar` por el gate del backend (sin módulos / cuestionario sin preguntas / cuestionario con preguntas de opción sin regla de puntaje), se muestra el `error` exacto de la respuesta en un toast — esta UI nunca duplica esa validación, solo la refleja.
- Al confirmar **Archivar**, un diálogo de confirmación (mismo patrón `createPortal` + overlay que `ServicesDashboard`) explica: *"Esta acción es permanente y no se puede deshacer. La oferta dejará de ser visible y no podrá publicarse de nuevo."*

**Modal "Crear oferta" / "Editar datos básicos"** (mismo modal, dos modos, como `ServiceFormModal`):

Campos:
- Tipo (`LIVE_WORKSHOP` / `RECORDED_COURSE`) — **inmutable una vez creada la oferta** (el backend no permite cambiar `type` vía `PUT`); en modo edición este campo se muestra deshabilitado.
- Título (texto, 3-150 caracteres).
- Precio USD (número, 0-10000).
- Precio MXN (número, opcional, 0-200000) — disponible desde el modal de creación también (no hace falta forzar que se agregue después; simplemente es un campo opcional más).
- Descripción (textarea, opcional, hasta 1000 caracteres).
- Imagen de portada (opcional): botón que abre selector de archivo, sube vía `useUpload().uploadImage`, muestra barra de progreso y preview.
- Si Tipo = Taller en vivo: Fecha/hora (date-time picker, reutilizar `CustomDatePicker` ya existente en el proyecto), Cupo (número, opcional, 1-1000), Enlace externo (URL, **obligatorio** junto con la fecha — el backend rechaza crear o actualizar un `LIVE_WORKSHOP` sin ambos).

Al crear exitosamente, la vista navega directo al editor de esa oferta nueva (queda en estado `DRAFT`, sin módulos).

**Editor de oferta** (`offeringId` seleccionado):

- Encabezado: título, badge de estado, botón "← Volver a mis ofertas", botón **Editar datos básicos** (reabre el modal de arriba en modo edición), botón **Publicar**/**Despublicar**.
- Lista de módulos (`GET /:offeringId/modules`, usando el token de auth — por eso llega el contenido completo, a diferencia de la vista pública), ordenados por `order`. Cada fila:
  - Ícono según tipo (texto/video/pdf/cuestionario) + título + descripción corta.
  - Flechas ↑ / ↓ — deshabilitadas en los extremos de la lista. Al hacer clic, intercambia el `order` de este módulo con el adyacente mediante dos llamadas `PUT` (ver nota de diseño arriba), y refresca la lista.
  - Botón **Editar** (abre el modal de módulo en modo edición).
  - Botón **Eliminar** — deshabilitado con tooltip si la oferta está `PUBLISHED` y es el único módulo (reflejando el gate del backend: *"Despublica la oferta primero"*). Al confirmar, llama `DELETE` y refresca.
- Botón **"+ Agregar módulo"** abre el modal de módulo en modo creación.

**Modal de módulo:**

- Campos comunes: Título (2-150 caracteres), Descripción (opcional, hasta 500 caracteres).
- Tipo: selector (TEXT/VIDEO/PDF/QUESTIONNAIRE) — **solo visible/editable en modo creación**; en modo edición se muestra como texto fijo, no seleccionable (el backend no permite cambiar `type` de un módulo existente).
- Según el tipo elegido:
  - **TEXT:** textarea de contenido (hasta 10,000 caracteres), obligatorio.
  - **VIDEO:** botón de subir archivo → `useUpload().uploadVideo`, con barra de progreso; obligatorio antes de poder guardar.
  - **PDF:** botón de subir archivo → `useUpload().uploadPdf`, con barra de progreso; obligatorio antes de poder guardar.
  - **QUESTIONNAIRE:** sin campo de contenido propio. En su lugar, dos sub-secciones (solo visibles/disponibles después de guardar el módulo por primera vez, ya que preguntas/reglas cuelgan de un `moduleId` que debe existir):
    - **Preguntas:** lista de las preguntas actuales del módulo (`GET .../questions`), cada una mostrando texto + tipo + número de opciones (si aplica), con botones Editar (solo cambia el texto, ver decisión #6) y Eliminar. Botón **"+ Pregunta"** abre un sub-formulario: texto (3-300 caracteres), tipo (FREE_TEXT/SINGLE_CHOICE/MULTIPLE_CHOICE); si el tipo es de opción, una lista dinámica de opciones (label + valor numérico, mínimo 2, máximo 20, con botones "+ Opción" / eliminar fila).
    - **Reglas de puntaje:** lista de las reglas actuales (`GET .../scoring-rules`), cada una mostrando el rango `minScore`-`maxScore` y el mensaje, con Editar/Eliminar (edición completa soportada, el backend ya lo permite). Botón **"+ Regla"** abre un sub-formulario: minScore, maxScore (entero, ≥ minScore), mensaje (3-500 caracteres).

## Casos especiales y límites conocidos

- **Archivar es permanente** — no hay endpoint de desarchivar; decisión explícita de esta fase, documentada arriba.
- **El tipo de una oferta y el tipo de un módulo son inmutables** una vez creados — el backend no expone forma de cambiarlos. Si el profesional se equivoca, debe borrar y recrear.
- **Editar una pregunta solo cambia su texto** — cambiar tipo u opciones requiere borrar y recrear la pregunta. Esto es aceptable porque cambiar opciones de una pregunta con respuestas reales ya guardadas (`Answer.valueOptionIds`, que no tiene integridad referencial a nivel de base de datos) dejaría esas respuestas apuntando a ids inexistentes, contribuyendo silenciosamente 0 al puntaje — se evita todo ese riesgo.
- **Reordenar módulos no es atómico** (dos llamadas `PUT` separadas) — ver nota de diseño en la sección de Backend.
- **El conteo de compras (`_count.purchases`) se muestra en la tarjeta de la lista, pero no hay forma de ver el detalle de quién compró** — eso es explícitamente Fase 6.
- **La condición de carrera ya documentada en Fase 2** (doble-`DELETE` del último módulo de una oferta publicada pudiendo dejarla sin módulos) no cambia en esta fase; esta UI solo la hereda tal cual.

## Fuera de alcance (explícito)

- Lista de compradores por oferta y cualquier detalle de una compra individual desde el panel del profesional (Fase 6).
- Métricas de ingresos, conversión o cualquier analítica de talleres/cursos (Fase 6).
- Desarchivar una oferta archivada.
- Cambiar el tipo de una oferta o de un módulo después de creados.
- Editar el tipo o las opciones de una pregunta ya creada (solo su texto).
- Drag & drop para reordenar módulos.
- Cualquier cambio al flujo de checkout, pago, o a la página de acceso del comprador (Fases 3-4, ya cerradas).

## Verificación

Este backend no tiene suite de tests. La verificación será:

- **Backend:** empírica contra el dev server local, igual que en fases anteriores — confirmar que `PUT /modules/:moduleId` con `{"order": N}` efectivamente actualiza el campo, y que el resto de los endpoints consumidos (ya verificados en Fases 1-2) sigue funcionando sin cambios.
- **Frontend:** manual contra el dev server, ejercitando el flujo completo: crear una oferta de cada tipo, agregar un módulo de cada tipo (incluyendo subir video/PDF/imagen reales), crear un módulo cuestionario con preguntas de los tres tipos y reglas de puntaje, reordenar módulos, editar datos básicos, intentar publicar con el gate fallando (ver el mensaje de error correcto) y luego con el gate pasando, despublicar, archivar, y confirmar que la vista de lista refleja todo correctamente en cada tab de filtro.
