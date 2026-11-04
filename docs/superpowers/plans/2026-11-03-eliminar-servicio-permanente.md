# Eliminar servicio permanentemente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir eliminar un servicio de Aliax de verdad (no solo desactivarlo), con un modal de confirmación que exige escribir el nombre del servicio, y solo disponible para servicios ya desactivados.

**Architecture:** Dos endpoints nuevos en `backend/src/routes/services.ts` (conteo de citas por estado + borrado real, separados del `DELETE /:id` existente que sigue siendo soft-delete). Dos funciones nuevas en el hook `useServices.ts`. Un modal nuevo en `SchedulingConfig.tsx` (`TabServicios`) que consulta el conteo, exige escribir el nombre exacto, y llama al borrado real.

**Tech Stack:** Express + Prisma (backend), React + TypeScript (frontend), mismos patrones ya establecidos en ambos archivos.

---

### Task 1: Backend — endpoints de conteo y borrado real

**Files:**
- Modify: `backend/src/routes/services.ts:154` (insertar después de la ruta `PATCH /:id/toggle`, antes del comentario `// POST /api/services/:id/images`)

El archivo ya tiene un helper `verifyServiceOwnership(serviceId, userId)` (línea 14) que busca el servicio, lanza 404 si no existe y 403 si no pertenece al usuario, y devuelve el servicio completo — se reutiliza tal cual, sin cambios.

- [ ] **Step 1: Confirmar el texto actual del archivo**

Leer `backend/src/routes/services.ts` líneas 130-160 y confirmar que termina así (la ruta `PATCH /:id/toggle` cierra en la línea 154, seguida de una línea en blanco y el comentario de la ruta de imágenes en la línea 156):

```ts
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// POST /api/services/:id/images — Add image URL to service images[]
```

Si el contenido difiere de esto, detente y describe qué encontraste en vez de adivinar dónde insertar.

- [ ] **Step 2: Insertar los dos endpoints nuevos**

Insertar el siguiente bloque entre el cierre de la ruta `PATCH /:id/toggle` (línea 154, `});`) y el comentario `// POST /api/services/:id/images` (línea 156), con una línea en blanco antes y después:

```ts
// GET /api/services/:id/booking-counts — Count of bookings by status (auth)
router.get('/:id/booking-counts', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyServiceOwnership(req.params.id, req.userId!);

    const grouped = await prisma.booking.groupBy({
      by: ['status'],
      where: { serviceId: req.params.id },
      _count: { status: true },
    });

    const byStatus = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0, NO_SHOW: 0 };
    let total = 0;
    for (const row of grouped) {
      byStatus[row.status] = row._count.status;
      total += row._count.status;
    }

    res.json({ total, byStatus });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id/permanent — Hard delete (auth, solo si ya está desactivado)
router.delete('/:id/permanent', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const service = await verifyServiceOwnership(req.params.id, req.userId!);

    if (service.isActive) {
      throw new AppError(400, 'El servicio debe estar desactivado antes de eliminarlo permanentemente.');
    }

    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
```

Este patrón de `_count: { status: true }` en `groupBy` ya se usa en `backend/src/routes/admin.ts:37` (`prisma.booking.groupBy({ by: ['status'], _count: { status: true } })`, consumido como `row._count.status`) — se sigue el mismo estilo exacto, no el atajo `_count: true`.

No se toca la ruta `DELETE /:id` (soft-delete, línea 117) ni `PATCH /:id/toggle` (línea 132).

- [ ] **Step 3: Verificar que compila**

Run: `cd backend && npx tsc --noEmit`
Expected: sin salida, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/services.ts
git commit -m "feat: add booking-counts and permanent-delete endpoints for services

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Frontend — funciones nuevas en `useServices.ts`

**Files:**
- Modify: `frontend/src/hooks/useServices.ts`

- [ ] **Step 1: Confirmar el texto actual del archivo**

Leer `frontend/src/hooks/useServices.ts` completo (152 líneas) y confirmar que `toggleService` (líneas 110-130) sigue teniendo esta forma exacta, y que el `return` final (líneas 140-151) sigue listando `services, stats, loading, error, setError, createService, updateService, deleteService, toggleService, refetch`. Si difiere, detente y describe qué encontraste.

- [ ] **Step 2: Agregar el tipo `ServiceBookingCounts`**

Insertar después de la interface `UpdateServiceData` (que cierra en la línea 50) y antes de `export function useServices()` (línea 52):

```ts
export interface ServiceBookingCounts {
  total: number;
  byStatus: {
    PENDING: number;
    CONFIRMED: number;
    CANCELLED: number;
    COMPLETED: number;
    NO_SHOW: number;
  };
}
```

- [ ] **Step 3: Agregar `getServiceBookingCounts` y `permanentlyDeleteService`**

