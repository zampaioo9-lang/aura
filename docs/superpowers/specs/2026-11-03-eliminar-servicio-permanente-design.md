# Eliminar servicio permanentemente — Design Spec

**Fecha:** 2026-11-03
**Depende de:** `backend/src/routes/services.ts`, `backend/prisma/schema.prisma` (sin cambios de schema), `frontend/src/hooks/useServices.ts`, `frontend/src/pages/SchedulingConfig.tsx` (pestaña Servicios / `TabServicios`).

## Problema

Hoy, `DELETE /api/services/:id` es en realidad un soft-delete (solo pone `isActive=false`) — no existe forma de eliminar un servicio de verdad. Esto es intencional: `Booking.service` tiene `onDelete: Cascade` en el schema de Prisma, así que un borrado real arrastraría todas las citas asociadas a ese servicio, incluyendo historial de sesiones completadas y clientes reales.

Pero esto deja sin salida un caso real: servicios creados solo para pruebas (ej. para verificar una feature nueva, con citas de prueba asociadas) que el usuario sí quiere eliminar del todo, no solo desactivar. No hay forma de distinguir automáticamente "cita de prueba" de "cita real" — `Booking` no tiene ningún campo de pago/monto (Aliax no procesa pagos por cita, el profesional cobra directo a su cliente), así que el único dato disponible es `status` (`PENDING`/`CONFIRMED`/`CANCELLED`/`COMPLETED`/`NO_SHOW`).

## Decisión de diseño

En vez de intentar adivinar automáticamente qué servicios son "seguros" de borrar según su historial, el criterio es: **siempre se puede borrar permanentemente, sin bloqueo automático por estado de citas — la protección es un modal de confirmación fuerte** que muestra exactamente cuántas citas (y de qué tipo) se perderán, y exige escribir el nombre exacto del servicio para habilitar el botón de borrado. La responsabilidad final es del profesional, con información completa delante.

Como segunda capa de fricción (no automática por contenido, sino por flujo): el borrado permanente **solo está disponible para un servicio ya desactivado**. Primero desactivar (como hoy), y solo desde la lista de "Inactivos" aparece la opción de eliminarlo del todo. Esto se exige tanto en la UI como en el backend (no solo ocultar el botón).

## Backend

Dos endpoints nuevos en `backend/src/routes/services.ts`, junto a las rutas existentes de servicios (`PUT /:id`, `DELETE /:id` soft-delete, `PATCH /:id/toggle`). Ambos con `authMiddleware` y verificación de que el servicio pertenece al profesional autenticado (mismo patrón ya usado en las rutas existentes de este archivo).

### `GET /api/services/:id/booking-counts`

Devuelve el conteo de citas asociadas a ese servicio, agrupado por estado, usando `prisma.booking.groupBy({ by: ['status'], where: { serviceId }, _count: true })`.

Respuesta:
```json
{
  "total": 3,
  "byStatus": { "PENDING": 2, "CONFIRMED": 0, "CANCELLED": 1, "COMPLETED": 0, "NO_SHOW": 0 }
}
```
Todos los valores de `byStatus` presentes siempre (con 0 si no hay ninguna en ese estado), para que el frontend no tenga que manejar claves ausentes.

### `DELETE /api/services/:id/permanent`

1. Busca el servicio por `id`, verifica que pertenece al usuario autenticado (mismo patrón que las rutas existentes) — si no existe o no es dueño, 404.
2. Si `service.isActive === true`, responde 400 con `{ error: 'El servicio debe estar desactivado antes de eliminarlo permanentemente.' }` — no borra nada.
3. Si `isActive === false`, ejecuta `prisma.service.delete({ where: { id } })`. Esto dispara el cascade real ya definido en el schema (`Booking`, y transitivamente `Notification`, `ReviewToken`, `Review` de cada booking, más `ServiceAvailability` del propio servicio).
4. Responde 204 sin contenido en éxito.

No se modifica `DELETE /:id` (soft-delete) ni `PATCH /:id/toggle` — siguen funcionando exactamente igual que hoy.

## Frontend

### `useServices.ts`

Dos funciones nuevas, mismo patrón que las existentes (`deleteService`, `toggleService`):
- `getServiceBookingCounts(id: string): Promise<{ total: number; byStatus: Record<BookingStatus, number> } | null>` — `GET /services/:id/booking-counts`, devuelve `null` si falla (el caller decide cómo mostrar el error).
- `permanentlyDeleteService(id: string): Promise<boolean>` — `DELETE /services/:id/permanent`, devuelve `true`/`false` según éxito; en caso de error, deja el mensaje del backend disponible para mostrarlo (mismo patrón de manejo de errores que `deleteService`/`toggleService` ya usan en este archivo).

