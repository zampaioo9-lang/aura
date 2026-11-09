# Nombre completo en la suscripción de Revista + panel de Suscriptores en Admin

## Contexto

La caja de suscripción de Revista Aliax (`frontend/scripts/generate-blog.ts`, función `renderSubscribeBand()`) solo pide correo electrónico y audiencia (Terapeuta/Paciente). El modelo `NewsletterSubscriber` en Prisma no tiene campo de nombre. César quiere capturar el nombre completo para poder construir, con el tiempo, una base de datos real de usuarios interesados (pacientes y terapeutas) consultable desde su Admin — hoy esa lista no existe en ningún lado del Admin.

Esto es parte del sistema de newsletter ya construido en `[[project_aliax_revista_newsletter]]` (doble opt-in, 2 audiencias en Resend) — este cambio añade un campo al flujo existente y construye la vista de administración que faltaba, sin tocar el mecanismo de doble opt-in.

## Goal

1. El formulario público de suscripción pide "Nombre completo" (obligatorio) además de correo y audiencia.
2. El nombre se guarda en la base de datos y se usa como nombre real del contacto en Resend (hoy se usa el correo como nombre, por defecto).
3. El Admin tiene una sub-pestaña nueva "Suscriptores" dentro de la pestaña "Revista" (junto a "Articulos" y "Categorias") con: lista (nombre, correo, audiencia, estado, fecha), filtro por audiencia, exportar a CSV, dar de baja manual por fila.

## Arquitectura

**Base de datos:** se agrega `fullName String` (sin default, obligatorio para registros nuevos) al modelo `NewsletterSubscriber` en `backend/prisma/schema.prisma`. Desplegado con `prisma db push` (no `migrate dev` — ya establecido en este proyecto porque Neon no soporta el flujo de migraciones estándar). Los suscriptores que ya existen desde antes de este cambio quedan con `fullName` vacío (`""`) tras el `db push` (Postgres no permite agregar una columna `NOT NULL` sin default a una tabla con filas existentes sin un valor de relleno) — se usa `""` como relleno único para los registros viejos, y el Admin los muestra como "Sin nombre". No se intenta reconstruir el nombre real de esos registros.

**Formulario público (`generate-blog.ts`):** se agrega un `<input id="ra-subscribe-fullname" type="text" required>` arriba del campo de correo, y el JS del formulario lo incluye en el body del `POST /newsletter/subscribe` como `fullName`.

**Backend — validación y ruta pública:**
- `subscribeNewsletterSchema` (`backend/src/utils/validation.ts`): se agrega `fullName: z.string().trim().min(2, 'El nombre es obligatorio')`.
- `POST /api/newsletter/subscribe` (`backend/src/routes/newsletter.ts`): guarda `fullName` tanto al crear como al actualizar (reintento de suscripción) un `NewsletterSubscriber`.
- `addContact()` (`backend/src/services/audienceService.ts`) ya acepta `name` como segundo parámetro, pero la llamada actual en `GET /api/newsletter/confirm/:token` le pasa `subscriber.email` en vez de un nombre real (`addContact(subscriber.email, subscriber.email, ...)`). Se corrige para pasar `subscriber.fullName`, así el contacto en Resend muestra el nombre real en vez del correo repetido.

**Backend — endpoints nuevos para el Admin** (en `backend/src/routes/admin.ts`, mismo patrón de auth que el resto de rutas admin — `authMiddleware` + `adminMiddleware`):
- `GET /api/admin/newsletter/subscribers?audience=TERAPEUTAS|PACIENTES` (audience opcional, sin filtro = todos): devuelve `fullName, email, audience, status, createdAt, confirmedAt`, ordenado por `createdAt desc`.
- `GET /api/admin/newsletter/subscribers/export?audience=...`: mismo filtro, responde un CSV (`Content-Type: text/csv`, `Content-Disposition: attachment`) con columnas Nombre, Correo, Audiencia, Estado, Fecha de registro, Fecha de confirmación.
- `POST /api/admin/newsletter/subscribers/:id/unsubscribe`: marca el registro como `UNSUBSCRIBED` y llama a `removeContact()` (misma función que ya usa el endpoint público de baja) — mismo efecto que si la persona se diera de baja ella misma, disparado por un admin.

**Admin — nueva sub-pestaña "Suscriptores"** (`frontend/src/components/admin/AdminRevista.tsx`): se extiende el tipo de `subTab` de `'categorias' | 'articulos'` a `'categorias' | 'articulos' | 'suscriptores'`, se agrega el botón de tab (mismo patrón visual que los otros dos, ícono `Users` de lucide-react, ya usado en otras tablas de personas del Admin) y el bloque condicional con:
- Selector de audiencia (Todos / Terapeutas / Pacientes) que re-consulta la lista al cambiar.
- Tabla: Nombre, Correo, Audiencia (pill de color), Estado (pill: Pendiente ámbar / Confirmado verde / Baja gris), Fecha.
- Botón "Exportar CSV" arriba de la tabla (descarga directa vía `window.open` o `<a download>` al endpoint de export, respetando el filtro activo).
- Botón "Dar de baja" por fila (solo visible si el estado no es ya `UNSUBSCRIBED`), con confirmación simple antes de ejecutar.

## Fuera de alcance (no pedido, no se construye en este plan)

- Edición del nombre/correo de un suscriptor ya existente.
- Importación masiva de suscriptores.
- Volver a dar de alta a alguien que se dio de baja desde el Admin (ya existe el flujo de que la persona se vuelva a suscribir sola).
- Cambios al mecanismo de doble opt-in o a las plantillas de correo existentes.

## Testing / verificación

Este backend no tiene suite de pruebas automatizadas (mismo patrón ya establecido en el resto del proyecto). Verificación: `npx tsc -b` en frontend y backend, y verificación manual end-to-end en producción (suscribirse de prueba con nombre real, confirmar que aparece en el Admin con el nombre correcto, exportar CSV y revisar el contenido, dar de baja desde el Admin y confirmar que ya no aparece como activo y que se quitó de Resend) — datos de prueba se crean y se dan de baja/eliminan en la misma sesión de verificación.