Insertar después de `toggleService` (que cierra en la línea 130) y antes de `refetch` (línea 132):

```ts
  const getServiceBookingCounts = useCallback(async (id: string): Promise<ServiceBookingCounts | null> => {
    try {
      const res = await api.get<ServiceBookingCounts>(`/services/${id}/booking-counts`);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  const permanentlyDeleteService = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/services/${id}/permanent`);
      setServices(prev => prev.filter(s => s.id !== id));
      setStats(prev => prev ? { ...prev, total: prev.total - 1, inactive: prev.inactive - 1 } : prev);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al eliminar el servicio permanentemente';
      setError(msg);
      throw new Error(msg);
    }
  }, []);
```

`getServiceBookingCounts` no toca el estado del hook (`services`/`stats`/`error`) porque es una consulta de solo lectura usada dentro del modal de confirmación — si falla, devuelve `null` y el modal decide cómo mostrarlo (no es un error de la lista completa de servicios). `permanentlyDeleteService` sigue el mismo patrón que `deleteService`/`toggleService`: en éxito actualiza el estado local directamente (aquí removiendo el servicio de la lista, ya que fue borrado de verdad, no desactivado); en error, guarda el mensaje en `error` y lo relanza como `Error` para que el componente que llama pueda mostrarlo en su propio toast.

- [ ] **Step 4: Exponer las funciones nuevas en el `return`**

Reemplazar el `return` final:

```ts
  return {
    services,
    stats,
    loading,
    error,
    setError,
    createService,
    updateService,
    deleteService,
    toggleService,
    refetch,
  };
```

por:

```ts
  return {
    services,
    stats,
    loading,
    error,
    setError,
    createService,
    updateService,
    deleteService,
    toggleService,
    getServiceBookingCounts,
    permanentlyDeleteService,
    refetch,
  };
