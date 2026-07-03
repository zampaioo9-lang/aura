# Consentimiento Expreso para Datos Sensibles — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al terapeuta una forma de documentar, dentro de Aliax, que obtuvo el consentimiento expreso del paciente para tratar sus datos de salud, antes de poder capturar historia clínica o notas de sesión de ese paciente.

**Architecture:** Tres campos nuevos en el modelo `Client` (`consentGivenAt`, `consentMethod`, `consentNotes`), expuestos por el endpoint `PATCH /api/clients/:id` ya existente (sin ruta nueva). Un componente de frontend compartido (`ConsentStep`) se inserta como Paso 0 en ambos wizards (`PatientWizard` y `CoupleWizard`) y bloquea el acceso a los pasos siguientes hasta que `consentGivenAt` esté guardado.

**Tech Stack:** Express + Prisma + PostgreSQL (backend), React + TypeScript (frontend). Sin librerías nuevas.

**Nota sobre verificación:** Este proyecto no tiene suite de pruebas automatizadas (no hay `jest`/`vitest` configurado). Cada tarea se verifica manualmente: `npx tsc --noEmit` para tipos, y una comprobación funcional puntual (`curl` o navegador) descrita en cada paso — siguiendo el mismo patrón usado en el resto del proyecto.

---

## Task 1: Migración de base de datos

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar los campos al modelo `Client`**

Abre `backend/prisma/schema.prisma` y busca el modelo `Client` (empieza en la línea 37). Agrega estas tres líneas después de `referralSource String?` (línea 53) y antes de `createdAt`:

```prisma
  consentGivenAt   DateTime?
  consentMethod    String?
  consentNotes     String?
```

El bloque del modelo debe quedar así (fragmento relevante):

```prisma
model Client {
  id               String    @id @default(cuid())
  userId           String
  name             String
  email            String?
  phone            String?
  notes            String?
  // Campos demográficos para historia clínica
  birthDate        DateTime?
  gender           String?
  maritalStatus    String?
  education        String?
  occupation       String?
  city             String?
  country          String?
  emergencyContact String?
  referralSource   String?
  // Consentimiento expreso (LFPDPPP Art. 9) — ver docs/superpowers/specs/2026-07-02-consentimiento-expreso-design.md
  consentGivenAt   DateTime?
  consentMethod    String?
  consentNotes     String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt @default(now())
  ...
```

- [ ] **Step 2: Aplicar el cambio a la base de datos de desarrollo**

Run: `cd backend && npx prisma db push`

Expected output (entre otras líneas): `Your database is now in sync with your Prisma schema.` y `✔ Generated Prisma Client`.

- [ ] **Step 3: Verificar que el campo existe**

Run:
```bash
cd backend && cat > ./scratch-verify-schema.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  // No lanza error de tipos si el campo existe en el Client de Prisma
  const test = await prisma.client.findFirst({ select: { id: true, consentGivenAt: true, consentMethod: true, consentNotes: true } });
  console.log('Campo consentGivenAt accesible. Ejemplo:', test);
  await prisma.$disconnect();
})();
EOF
npx tsx ./scratch-verify-schema.ts && rm ./scratch-verify-schema.ts
```

Expected: imprime `Campo consentGivenAt accesible. Ejemplo: { id: ..., consentGivenAt: null, consentMethod: null, consentNotes: null }` (o `null` si no hay ningún `Client` en la base) sin errores de TypeScript ni de Prisma.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add consentGivenAt/consentMethod/consentNotes fields to Client model"
```

---

## Task 2: Ajustar el backend para guardar `consentGivenAt` como fecha

**Files:**
- Modify: `backend/src/routes/clients.ts:76-92`

- [ ] **Step 1: Leer el handler actual**

El handler `PATCH /:id` en `backend/src/routes/clients.ts` ya hace un spread genérico de `req.body`, así que `consentMethod` y `consentNotes` (strings) ya funcionan sin cambios. Solo `consentGivenAt` necesita conversión explícita a `Date`, igual que `birthDate`.

- [ ] **Step 2: Modificar el handler**

Reemplaza el bloque completo del handler (líneas 76-92) por:

```typescript
router.patch('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Paciente no encontrado');
    if (existing.userId !== req.userId) throw new AppError(403, 'No autorizado');

    const { birthDate, consentGivenAt, ...rest } = req.body;
    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
        ...(consentGivenAt !== undefined ? { consentGivenAt: consentGivenAt ? new Date(consentGivenAt) : null } : {}),
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});
```

- [ ] **Step 3: Verificar tipos**

Run: `cd backend && npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 4: Verificar en caliente contra el backend local**

