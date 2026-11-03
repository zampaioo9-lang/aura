# Botón "+ Nueva cita" en detalle de paciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón "+ Nueva cita" en la pestaña Citas del detalle de un paciente, que abra el modal de creación de citas ya existente con los datos del paciente prellenados.

**Architecture:** Reutiliza `NewBookingModal.tsx` (ya usado por la Agenda general) sin modificarlo. Se agrega un prop `profiles` que hoy no llega desde `Dashboard.tsx` hasta `Pacientes.tsx`, y `PatientBookings.tsx` pasa de ser un componente de solo lectura a poseer también el botón, el estado del modal, y la carga de servicios activos — sigue siendo el único dueño de la pestaña Citas de un paciente.

**Tech Stack:** React + TypeScript, mismo patrón de fetch con axios (`api` de `../../api/client`) y estilos inline ya usado en todo el dashboard.

---

### Task 1: `Dashboard.tsx` — pasar `profiles` a `<Pacientes>`

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx:750` (vista móvil)
- Modify: `frontend/src/pages/Dashboard.tsx:1051` (vista escritorio)

`profiles` ya existe como estado en este archivo (`const [profiles, setProfiles] = useState<Profile[]>([]);`, usado por `ProfessionalCalendar` y otras pestañas) pero no se lo pasa a `<Pacientes>` en ninguno de sus 2 renders.

- [ ] **Step 1: Pasar `profiles` en la vista móvil**

Change:
```tsx
                <Pacientes C={C} isPairTherapist={isPairTherapist} isPro={(isPro ?? false) || canPacientes} isActive={mobileSection === 'pacientes'} />
```
to:
```tsx
                <Pacientes C={C} isPairTherapist={isPairTherapist} isPro={(isPro ?? false) || canPacientes} isActive={mobileSection === 'pacientes'} profiles={profiles} />
```

- [ ] **Step 2: Pasar `profiles` en la vista escritorio**

Change:
```tsx
                <Pacientes C={C} isPairTherapist={isPairTherapist} isPro={(isPro ?? false) || canPacientes} isActive={activeTab === 'pacientes'} />
```
to:
```tsx
                <Pacientes C={C} isPairTherapist={isPairTherapist} isPro={(isPro ?? false) || canPacientes} isActive={activeTab === 'pacientes'} profiles={profiles} />
```

- [ ] **Step 3: Verificar que compila**

```bash
cd frontend && npx tsc -b
```
Expected: errores esperados en este punto (`Pacientes` todavía no acepta `profiles` — se resuelve en el Task 2). Si el único error que aparece es sobre la prop `profiles` no reconocida en `Pacientes`, está bien, continúa al Task 2. Si aparece cualquier otro error, detente y revisa.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: pass profiles prop to Pacientes"
```

---

### Task 2: `Pacientes.tsx` — aceptar y reenviar `profiles` y `phone`

**Files:**
- Modify: `frontend/src/pages/Pacientes.tsx:20` (firma del componente)
- Modify: `frontend/src/pages/Pacientes.tsx:186-193` (render de la pestaña Citas)

- [ ] **Step 1: Agregar `profiles` a la firma del componente**

Change:
```tsx
export default function Pacientes({ C, isPro = false, isActive }: { C: Colors; isPairTherapist?: boolean; isPro?: boolean; isActive?: boolean }) {
```
to:
```tsx
export default function Pacientes({ C, isPro = false, isActive, profiles }: { C: Colors; isPairTherapist?: boolean; isPro?: boolean; isActive?: boolean; profiles: { id: string }[] }) {
```

- [ ] **Step 2: Reenviar `profiles` y `phone` a `PatientBookings`**

