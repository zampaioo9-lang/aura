# Módulo: Control Total Admin (Feature Overrides)

## ¿Para qué sirve?

Permite al administrador dar acceso a módulos Pro individuales a usuarios Free, o bloquear el acceso de cualquier usuario — todo sin tocar código ni la base de datos directamente.

**Casos de uso:**
- Dar acceso a Historia Clínica a un psicólogo que está en proceso de pago
- Bloquear un usuario que viola términos de uso (sin borrar sus datos)
- Dar acceso a un usuario como demo o beta tester
- Resolver problemas de facturación manteniendo el acceso
- Partnerships o acuerdos especiales

---

## Arquitectura

### Base de datos (User model)

```prisma
blocked          Boolean   @default(false)
featureOverrides Json      @default("{}")
```

**`blocked`** — Verificado en cada request autenticado. Si es `true`, el middleware retorna `403 "Cuenta suspendida"`.

**`featureOverrides`** — JSON con módulos habilitados individualmente:
```json
{
  "historia_clinica": true,
  "templates_premium": true
}
```

### Middleware de Auth

Cada request autenticado verifica:
1. JWT válido → extrae userId
2. Consulta DB → user.blocked
3. Si bloqueado → 403
4. Si no → continúa

### Hook useFeature (Frontend)

```typescript
// frontend/src/hooks/useFeature.ts
export function useFeature(key: string): boolean {
  const { isPro, featureOverrides } = useAuth();
  return isPro || featureOverrides[key] === true;
}
```

**Lógica:** Un módulo es accesible si el usuario tiene plan Pro activo O si tiene el override individual activado.

---

## Keys de Módulos

| Key | Módulo | Dónde se aplica |
|-----|--------|-----------------|
| `historia_clinica` | HC Individual (wizard 9 pasos) | `Pacientes.tsx` — botón HC Individual |
| `terapia_pareja` | HC de Pareja (wizard 9 pasos) | `Pacientes.tsx` — botón HC de Pareja |
| `templates_premium` | Templates Bold/Elegant/Creative/Carbono | `ProfileCreate.tsx`, `ProfileEditor.tsx` |
| `pacientes` | Módulo Pacientes completo | `Dashboard.tsx` — prop `isPro` a `<Pacientes>` |
| `analytics` | Resumen de reservas | No bloqueado actualmente, siempre visible |
| `agenda` | Configuración de disponibilidad | `SchedulingConfig.tsx` — `effectiveIsPro` |
| `colores_premium` | Temas de color Pro | `Dashboard.tsx` — sidebar color circles |

---

## Endpoints del Admin

```
PATCH /api/admin/users/:id/block
  Body: { "blocked": true }
  Restricciones: No bloquear admins, no self-block

PATCH /api/admin/users/:id/features
  Body: { "historia_clinica": true, "terapia_pareja": false }
  Comportamiento: MERGE (no reemplaza el JSON completo)
  Keys válidas: historia_clinica, terapia_pareja, templates_premium,
                pacientes, analytics, agenda, colores_premium
```

---

## Cómo Agregar un Nuevo Módulo Controlable

Para agregar un nuevo módulo al sistema de control:

1. **Backend** — agregar la key a `VALID_KEYS` en `backend/src/routes/admin.ts`:
   ```typescript
   const VALID_KEYS = [
     'historia_clinica', 'terapia_pareja', 'templates_premium',
     'pacientes', 'analytics', 'agenda', 'colores_premium',
     'nuevo_modulo',  // ← agregar aquí
   ];
   ```

2. **AdminPanel** — agregar checkbox a `FEATURE_LABELS` en `AdminPanel.tsx`:
   ```typescript
   const FEATURE_LABELS = [
     ...
     { key: 'nuevo_modulo', label: 'Nombre del Módulo' },
   ];
   ```

3. **Componente** — usar `useFeature()` donde corresponda:
   ```tsx
   const canNuevoModulo = useFeature('nuevo_modulo');
   // Luego usar: isPro || canNuevoModulo
   ```

---

## Flujo de Datos

```
Admin hace click en checkbox
        ↓
PATCH /api/admin/users/:id/features { key: true/false }
        ↓
Backend merge + UPDATE user.featureOverrides en DB
        ↓
Admin ve el estado actualizado inmediatamente (optimistic UI)
        ↓
En la próxima acción del usuario afectado:
  GET /api/auth/me → retorna featureOverrides actualizado
  AuthContext → actualiza featureOverrides
  useFeature(key) → retorna true
  Módulo desbloqueado ✓
```