Si el backend local (`npm run dev` en `backend/`) no está corriendo, arráncalo. Luego, desde una sesión de navegador ya autenticada (o repitiendo el flujo de registro + creación de paciente descrito en las sesiones de prueba anteriores de este proyecto), confirma que:

```bash
curl -s -X PATCH http://localhost:4000/api/clients/<ID_DE_UN_PACIENTE_DE_PRUEBA> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"consentGivenAt": "2026-07-02T12:00:00.000Z", "consentMethod": "verbal", "consentNotes": "prueba"}'
```

Expected: respuesta JSON 200 con `"consentGivenAt":"2026-07-02T12:00:00.000Z","consentMethod":"verbal","consentNotes":"prueba"` en el cuerpo. Si no tienes un token/paciente de prueba a mano en este punto, puedes posponer esta verificación funcional al Task 7 (verificación end-to-end en navegador), donde se prueba de forma natural a través de la UI — pero no marques este step como completo hasta haberlo confirmado por alguna de las dos vías.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/clients.ts
git commit -m "fix: coerce consentGivenAt to Date in PATCH /api/clients/:id"
```

---

## Task 3: Agregar los campos de consentimiento al tipo `Patient` (frontend)

**Files:**
- Modify: `frontend/src/hooks/usePatients.ts:4-23`

- [ ] **Step 1: Extender la interfaz `Patient`**

En `frontend/src/hooks/usePatients.ts`, localiza la interfaz `Patient` (línea 4) y agrega los tres campos nuevos justo después de `referralSource?: string;` (línea 17):

```typescript
export interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  city?: string;
  country?: string;
  emergencyContact?: string;
  referralSource?: string;
  consentGivenAt?: string | null;
  consentMethod?: string | null;
  consentNotes?: string | null;
  notes?: string;
  createdAt: string;
  clinicalHistory?: { completedSteps: number[] } | null;
  clinicalHistoryCouple?: { completedSteps: number[] } | null;
  sessionNotes?: { id: string }[];
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores relacionados a `usePatients.ts` (puede haber ruido de otros archivos no relacionados; confirma que ninguno mencione `usePatients.ts`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/usePatients.ts
git commit -m "feat: add consent fields to Patient type"
```

---

## Task 4: Crear el componente `ConsentStep` compartido

**Files:**
- Create: `frontend/src/components/patients/ConsentStep.tsx`

Este componente se usa como Paso 0 en `PatientWizard` (Task 5) y `CoupleWizard` (Task 6). Sigue exactamente el mismo patrón de props y de guardado que `wizard/Step1Datos.tsx`: recibe `patient` y `onSave` (que en ambos wizards apunta a `onPatientUpdate`, es decir, un `PATCH /api/clients/:id`), no el patrón `stepIndex`/`history` que usan los demás pasos (esos operan sobre `ClinicalHistory`/`ClinicalHistoryCouple`, no sobre `Client`).

- [ ] **Step 1: Crear el archivo**

```tsx
import { useState } from 'react';
import type { Patient } from '../../hooks/usePatients';
import CustomSelect from '../CustomSelect';
import { useWizardAccent } from './WizardAccentContext';

interface Props {
  patient: Patient;
  onSave: (data: Partial<Patient>) => Promise<void>;
  inp: React.CSSProperties;
  lbl: React.CSSProperties;
  accent?: string;
  isDark?: boolean;
}

const METHODS = [
  { value: 'escrito', label: 'Firma en papel' },
  { value: 'verbal', label: 'Consentimiento verbal' },
  { value: 'otro', label: 'Otro' },
];

const CONSENT_TEXT = `Este documento informa que ${'{{NOMBRE}}'} registrará datos de salud (motivo de consulta, antecedentes, notas de sesión) en la plataforma Aliax.io, tratados como datos personales sensibles conforme al Art. 9 de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).

Si el profesional utiliza la función de notas clínicas con inteligencia artificial, el texto de la sesión se envía anonimizado (sin nombre) a nuestro proveedor de IA (Anthropic) para generar la nota estructurada.

El paciente tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (derechos ARCO) al tratamiento de sus datos, contactando directamente a su profesional o escribiendo a privacidad@aliax.io.

Al confirmar más abajo, el profesional declara haber obtenido el consentimiento expreso del paciente para el tratamiento descrito, por el medio indicado.`;

export default function ConsentStep({ patient, onSave, inp, lbl, accent, isDark = true }: Props) {
  const [method, setMethod] = useState(patient.consentMethod ?? '');
  const [notes, setNotes] = useState(patient.consentNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const wBtn = useWizardAccent();

  const alreadyGiven = !!patient.consentGivenAt;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        consentGivenAt: new Date().toISOString(),
        consentMethod: method || 'otro',
        consentNotes: notes,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const documentText = CONSENT_TEXT.replace('{{NOMBRE}}', patient.name || 'el/la paciente');

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<pre style="font-family: sans-serif; white-space: pre-wrap; max-width: 640px; margin: 40px auto; line-height: 1.6;">${documentText}</pre>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: 14, borderRadius: 10, background: wBtn.noteBg,
        border: `1px solid ${wBtn.border}`, whiteSpace: 'pre-wrap',
        fontSize: 13, lineHeight: 1.6, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
      }}>
        {documentText}
      </div>

      <div>
        <label style={lbl}>Método de consentimiento</label>
        <CustomSelect
          value={method}
          onChange={setMethod}
          options={METHODS}
          placeholder="Seleccionar"
          dark={isDark}
          accent={accent}
        />
      </div>

      <div>
        <label style={lbl}>Notas (opcional)</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={inp}
          placeholder="Ej. firmado en papel, archivo en expediente físico"
        />
      </div>

      {alreadyGiven && (
        <p style={{ fontSize: 12, color: wBtn.savedColor, margin: 0 }}>
          ✓ Consentimiento registrado el {new Date(patient.consentGivenAt!).toLocaleDateString('es-MX')}
          {patient.consentMethod ? ` (${METHODS.find(m => m.value === patient.consentMethod)?.label ?? patient.consentMethod})` : ''}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          className="btn-lift"
          onClick={handlePrint}
          style={{
            padding: '10px 18px', borderRadius: 10, border: `1px solid ${wBtn.border}`,
            background: 'transparent', color: wBtn.lblColor, fontSize: 14, cursor: 'pointer',
          }}
        >
          Descargar documento de consentimiento
        </button>
        <button
          className="btn-lift"
          onClick={handleSave}
          disabled={saving || !method}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: saved ? wBtn.savedBg : wBtn.bg,
            color: saved ? wBtn.savedColor : '#fff', fontSize: 14, fontWeight: 600,
            cursor: (saving || !method) ? 'not-allowed' : 'pointer',
            opacity: !method ? 0.5 : 1,
          }}
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Confirmar consentimiento'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores relacionados a `ConsentStep.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/patients/ConsentStep.tsx
git commit -m "feat: add shared ConsentStep component for express consent capture"
```

---

## Task 5: Integrar `ConsentStep` en `PatientWizard` con gating

**Files:**
- Modify: `frontend/src/components/patients/PatientWizard.tsx`

- [ ] **Step 1: Importar `ConsentStep` y agregarlo a `STEPS`**

En `frontend/src/components/patients/PatientWizard.tsx`, agrega el import (junto a los demás, antes de `Step1Datos`):

```typescript
import ConsentStep from './ConsentStep';
```

Modifica el array `STEPS` (línea 17-20) para agregar `'Consentimiento'` al inicio:

```typescript
const STEPS = [
  'Consentimiento', 'Datos', 'Motivo', 'Problema', 'Antec. personales',
  'Antec. familiares', 'Biografía', 'Estado mental', 'Diagnóstico', 'Plan',
];
```

- [ ] **Step 2: Renderizar `ConsentStep` en el índice 0 y desplazar los demás pasos**

Reemplaza el bloque de renderizado de contenido (líneas 133-143) por:

```tsx
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {step === 0 && <ConsentStep patient={patient} onSave={onPatientUpdate} inp={inp} lbl={lbl} accent={accent} isDark={D} />}
            {step === 1 && <Step1Datos patient={patient} onSave={onPatientUpdate} inp={inp} lbl={lbl} accent={accent} isDark={D} />}
            {step === 2 && <Step2Motivo {...stepProps} stepIndex={1} />}
            {step === 3 && <Step3Problema {...stepProps} stepIndex={2} />}
            {step === 4 && <Step4AntecPersonales {...stepProps} stepIndex={3} />}
            {step === 5 && <Step5AntecFamiliares {...stepProps} stepIndex={4} />}
            {step === 6 && <Step6Biografia {...stepProps} stepIndex={5} />}
            {step === 7 && <Step7ExamenMental {...stepProps} stepIndex={6} />}
            {step === 8 && <Step8Diagnostico {...stepProps} stepIndex={7} />}
            {step === 9 && <Step9Plan {...stepProps} stepIndex={8} />}
          </div>
```

Nota: los `stepIndex` pasados a `Step2Motivo` en adelante **no cambian** (siguen siendo 1-8) porque esos índices identifican el paso dentro de `ClinicalHistory.completedSteps`, una estructura de datos independiente del índice del wizard (`step`). Solo el índice del wizard (`step`) se desplaza +1; el `stepIndex` de negocio permanece igual.

- [ ] **Step 3: Agregar el gating en el stepper**

Reemplaza el bloque del stepper (líneas 110-129) por una versión que bloquea los índices ≥ 1 si no hay consentimiento:

```tsx
            {STEPS.map((s, i) => {
              const locked = i > 0 && !patient.consentGivenAt;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn-lift"
                    onClick={() => { if (!locked) setStep(i); }}
                    disabled={locked}
                    title={locked ? 'Registra el consentimiento primero' : s}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: 'none',
                      background: i === step ? tokens.savedColor : isCompleted(i) ? `${tokens.savedColor}33` : stepInactiveBg,
                      color: i === step ? '#fff' : isCompleted(i) ? tokens.savedColor : stepInactiveColor,
                      fontSize: 11, fontWeight: 700, cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: locked ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                    }}
                  >
                    {isCompleted(i) && i !== step ? <Check size={12} /> : i + 1}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 20, height: 1, background: isCompleted(i) ? `${tokens.savedColor}44` : connectorBg }} />
                  )}
                </div>
              );
            })}