Change:
```tsx
          {/* ── CITAS ── */}
          {detailTab === 'citas' && (
            selected.email
              ? <PatientBookings email={selected.email} name={selected.name} C={C} />
              : <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                  Agrega un email en la pestaña Datos para ver el historial de citas.
                </p>
          )}
```
to:
```tsx
          {/* ── CITAS ── */}
          {detailTab === 'citas' && (
            selected.email
              ? <PatientBookings email={selected.email} name={selected.name} phone={selected.phone} profiles={profiles} C={C} />
              : <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                  Agrega un email en la pestaña Datos para ver el historial de citas.
                </p>
          )}
```

- [ ] **Step 3: Verificar que compila**

```bash
cd frontend && npx tsc -b
```
Expected: errores esperados sobre `phone`/`profiles` no reconocidos en `PatientBookings` — se resuelve en el Task 3. Ningún otro error debería aparecer (confirma que `Dashboard.tsx` del Task 1 ya quedó resuelto).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Pacientes.tsx
git commit -m "feat: forward profiles and phone props to PatientBookings"
```

---

### Task 3: `PatientBookings.tsx` — botón, modal y refresco

**Files:**
- Modify: `frontend/src/components/patients/PatientBookings.tsx` (archivo completo, ver detalle abajo)

- [ ] **Step 1: Imports — agregar `Plus` y `NewBookingModal`**

Change:
```tsx
import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../../api/client';
```
to:
```tsx
import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader, Plus } from 'lucide-react';
import api from '../../api/client';
import NewBookingModal from '../dashboard/NewBookingModal';
```

- [ ] **Step 2: `Colors` — agregar `mainBg`, requerido por `NewBookingModal`**

`NewBookingModal.tsx` declara su propio `Colors` con un campo `mainBg: string` que el `Colors` local de este archivo no tiene. El objeto `C` real que llega desde `Dashboard.tsx` siempre trae `mainBg` en tiempo de ejecución — falta declararlo en el tipo para poder reenviar `C` sin error de compilación.

Change:
```tsx
interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}
```
to:
```tsx
interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
  mainBg: string;
}
```

- [ ] **Step 3: Nueva interfaz `Service`**

Change:
```tsx
interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; durationMinutes: number; price: number; currency: string; sessionModality?: string | null };
}
```
to:
```tsx
interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; durationMinutes: number; price: number; currency: string; sessionModality?: string | null };
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
  profileId: string;
  isActive: boolean;
}
```

- [ ] **Step 4: Props del componente + nuevo estado**

Change:
```tsx
export default function PatientBookings({ email, name, C }: { email: string; name: string; C: Colors }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/bookings/client/${encodeURIComponent(email)}`, { params: { name } })
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email, name]);
```
to:
```tsx
export default function PatientBookings({ email, name, phone, profiles, C }: { email: string; name: string; phone?: string; profiles: { id: string }[]; C: Colors }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [showModal, setShowModal] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get(`/bookings/client/${encodeURIComponent(email)}`, { params: { name } }),
      api.get('/services/me'),
    ])
      .then(([bookingsRes, servicesRes]) => {
        setBookings(bookingsRes.data);
        const allServices: Service[] = servicesRes.data.services ?? servicesRes.data;
        setServices(allServices.filter(s => s.isActive));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, name]);
```

- [ ] **Step 5: Envolver el `return` en un Fragment, agregar el botón arriba de la tarjeta, y el modal al final**

Change (el `return` actual arranca directo con el `<div>` de la tarjeta y termina con ese mismo `</div>`):
```tsx
  return (
    <div style={{
      background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${C.border}`, borderRadius: 16,
      padding: '18px 20px', marginBottom: 20,
      boxShadow: C.isDark ? 'none' : `0 4px 24px rgba(${_r},${_g},${_b},0.08)`,
    }}>