```

- [ ] **Step 5: Verificar que compila**

Run: `cd frontend && npx tsc -b`
Expected: sin salida, exit code 0. (Usar `tsc -b`, no `tsc --noEmit` — en este proyecto `--noEmit` a secas no revisa nada por el `tsconfig` con `files: []` + `references`.)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useServices.ts
git commit -m "feat: add getServiceBookingCounts and permanentlyDeleteService to useServices

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — modal de confirmación y botón en la lista de Servicios

**Files:**
- Modify: `frontend/src/pages/SchedulingConfig.tsx`

Este archivo es grande (1700+ líneas). Antes de cada edición de este task, releer la zona exacta indicada — las líneas citadas aquí reflejan el estado del archivo tras los merges de hoy (commit `5d9241b`), pero pueden haberse movido si Task 1 o Task 2 no tocan este archivo (no deberían, pero confirma antes de editar).

- [ ] **Step 1: Agregar el icono `Trash2` al import de `lucide-react`**

Leer la línea 3 del archivo y confirmar que es:

```tsx
import { ArrowLeft, X, Plus, Power, Sparkles, GripVertical, Pencil, CalendarDays, Layers, Ban, Settings2, Bell, ChevronRight } from 'lucide-react';
```

Reemplazar por:

```tsx
import { ArrowLeft, X, Plus, Power, Sparkles, GripVertical, Pencil, CalendarDays, Layers, Ban, Settings2, Bell, ChevronRight, Trash2 } from 'lucide-react';
```

- [ ] **Step 2: Importar el tipo `ServiceBookingCounts`**

Leer la línea 16 del archivo y confirmar que es:

```tsx
import { useServices, type Service } from '../hooks/useServices';
```

Reemplazar por:

```tsx
import { useServices, type Service, type ServiceBookingCounts } from '../hooks/useServices';
```

- [ ] **Step 3: Agregar soporte de `disabled` a `BtnDanger`**

Leer las líneas 130-137 del archivo y confirmar que `BtnDanger` sigue siendo:

```tsx
function BtnDanger({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'rgba(255,101,132,0.15)', color: '#ff6584', border: '1px solid rgba(255,101,132,0.3)',
      borderRadius: 8, cursor: 'pointer', padding: '6px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
    }}>{children}</button>
  );
}
```

Reemplazar por (mismo patrón ya usado en `BtnPrimary`/`BtnGhost` de este archivo para `disabled`):

```tsx
function BtnDanger({ onClick, children, disabled = false }: { onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'rgba(255,101,132,0.15)', color: '#ff6584', border: '1px solid rgba(255,101,132,0.3)',
      borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
      opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  );
}
```

- [ ] **Step 4: Agregar el componente `DeleteServicePermanentlyModal`**

Insertar inmediatamente después del cierre de `BtnDanger` (del Step 3) y antes de `function FormSelect(...)`:

```tsx
function DeleteServicePermanentlyModal({ service, getBookingCounts, onDeletePermanently, onClose, onDeleted }: {
  service: Service;
  getBookingCounts: (id: string) => Promise<ServiceBookingCounts | null>;
  onDeletePermanently: (id: string) => Promise<boolean>;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [counts, setCounts] = useState<ServiceBookingCounts | null>(null);
  const [countsError, setCountsError] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadCounts = useCallback(async () => {
    setLoadingCounts(true);
    setCountsError(false);
    const result = await getBookingCounts(service.id);
    if (result) setCounts(result); else setCountsError(true);
    setLoadingCounts(false);
  }, [service.id, getBookingCounts]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const STATUS_LABELS: [keyof ServiceBookingCounts['byStatus'], string][] = [
    ['PENDING', 'pendiente'], ['CONFIRMED', 'confirmada'], ['CANCELLED', 'cancelada'],
    ['COMPLETED', 'completada'], ['NO_SHOW', 'no-show'],
  ];

  const countsSummary = counts
    ? STATUS_LABELS
        .filter(([key]) => counts.byStatus[key] > 0)
        .map(([key, label]) => `${counts.byStatus[key]} ${label}${counts.byStatus[key] === 1 ? '' : 's'}`)
        .join(', ')
    : '';

  const canConfirm = !loadingCounts && !countsError && confirmText === service.name;

  const handleDelete = async () => {
    if (!canConfirm) return;
    setDeleting(true);
    try {
      await onDeletePermanently(service.id);
      toast('Servicio eliminado permanentemente');
      onDeleted();
    } catch (err: any) {
      toast(err.message || 'Error al eliminar el servicio', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sc-side)', border: '1px solid var(--sc-border)', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.3)', width: '100%', maxWidth: 440, padding: 24 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17, color: 'var(--sc-text)', marginBottom: 8 }}>
          Eliminar "{service.name}" permanentemente
        </div>

        {loadingCounts && (
          <p style={{ fontSize: 13, color: 'var(--sc-muted)', margin: '16px 0' }}>Cargando información de citas asociadas...</p>
        )}

        {!loadingCounts && countsError && (
          <div style={{ margin: '16px 0' }}>
            <p style={{ fontSize: 13, color: '#ff6584' }}>No se pudo cargar la información de citas asociadas.</p>
            <BtnGhost small onClick={loadCounts}>Reintentar</BtnGhost>
          </div>
        )}

        {!loadingCounts && !countsError && counts && (
          <p style={{ fontSize: 13, color: 'var(--sc-muted)', margin: '16px 0', lineHeight: 1.5 }}>
            {counts.total === 0
              ? 'Este servicio no tiene citas asociadas.'
              : `Esto también eliminará ${counts.total} cita${counts.total === 1 ? '' : 's'} asociada${counts.total === 1 ? '' : 's'}: ${countsSummary}.`}
          </p>
        )}

        <div style={{ marginTop: 8, marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--sc-muted)', display: 'block', marginBottom: 6 }}>
            Escribe el nombre del servicio para confirmar: <strong style={{ color: 'var(--sc-text)' }}>{service.name}</strong>
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            disabled={loadingCounts || countsError}
            style={{ background: 'var(--sc-inner)', border: '1px solid var(--sc-border)', borderRadius: 8, padding: '9px 12px', color: 'var(--sc-text)', fontFamily: 'DM Sans', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
          <BtnDanger onClick={handleDelete} disabled={!canConfirm || deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar permanentemente'}
          </BtnDanger>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar que compila (antes de seguir con la integración en `TabServicios`)**

Run: `cd frontend && npx tsc -b`
Expected: sin salida, exit code 0. El componente nuevo aún no se usa en ningún lado, así que este paso solo confirma que no tiene errores de tipos por sí mismo.

- [ ] **Step 6: Destructurar las funciones nuevas del hook en `TabServicios`**

Leer la línea 445 del archivo (dentro de `function TabServicios`) y confirmar que es:

```tsx
  const { services, stats, loading, createService, updateService, toggleService } = useServices();
```

Reemplazar por:

```tsx
  const { services, stats, loading, createService, updateService, toggleService, getServiceBookingCounts, permanentlyDeleteService } = useServices();
```

- [ ] **Step 7: Agregar el estado `deletingService`**

Leer la línea 517 del archivo y confirmar que es:

```tsx
  const [togglingId, setTogglingId] = useState<string | null>(null);
```

Reemplazar por:

```tsx
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
```

- [ ] **Step 8: Agregar el botón "Eliminar permanentemente" en la fila de cada servicio inactivo**

Leer las líneas 883-898 del archivo (el botón "Activar/Desactivar" dentro del `.map` de servicios) y confirmar que terminan así:

```tsx
              {/* Botón Activar/Desactivar */}
              <button
                onClick={() => handleToggle(s.id)}
                disabled={togglingId === s.id}
                title={s.isActive ? 'Desactivar' : 'Activar'}
                style={{
                  flexShrink: 0, background: s.isActive ? 'rgba(255,101,132,0.12)' : 'rgba(67,217,173,0.12)',
                  border: `1px solid ${s.isActive ? 'rgba(255,101,132,0.3)' : 'rgba(67,217,173,0.3)'}`,
                  borderRadius: 8, cursor: 'pointer', padding: '6px 10px', color: s.isActive ? '#ff6584' : '#43d9ad',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'DM Sans',
                  opacity: togglingId === s.id ? 0.5 : 1,
                }}
              >
                <Power size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

    </>
  );
}
```

Reemplazar por (agrega el botón nuevo justo después del botón de Activar/Desactivar, y el modal al final, antes de `</>`):

```tsx
              {/* Botón Activar/Desactivar */}
              <button
                onClick={() => handleToggle(s.id)}
                disabled={togglingId === s.id}
                title={s.isActive ? 'Desactivar' : 'Activar'}
                style={{
                  flexShrink: 0, background: s.isActive ? 'rgba(255,101,132,0.12)' : 'rgba(67,217,173,0.12)',
                  border: `1px solid ${s.isActive ? 'rgba(255,101,132,0.3)' : 'rgba(67,217,173,0.3)'}`,
                  borderRadius: 8, cursor: 'pointer', padding: '6px 10px', color: s.isActive ? '#ff6584' : '#43d9ad',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'DM Sans',
                  opacity: togglingId === s.id ? 0.5 : 1,
                }}
              >
                <Power size={13} />
              </button>
              {/* Botón Eliminar permanentemente (solo si está inactivo) */}
              {!s.isActive && (
                <button
                  onClick={e => { e.stopPropagation(); setDeletingService(s); }}
                  title="Eliminar permanentemente"
                  style={{
                    flexShrink: 0, background: 'rgba(255,101,132,0.12)', border: '1px solid rgba(255,101,132,0.3)',
                    borderRadius: 8, cursor: 'pointer', padding: '6px 10px', color: '#ff6584',
                    display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'DM Sans',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {deletingService && (
        <DeleteServicePermanentlyModal
          service={deletingService}
          getBookingCounts={getServiceBookingCounts}
          onDeletePermanently={permanentlyDeleteService}
          onClose={() => setDeletingService(null)}
          onDeleted={() => setDeletingService(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 9: Verificar que compila**

Run: `cd frontend && npx tsc -b`
Expected: sin salida, exit code 0.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/pages/SchedulingConfig.tsx
git commit -m "feat: add permanent service deletion modal and trigger button

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Verificación end-to-end manual

**NO delegar a un subagente de implementación — requiere servidores locales y confirmación del usuario sobre comportamiento real, igual que la verificación de la feature de Configurar Agenda de hoy.**

Con servidores locales (backend y frontend) apuntando a la base de datos de producción compartida:

1. Ir a Configurar Agenda → Servicios, con un servicio de prueba **activo**. Confirmar que el botón "Eliminar permanentemente" NO aparece mientras está activo.
2. Desactivarlo. Confirmar que el botón "Eliminar permanentemente" aparece junto a Editar y el botón de encendido.
3. Clic en "Eliminar permanentemente" sobre un servicio de prueba **sin citas asociadas** → el modal debe mostrar "Este servicio no tiene citas asociadas." → el botón "Eliminar permanentemente" del modal debe estar deshabilitado hasta escribir el nombre exacto → escribirlo mal primero (confirmar que sigue deshabilitado) → escribirlo bien → confirmar que se habilita → eliminar → confirmar que el servicio desaparece de la lista (incluso en el filtro "Todos"/"Inactivos").
4. Repetir con un servicio de prueba **con al menos una cita asociada** (ej. los servicios de prueba creados hoy mismo con la cita de "Beto") → confirmar que el modal muestra el conteo correcto por estado (ej. "Esto también eliminará 1 cita asociada: 1 pendiente.") → eliminar → confirmar en la base de datos (o en "Mis Citas"/calendario del profesional) que la cita también desapareció.
5. Intentar `DELETE /services/:id/permanent` directamente sobre un servicio **activo** (ej. con curl o Postman, usando un token válido) → confirmar 400 con el mensaje "El servicio debe estar desactivado antes de eliminarlo permanentemente." y que el servicio sigue existiendo.
6. Confirmar que un servicio real con historial de citas sigue pudiendo desactivarse y reactivarse sin problema (comportamiento existente, no debe romperse).
7. Cerrar el modal con "Cancelar" a medio escribir el nombre → confirmar que no se eliminó nada y que al reabrirlo el campo de texto vuelve a estar vacío.
