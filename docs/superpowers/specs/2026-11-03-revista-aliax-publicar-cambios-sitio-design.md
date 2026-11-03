# Revista Aliax — botón "Publicar cambios en el sitio" — Design Spec

**Fecha:** 2026-11-03
**Depende de:** todo el trabajo previo de Revista Aliax ya en producción, en particular el sistema de bloques (`backend/src/routes/articles.ts`, `frontend/src/components/admin/BlockEditor.tsx`).
**Reemplaza:** el throttle de 2 minutos implementado el mismo día (commit `0546a7b`), que quedó commiteado pero **nunca llegó a desplegarse** (bloqueado por el límite diario de despliegues de Vercel). Esta spec lo sustituye por completo antes de que se despliegue nada de esa versión.

## Resumen

Hoy, cada edición individual sobre un artículo ya publicado — agregar un bloque, moverlo, editarlo, borrarlo, o guardar el formulario principal del artículo — dispara automáticamente una reconstrucción completa del sitio en Vercel. Como el editor de bloques no tiene un botón "Guardar" (cada bloque se autoguarda solo, sin que el usuario confirme nada), un artículo editado bloque por bloque puede disparar decenas de despliegues seguidos. Esto ya causó un incidente real: un artículo de 26 bloques agotó el límite diario de despliegues gratis de Vercel (compartido entre todos los proyectos de la cuenta) a media edición, dejando el sitio público desactualizado sin ningún aviso visible para el usuario.

La solución: las ediciones dejan de disparar despliegues automáticamente. En su lugar, el usuario decide explícitamente cuándo publicar, con un botón "Publicar cambios en el sitio" en la vista general de Artículos, acompañado de un indicador que avisa cuando hay cambios guardados que todavía no están en vivo. Publicar, despublicar y borrar un artículo siguen disparando un despliegue inmediato, sin cambios — son acciones deliberadas y poco frecuentes, no el problema que se está resolviendo.

Pensado explícitamente para la Fase 3 futura de Revista Aliax (terapeutas publicando sus propios artículos, aún no iniciada): un terapeuta sin conocimientos técnicos no va a entender "espera un rato a que se actualice solo" — necesita un botón literal y un aviso visual claro.

## Alcance

### 1. Base de datos — reutilizar `BlogRebuildState`

La tabla ya existe en producción (creada hoy para el throttle, migración `20261103042116_add_blog_rebuild_state`), pero nunca se usó en código desplegado — se puede cambiar de forma limpia sin preocuparse por datos existentes.

```prisma
model BlogRebuildState {
  id            String    @id @default("singleton")
  lastEditAt    DateTime?
  lastRebuiltAt DateTime?
}
```

(Elimina el campo `lastTriggeredAt` de hoy, agrega `lastEditAt` y `lastRebuiltAt` — dos fechas en vez de una, ahora con un propósito distinto: no son para "esperar un rato", son para comparar "¿lo último que se guardó es más reciente que la última vez que se publicó?".)

### 2. Backend — dos funciones en vez de un throttle

En `backend/src/routes/articles.ts`:

- **`triggerBlogRebuild()`** vuelve a ser simple (sin el `force`/throttle de hoy — ya no hace falta, nadie más la llama automáticamente). Dispara el Deploy Hook de Vercel como siempre (reintenta una vez, nunca falla la solicitud), y al intentarlo actualiza `lastRebuiltAt = ahora`.
- **`markContentEdited()`** (nueva, reemplaza las llamadas automáticas a `triggerBlogRebuild()` en las rutas de edición "pequeña"): solo actualiza `lastEditAt = ahora` en la base de datos. Sin llamada de red a Vercel, así que no añade ninguna latencia perceptible.

**Las 5 rutas de edición pequeña** (`PUT /:id` del artículo, `POST/PUT/DELETE /:id/blocks`, `PATCH /:id/blocks/swap`) cambian su llamada de `triggerBlogRebuild()` (throttled) a `markContentEdited()` — mismo condicional `if (status === 'PUBLISHED')` que ya tienen hoy, sin tocarlo.

**Las 3 rutas de acción deliberada** (`PATCH /:id/publish`, `PATCH /:id/unpublish`, `DELETE /:id` cuando el artículo estaba publicado) siguen llamando a `triggerBlogRebuild()` directamente, sin cambios de comportamiento — igual que hoy.