```
to:
```tsx
  return (
    <>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', background: C.accent, border: 'none',
          borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}
      >
        <Plus size={15} /> Nueva cita
      </button>
    </div>
    <div style={{
      background: C.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.80)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${C.border}`, borderRadius: 16,
      padding: '18px 20px', marginBottom: 20,
      boxShadow: C.isDark ? 'none' : `0 4px 24px rgba(${_r},${_g},${_b},0.08)`,
    }}>
```

Change (el cierre del `return`, hoy termina justo después del bloque de `{!loading && bookings.length > 0 && (...)}`):
```tsx
      {!loading && bookings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Upcoming first */}
          {upcoming.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 2px' }}>Próximas</p>
              {upcoming.map(b => <BookingRow key={b.id} b={b} C={C} />)}
            </>
          )}
          {past.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 2px' }}>Historial</p>
              {past.map(b => <BookingRow key={b.id} b={b} C={C} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```
to:
```tsx
      {!loading && bookings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Upcoming first */}
          {upcoming.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 2px' }}>Próximas</p>
              {upcoming.map(b => <BookingRow key={b.id} b={b} C={C} />)}
            </>
          )}
          {past.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 2px' }}>Historial</p>
              {past.map(b => <BookingRow key={b.id} b={b} C={C} />)}
            </>
          )}
        </div>
      )}
    </div>
    {showModal && (
      <NewBookingModal
        slot={{ date: new Date().toISOString().slice(0, 10), time: '' }}
        services={services}
        profiles={profiles}
        prefillClient={{ name, email, phone: phone ?? '' }}
        C={C}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); loadData(); }}
      />
    )}
    </>
  );
}
```

- [ ] **Step 6: Verificar que compila**

```bash
cd frontend && npx tsc -b
```
Expected: sin errores. IMPORTANTE: usar `npx tsc -b` (no `npx tsc --noEmit`, que es un no-op en este repo — ver `backend`/`frontend` ya documentado en sesiones previas).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/patients/PatientBookings.tsx
git commit -m "feat: add Nueva cita button to patient bookings tab"
```

---

### Task 4: Verificación end-to-end

**Files:** ninguno (solo verificación, sin cambios de código)

Con servidores de desarrollo locales (`PORT=4000` backend + frontend en `5173`) apuntando a la base de datos de producción compartida — mismo patrón ya usado en sesiones anteriores de este repo.

- [ ] **Step 1: Entrar a un paciente real con email**

En el dashboard, pestaña Pacientes → seleccionar un paciente que tenga email cargado → pestaña Citas. Confirmar que aparece el botón "+ Nueva cita" arriba de la tarjeta "Historial de citas".

- [ ] **Step 2: Abrir el modal y confirmar el prellenado**

Clic en "+ Nueva cita". Confirmar que el modal se abre con Nombre, Email y Teléfono del paciente ya rellenados (editable si hace falta), y que el selector de Servicio no está vacío si el profesional tiene servicios activos.

- [ ] **Step 3: Crear la cita**

Elegir servicio, fecha, hora disponible → "Crear cita". Confirmar: toast de éxito, el modal se cierra solo, y la cita nueva aparece de inmediato en la sección "Próximas" del historial — sin recargar la página.

- [ ] **Step 4: Confirmar que la cita es real, no solo visual en esta pestaña**

Ir a la pestaña Agenda del mismo profesional (`ProfessionalCalendar`) y confirmar que la cita creada aparece ahí también, en la fecha/hora correctas — prueba de que usa el mismo endpoint (`POST /bookings/professional`) que ya usa la Agenda general, no uno nuevo.

- [ ] **Step 5: Caso sin servicios activos**

Si hay algún profesional de prueba sin servicios activos configurados (o desactivar uno temporalmente y restaurarlo después), confirmar que el botón igual abre el modal, y el modal muestra "No hay servicios activos." con el botón "Crear cita" deshabilitado — comportamiento heredado de `NewBookingModal`, no es necesario construir nada nuevo para este caso.

- [ ] **Step 6: Limpieza**

Si se creó una cita de prueba real en el paso 3 sobre un paciente real, decidir con el usuario si se borra o se deja (igual que el resto de pruebas en producción compartida de sesiones anteriores — no borrar datos sin confirmar primero).