```

- [ ] **Step 4: Agregar el gating al botón "Siguiente"**

Reemplaza el botón "Siguiente" (líneas 161-169) por:

```tsx
            <button
              className="btn-lift"
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              disabled={step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                background: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? nextDis : tokens.bg,
                border: 'none', borderRadius: 10,
                color: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? nextDisColor : '#fff',
                fontSize: 14, fontWeight: 600,
                cursor: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? 'not-allowed' : 'pointer',
              }}
            >
              Siguiente <ChevronRight size={16} />
            </button>
```

- [ ] **Step 5: Verificar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores relacionados a `PatientWizard.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/patients/PatientWizard.tsx
git commit -m "feat: gate PatientWizard clinical steps behind consent confirmation"
```

---

## Task 6: Integrar `ConsentStep` en `CoupleWizard` con gating

`CoupleWizard` hoy no recibe ninguna forma de actualizar el `Client` (a diferencia de `PatientWizard`, que recibe `onPatientUpdate`). Este task agrega esa prop y la conecta desde `Pacientes.tsx`, además de repetir el mismo patrón de gating del Task 5.

**Files:**
- Modify: `frontend/src/components/patients/CoupleWizard.tsx`
- Modify: `frontend/src/pages/Pacientes.tsx:338-339`

- [ ] **Step 1: Agregar `onPatientUpdate` a las props de `CoupleWizard`**

En `frontend/src/components/patients/CoupleWizard.tsx`, agrega el import junto a los demás:

```typescript
import ConsentStep from './ConsentStep';
```

Modifica la interfaz `Props` (líneas 22-27) para agregar `onPatientUpdate`:

```typescript
interface Props {
  patient: Patient;
  onClose: () => void;
  onPatientUpdate: (data: Partial<Patient>) => Promise<void>;
  accent?: string;
  isDark?: boolean;
}
```

Y la firma del componente (línea 29):

```typescript
export default function CoupleWizard({ patient, onClose, onPatientUpdate, accent, isDark = true }: Props) {
```

- [ ] **Step 2: Agregar `'Consentimiento'` a `STEPS` y renderizar `ConsentStep` en el índice 0**

Modifica el array `STEPS` (líneas 17-20):

```typescript
const STEPS = [
  'Consentimiento', 'Datos', 'Motivo', 'Historia', 'Conflicto',
  'Intimidad', 'Familia', 'Recursos', 'Evaluación', 'Plan',
];
```

Busca el bloque de renderizado de contenido (equivalente al de `PatientWizard`, con `StepC1Datos` en `step === 0`) y desplázalo igual que en el Task 5, Step 2 — agrega `ConsentStep` en `step === 0` y sube en uno el índice de cada `StepCN` existente, manteniendo los `stepIndex` de negocio (0-8) sin cambios:

```tsx
            {step === 0 && <ConsentStep patient={patient} onSave={onPatientUpdate} inp={inp} lbl={lbl} accent={accent} isDark={D} />}
            {step === 1 && <StepC1Datos {...stepProps} stepIndex={0} />}
            {step === 2 && <StepC2Motivo {...stepProps} stepIndex={1} />}
            {step === 3 && <StepC3Historia {...stepProps} stepIndex={2} />}
            {step === 4 && <StepC4Conflicto {...stepProps} stepIndex={3} />}
            {step === 5 && <StepC5Intimidad {...stepProps} stepIndex={4} />}
            {step === 6 && <StepC6Familia {...stepProps} stepIndex={5} />}
            {step === 7 && <StepC7Recursos {...stepProps} stepIndex={6} />}
            {step === 8 && <StepC8Evaluacion {...stepProps} stepIndex={7} />}
            {step === 9 && <StepC9Plan {...stepProps} stepIndex={8} />}
```

- [ ] **Step 3: Agregar el gating en el stepper**

Busca el bloque del stepper en `CoupleWizard.tsx` (el `STEPS.map((s, i) => ...)` dentro del `<div>` con `overflowX: 'auto'`, estructuralmente idéntico al de `PatientWizard.tsx`) y reemplázalo por:

```tsx
            {STEPS.map((s, i) => {
              const locked = i > 0 && !patient.consentGivenAt;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn-lift"
                    onClick={() => { if (!locked) setStep(i); }}
                    disabled={locked}
                    title={locked ? 'Registra el consentimiento primero' : s}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: 'none',
                      background: i === step ? tokens.savedColor : isCompleted(i) ? `${tokens.savedColor}33` : stepInactiveBg,
                      color: i === step ? '#fff' : isCompleted(i) ? tokens.savedColor : stepInactiveColor,
                      fontSize: 11, fontWeight: 700, cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: locked ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                    }}
                  >
                    {isCompleted(i) && i !== step ? <Check size={12} /> : i + 1}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 20, height: 1, background: isCompleted(i) ? `${tokens.savedColor}44` : connectorBg }} />
                  )}
                </div>
              );
            })}
