# Pacientes — botón "+ Nueva cita" en la pestaña Citas — Design Spec

**Fecha:** 2026-11-03
**Depende de:** `frontend/src/components/dashboard/NewBookingModal.tsx` (ya existe, ya usado por `ProfessionalCalendar.tsx`), `frontend/src/components/patients/PatientBookings.tsx` (ya existe, solo lectura hoy), `frontend/src/pages/Pacientes.tsx`, `frontend/src/pages/Dashboard.tsx`.

## Resumen

Hoy, la pestaña "Citas" del detalle de un paciente (dentro de Pacientes → seleccionar un paciente → pestaña Citas) solo muestra el historial de citas de ese paciente (`PatientBookings.tsx`), sin forma de crear una cita nueva desde ahí — el profesional tiene que ir a la Agenda general y buscar/escribir el nombre del paciente a mano en el modal de creación (`NewBookingModal.tsx`), que ya soporta un prop `prefillClient` pensado exactamente para este caso pero que nadie usa todavía.

Se agrega un botón "+ Nueva cita" arriba de "Historial de citas" que abre ese mismo modal, con el nombre/email/teléfono del paciente ya rellenados, sin tocar la lógica de disponibilidad/horarios/servicios que el modal ya resuelve sola.

## Alcance

### 1. Cadena de props — `profiles` hasta `Pacientes.tsx`

`Dashboard.tsx` ya mantiene `profiles` en estado (usado por `ProfessionalCalendar` y otras pestañas) pero no lo pasa a `<Pacientes>` en ninguno de sus 2 puntos de render (vista móvil `mobileSection === 'pacientes'`, vista escritorio `activeTab === 'pacientes'`). Se agrega `profiles={profiles}` en ambos.

`Pacientes.tsx` agrega `profiles: { id: string }[]` a sus props y lo reenvía a `<PatientBookings>` cuando `detailTab === 'citas'`, junto con `phone={selected.phone}` (hoy solo pasa `email`/`name`/`C`).

### 2. `PatientBookings.tsx` — dueño del botón, el modal y el refresco

Se mantiene como el componente responsable de toda la pestaña Citas de un paciente (lectura + ahora también creación), en vez de repartir esa responsabilidad con `Pacientes.tsx`.

- **Nuevos props:** `phone?: string`, `profiles: { id: string }[]`.
- **Nuevo estado:** `services` (cargado vía `GET /services/me`, filtrado a `isActive`, mismo patrón que `ProfessionalCalendar.tsx`) y `showModal: boolean`. Los servicios se cargan en el mismo `useEffect` que ya carga las reservas (una sola vez al montar, cuando se entra a la pestaña), no de forma perezosa — mismo costo que ya paga `ProfessionalCalendar` y evita un parpadeo de carga extra al primer clic en el botón.
- **Botón "+ Nueva cita":** fila nueva arriba del header actual ("Historial de citas" + contador de sesiones), mismo estilo de botón pill ya usado en el resto del dashboard (fondo `C.accent`, ícono `Plus` de lucide-react, texto blanco).
- **Al hacer clic:** abre `NewBookingModal` con:
  - `slot = { date: <hoy, formato YYYY-MM-DD>, time: '' }` — el modal ya autoselecciona la primera hora disponible al cargar servicio+fecha, no hace falta precalcularla aquí.
  - `prefillClient = { name, email, phone: phone ?? '' }`.
  - `services` (ya cargados, filtrados a activos) y `profiles` (recibidos por prop).
  - `onClose` cierra el modal sin más acción.
  - `onCreated` cierra el modal y vuelve a pedir el historial de citas de este paciente (reutiliza la misma función de carga que ya corre en el `useEffect` inicial, no hace falta recargar toda la pestaña ni la página).

### 3. Fuera de alcance (explícito)

- No se modifica `NewBookingModal.tsx` — se usa tal cual ya existe, con los props que ya soporta.
- No se agrega ninguna validación nueva (servicios activos, disponibilidad, modalidad, etc.) — todo eso ya lo resuelve el modal internamente.
- No se cambia el mensaje "Agrega un email en la pestaña Datos..." que ya existe en `Pacientes.tsx` para cuando el paciente no tiene email — el botón nuevo solo puede aparecer cuando `PatientBookings` se renderiza, y eso ya está condicionado a que exista `selected.email`.
- No se toca el flujo de creación de citas desde la Agenda general (`ProfessionalCalendar.tsx`) — sigue funcionando exactamente igual.

## Verificación

Sin suite de tests en este repo. Verificación empírica, con servidores locales apuntando a la base de datos de producción compartida:

1. Entrar a un paciente real con email, pestaña Citas → debe verse el botón "+ Nueva cita" arriba del historial.
2. Clic en el botón → se abre el modal con nombre/email/teléfono ya rellenados, editable si hace falta.
3. Elegir servicio, fecha, hora → crear la cita → debe aparecer de inmediato en "Próximas" sin recargar la página, y el modal debe cerrarse solo (como ya hace al crear desde la Agenda).
4. Confirmar que la cita creada así también aparece en la Agenda general (`ProfessionalCalendar`) del profesional, en la fecha/hora correctas — prueba de que usa el mismo endpoint real, no uno nuevo.
5. Probar con un paciente sin servicios activos configurados → el botón debe abrir el modal, que ya muestra "No hay servicios activos." y deshabilita "Crear cita" (comportamiento heredado del modal, no nuevo).
