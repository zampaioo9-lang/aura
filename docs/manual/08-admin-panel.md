# Módulo: Panel de Administración

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/AdminPanel.tsx` | Panel de administración completo |
| `backend/src/routes/admin.ts` | Endpoints admin |
| `backend/src/middleware/adminAuth.ts` | Middleware de verificación admin |

---

## Acceso

- Ruta: `/admin`
- Requiere `user.isAdmin === true` en la DB
- El campo `isAdmin` se setea manualmente en la DB para el usuario administrador

---

## Secciones del Panel

### 1. Resumen (tablero de estadísticas)

Un panel unificado y compacto con:

**Métricas principales** (5 columnas):
| Métrica | Color |
|---------|-------|
| Profesionales (total + nuevos este mes) | Teal |
| Plan PRO (usuarios activos pagando) | Verde esmeralda |
| Perfiles publicados | Azul |
| Clientes únicos (que reservaron) | Violeta |
| Reservas totales | Naranja |

**Estado de reservas** (fila compacta con dots de colores):
- Pendientes (amarillo), Confirmadas (verde), Completadas (teal), Canceladas (rojo), No show (gris)

### 2. Tabla de Usuarios

Lista paginada de todos los usuarios con:
- Nombre, email, plan, tipo (profesional/sin perfil), reservas, email bienvenida, rol
- Búsqueda por nombre o email
- Paginación (15 por página)
- Fila expandible con detalle completo

**Al expandir un usuario se muestra:**
- Datos básicos (nombre, email, teléfono, fecha de registro)
- Detalle del plan (tipo, expiración, método de pago)
- Perfiles creados (slug, estado de publicación, servicios, reservas)
- Email de bienvenida (enviado/no enviado + botón reenviar)
- **Control de Acceso** (ver sección abajo)
- Botón de eliminar usuario

### 3. Newsletter (Resend Broadcasts)

Envío de newsletter a toda la audiencia de Resend con tracking de aperturas y clics.

Campos: nombre interno, asunto del email, HTML del contenido.

También hay un botón para sincronizar usuarios existentes como contactos en Resend Audiences.

### 4. Anuncios (Email directo)

Envío directo a grupos de usuarios (todos / solo Pro / solo trial) usando templates simples de texto.

Audiencias disponibles:
- `all` — todos los usuarios
- `pro` — usuarios con plan Pro
- `trial` — usuarios en periodo de prueba

---

## Control de Acceso por Usuario

Dentro del panel expandido de cada usuario (solo si no es admin):

### Bloqueo de cuenta
- Si el usuario está bloqueado: banner rojo "CUENTA BLOQUEADA" + botón "Desbloquear"
- Si no está bloqueado: botón "Bloquear cuenta"
- El bloqueo actúa en el **siguiente request** del usuario bloqueado

### Módulos individuales (7 checkboxes)

| Checkbox | Key | Módulo que desbloquea |
|----------|-----|----------------------|
| HC Individual | `historia_clinica` | Wizard HC individual (9 pasos) |
| HC de Pareja | `terapia_pareja` | Wizard HC de pareja (9 pasos) |
| Pacientes | `pacientes` | Módulo completo de pacientes |
| Analytics | `analytics` | Resumen de reservas en dashboard |
| Agenda | `agenda` | Configuración de disponibilidad |
| Templates Premium | `templates_premium` | Bold, Elegant, Creative, Carbono |
| Colores Premium | `colores_premium` | Temas de color Pro en sidebar |

**Comportamiento:**
- Cada checkbox hace `PATCH` inmediato al hacer click
- Sin botón de guardar — los cambios son instantáneos
- Los overrides hacen merge, no reemplazan (cambiar un módulo no afecta los demás)

### Acciones rápidas
- **"Dar todo Pro"** — activa los 7 módulos de una vez
- **"Quitar todo"** — desactiva los 7 módulos
- **"Bloquear cuenta"** — bloquea el login

---

## Estadísticas Disponibles

```
GET /api/admin/stats → {
  users: { total, newThisMonth, inTrial, paid, withDiscount },
  profiles: { total },
  clients: { total },
  bookings: { total, pending, confirmed, cancelled, completed, noShow },
  notifications: { sent }
}
```

---

## Acciones sobre Usuarios

```
GET    /api/admin/users              → Lista paginada
DELETE /api/admin/users/:id          → Eliminar (no admins, no self)
POST   /api/admin/users/:id/welcome-email → Enviar/reenviar email bienvenida
PATCH  /api/admin/users/:id/block    → { blocked: boolean }
PATCH  /api/admin/users/:id/features → { key: boolean, ... }
```

---

## Paleta de Colores del AdminPanel

El AdminPanel usa el mismo sistema de temas teal del dashboard del usuario. Soporta modo oscuro y claro con toggle.
