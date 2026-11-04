# Configurar Agenda — replicar horario y horario de servicio al crear — Design Spec

**Fecha:** 2026-11-03
**Depende de:** `frontend/src/pages/SchedulingConfig.tsx` (archivo único que contiene las pestañas Disponibilidad y Servicios de "Configurar Agenda"), endpoints backend ya existentes (`POST /api/availability/bulk`, `POST /api/service-availability/bulk`) — ninguno de los dos requiere cambios de backend.

Dos mejoras de flujo independientes, pedidas juntas por el usuario en la misma sesión, dentro de la misma pantalla de "Configurar Agenda" pero en pestañas distintas (Disponibilidad vs Servicios).

## Feature 1 — Replicar horario a todos los días laborables (pestaña Disponibilidad)

### Problema

Hoy, configurar el "Horario de atención" (`TabDisponibilidad`) requiere repetir manualmente las mismas franjas horarias día por día — no existe forma de tomar el horario ya configurado en un día y aplicarlo a los demás. El botón "Aplicar plantilla" que ya existe (`QuickTemplates`) no resuelve esto: aplica una de 4 plantillas fijas genéricas (ej. "Oficina: Lunes a Viernes 9:00-17:00"), **borrando y reemplazando** cualquier horario personalizado — no copia lo que el profesional ya configuró.

### Diseño

En `TabDisponibilidad`, junto al botón "Guardar" existente (línea ~350 de `SchedulingConfig.tsx`), un nuevo botón **"Aplicar a todos los días"**.

Comportamiento al hacer clic:
1. Pide confirmación explícita con `window.confirm()` — mismo patrón ya usado en este archivo para otras acciones destructivas (`handleDelete`, `handleDeleteRecurring`, líneas 906/933) — con un mensaje dinámico indicando qué días se van a sobrescribir, ej. "Esto reemplazará el horario de Mar, Mié, Jue, Vie, Sáb con el horario de Lun. ¿Continuar?" (lista los demás días ya marcados como laborables, excluyendo el día actualmente seleccionado).
2. Si se confirma: toma las franjas horarias visibles en pantalla ahora mismo para el día seleccionado (`franjas`, sin importar si ya se guardaron o no), y las persiste en **todos los días marcados como laborables** (`activeDays`), incluyendo el día actualmente seleccionado — reutilizando el mismo patrón que ya usa `handleSave`/`handleApplyTemplate`: borrar los slots existentes de cada día destino (`DELETE /api/availability/:id`) y crear los nuevos de una sola vez (`POST /api/availability/bulk`).
3. Muestra un toast de éxito ("Horario aplicado a N días") y refresca la vista (`fetchSlots()`), igual que las acciones existentes.
4. Si no hay más días laborables aparte del seleccionado (`activeDays.length <= 1`), el botón no tiene nada que hacer — se deshabilita con un estado visual claro, sin necesidad de mostrar el diálogo de confirmación.

Esto es una sobreescritura total y deliberada (no un "merge" inteligente con los horarios existentes de cada día) — mismo nivel de severidad que "Aplicar plantilla", pero usando el horario real del profesional en vez de uno genérico.

### Fuera de alcance

- No se toca el botón "Aplicar plantilla" / `QuickTemplates` existente — sigue funcionando igual, sin relación con esta función nueva.
- No se construye una forma de replicar hacia un subconjunto elegido de días (checkboxes por día) — se decidió explícitamente la opción simple ("todos los días laborables") en vez de un selector granular.
- No se agregan endpoints de backend nuevos — se reutiliza `/availability/bulk` tal como existe hoy.

## Feature 2 — Horario del servicio disponible desde la creación (pestaña Servicios)

### Problema

Hoy, el bloque "Horario de este servicio" (disponibilidad específica por servicio, `ServiceAvailability`) solo aparece cuando `modalMode === 'edit'` (línea 706 de `SchedulingConfig.tsx`) — es decir, solo después de haber creado el servicio, guardado, y vuelto a entrar en modo edición. La razón técnica real: `POST /api/service-availability/bulk` requiere un `serviceId` real, que no existe hasta que el servicio se guarda por primera vez. Desde la perspectiva de un terapeuta sin conocimientos técnicos, esto es confuso — no hay ninguna pista de que deba "volver a entrar" al servicio para configurar su horario.