**Dos endpoints nuevos:**
- `POST /api/articles/publish-site-changes` (auth, admin): llama a `triggerBlogRebuild()` sin condición. Esto es lo que dispara el botón nuevo.
- `GET /api/articles/rebuild-status` (auth, admin): lee la fila `BlogRebuildState` y devuelve `{ hasPendingChanges: boolean }` — `true` cuando `lastEditAt` existe y es más reciente que `lastRebuiltAt` (o `lastRebuiltAt` nunca existió). El cálculo de la comparación vive en el backend, no en el frontend — una sola fuente de verdad.

### 3. Frontend — el botón y el indicador

En `frontend/src/hooks/useArticles.ts`: dos funciones nuevas, `publishSiteChanges()` y `getRebuildStatus()`, mismo patrón que las funciones ya existentes en ese archivo.

En `frontend/src/components/admin/AdminRevista.tsx`, arriba de la lista de Artículos, junto al botón "Nuevo artículo":

- Un botón **"Publicar cambios en el sitio"**, con una etiqueta pequeña (ej. un punto de color + texto "Cambios sin publicar") visible solo cuando `hasPendingChanges` es `true`.
- Cuando no hay cambios pendientes, el botón se ve apagado (deshabilitado) y dice **"Sin cambios pendientes"**.
- El estado `hasPendingChanges` se consulta al cargar la vista de Artículos, y se vuelve a consultar cada vez que el usuario regresa a esa lista (por ejemplo, al cerrar el editor de un artículo) — así el indicador refleja ediciones hechas dentro del editor de bloques, que vive en un componente aparte (`ArticleEditor`/`BlockEditor`) sin acceso directo al estado de `AdminRevista`.
- Al hacer clic: llama a `publishSiteChanges()`, muestra un mensaje de éxito (ej. "Cambios publicados en el sitio"), y refresca el indicador (debería quedar en `false` inmediatamente después).

**El botón "Guardar cambios" del formulario principal del artículo (`ArticleEditor.tsx`) no cambia en nada visible** — sigue guardando los campos (título, extracto, autor, etc.) a la base de datos exactamente igual que hoy. Internamente, ese guardado ahora pasa por la ruta que llama a `markContentEdited()` en vez de disparar un despliegue directo, pero eso es invisible para el usuario.

## Fuera de alcance (explícito)

- El throttle de 2 minutos de hoy se elimina por completo, no se mantiene como respaldo — con los despliegues automáticos quitados de raíz, no hay nada que agrupar.
- No se construye ninguna protección contra doble clic en el botón nuevo más allá de deshabilitarlo mientras la solicitud está en curso (mismo patrón ya usado en otros botones de este archivo, ej. `creating`/`adding`).
- No se expone ninguna fecha legible ("hace 5 minutos") en el indicador — solo el booleano sí/no hay cambios pendientes. Se puede agregar después si hace falta.
- No se toca el comportamiento de autoguardado de los bloques (`BlockEditor.tsx`) — siguen guardándose solos en la base de datos exactamente igual que hoy, sin riesgo de pérdida de trabajo. Lo único que cambia es que ya no disparan un despliegue por sí mismos.

## Verificación

Sin suite de tests en este repo. Verificación empírica:

1. Confirmar que editar un artículo ya publicado (formulario principal o bloques) **no** dispara ningún despliegue — revisar el historial de despliegues de Vercel durante la prueba, debe quedar vacío.
2. Confirmar que el indicador "Cambios sin publicar" aparece después de esa edición, y que vuelve a `false` después de usar el botón.
3. Confirmar que "Publicar cambios en el sitio" efectivamente dispara un despliegue (revisar historial de Vercel) y que el sitio público refleja los cambios tras ese despliegue.
4. Confirmar que Publicar/Despublicar/Borrar un artículo siguen disparando un despliegue inmediato, sin pasar por el botón nuevo.
5. Confirmar que crear un artículo nuevo y agregarle bloques (mientras sigue en Borrador) no activa el indicador de cambios pendientes en ningún momento — el mecanismo nuevo solo debe reaccionar a artículos ya publicados.
