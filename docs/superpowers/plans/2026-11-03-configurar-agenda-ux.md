# Configurar Agenda UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "Aplicar a todos los días" en Disponibilidad (replica el horario de un día a los demás días laborables), y hacer que el horario específico de un servicio (`ServiceAvailability`) sea configurable desde el mismo formulario de "Nuevo servicio", no solo al editar.

**Architecture:** Ambos cambios viven en `frontend/src/pages/SchedulingConfig.tsx` (archivo único, 2 funciones de pestaña distintas: `TabDisponibilidad` y `TabServicios`), reusando endpoints de backend que ya existen (`POST /api/availability/bulk`, `POST /api/service-availability/bulk`) — sin cambios de backend.

**Tech Stack:** React + TypeScript, mismo patrón de fetch con axios (`api` de `../../api/client`) y estilos inline ya usado en todo el archivo.

---

### Task 1: Replicar horario a todos los días laborables (Disponibilidad)

**Files:**
- Modify: `frontend/src/pages/SchedulingConfig.tsx` (función `BtnGhost`, línea ~120; función `TabDisponibilidad`, líneas ~203-354)

- [ ] **Step 1: Agregar soporte de `disabled` a `BtnGhost`**

`BtnGhost` (usado en varias partes del archivo) hoy no soporta un prop `disabled` — lo necesitamos para el botón nuevo. `BtnPrimary` (líneas 108-118) ya tiene exactamente este patrón; lo replicamos.

Change:
```tsx
function BtnGhost({ onClick, children, small = false }: { onClick?: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--sc-inner)', color: 'var(--sc-text)', border: '1px solid var(--sc-border)', borderRadius: 8, cursor: 'pointer',
      padding: small ? '6px 12px' : '10px 20px', fontSize: small ? 13 : 14, fontFamily: 'DM Sans, sans-serif',
      fontWeight: 500, transition: 'all .15s',
    }}>{children}</button>
  );
}
```
to:
```tsx
function BtnGhost({ onClick, children, small = false, disabled = false }: { onClick?: () => void; children: React.ReactNode; small?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'var(--sc-inner)', color: 'var(--sc-text)', border: '1px solid var(--sc-border)', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
      padding: small ? '6px 12px' : '10px 20px', fontSize: small ? 13 : 14, fontFamily: 'DM Sans, sans-serif',
      fontWeight: 500, transition: 'all .15s', opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  );
}
```

- [ ] **Step 2: Agregar `handleApplyToAllDays` en `TabDisponibilidad`**

Change:
```tsx
  const handleApplyTemplate = async (templateSlots: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
    await Promise.all(slots.map(s => api.delete(`/availability/${s.id}`)));
    await api.post('/availability/bulk', { profileId, slots: templateSlots });
    toast('Plantilla aplicada');
    await fetchSlots();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div style={{ width: 32, height: 32, border: '3px solid var(--sc-accent-30)', borderTopColor: 'var(--sc-accent-text)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;
```
to:
```tsx
  const handleApplyTemplate = async (templateSlots: { dayOfWeek: number; startTime: string; endTime: string }[]) => {
    await Promise.all(slots.map(s => api.delete(`/availability/${s.id}`)));
    await api.post('/availability/bulk', { profileId, slots: templateSlots });
    toast('Plantilla aplicada');
    await fetchSlots();
  };

  // Copia las franjas visibles del día seleccionado a todos los demás días laborables,
  // sobrescribiendo lo que cada uno tuviera antes. Reusa el mismo patrón de borrar-y-crear
  // que ya usan handleSave/handleApplyTemplate.
  const handleApplyToAllDays = async () => {
    if (selectedDay === null) return;
    const otherDays = activeDays.filter(d => d !== selectedDay);
    if (otherDays.length === 0) return;
    const dayLabels = otherDays.map(d => DAY_NAMES_SHORT[d]).join(', ');
    if (!confirm(`Esto reemplazará el horario de ${dayLabels} con el horario de ${DAY_NAMES_SHORT[selectedDay]}. ¿Continuar?`)) return;
    setSaving(true);
    try {
      const existing = slots.filter(s => activeDays.includes(s.dayOfWeek));
      await Promise.all(existing.map(s => api.delete(`/availability/${s.id}`)));
      if (franjas.length > 0) {
        const bulkSlots = activeDays.flatMap(day => franjas.map(f => ({ dayOfWeek: day, startTime: f.startTime, endTime: f.endTime })));
        await api.post('/availability/bulk', { profileId, slots: bulkSlots });
      }
      toast(`Horario aplicado a ${activeDays.length} días`);
      fetchSlots();
    } catch (err: any) { toast(err.response?.data?.error || 'Error al aplicar', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><div style={{ width: 32, height: 32, border: '3px solid var(--sc-accent-30)', borderTopColor: 'var(--sc-accent-text)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;
```

- [ ] **Step 3: Agregar el botón junto a "Guardar"**