### Diseño

El bloque "Horario de este servicio" (días/franjas, líneas 706-752) se muestra **también en modo Crear**, en el mismo lugar y con el mismo diseño que ya tiene en modo Editar (incluyendo la protección `ProGate`) — la condición `modalMode === 'edit' && editingService` deja de ser necesaria para decidir si se **muestra** el bloque; los estados `activeDays`/`selectedDay`/`franjasByDay` ya son genéricos y no dependen de que exista un servicio guardado.

Lo que sí cambia según el modo es el **guardado**:
- **Modo Crear:** desaparece el botón independiente "Guardar horario" de este bloque. El único botón de acción es "Crear servicio" (el que ya existe arriba del formulario). Al hacer clic:
  1. Crea el servicio con los datos básicos, igual que hoy (`createService`).
  2. Si en el mismo formulario se configuró al menos un día con franjas (`activeDays.length > 0`), inmediatamente después de obtener el `id` del servicio recién creado, se llama a `POST /api/service-availability/bulk` con esos mismos datos — una segunda llamada encadenada, invisible para el profesional (un solo clic, un solo "Guardando...").
  3. Si el paso 1 fallo (ej. nombre muy corto, precio negativo): ni el servicio ni el horario se guardan, mismo comportamiento de error que ya existe hoy — sin cambios.
  4. Si el paso 1 tuvo éxito pero el paso 2 (guardar el horario) falla: el servicio queda creado igual (no se revierte), se cierra el modal, y se muestra un toast específico: *"Servicio creado, pero no se pudo guardar su horario — edítalo después"* — en vez del mensaje de error genérico.
- **Modo Editar:** sin cambios — sigue teniendo su propio botón "Guardar horario" (`handleSaveSlots`), independiente del botón "Guardar cambios" de los datos básicos del servicio, exactamente como hoy.

### Fuera de alcance

- No se modifica el backend en absoluto — se reutilizan `POST /api/services` (o el endpoint real que use `createService`) y `POST /api/service-availability/bulk` tal como existen.
- No se cambia el comportamiento de "Editar servicio" — sigue con sus dos botones de guardado independientes (datos básicos / horario), nada de esto se toca.
- No se agrega ninguna validación nueva al horario del servicio (ej. límites de franjas) más allá de lo que el bloque ya valida hoy.

## Verificación

Sin suite de tests en este repo. Verificación empírica con servidores locales apuntando a la base de datos de producción compartida:

**Feature 1:**
1. Configurar un horario personalizado (franjas específicas) en un día, con al menos 2-3 días más marcados como laborables con horarios distintos.
2. Clic en "Aplicar a todos los días" → confirmar que aparece el diálogo de confirmación listando los días afectados.
3. Confirmar → verificar que los demás días quedan con exactamente el mismo horario que el día de origen, y que el "Resumen semanal" lo refleja.
4. Probar el caso de un solo día laborable (sin otros días) → el botón debe estar deshabilitado o indicar que no hay nada que replicar.

**Feature 2:**
1. Abrir "Nuevo servicio" → confirmar que el bloque "Horario de este servicio" ya es visible, sin necesidad de guardar primero.
2. Llenar los datos básicos, configurar un horario específico (ej. solo Martes y Jueves), dar clic en "Crear servicio".
3. Confirmar que el servicio aparece en la lista, y al editarlo de nuevo, el horario específico configurado durante la creación ya está guardado correctamente (días/franjas coinciden).
4. Crear un servicio SIN configurar ningún horario específico → confirmar que no se dispara ninguna llamada a `service-availability/bulk` de más, y que el servicio usa el horario general como ya ocurre hoy.
5. Confirmar que en modo Editar nada cambió (sigue con su botón "Guardar horario" propio).
