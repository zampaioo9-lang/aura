# Consentimiento Expreso para Datos Sensibles — Diseño

**Fecha:** 2026-07-02
**Proyecto:** Aliax (aura)
**Objetivo:** Dar al terapeuta una forma de documentar, dentro de Aliax, que obtuvo el consentimiento expreso del paciente para el tratamiento de sus datos de salud (LFPDPPP Art. 9), antes de que el terapeuta capture historia clínica o notas de sesión de ese paciente.

---

## Contexto

El aviso de privacidad de Aliax (`frontend/src/pages/PrivacyPolicy.tsx`, actualizado 2026-07-02) ya establece que "el profesional que te atiende es responsable de solicitar y documentar tu consentimiento expreso antes de registrar tus datos de salud en la plataforma." Este diseño resuelve el "documentar": hoy no existe ningún campo, pantalla o documento en Aliax donde quede ese registro — es un gap identificado en la auditoría de cumplimiento HIPAA/LFPDPPP de esta misma fecha.

Restricción central: **el paciente no tiene cuenta en Aliax** — solo el terapeuta interactúa con la plataforma. `Client.email` y `Client.phone` son campos opcionales, por lo que no puede asumirse que existan.

---

## Decisiones de diseño

**Enfoque elegido: Atestación del terapeuta**, no un flujo de aceptación digital por parte del paciente.

El terapeuta obtiene el consentimiento por el medio que ya usa en su práctica (verbal, papel firmado, etc.) y lo confirma dentro de Aliax con fecha y método. Aliax provee el texto legal correcto (generable como documento descargable) para que el terapeuta lo use en consulta, pero el registro en Aliax es una atestación del profesional, no una firma digital capturada directamente del paciente.

**Alternativas descartadas:**
- *Link digital al paciente* (Aliax envía un enlace de consentimiento por email/WhatsApp que el paciente acepta): descartado como versión inicial porque depende de que el `Client` tenga email o teléfono cargado (opcional hoy) y de que el paciente efectivamente abra el enlace — no cubre el caso base. El modelo de datos de este diseño deja espacio para añadirlo después (`consentMethod: "digital"` ya es un valor válido) sin romper lo existente.

**No se modifica** `ai-notes.ts` ni `SessionNotesFeed.tsx` — el consentimiento se pide una vez al iniciar la historia clínica del paciente, no en cada nota individual.

---

## 1. Base de datos

### Migración Prisma

Agregar al modelo `Client` en `schema.prisma`:

```prisma
consentGivenAt   DateTime?
consentMethod    String?   // "verbal" | "escrito" | "digital" | "otro"
consentNotes     String?   // opcional, ej. "firmado en papel, archivo en expediente físico"
```

Los tres campos son opcionales — un `Client` existente sin consentimiento registrado simplemente tiene `consentGivenAt: null`, que es la señal de "no dado" en todo el diseño.

---

## 2. Backend API

**No se crea ningún endpoint nuevo.** `PATCH /api/clients/:id` (`backend/src/routes/clients.ts:76-92`) ya hace un spread genérico de `req.body` sobre `prisma.client.update`, así que acepta los tres campos nuevos sin cambios de ruta.

**Único ajuste necesario:** `consentGivenAt` es `DateTime` y debe recibir el mismo tratamiento que `birthDate` en ese mismo handler (conversión explícita a `Date` o `null`), en vez de dejar pasar el string crudo:

```typescript
const { birthDate, consentGivenAt, ...rest } = req.body;
const updated = await prisma.client.update({
  where: { id: req.params.id },
  data: {
    ...rest,
    ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
    ...(consentGivenAt !== undefined ? { consentGivenAt: consentGivenAt ? new Date(consentGivenAt) : null } : {}),
  },
});
```

`consentMethod` y `consentNotes` son strings simples y ya pasan correctamente por el `...rest` existente.

---

## 3. Documento de consentimiento

Un componente de texto fijo (`ConsentDocumentText`, sin backend, similar en tono a `PrivacyPolicy.tsx`) que cubre:

- Qué datos de salud se recopilan (motivo de consulta, antecedentes, notas de sesión).
- Que se almacenan en Aliax y son tratados como datos personales sensibles (LFPDPPP Art. 9).
- Que si el terapeuta usa la función de notas con IA, el texto se envía anonimizado (sin nombre) a Anthropic.
- Los derechos ARCO del paciente y el contacto (`privacidad@aliax.io`), igual que en la Política de Privacidad.

Se reutiliza como texto embebido en el Paso 0 del wizard (sección 4) y como contenido descargable. Para evitar agregar una dependencia nueva solo para un documento de una página, el botón "Descargar documento de consentimiento" abre el texto en una vista dedicada (`window.print()` del navegador, que ya permite "Guardar como PDF" desde el diálogo de impresión) en vez de generar el PDF con una librería como jsPDF.

---

## 4. Frontend — Paso 0 del wizard

Nuevo primer paso en `PatientWizard.tsx` y `CoupleWizard.tsx` (antes de `Step1Datos`/`StepC1Datos`), siguiendo el mismo patrón de props que los pasos existentes (`patient`, `onSave`, `inp`, `lbl`, `accent`, `isDark`):

**Contenido de la pantalla:**
- El texto de `ConsentDocumentText` (o un resumen con un enlace/acordeón para expandir el texto completo).
- Selector de método (etiqueta visible → valor guardado en `consentMethod`): "Firma en papel" → `"escrito"`, "Consentimiento verbal" → `"verbal"`, "Otro" → `"otro"` (el valor `"digital"` queda reservado para el flujo de la sección 6, no aparece como opción todavía).
- Campo de texto opcional para `consentNotes`.
- Checkbox de confirmación ("Confirmo que el paciente dio su consentimiento expreso") — al marcarlo y guardar, se manda `consentGivenAt: new Date().toISOString()` junto con `consentMethod`/`consentNotes` vía el `onSave` existente (que ya llama a `updateClient`, sección 2).
- Botón "Descargar documento de consentimiento" — no bloquea el flujo, es una ayuda para el terapeuta.

### Gating

Si `patient.consentGivenAt` es `null`, los pasos siguientes del wizard (que sí capturan datos sensibles) se muestran bloqueados con un aviso, replicando visualmente el patrón ya usado para los pasos "PRO" bloqueados en `SessionNotesFeed` (candado + texto explicativo). El Paso 0 en sí nunca está bloqueado.

Los datos generales no sensibles (nombre, teléfono del `Client`) siguen capturándose desde el formulario "Nuevo paciente" existente (`Pacientes.tsx`), **antes** de este wizard — ese paso no cambia y no se gatea, porque nombre/teléfono no son datos sensibles por sí solos.

---

## 5. Manejo de errores

- Si el `PATCH` falla (red, 401, etc.), el Paso 0 muestra el mismo patrón de error que usan los demás pasos del wizard (revertir el checkbox, mensaje de error inline) — no hay lógica nueva de manejo de errores, se reutiliza la existente en `onSave`.
- No hay validación de "el checkbox debe estar marcado para continuar" a nivel de UI estricta — el gating de los pasos siguientes (sección 4) ya cumple esa función; el checkbox puede desmarcarse y volver a marcarse libremente antes de guardar.

---

## 6. Fuera de alcance (explícitamente)

- Flujo de consentimiento digital directo del paciente (link por email/WhatsApp) — el modelo de datos lo permite a futuro (`consentMethod: "digital"`) pero no se construye ahora.
- Revocación de consentimiento desde una UI dedicada — se maneja, como hoy, vía el correo de contacto ya documentado en la Política de Privacidad (sección 8, derechos ARCO).
- Re-confirmación periódica o expiración del consentimiento — un solo registro por paciente, sin fecha de vencimiento.
- Cambios a `ai-notes.ts`, `ai-matching.ts` o `SessionNotesFeed.tsx`.