Change:
```tsx
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--sc-border)', gap: 8, flexWrap: 'wrap' }}>
              <BtnGhost small onClick={addFranja}>+ Añadir franja</BtnGhost>
              <BtnPrimary onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</BtnPrimary>
            </div>
          </>
        )}
      </Card>

      {/* Resumen semanal */}
```
to:
```tsx
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--sc-border)', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <BtnGhost small onClick={addFranja}>+ Añadir franja</BtnGhost>
                <BtnGhost small onClick={handleApplyToAllDays} disabled={saving || activeDays.filter(d => d !== selectedDay).length === 0}>
                  Aplicar a todos los días
                </BtnGhost>
              </div>
              <BtnPrimary onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</BtnPrimary>
            </div>
          </>
        )}
      </Card>

      {/* Resumen semanal */}
```

- [ ] **Step 4: Verificar que compila**

```bash
cd frontend && npx tsc -b
```
Expected: sin errores. IMPORTANTE: usar `npx tsc -b`, no `npx tsc --noEmit` (es un no-op en este repo).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SchedulingConfig.tsx
git commit -m "feat: add Aplicar a todos los días button to Disponibilidad"
```

---

### Task 2: Horario de servicio configurable desde "Nuevo servicio" (Servicios)

**Files:**
- Modify: `frontend/src/pages/SchedulingConfig.tsx` (función `TabServicios`, líneas ~408-905)

- [ ] **Step 1: Resetear el horario del servicio al abrir el modal en modo Crear**

Hoy, `activeDays`/`selectedDay`/`franjasByDay` solo se resetean dentro de `loadSlots()`, llamada únicamente desde `openEdit`. Si se abre "Nuevo servicio" después de haber editado otro servicio, estos estados quedan con los valores del servicio anterior — un bug real que se vuelve más grave ahora que el modo Crear también usa estos datos para guardar.

Change:
```tsx
  useEffect(() => {
    if (modalOpen && editingService) {
      setFormData({ name: editingService.name, description: editingService.description || '', price: String(editingService.price), currency: editingService.currency, durationMinutes: editingService.durationMinutes, sessionModality: editingService.sessionModality || '' });
      setFormImage(editingService.image || '');
      setFormImagePosition(editingService.imagePosition || '50% 50%');
    } else if (modalOpen) {
      setFormData({ name: '', description: '', price: '0', currency: 'EUR', durationMinutes: 60, sessionModality: '' });
      setFormImage('');
      setFormImagePosition('50% 50%');
    }
    setFormError('');
  }, [modalOpen, editingService]);
```
to:
```tsx
  useEffect(() => {
    if (modalOpen && editingService) {
      setFormData({ name: editingService.name, description: editingService.description || '', price: String(editingService.price), currency: editingService.currency, durationMinutes: editingService.durationMinutes, sessionModality: editingService.sessionModality || '' });
      setFormImage(editingService.image || '');
      setFormImagePosition(editingService.imagePosition || '50% 50%');
    } else if (modalOpen) {
      setFormData({ name: '', description: '', price: '0', currency: 'EUR', durationMinutes: 60, sessionModality: '' });
      setFormImage('');
      setFormImagePosition('50% 50%');
      setActiveDays([]);
      setSelectedDay(null);
      setFranjasByDay({});
    }
    setFormError('');
  }, [modalOpen, editingService]);
```

- [ ] **Step 2: Guardar el horario configurado al crear el servicio**

Change:
```tsx
  const handleInlineSubmit = async () => {
    if (formData.name.trim().length < 3) { setFormError('El nombre debe tener al menos 3 caracteres.'); return; }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) { setFormError('El precio no puede ser negativo.'); return; }
    setModalLoading(true);
    try {
      const payload = { name: formData.name.trim(), description: formData.description.trim() || undefined, price, currency: formData.currency, durationMinutes: formData.durationMinutes, sessionModality: formData.sessionModality || undefined, image: formImage || undefined, imagePosition: formImage ? formImagePosition : undefined, profileId };
      if (modalMode === 'create') { await createService(payload); toast('Servicio creado'); }
      else if (editingService) { await updateService(editingService.id, payload); toast('Servicio actualizado'); }
      setModalOpen(false);
    } catch (err: any) { setFormError(err.response?.data?.error || err.message || 'Error al guardar'); }
    finally { setModalLoading(false); }
  };
```
to:
```tsx
  const handleInlineSubmit = async () => {
    if (formData.name.trim().length < 3) { setFormError('El nombre debe tener al menos 3 caracteres.'); return; }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) { setFormError('El precio no puede ser negativo.'); return; }
    setModalLoading(true);
    try {
      const payload = { name: formData.name.trim(), description: formData.description.trim() || undefined, price, currency: formData.currency, durationMinutes: formData.durationMinutes, sessionModality: formData.sessionModality || undefined, image: formImage || undefined, imagePosition: formImage ? formImagePosition : undefined, profileId };
      if (modalMode === 'create') {
        const created = await createService(payload);
        toast('Servicio creado');
        if (created && activeDays.length > 0) {
          const slotsToSave: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
          activeDays.forEach(day => (franjasByDay[day] ?? []).forEach(f => slotsToSave.push({ dayOfWeek: day, ...f })));
          try {
            await api.post('/service-availability/bulk', { serviceId: created.id, slots: slotsToSave });
          } catch {
            toast('Servicio creado, pero no se pudo guardar su horario — edítalo después', 'error');
          }
        }
      }
      else if (editingService) { await updateService(editingService.id, payload); toast('Servicio actualizado'); }
      setModalOpen(false);
    } catch (err: any) { setFormError(err.response?.data?.error || err.message || 'Error al guardar'); }
    finally { setModalLoading(false); }
  };