```

- [ ] **Step 4: Agregar el gating al botón "Siguiente"**

Busca el botón "Siguiente" en el footer de `CoupleWizard.tsx` (estructuralmente idéntico al de `PatientWizard.tsx`) y reemplázalo por:

```tsx
            <button
              className="btn-lift"
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              disabled={step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                background: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? nextDis : tokens.bg,
                border: 'none', borderRadius: 10,
                color: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? nextDisColor : '#fff',
                fontSize: 14, fontWeight: 600,
                cursor: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? 'not-allowed' : 'pointer',
              }}
            >
              Siguiente <ChevronRight size={16} />
            </button>
```

- [ ] **Step 5: Pasar `onPatientUpdate` desde `Pacientes.tsx`**

En `frontend/src/pages/Pacientes.tsx`, localiza la línea 339:

```tsx
<CoupleWizard patient={selected} onClose={() => setActiveWizard(null)} accent={C.accent} isDark={C.isDark} />
```

Reemplázala por (mismo patrón que la invocación de `PatientWizard` en las líneas 330-336):

```tsx
<CoupleWizard
  patient={selected}
  onClose={() => setActiveWizard(null)}
  onPatientUpdate={async (data) => { await updatePatient(selected.id, data); setSelected({ ...selected, ...data }); }}
  accent={C.accent}
  isDark={C.isDark}
