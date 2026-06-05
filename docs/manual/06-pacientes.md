# Módulo: Pacientes e Historia Clínica

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `frontend/src/pages/Pacientes.tsx` | Panel de gestión de pacientes |
| `frontend/src/hooks/usePatients.ts` | CRUD de pacientes (clientes) |
| `frontend/src/components/patients/PatientWizard.tsx` | Wizard HC Individual (9 pasos) |
| `frontend/src/components/patients/CoupleWizard.tsx` | Wizard HC de Pareja (9 pasos) |
| `frontend/src/components/patients/SessionNotesFeed.tsx` | Notas de sesión |
| `frontend/src/components/patients/WizardAccentContext.ts` | Tokens de color en wizards |
| `frontend/src/components/patients/wizard/Step*.tsx` | 9 pasos HC individual |
| `frontend/src/components/patients/couple-wizard/StepC*.tsx` | 9 pasos HC pareja |
| `backend/src/routes/clients.ts` | CRUD de pacientes |
| `backend/src/routes/clinical-history.ts` | HC individual |
| `backend/src/routes/clinical-history-couple.ts` | HC de pareja |
| `backend/src/routes/session-notes.ts` | Notas de sesión |

---

## Acceso al Módulo

El módulo Pacientes aparece en el sidebar del Dashboard. Tiene 3 sub-módulos con protección de plan:

| Sub-módulo | Acceso | Override admin |
|-----------|--------|----------------|
| Datos Básicos | Siempre libre | — |
| HC Individual | Pro | `featureOverrides.historia_clinica` |
| HC de Pareja | Pro + `isPairTherapist` | `featureOverrides.terapia_pareja` |

`isPairTherapist` es `true` si el profesional seleccionó "Terapia de pareja" como enfoque terapéutico en su perfil.

---

## Datos Básicos del Paciente

### Modelo `Client`
```typescript
{
  id, userId,
  name, email, phone,
  birthDate, gender, maritalStatus,
  education, occupation,
  city, country,
  emergencyContact,
  referralSource,    // ¿Cómo nos encontró?
  notes             // Notas internas
}
```

### Endpoints Clientes
```
GET    /api/clients          → Mis pacientes
GET    /api/clients/:id      → Paciente con HC completa
POST   /api/clients          → Crear paciente
PUT    /api/clients/:id      → Actualizar datos básicos
DELETE /api/clients/:id      → Eliminar paciente
```

---

## Historia Clínica Individual (9 Pasos)

Wizard completo para documentar la HC de un paciente en 9 secciones. Cada sección se guarda de forma independiente.

### Pasos

| Paso | Componente | Contenido |
|------|-----------|-----------|
| 1 | Step1Datos | Datos demográficos del paciente |
| 2 | Step2Motivo | Motivo de consulta y síntomas principales |
| 3 | Step3Problema | Historia del problema actual, duración, factores |
| 4 | Step4AntecPersonales | Antecedentes médicos, psiquiátricos, medicación actual |
| 5 | Step5AntecFamiliares | Historia familiar, enfermedades hereditarias |
| 6 | Step6Biografia | Historia biográfica: infancia, escuela, trabajo, relaciones |
| 7 | Step7ExamenMental | Apariencia, humor, afecto, pensamiento, percepción, cognición |
| 8 | Step8Diagnostico | Impresión diagnóstica, códigos DSM/CIE |
| 9 | Step9Plan | Plan de tratamiento, objetivos, frecuencia de sesiones |

### Modelo `ClinicalHistory`
Tiene un campo por sección: `chiefComplaint`, `symptomDuration`, `currentProblem`, `medicalHistory`, `psychiatricHistory`, `currentMedication`, `familyComposition`, `childhoodHistory`, `schoolHistory`, `workHistory`, `appearance`, `mood`, `affect`, `thought`, `perception`, `provisionalDiagnosis`, `therapeuticGoals`, `sessionFrequency`.

Campo especial: `completedSteps: number[]` — IDs de los pasos completados.

### Endpoints HC Individual
```
GET  /api/clinical-history/:clientId      → HC completa
PUT  /api/clinical-history/:clientId      → Guardar/actualizar (guarda por sección)
```

---

## Historia Clínica de Pareja (9 Pasos)

Similar al wizard individual pero adaptado a terapia de pareja.

### Pasos

| Paso | Componente | Contenido |
|------|-----------|-----------|
| C1 | StepC1Datos | Datos de ambos miembros (P1 y P2), estado de la relación |
| C2 | StepC2Motivo | Motivo de consulta de la pareja |
| C3 | StepC3Historia | Historia de la relación, cómo se conocieron |
| C4 | StepC4Conflicto | Dinámica de conflicto, temas recurrentes, comunicación |
| C5 | StepC5Intimidad | Intimidad emocional, sexual, conexión |
| C6 | StepC6Familia | Historia familiar de origen de cada miembro |
| C7 | StepC7Recursos | Recursos de la pareja, intentos previos de solución |
| C8 | StepC8Evaluacion | Evaluación clínica, factores de riesgo |
| C9 | StepC9Plan | Plan terapéutico para la pareja, objetivos |

### Modelo `ClinicalHistoryCouple`
Campos separados para cada miembro (`p1Name`, `p2Name`, `p1Age`, `p2Age`, etc.) + campos de la relación + `completedSteps`.

### Endpoints HC Pareja
```
GET  /api/clinical-history-couple/:clientId
PUT  /api/clinical-history-couple/:clientId
```

---

## Notas de Sesión

Cada paciente puede tener N notas de sesión. Son independientes de la HC.

### Modelo `SessionNote`
```typescript
{
  sessionNumber: int       // Número de sesión
  sessionDate: DateTime    // Fecha
  summary: string          // Resumen de la sesión
  topics: string           // Temas trabajados
  homework: string?        // Tarea asignada
  observations: string?    // Observaciones clínicas
  nextPlan: string?        // Plan para la próxima sesión
}
```

### Endpoints
```
GET    /api/session-notes/:clientId      → Todas las notas del paciente
POST   /api/session-notes/:clientId      → Crear nota
PUT    /api/session-notes/:id            → Actualizar nota
DELETE /api/session-notes/:id            → Eliminar nota
```

---

## WizardAccentContext

Los wizards usan un Context especial para manejar los tokens de color dinámicos según el acento del profesional:

```typescript
// frontend/src/components/patients/WizardAccentContext.ts
const { accent, accentLight, border, ... } = useContext(WizardAccentContext);
```

Esto permite que los wizards se adapten al tema de color seleccionado por el profesional.