```

- [ ] **Step 3: Mostrar el bloque de horario también en modo Crear**

Change:
```tsx
            {modalMode === 'edit' && editingService && (
              <ProGate isPro={isPro}>
```
to:
```tsx
            <ProGate isPro={isPro}>
```

- [ ] **Step 4: Quitar la referencia a `editingService.name` (null en modo Crear)**

Change:
```tsx
                  <p style={{ fontSize: 12, color: 'var(--sc-muted)', marginBottom: 12 }}>
                    Días y horas disponibles solo para "{editingService.name}". Si no configuras nada aquí, se usa el horario general.
                  </p>
```
to:
```tsx
                  <p style={{ fontSize: 12, color: 'var(--sc-muted)', marginBottom: 12 }}>
                    Días y horas disponibles solo para "{editingService?.name || formData.name || 'este servicio'}". Si no configuras nada aquí, se usa el horario general.
                  </p>
```

- [ ] **Step 5: Ocultar "Guardar horario" en modo Crear**

En modo Crear, el único botón de guardado es "Crear servicio" (arriba del todo) — este bloque de horario ya no tiene su propio botón de guardar, solo "+ Añadir franja" para seguir armando las franjas antes de enviar el formulario completo.

Change:
```tsx
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--sc-border)', gap: 8, flexWrap: 'wrap' }}>
                    <BtnGhost small onClick={addFranja}>+ Añadir franja</BtnGhost>
                    <BtnPrimary onClick={handleSaveSlots} disabled={saving}>{saving ? 'Guardando...' : 'Guardar horario'}</BtnPrimary>
                  </div>
                </div>
              </ProGate>
            )}
          </div>
```
to:
```tsx
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: modalMode === 'create' ? 'flex-start' : 'flex-end', paddingTop: 16, borderTop: '1px solid var(--sc-border)', gap: 8, flexWrap: 'wrap' }}>
                    <BtnGhost small onClick={addFranja}>+ Añadir franja</BtnGhost>
                    {modalMode === 'edit' && (
                      <BtnPrimary onClick={handleSaveSlots} disabled={saving}>{saving ? 'Guardando...' : 'Guardar horario'}</BtnPrimary>
                    )}
                  </div>
                </div>
              </ProGate>
          </div>
```

- [ ] **Step 6: Verificar que compila**

```bash
cd frontend && npx tsc -b
```
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/SchedulingConfig.tsx
git commit -m "feat: show service-specific schedule in Nuevo servicio form"
```

---

### Task 3: Verificación end-to-end

**Files:** ninguno (solo verificación, sin cambios de código)

Con servidores de desarrollo locales (`PORT=4000` backend + frontend en `5173`) apuntando a la base de datos de producción compartida — mismo patrón ya usado en sesiones anteriores de este repo.

**Feature 1 (Disponibilidad):**
- [ ] **Step 1:** Configurar un horario personalizado en un día (ej. Lunes, franjas distintas a las demás), con al menos 2 días más marcados como laborables con horarios distintos.
- [ ] **Step 2:** Clic en "Aplicar a todos los días" → confirmar que aparece el diálogo nativo de confirmación listando los demás días laborables.
- [ ] **Step 3:** Confirmar → verificar que los demás días quedan con exactamente el mismo horario que el día de origen, y que "Resumen semanal" lo refleja.
- [ ] **Step 4:** Con un solo día laborable marcado (sin otros), confirmar que el botón "Aplicar a todos los días" aparece deshabilitado.

**Feature 2 (Servicios):**
- [ ] **Step 5:** Clic en "Nuevo servicio" → confirmar que el bloque "Horario de este servicio" ya es visible, sin necesidad de guardar primero, y que no muestra residuos de un servicio editado antes.
- [ ] **Step 6:** Llenar los datos básicos, configurar un horario específico (ej. solo Martes y Jueves), confirmar que el bloque de horario NO tiene un botón "Guardar horario" propio — solo "+ Añadir franja".
- [ ] **Step 7:** Clic en "Crear servicio" → confirmar que el servicio aparece en la lista, y al editarlo de nuevo, el horario específico configurado durante la creación ya está guardado (días/franjas coinciden).
- [ ] **Step 8:** Crear un servicio SIN configurar ningún horario específico → confirmar que no se dispara ninguna llamada extra a `service-availability/bulk`, y que el servicio usa el horario general como ya ocurre hoy.
- [ ] **Step 9:** Abrir "Editar servicio" en un servicio existente → confirmar que nada cambió ahí (sigue con su propio botón "Guardar horario", independiente de "Guardar cambios").