/>
```

- [ ] **Step 6: Verificar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sin errores relacionados a `CoupleWizard.tsx` ni `Pacientes.tsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/patients/CoupleWizard.tsx frontend/src/pages/Pacientes.tsx
git commit -m "feat: gate CoupleWizard clinical steps behind consent confirmation"
```

---

## Task 7: Verificación manual end-to-end en navegador

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar backend y frontend local**

```bash
cd backend && npm run dev
```
En otra terminal:
```bash
cd frontend && npm run dev
```
Confirma `frontend/.env.local` con `VITE_API_URL=http://localhost:4000/api` (ver sesiones de prueba anteriores de este proyecto para el detalle de por qué es necesario).

- [ ] **Step 2: Crear una cuenta y paciente de prueba**

Registra una cuenta de prueba con email claramente identificable como tal (ej. `qatest.borrar.consentimiento@aliax-test.local`), márcala como `PRO` en la base de datos si el flujo de historia clínica lo requiere (ver Task de anonimización anterior para el script de referencia), y crea un paciente de prueba.

- [ ] **Step 3: Verificar el gating**

Abre el wizard individual (`PatientWizard`) para el paciente de prueba. Confirma:
- El primer paso mostrado es "Consentimiento" (paso 1 de 10).
- Los círculos del stepper para los pasos 2 en adelante están atenuados (opacidad reducida) y no reaccionan al clic.
- El botón "Siguiente" está deshabilitado hasta seleccionar un método y presionar "Confirmar consentimiento".