### Nuevo componente modal: `DeleteServicePermanentlyModal`

No puede ser `window.confirm()` porque necesita un campo de texto (confirmación por nombre). Vive en `SchedulingConfig.tsx` junto a los demás componentes auxiliares de ese archivo (mismo patrón que `BtnPrimary`/`BtnGhost`/etc., o como función separada si el archivo ya está muy largo — decisión de implementación, no de diseño).

**Props:** `service: Service`, `onClose: () => void`, `onDeleted: () => void` (dispara refetch de la lista en `TabServicios`).

**Comportamiento al abrirse:**
1. Llama a `getServiceBookingCounts(service.id)` inmediatamente.
2. Mientras carga: muestra un estado de carga simple, el campo de texto y el botón "Eliminar" están deshabilitados.
3. Si falla la carga: muestra "No se pudo cargar la información de citas asociadas." con un botón "Reintentar" — el campo de texto y el botón "Eliminar" se mantienen deshabilitados hasta que la consulta tenga éxito. Nunca se permite confirmar a ciegas.
4. Si tiene éxito y `total === 0`: muestra "Este servicio no tiene citas asociadas."
5. Si tiene éxito y `total > 0`: muestra una lista de los estados con conteo mayor a 0, en español, ej.:
   > Esto también eliminará 3 citas asociadas: 2 pendientes, 1 cancelada.

   (orden fijo: pendientes, confirmadas, canceladas, completadas, no-show; se omiten los estados en 0; sin usar guion largo en ningún texto, por la regla del proyecto).
6. Debajo, siempre visible (independiente del resultado del paso anterior, pero deshabilitado hasta que el conteo haya cargado con éxito): un campo de texto con la instrucción "Escribe el nombre del servicio para confirmar: **{nombre del servicio}**", y el botón "Eliminar permanentemente" solo se habilita cuando el texto escrito coincide exactamente con `service.name`.
7. Al confirmar: llama a `permanentlyDeleteService(service.id)`. Si tiene éxito: cierra el modal, dispara `onDeleted()`, muestra un toast "Servicio eliminado permanentemente". Si falla: muestra el error del backend como toast (ej. el caso 400 de "debe estar desactivado", poco probable en uso normal pero posible por una carrera entre pestañas) y mantiene el modal abierto.
8. Botón "Cancelar" siempre disponible, cierra el modal sin hacer nada.

### Punto de entrada en `TabServicios`

En la lista de servicios, cuando el filtro muestra un servicio con `isActive === false` (vista "Inactivos" o "Todos" filtrando los inactivos), aparece un nuevo botón/icono "Eliminar permanentemente" junto a los controles existentes (Editar, reactivar). Al hacer clic, abre `DeleteServicePermanentlyModal` para ese servicio. El botón no aparece para servicios activos (coherente con el backend, que también lo rechaza).

## Fuera de alcance

- No se toca `DELETE /:id` (soft-delete) ni `PATCH /:id/toggle`.
- No se agrega ningún criterio automático de bloqueo por estado de citas (`COMPLETED` u otro) — fue una opción considerada y descartada a favor de la confirmación explícita.
- No se agrega una función de "deshacer" tras el borrado permanente — es irreversible por diseño, igual que cualquier `DELETE` real en este proyecto.
- No se cambia el comportamiento de desactivar/reactivar un servicio.

## Verificación

Sin suite de tests en este repo. Verificación empírica con servidores locales apuntando a la base de datos de producción compartida, igual que el resto de features de hoy:

1. Intentar `DELETE /services/:id/permanent` sobre un servicio **activo** → confirmar 400 y que el servicio sigue existiendo.
2. Desactivar un servicio de prueba sin citas asociadas → el botón "Eliminar permanentemente" aparece → abrir el modal → confirmar que dice "no tiene citas asociadas" → escribir el nombre → eliminar → confirmar que desaparece de la lista (incluso en "Todos"/"Inactivos") y que una consulta directa a la base de datos confirma que ya no existe la fila.
3. Desactivar un servicio de prueba CON citas asociadas de varios estados (ej. el servicio y la cita de prueba creados hoy mismo para "Beto") → abrir el modal → confirmar que el conteo por estado es correcto → el botón "Eliminar" debe estar deshabilitado hasta escribir el nombre exacto (probar con un nombre incorrecto primero) → confirmar → verificar que el servicio y sus citas desaparecen (incluida la cita de prueba de "Beto" si aplica).
4. Confirmar que un servicio real con historial de citas sigue pudiendo desactivarse y reactivarse sin problema (comportamiento existente, no debe romperse).