- [ ] **Step 4: Verificar que el consentimiento se guarda y desbloquea el resto**

Selecciona un método, presiona "Confirmar consentimiento", confirma que aparece "✓ Guardado" y luego el texto "✓ Consentimiento registrado el [fecha]". Presiona "Siguiente" — debe avanzar a "Datos" sin bloqueo. Los círculos del stepper para los demás pasos ya no deben estar atenuados.

- [ ] **Step 5: Verificar persistencia**

Cierra el wizard (botón X) y vuelve a abrirlo para el mismo paciente. El Paso 0 debe mostrar directamente "✓ Consentimiento registrado el [fecha]" (leído desde `patient.consentGivenAt`, ya no `null`), y los pasos siguientes deben seguir desbloqueados sin necesidad de volver a confirmar.

- [ ] **Step 6: Repetir Steps 3-5 para `CoupleWizard`**

Mismo paciente u otro nuevo, usando el wizard de pareja en vez del individual.

- [ ] **Step 7: Verificar el botón de descarga**

Presiona "Descargar documento de consentimiento" — debe abrir una pestaña nueva con el texto del documento y disparar el diálogo de impresión del navegador. Cierra el diálogo sin imprimir (no es necesario guardar el PDF para esta verificación).

- [ ] **Step 8: Limpiar los datos de prueba**

Usa el mismo patrón de script de limpieza (`prisma.sessionNote.deleteMany` + `prisma.client.deleteMany` + `prisma.user.delete` filtrando por el email de prueba) usado en las sesiones de prueba anteriores de este proyecto, para no dejar residuos en la base de datos compartida.

- [ ] **Step 9: Confirmar que no quedan cambios sin commitear**

Run: `git status --short`
Expected: sin archivos modificados relacionados a este feature (todo ya commiteado en los tasks anteriores).

---

## Task 8: Desplegar a producción

**Files:** ninguno (solo deploy)

- [ ] **Step 1: Push a GitHub**

```bash
git push origin master
```

- [ ] **Step 2: Desplegar backend**

```bash
cd backend && npx vercel --prod
```
Expected: línea final `Aliased: https://api.aliax.io`.

- [ ] **Step 3: Aplicar la migración de Prisma en la base de datos de producción**

`backend/package.json` ya corre `prisma db push` automáticamente como parte de `start:prod` en cada deploy — no se requiere un paso manual adicional, pero confirma revisando los logs del deploy en Vercel (pestaña "Deployments" → el deploy más reciente → "Building") que la línea `Your database is now in sync with your Prisma schema` (o equivalente) aparece sin errores.

- [ ] **Step 4: Desplegar frontend**

```bash
cd .. && npx vercel --prod
```
(Correr desde la raíz del repo, no desde `frontend/` — ver sesiones de prueba anteriores de este proyecto para el porqué). Expected: línea final `Aliased: https://www.aliax.io`.

- [ ] **Step 5: Verificar producción**

```bash
curl -s -o /dev/null -w "Status: %{http_code}\n" https://api.aliax.io/api/health
curl -s -o /dev/null -w "Status: %{http_code}\n" https://www.aliax.io
```
Expected: ambos `Status: 200`.

- [ ] **Step 6: Verificación funcional en producción (opcional pero recomendada)**

Repite una versión abreviada del Task 7 (Steps 2-5) contra `https://www.aliax.io` en vez de `localhost:5173`, con una cuenta de prueba nueva, limpiando los datos al final.
