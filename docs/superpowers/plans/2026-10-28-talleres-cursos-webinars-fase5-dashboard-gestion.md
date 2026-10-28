# Fase 5: Dashboard de gestión "Mis Talleres y Cursos" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new "Talleres y Cursos" section inside the professional's Dashboard where they can create, edit, publish/unpublish, and archive their Offerings (workshops/courses), including full management of their Modules, Questions, and ScoringRules — all currently only reachable via direct API calls.

**Architecture:** A new tab inside the existing `Dashboard.tsx` left sidebar (not a new route), backed by a new `useOfferings` data hook that wraps the already-existing backend endpoints. The new UI lives in `frontend/src/pages/TalleresCursos.tsx` plus four focused sub-components under `frontend/src/components/offerings/`. One small backend addition (an `order` field on module updates) and one small hook addition (`uploadPdf`, mirroring the existing `uploadVideo`) are required; everything else consumes existing endpoints.

**Tech Stack:** React + TypeScript (frontend), Express + Prisma + Zod (backend), inline-style theming via the `Colors` (`C`) prop pattern already used by `Pacientes.tsx` (not Tailwind — this UI renders inside the Dashboard's themed shell, unlike standalone pages like `ServicesDashboard.tsx`).

---

## Important context for whoever implements this

- **No test suite exists in this repo.** Verification is empirical: `tsc --noEmit` for type safety, `curl` against a local dev server for the one backend change, and a manual browser walkthrough for the frontend (Task 12).
- **This UI renders *inside* `Dashboard.tsx`'s themed shell**, like the existing `Pacientes` tab — NOT as a standalone page like `ServicesDashboard.tsx`. That means every new component takes a `C: Colors` prop and uses inline `style={{...}}` objects that reference `C.accent`, `C.text`, `C.muted`, `C.border`, `C.cardBg`, `C.isDark`, matching the exact pattern in `frontend/src/pages/Pacientes.tsx`. Do not use Tailwind classes in these new files.
- **`Offering.priceUSD`/`priceMXN` arrive from the API as strings** (Prisma `Decimal` serializes to JSON as a string), but the create/update endpoints expect numbers in the request body. Forms must `Number(...)` the input before sending and display the string value as-is when reading.
- **`Offering.scheduledAt` is a full date+time** (ISO datetime string), but the existing `CustomDatePicker` component only handles a date (`YYYY-MM-DD`). The create/edit form must pair it with a plain `<input type="time">` and combine both into one ISO string before sending (see Task 4, Step 2 for the exact code).

---

### Task 0: Set up the worktree

- [ ] **Step 1: Create the worktree**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax"
git worktree add .worktrees/talleres-fase5-dashboard-gestion -b feature/talleres-fase5-dashboard-gestion
```

- [ ] **Step 2: Copy the `.env` files (not tracked by git)**

```bash
cp backend/.env .worktrees/talleres-fase5-dashboard-gestion/backend/.env
cp frontend/.env .worktrees/talleres-fase5-dashboard-gestion/frontend/.env 2>/dev/null || echo "frontend has no .env, skipping"
```

- [ ] **Step 3: Install dependencies in both packages**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\backend" && npm install
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npm install
```

- [ ] **Step 4: Verify a clean baseline**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\backend" && npx tsc --noEmit && echo "BACKEND_OK"
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit && echo "FRONTEND_OK"
```

Expected: both print their `_OK` line with no TypeScript errors.

---

### Task 1: Backend — allow reordering modules

**Files:**
- Modify: `backend/src/utils/validation.ts`

- [ ] **Step 1: Add `order` to `updateModuleSchema`**

Find this block (currently without `order`):

```typescript
export const updateModuleSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
});
```

Replace it with:

```typescript
export const updateModuleSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
  order: z.number().int().min(1).optional(),
});
```

No other file needs to change: `PUT /:offeringId/modules/:moduleId` in `backend/src/routes/offerings.ts` already does `prisma.module.update({ where: { id: req.params.moduleId }, data })`, passing through the entire parsed object — `order` will be persisted automatically now that the schema allows it.

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\backend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/utils/validation.ts
git commit -m "feat: allow reordering modules via PUT .../modules/:moduleId

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Frontend — add `uploadPdf` to the upload hook

**Files:**
- Modify: `frontend/src/hooks/useUpload.ts`

The backend already exposes `POST /api/upload/pdf` (see `backend/src/routes/upload.ts`), but `useUpload.ts` only wraps `/image` and `/video`. Module content for `PDF`-type modules needs this.

- [ ] **Step 1: Read the current file to confirm the exact pattern to mirror**

`frontend/src/hooks/useUpload.ts` currently ends with `uploadVideo` (mirrors `uploadImage` exactly, just posting to `/upload/video`) and returns `{ uploadImage, uploadVideo, uploading, progress, error }`.

- [ ] **Step 2: Add `uploadPdf`, mirroring `uploadVideo` exactly**

Insert a new function right after `uploadVideo`'s closing brace, before the `return` statement:

```typescript
  const uploadPdf = async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir PDF');
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };
```

And change the final `return` line from:

```typescript
  return { uploadImage, uploadVideo, uploading, progress, error };
```

to:

```typescript
  return { uploadImage, uploadVideo, uploadPdf, uploading, progress, error };
```

- [ ] **Step 3: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useUpload.ts
git commit -m "feat: add uploadPdf to useUpload hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — `useOfferings` data hook

**Files:**
- Create: `frontend/src/hooks/useOfferings.ts`

This is the full data layer: TypeScript interfaces mirroring the Prisma models, and functions wrapping every endpoint this feature needs. No UI in this file.

- [ ] **Step 1: Write the file**

```typescript
import { useState, useCallback } from 'react';
import api from '../api/client';

export interface QuestionOption {
  id: string;
  label: string;
  value: number;
}

export interface Question {
  id: string;
  moduleId: string;
  order: number;
  text: string;
  type: 'FREE_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  options: QuestionOption[];
}

export interface ScoringRule {
  id: string;
  moduleId: string;
  minScore: number;
  maxScore: number;
  message: string;
}

export interface Module {
  id: string;
  offeringId: string;
  order: number;
  title: string;
  description: string | null;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'QUESTIONNAIRE';
  textContent: string | null;
  fileUrl: string | null;
  createdAt: string;
}

export interface Offering {
  id: string;
  profileId: string;
  type: 'LIVE_WORKSHOP' | 'RECORDED_COURSE';
  title: string;
  description: string | null;
  coverImage: string | null;
  priceUSD: string;
  priceMXN: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  scheduledAt: string | null;
  capacity: number | null;
  externalLink: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { modules: number; purchases: number };
}

export interface CreateOfferingData {
  profileId: string;
  type: 'LIVE_WORKSHOP' | 'RECORDED_COURSE';
  title: string;
  description?: string;
  coverImage?: string;
  priceUSD: number;
  priceMXN?: number;
  scheduledAt?: string;
  capacity?: number;
  externalLink?: string;
}

export interface UpdateOfferingData {
  title?: string;
  description?: string;
  coverImage?: string;
  priceUSD?: number;
  priceMXN?: number | null;
  scheduledAt?: string | null;
  capacity?: number | null;
  externalLink?: string | null;
}

export interface CreateModuleData {
  title: string;
  description?: string;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'QUESTIONNAIRE';
  textContent?: string;
  fileUrl?: string;
}

export interface UpdateModuleData {
  title?: string;
  description?: string;
  textContent?: string;
  fileUrl?: string;
  order?: number;
}

export interface CreateQuestionData {
  text: string;
  type: 'FREE_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  options?: { label: string; value: number }[];
}

export interface ScoringRuleData {
  minScore: number;
  maxScore: number;
  message: string;
}

function errorMessage(err: any, fallback: string): string {
  return err.response?.data?.error || fallback;
}

// NO auto-carga al montarse (a diferencia de useServices.ts): este hook se usa tanto en
// TalleresCursos.tsx (que permanece montado todo el tiempo, oculto con display:none, nunca
// desmontado -- mismo patron que Pacientes) como dentro de QuestionnaireEditor.tsx (que se
// monta/desmonta cada vez que se abre/cierra el modal de un modulo QUESTIONNAIRE). Si este
// hook se auto-cargara en su propio useEffect, TalleresCursos dispararia un GET /offerings/me
// apenas el Dashboard carga -- sin que el profesional haya entrado a la pestaña -- y cada
// apertura de QuestionnaireEditor dispararia otro de mas. En su lugar, cada consumidor decide
// cuando llamar fetchOfferings() explicitamente (TalleresCursos ya lo hace, gateado por
// `isActive`; QuestionnaireEditor nunca necesita la lista de offerings, solo las funciones).
export function useOfferings() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOfferings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/offerings/me');
      setOfferings(res.data);
      setError(null);
    } catch (err: any) {
      setError(errorMessage(err, 'Error al cargar tus ofertas'));
    } finally {
      setLoading(false);
    }
  }, []);

  const createOffering = async (data: CreateOfferingData): Promise<Offering> => {
    try {
      const res = await api.post('/offerings', data);
      await fetchOfferings();
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear la oferta'));
    }
  };

  const updateOffering = async (id: string, data: UpdateOfferingData): Promise<Offering> => {
    try {
      const res = await api.put(`/offerings/${id}`, data);
      await fetchOfferings();
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar la oferta'));
    }
  };

  const togglePublish = async (id: string): Promise<Offering> => {
    try {
      const res = await api.patch(`/offerings/${id}/publish`);
      await fetchOfferings();
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al publicar/despublicar la oferta'));
    }
  };

  const archiveOffering = async (id: string): Promise<void> => {
    try {
      await api.delete(`/offerings/${id}`);
      await fetchOfferings();
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al archivar la oferta'));
    }
  };

  const fetchModules = async (offeringId: string): Promise<Module[]> => {
    const res = await api.get(`/offerings/${offeringId}/modules`);
    return res.data;
  };

  const createModule = async (offeringId: string, data: CreateModuleData): Promise<Module> => {
    try {
      const res = await api.post(`/offerings/${offeringId}/modules`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear el modulo'));
    }
  };

  const updateModule = async (offeringId: string, moduleId: string, data: UpdateModuleData): Promise<Module> => {
    try {
      const res = await api.put(`/offerings/${offeringId}/modules/${moduleId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar el modulo'));
    }
  };

  const deleteModule = async (offeringId: string, moduleId: string): Promise<void> => {
    try {
      await api.delete(`/offerings/${offeringId}/modules/${moduleId}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al eliminar el modulo'));
    }
  };

  const fetchQuestions = async (offeringId: string, moduleId: string): Promise<Question[]> => {
    const res = await api.get(`/offerings/${offeringId}/modules/${moduleId}/questions`);
    return res.data;
  };

  const createQuestion = async (offeringId: string, moduleId: string, data: CreateQuestionData): Promise<Question> => {
    try {
      const res = await api.post(`/offerings/${offeringId}/modules/${moduleId}/questions`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear la pregunta'));
    }
  };

  const updateQuestionText = async (offeringId: string, moduleId: string, questionId: string, text: string): Promise<Question> => {
    try {
      const res = await api.put(`/offerings/${offeringId}/modules/${moduleId}/questions/${questionId}`, { text });
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar la pregunta'));
    }
  };

  const deleteQuestion = async (offeringId: string, moduleId: string, questionId: string): Promise<void> => {
    try {
      await api.delete(`/offerings/${offeringId}/modules/${moduleId}/questions/${questionId}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al eliminar la pregunta'));
    }
  };

  const fetchScoringRules = async (offeringId: string, moduleId: string): Promise<ScoringRule[]> => {
    const res = await api.get(`/offerings/${offeringId}/modules/${moduleId}/scoring-rules`);
    return res.data;
  };

  const createScoringRule = async (offeringId: string, moduleId: string, data: ScoringRuleData): Promise<ScoringRule> => {
    try {
      const res = await api.post(`/offerings/${offeringId}/modules/${moduleId}/scoring-rules`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear la regla de puntaje'));
    }
  };

  const updateScoringRule = async (offeringId: string, moduleId: string, ruleId: string, data: ScoringRuleData): Promise<ScoringRule> => {
    try {
      const res = await api.put(`/offerings/${offeringId}/modules/${moduleId}/scoring-rules/${ruleId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar la regla de puntaje'));
    }
  };

  const deleteScoringRule = async (offeringId: string, moduleId: string, ruleId: string): Promise<void> => {
    try {
      await api.delete(`/offerings/${offeringId}/modules/${moduleId}/scoring-rules/${ruleId}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al eliminar la regla de puntaje'));
    }
  };

  return {
    offerings, loading, error, setError, fetchOfferings,
    createOffering, updateOffering, togglePublish, archiveOffering,
    fetchModules, createModule, updateModule, deleteModule,
    fetchQuestions, createQuestion, updateQuestionText, deleteQuestion,
    fetchScoringRules, createScoringRule, updateScoringRule, deleteScoringRule,
  };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit
```

Expected: no output (the file isn't imported anywhere yet, so this just confirms the file itself is syntactically and typologically valid in isolation — `tsc` checks the whole project, so any error inside this new unused file will still surface).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useOfferings.ts
git commit -m "feat: add useOfferings data hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Frontend — `OfferingFormModal.tsx` (create/edit an Offering)

**Files:**
- Create: `frontend/src/components/offerings/OfferingFormModal.tsx`

This modal handles both creating a new Offering and editing an existing one's basic fields. `type` is only editable at creation time (the backend's `PUT /:id` never accepts `type`).

- [ ] **Step 1: Write the file**

```tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import CustomDatePicker from '../CustomDatePicker';
import { useUpload } from '../../hooks/useUpload';
import type { Offering, CreateOfferingData, UpdateOfferingData } from '../../hooks/useOfferings';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

interface Props {
  C: Colors;
  isOpen: boolean;
  mode: 'create' | 'edit';
  offering: Offering | null;
  profileId: string;
  onClose: () => void;
  onSubmit: (data: CreateOfferingData | UpdateOfferingData) => Promise<void>;
}

function splitScheduledAt(scheduledAt: string | null): { date: string; time: string } {
  if (!scheduledAt) return { date: '', time: '' };
  const d = new Date(scheduledAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

export default function OfferingFormModal({ C, isOpen, mode, offering, profileId, onClose, onSubmit }: Props) {
  const { uploadImage, uploading, progress } = useUpload();

  const [type, setType] = useState<'LIVE_WORKSHOP' | 'RECORDED_COURSE'>('RECORDED_COURSE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [priceMXN, setPriceMXN] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && offering) {
      setType(offering.type);
      setTitle(offering.title);
      setDescription(offering.description || '');
      setPriceUSD(offering.priceUSD);
      setPriceMXN(offering.priceMXN || '');
      setCoverImage(offering.coverImage || '');
      const { date, time } = splitScheduledAt(offering.scheduledAt);
      setScheduledDate(date);
      setScheduledTime(time);
      setCapacity(offering.capacity != null ? String(offering.capacity) : '');
      setExternalLink(offering.externalLink || '');
    } else {
      setType('RECORDED_COURSE');
      setTitle('');
      setDescription('');
      setPriceUSD('');
      setPriceMXN('');
      setCoverImage('');
      setScheduledDate('');
      setScheduledTime('');
      setCapacity('');
      setExternalLink('');
    }
    setFormError('');
  }, [isOpen, mode, offering]);

  if (!isOpen) return null;

  const handleCoverUpload = async (file: File) => {
    const result = await uploadImage(file);
    if (result) setCoverImage(result.url);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!title.trim() || title.trim().length < 3) {
      setFormError('El titulo debe tener al menos 3 caracteres');
      return;
    }
    const priceNum = Number(priceUSD);
    if (!priceUSD || Number.isNaN(priceNum) || priceNum < 0) {
      setFormError('El precio USD debe ser un numero valido');
      return;
    }
    let scheduledAtIso: string | undefined;
    if (type === 'LIVE_WORKSHOP') {
      if (!scheduledDate || !scheduledTime) {
        setFormError('Un taller en vivo requiere fecha y hora');
        return;
      }
      if (!externalLink.trim()) {
        setFormError('Un taller en vivo requiere un enlace externo');
        return;
      }
      scheduledAtIso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const data: CreateOfferingData = {
          profileId,
          type,
          title: title.trim(),
          priceUSD: priceNum,
          description: description.trim() || undefined,
          coverImage: coverImage || undefined,
          priceMXN: priceMXN ? Number(priceMXN) : undefined,
          scheduledAt: scheduledAtIso,
          capacity: capacity ? Number(capacity) : undefined,
          externalLink: type === 'LIVE_WORKSHOP' ? externalLink.trim() : undefined,
        };
        await onSubmit(data);
      } else {
        const data: UpdateOfferingData = {
          title: title.trim(),
          priceUSD: priceNum,
          description: description.trim() || '',
          coverImage: coverImage || '',
          priceMXN: priceMXN ? Number(priceMXN) : null,
          scheduledAt: scheduledAtIso ?? null,
          capacity: capacity ? Number(capacity) : null,
          externalLink: type === 'LIVE_WORKSHOP' ? externalLink.trim() : null,
        };
        await onSubmit(data);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, width: '100%', boxSizing: 'border-box',
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'white',
    border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase',
    letterSpacing: '0.5px', display: 'block', marginBottom: 5, marginTop: 14,
  };
  const btnPrimary: React.CSSProperties = {
    padding: '10px 18px', background: C.accent, border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    padding: '10px 18px', background: 'transparent', border: `1px solid ${C.border}`,
    borderRadius: 10, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
            {mode === 'create' ? 'Nueva oferta' : 'Editar datos basicos'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <label style={lbl}>Tipo</label>
        {mode === 'create' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setType('RECORDED_COURSE')}
              style={{ ...btnSecondary, flex: 1, background: type === 'RECORDED_COURSE' ? C.accentLight : 'transparent', borderColor: type === 'RECORDED_COURSE' ? C.accent : C.border }}
            >
              Curso grabado
            </button>
            <button
              onClick={() => setType('LIVE_WORKSHOP')}
              style={{ ...btnSecondary, flex: 1, background: type === 'LIVE_WORKSHOP' ? C.accentLight : 'transparent', borderColor: type === 'LIVE_WORKSHOP' ? C.accent : C.border }}
            >
              Taller en vivo
            </button>
          </div>
        ) : (
          <input style={{ ...inp, opacity: 0.6 }} value={type === 'LIVE_WORKSHOP' ? 'Taller en vivo' : 'Curso grabado'} disabled />
        )}

        <label style={lbl}>Titulo</label>
        <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la oferta" />

        <label style={lbl}>Descripcion</label>
        <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Precio USD</label>
            <input style={inp} type="number" min={0} value={priceUSD} onChange={(e) => setPriceUSD(e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Precio MXN (opcional)</label>
            <input style={inp} type="number" min={0} value={priceMXN} onChange={(e) => setPriceMXN(e.target.value)} placeholder="0" />
          </div>
        </div>

        <label style={lbl}>Imagen de portada (opcional)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
        />
        {uploading && <p style={{ fontSize: 12, color: C.muted, margin: '4px 0' }}>Subiendo... {progress}%</p>}
        {coverImage && !uploading && (
          <img src={coverImage} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 6 }} />
        )}

        {type === 'LIVE_WORKSHOP' && (
          <>
            <label style={lbl}>Fecha y hora</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <CustomDatePicker value={scheduledDate} onChange={setScheduledDate} accent={C.accent} isDark={C.isDark} style={{ flex: 1 }} />
              <input style={{ ...inp, flex: 1 }} type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </div>

            <label style={lbl}>Cupo (opcional)</label>
            <input style={inp} type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Sin limite" />

            <label style={lbl}>Enlace externo (Zoom, Meet, etc.)</label>
            <input style={inp} value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://..." />
          </>
        )}

        {formError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{formError}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button style={btnSecondary} onClick={onClose}>Cancelar</button>
          <button style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : mode === 'create' ? 'Crear oferta' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit
```

Expected: no output. (If `CustomDatePicker`'s `Props` interface doesn't export a `style` field exactly as used above, this step will surface it — check `frontend/src/components/CustomDatePicker.tsx`'s `Props` interface, it does declare `style?: React.CSSProperties`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/offerings/OfferingFormModal.tsx
git commit -m "feat: add OfferingFormModal for creating/editing offerings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Frontend — `OfferingList.tsx` (list view, presentational)

**Files:**
- Create: `frontend/src/components/offerings/OfferingList.tsx`

Pure presentational component: receives an already-filtered array and renders cards with actions. Filtering/tab state lives in the parent (`TalleresCursos.tsx`), matching the `ServiceList`/`ServicesDashboard` split.

- [ ] **Step 1: Write the file**

```tsx
import { Pencil, Eye, EyeOff, Archive } from 'lucide-react';
import type { Offering } from '../../hooks/useOfferings';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

interface Props {
  C: Colors;
  offerings: Offering[];
  loading: boolean;
  emptyMessage: string;
  onEdit: (offering: Offering) => void;
  onOpen: (offering: Offering) => void;
  onTogglePublish: (offering: Offering) => void;
  onArchive: (offering: Offering) => void;
}

const STATUS_LABEL: Record<Offering['status'], string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  ARCHIVED: 'Archivada',
};

const STATUS_COLOR: Record<Offering['status'], string> = {
  DRAFT: '#f59e0b',
  PUBLISHED: '#22c55e',
  ARCHIVED: '#6b7280',
};

export default function OfferingList({ C, offerings, loading, emptyMessage, onEdit, onOpen, onTogglePublish, onArchive }: Props) {
  if (loading) {
    return <p style={{ color: C.muted, fontSize: 14, padding: 20, textAlign: 'center' }}>Cargando...</p>;
  }
  if (offerings.length === 0) {
    return <p style={{ color: C.muted, fontSize: 14, padding: 20, textAlign: 'center' }}>{emptyMessage}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {offerings.map((offering) => (
        <div
          key={offering.id}
          style={{
            background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}
        >
          <div onClick={() => onOpen(offering)} style={{ flex: 1, minWidth: 180, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: STATUS_COLOR[offering.status],
                background: `${STATUS_COLOR[offering.status]}22`, borderRadius: 6, padding: '2px 7px',
                textTransform: 'uppercase',
              }}>
                {STATUS_LABEL[offering.status]}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>
                {offering.type === 'LIVE_WORKSHOP' ? 'Taller en vivo' : 'Curso grabado'}
              </span>
            </div>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{offering.title}</p>
            <p style={{ color: C.muted, fontSize: 12, margin: '4px 0 0' }}>
              ${offering.priceUSD} USD · {offering._count.modules} modulo{offering._count.modules === 1 ? '' : 's'} · {offering._count.purchases} compra{offering._count.purchases === 1 ? '' : 's'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              title="Editar datos basicos"
              onClick={() => onEdit(offering)}
              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', color: C.text }}
            >
              <Pencil size={15} />
            </button>
            {offering.status !== 'ARCHIVED' && (
              <button
                title={offering.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                onClick={() => onTogglePublish(offering)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', color: C.text }}
              >
                {offering.status === 'PUBLISHED' ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            )}
            {offering.status !== 'ARCHIVED' && (
              <button
                title="Archivar"
                onClick={() => onArchive(offering)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', color: '#ef4444' }}
              >
                <Archive size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/offerings/OfferingList.tsx
git commit -m "feat: add OfferingList presentational component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Frontend — `QuestionnaireEditor.tsx` (questions + scoring rules for one module)

**Files:**
- Create: `frontend/src/components/offerings/QuestionnaireEditor.tsx`

Rendered inside `ModuleFormModal` only when the module's type is `QUESTIONNAIRE`. Manages two independent lists (questions, scoring rules) with inline add-forms (not nested modals).

- [ ] **Step 1: Write the file**

```tsx
import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X as XIcon } from 'lucide-react';
import { useOfferings, type Question, type ScoringRule } from '../../hooks/useOfferings';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

interface Props {
  C: Colors;
  offeringId: string;
  moduleId: string;
}

type QuestionType = 'FREE_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  FREE_TEXT: 'Texto libre',
  SINGLE_CHOICE: 'Opcion unica',
  MULTIPLE_CHOICE: 'Opcion multiple',
};

export default function QuestionnaireEditor({ C, offeringId, moduleId }: Props) {
  const { fetchQuestions, createQuestion, updateQuestionText, deleteQuestion, fetchScoringRules, createScoringRule, updateScoringRule, deleteScoringRule } = useOfferings();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingRules, setLoadingRules] = useState(true);
  const [error, setError] = useState('');

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    try {
      setQuestions(await fetchQuestions(offeringId, moduleId));
    } finally {
      setLoadingQuestions(false);
    }
  };
  const loadRules = async () => {
    setLoadingRules(true);
    try {
      setRules(await fetchScoringRules(offeringId, moduleId));
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    loadQuestions();
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  // ── Questions ──
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('FREE_TEXT');
  const [qOptions, setQOptions] = useState<{ label: string; value: string }[]>([{ label: '', value: '' }, { label: '', value: '' }]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');

  const resetQuestionForm = () => {
    setAddingQuestion(false);
    setQText('');
    setQType('FREE_TEXT');
    setQOptions([{ label: '', value: '' }, { label: '', value: '' }]);
  };

  const submitQuestion = async () => {
    setError('');
    if (qText.trim().length < 3) {
      setError('La pregunta debe tener al menos 3 caracteres');
      return;
    }
    try {
      if (qType === 'FREE_TEXT') {
        await createQuestion(offeringId, moduleId, { text: qText.trim(), type: qType });
      } else {
        const parsedOptions = qOptions
          .filter((o) => o.label.trim())
          .map((o) => ({ label: o.label.trim(), value: Number(o.value) || 0 }));
        if (parsedOptions.length < 2) {
          setError('Las preguntas de opcion requieren al menos 2 opciones');
          return;
        }
        await createQuestion(offeringId, moduleId, { text: qText.trim(), type: qType, options: parsedOptions });
      }
      resetQuestionForm();
      await loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveQuestionText = async (questionId: string) => {
    setError('');
    try {
      await updateQuestionText(offeringId, moduleId, questionId, editingQuestionText.trim());
      setEditingQuestionId(null);
      await loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeQuestion = async (questionId: string) => {
    setError('');
    try {
      await deleteQuestion(offeringId, moduleId, questionId);
      await loadQuestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Scoring rules ──
  const [addingRule, setAddingRule] = useState(false);
  const [rMin, setRMin] = useState('');
  const [rMax, setRMax] = useState('');
  const [rMessage, setRMessage] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRMin, setEditRMin] = useState('');
  const [editRMax, setEditRMax] = useState('');
  const [editRMessage, setEditRMessage] = useState('');

  const resetRuleForm = () => {
    setAddingRule(false);
    setRMin('');
    setRMax('');
    setRMessage('');
  };

  const submitRule = async () => {
    setError('');
    const minScore = Number(rMin);
    const maxScore = Number(rMax);
    if (Number.isNaN(minScore) || Number.isNaN(maxScore) || maxScore < minScore) {
      setError('El rango de puntaje no es valido (maximo debe ser mayor o igual al minimo)');
      return;
    }
    if (rMessage.trim().length < 3) {
      setError('El mensaje debe tener al menos 3 caracteres');
      return;
    }
    try {
      await createScoringRule(offeringId, moduleId, { minScore, maxScore, message: rMessage.trim() });
      resetRuleForm();
      await loadRules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEditRule = (rule: ScoringRule) => {
    setEditingRuleId(rule.id);
    setEditRMin(String(rule.minScore));
    setEditRMax(String(rule.maxScore));
    setEditRMessage(rule.message);
  };

  const saveRule = async (ruleId: string) => {
    setError('');
    const minScore = Number(editRMin);
    const maxScore = Number(editRMax);
    if (Number.isNaN(minScore) || Number.isNaN(maxScore) || maxScore < minScore) {
      setError('El rango de puntaje no es valido');
      return;
    }
    try {
      await updateScoringRule(offeringId, moduleId, ruleId, { minScore, maxScore, message: editRMessage.trim() });
      setEditingRuleId(null);
      await loadRules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeRule = async (ruleId: string) => {
    setError('');
    try {
      await deleteScoringRule(offeringId, moduleId, ruleId);
      await loadRules();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const inp: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 7, width: '100%', boxSizing: 'border-box',
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'white',
    border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none',
  };
  const miniBtn: React.CSSProperties = {
    fontSize: 12, padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
    background: 'transparent', color: C.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
  };
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '8px 10px', background: C.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderRadius: 8, marginBottom: 6,
  };

  return (
    <div style={{ marginTop: 10 }}>
      {error && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</p>}

      {/* Preguntas */}
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '10px 0 6px' }}>
        Preguntas
      </p>
      {loadingQuestions ? (
        <p style={{ fontSize: 12, color: C.muted }}>Cargando...</p>
      ) : (
        questions.map((q) => (
          <div key={q.id} style={row}>
            {editingQuestionId === q.id ? (
              <>
                <input style={{ ...inp, flex: 1 }} value={editingQuestionText} onChange={(e) => setEditingQuestionText(e.target.value)} />
                <button onClick={() => saveQuestionText(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, display: 'flex' }}><Check size={16} /></button>
                <button onClick={() => setEditingQuestionId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}><XIcon size={16} /></button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}>
                  {q.text} <span style={{ color: C.muted, fontSize: 11 }}>({QUESTION_TYPE_LABEL[q.type]}{q.options.length > 0 ? `, ${q.options.length} opciones` : ''})</span>
                </span>
                <button onClick={() => { setEditingQuestionId(q.id); setEditingQuestionText(q.text); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, display: 'flex' }}><Pencil size={14} /></button>
                <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))
      )}

      {addingQuestion ? (
        <div style={{ padding: 10, background: C.accentLight, borderRadius: 10, marginTop: 6 }}>
          <input style={{ ...inp, marginBottom: 6 }} placeholder="Texto de la pregunta" value={qText} onChange={(e) => setQText(e.target.value)} />
          <select style={{ ...inp, marginBottom: 6 }} value={qType} onChange={(e) => setQType(e.target.value as QuestionType)}>
            <option value="FREE_TEXT">Texto libre</option>
            <option value="SINGLE_CHOICE">Opcion unica</option>
            <option value="MULTIPLE_CHOICE">Opcion multiple</option>
          </select>
          {qType !== 'FREE_TEXT' && (
            <div style={{ marginBottom: 6 }}>
              {qOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <input
                    style={{ ...inp, flex: 2 }}
                    placeholder={`Opcion ${i + 1}`}
                    value={opt.label}
                    onChange={(e) => setQOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, label: e.target.value } : o))}
                  />
                  <input
                    style={{ ...inp, flex: 1 }}
                    type="number"
                    placeholder="Valor"
                    value={opt.value}
                    onChange={(e) => setQOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, value: e.target.value } : o))}
                  />
                  {qOptions.length > 2 && (
                    <button onClick={() => setQOptions((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button style={miniBtn} onClick={() => setQOptions((prev) => [...prev, { label: '', value: '' }])}>
                <Plus size={12} /> Opcion
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...miniBtn, background: C.accent, color: '#fff', borderColor: C.accent }} onClick={submitQuestion}>Guardar pregunta</button>
            <button style={miniBtn} onClick={resetQuestionForm}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button style={miniBtn} onClick={() => setAddingQuestion(true)}><Plus size={12} /> Pregunta</button>
      )}

      {/* Reglas de puntaje */}
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '16px 0 6px' }}>
        Reglas de puntaje
      </p>
      {loadingRules ? (
        <p style={{ fontSize: 12, color: C.muted }}>Cargando...</p>
      ) : (
        rules.map((r) => (
          <div key={r.id} style={row}>
            {editingRuleId === r.id ? (
              <>
                <input style={{ ...inp, width: 50 }} type="number" value={editRMin} onChange={(e) => setEditRMin(e.target.value)} />
                <span style={{ color: C.muted }}>-</span>
                <input style={{ ...inp, width: 50 }} type="number" value={editRMax} onChange={(e) => setEditRMax(e.target.value)} />
                <input style={{ ...inp, flex: 1 }} value={editRMessage} onChange={(e) => setEditRMessage(e.target.value)} />
                <button onClick={() => saveRule(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, display: 'flex' }}><Check size={16} /></button>
                <button onClick={() => setEditingRuleId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}><XIcon size={16} /></button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}>
                  <strong>{r.minScore}-{r.maxScore}</strong> &rarr; {r.message}
                </span>
                <button onClick={() => startEditRule(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, display: 'flex' }}><Pencil size={14} /></button>
                <button onClick={() => removeRule(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={14} /></button>
              </>
            )}
          </div>
        ))
      )}

      {addingRule ? (
        <div style={{ padding: 10, background: C.accentLight, borderRadius: 10, marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input style={{ ...inp, flex: 1 }} type="number" placeholder="Min" value={rMin} onChange={(e) => setRMin(e.target.value)} />
            <input style={{ ...inp, flex: 1 }} type="number" placeholder="Max" value={rMax} onChange={(e) => setRMax(e.target.value)} />
          </div>
          <input style={{ ...inp, marginBottom: 6 }} placeholder="Mensaje de resultado" value={rMessage} onChange={(e) => setRMessage(e.target.value)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...miniBtn, background: C.accent, color: '#fff', borderColor: C.accent }} onClick={submitRule}>Guardar regla</button>
            <button style={miniBtn} onClick={resetRuleForm}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button style={miniBtn} onClick={() => setAddingRule(true)}><Plus size={12} /> Regla</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/offerings/QuestionnaireEditor.tsx
git commit -m "feat: add QuestionnaireEditor for managing questions and scoring rules

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Frontend — `ModuleFormModal.tsx` (create/edit a Module)

**Files:**
- Create: `frontend/src/components/offerings/ModuleFormModal.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useUpload } from '../../hooks/useUpload';
import QuestionnaireEditor from './QuestionnaireEditor';
import type { Module, CreateModuleData, UpdateModuleData } from '../../hooks/useOfferings';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

interface Props {
  C: Colors;
  isOpen: boolean;
  mode: 'create' | 'edit';
  module: Module | null;
  offeringId: string;
  onClose: () => void;
  onCreate: (data: CreateModuleData) => Promise<Module>;
  onUpdate: (moduleId: string, data: UpdateModuleData) => Promise<Module>;
}

type ModuleType = 'TEXT' | 'VIDEO' | 'PDF' | 'QUESTIONNAIRE';

const MODULE_TYPE_LABEL: Record<ModuleType, string> = {
  TEXT: 'Texto',
  VIDEO: 'Video',
  PDF: 'PDF',
  QUESTIONNAIRE: 'Cuestionario',
};

export default function ModuleFormModal({ C, isOpen, mode, module, offeringId, onClose, onCreate, onUpdate }: Props) {
  const { uploadVideo, uploadPdf, uploading, progress } = useUpload();

  const [type, setType] = useState<ModuleType>('TEXT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [textContent, setTextContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedModuleId, setSavedModuleId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && module) {
      setType(module.type);
      setTitle(module.title);
      setDescription(module.description || '');
      setTextContent(module.textContent || '');
      setFileUrl(module.fileUrl || '');
      setSavedModuleId(module.id);
    } else {
      setType('TEXT');
      setTitle('');
      setDescription('');
      setTextContent('');
      setFileUrl('');
      setSavedModuleId(null);
    }
    setFormError('');
  }, [isOpen, mode, module]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    const result = type === 'VIDEO' ? await uploadVideo(file) : await uploadPdf(file);
    if (result) setFileUrl(result.url);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (title.trim().length < 2) {
      setFormError('El titulo debe tener al menos 2 caracteres');
      return;
    }
    if (type === 'TEXT' && !textContent.trim()) {
      setFormError('Un modulo de texto requiere contenido');
      return;
    }
    if ((type === 'VIDEO' || type === 'PDF') && !fileUrl) {
      setFormError(`Un modulo de ${type === 'VIDEO' ? 'video' : 'PDF'} requiere subir un archivo`);
      return;
    }

    setSubmitting(true);
    try {
      // La rama se decide por `savedModuleId`, NO por `mode`: en modo "create", la PRIMERA
      // vez que se guarda crea el modulo (sin savedModuleId todavia); si el tipo es
      // QUESTIONNAIRE el modal se queda abierto despues para agregar preguntas/reglas, y
      // cualquier guardado posterior en esa misma sesion (ej. corregir el titulo) ya debe
      // actualizar ese mismo modulo en vez de intentar crear uno nuevo. En modo "edit",
      // savedModuleId ya viene prellenado desde el useEffect de arriba, asi que esta misma
      // rama de actualizar se usa desde el primer guardado.
      if (!savedModuleId) {
        const data: CreateModuleData = {
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          textContent: type === 'TEXT' ? textContent.trim() : undefined,
          fileUrl: type === 'VIDEO' || type === 'PDF' ? fileUrl : undefined,
        };
        const created = await onCreate(data);
        setSavedModuleId(created.id);
        if (type !== 'QUESTIONNAIRE') onClose();
      } else {
        const data: UpdateModuleData = {
          title: title.trim(),
          description: description.trim() || '',
          textContent: type === 'TEXT' ? textContent.trim() : undefined,
          fileUrl: type === 'VIDEO' || type === 'PDF' ? fileUrl : undefined,
        };
        await onUpdate(savedModuleId, data);
        if (type !== 'QUESTIONNAIRE') onClose();
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, width: '100%', boxSizing: 'border-box',
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'white',
    border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase',
    letterSpacing: '0.5px', display: 'block', marginBottom: 5, marginTop: 14,
  };
  const btnPrimary: React.CSSProperties = {
    padding: '10px 18px', background: C.accent, border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    padding: '10px 18px', background: 'transparent', border: `1px solid ${C.border}`,
    borderRadius: 10, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };

  // true una vez que el modulo ya existe en el servidor (recien creado en esta sesion, o
  // abierto en mode="edit") Y su tipo es QUESTIONNAIRE -- en ese momento se muestra el editor
  // de preguntas/reglas debajo del formulario. El boton Guardar sigue funcionando normalmente
  // en todo momento (ver handleSubmit), asi que Titulo/Descripcion nunca necesitan bloquearse.
  const showQuestionnaireEditor = type === 'QUESTIONNAIRE' && !!savedModuleId;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
            {mode === 'create' ? 'Nuevo modulo' : 'Editar modulo'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <label style={lbl}>Tipo</label>
        {mode === 'create' ? (
          <select style={inp} value={type} onChange={(e) => setType(e.target.value as ModuleType)}>
            <option value="TEXT">Texto</option>
            <option value="VIDEO">Video</option>
            <option value="PDF">PDF</option>
            <option value="QUESTIONNAIRE">Cuestionario</option>
          </select>
        ) : (
          <input style={{ ...inp, opacity: 0.6 }} value={MODULE_TYPE_LABEL[type]} disabled />
        )}

        <label style={lbl}>Titulo</label>
        <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del modulo" />

        <label style={lbl}>Descripcion</label>
        <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />

        {type === 'TEXT' && (
          <>
            <label style={lbl}>Contenido</label>
            <textarea style={{ ...inp, minHeight: 140, resize: 'vertical' }} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Texto que vera el comprador" />
          </>
        )}

        {(type === 'VIDEO' || type === 'PDF') && (
          <>
            <label style={lbl}>Archivo ({type === 'VIDEO' ? 'video' : 'PDF'})</label>
            <input
              type="file"
              accept={type === 'VIDEO' ? 'video/*' : 'application/pdf'}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            {uploading && <p style={{ fontSize: 12, color: C.muted, margin: '4px 0' }}>Subiendo... {progress}%</p>}
            {fileUrl && !uploading && <p style={{ fontSize: 12, color: C.accent, margin: '4px 0' }}>Archivo listo ✓</p>}
          </>
        )}

        {formError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{formError}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button style={btnSecondary} onClick={onClose}>{savedModuleId ? 'Cerrar' : 'Cancelar'}</button>
          <button style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : savedModuleId ? 'Guardar cambios' : 'Crear modulo'}
          </button>
        </div>

        {showQuestionnaireEditor && (
          <QuestionnaireEditor C={C} offeringId={offeringId} moduleId={savedModuleId!} />
        )}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/offerings/ModuleFormModal.tsx
git commit -m "feat: add ModuleFormModal for creating/editing modules

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Frontend — `TalleresCursos.tsx` (top-level: list + editor)

**Files:**
- Create: `frontend/src/pages/TalleresCursos.tsx`

Ties everything together: list view with status-filter tabs, the "editor" view for a selected Offering (module list with reorder arrows), and wires up both modals.

- [ ] **Step 1: Write the file**

```tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ArrowUp, ArrowDown, Pencil, Trash2, GraduationCap } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import { useOfferings, type Offering, type Module, type CreateModuleData, type UpdateModuleData } from '../hooks/useOfferings';
import ProGate from '../components/ProGate';
import OfferingFormModal from '../components/offerings/OfferingFormModal';
import OfferingList from '../components/offerings/OfferingList';
import ModuleFormModal from '../components/offerings/ModuleFormModal';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

type StatusTab = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const MODULE_ICON: Record<Module['type'], string> = {
  TEXT: '📄', VIDEO: '🎥', PDF: '📎', QUESTIONNAIRE: '❓',
};

export default function TalleresCursos({ C, isActive, isPro }: { C: Colors; isActive?: boolean; isPro: boolean }) {
  const {
    offerings, loading, error, setError, fetchOfferings,
    createOffering, updateOffering, togglePublish, archiveOffering,
    fetchModules, createModule, updateModule, deleteModule,
  } = useOfferings();

  const [tab, setTab] = useState<StatusTab>('DRAFT');
  const [profileId, setProfileId] = useState('');
  const [offeringModalOpen, setOfferingModalOpen] = useState(false);
  const [offeringModalMode, setOfferingModalMode] = useState<'create' | 'edit'>('create');
  const [editingOffering, setEditingOffering] = useState<Offering | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Offering | null>(null);

  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleModalMode, setModuleModalMode] = useState<'create' | 'edit'>('create');
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  useEffect(() => {
    if (isActive) fetchOfferings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    api.get('/profiles').then((res) => {
      if (res.data.length > 0) setProfileId(res.data[0].id);
    });
  }, [isActive]);

  const loadModules = async (offeringId: string) => {
    setModulesLoading(true);
    try {
      const data = await fetchModules(offeringId);
      setModules(data);
    } finally {
      setModulesLoading(false);
    }
  };

  const openOffering = async (offering: Offering) => {
    setSelectedOffering(offering);
    await loadModules(offering.id);
  };

  const backToList = () => {
    setSelectedOffering(null);
    setModules([]);
    fetchOfferings();
  };

  const openCreateOffering = () => {
    setEditingOffering(null);
    setOfferingModalMode('create');
    setOfferingModalOpen(true);
  };

  const openEditOffering = (offering: Offering) => {
    setEditingOffering(offering);
    setOfferingModalMode('edit');
    setOfferingModalOpen(true);
  };

  const handleOfferingSubmit = async (data: any) => {
    if (offeringModalMode === 'create') {
      const created = await createOffering(data);
      setOfferingModalOpen(false);
      await openOffering(created);
    } else if (editingOffering) {
      const updated = await updateOffering(editingOffering.id, data);
      if (selectedOffering?.id === updated.id) setSelectedOffering(updated);
    }
  };

  const handleTogglePublish = async (offering: Offering) => {
    try {
      await togglePublish(offering.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmArchive = (offering: Offering) => setArchiveTarget(offering);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveOffering(archiveTarget.id);
      setArchiveTarget(null);
      if (selectedOffering?.id === archiveTarget.id) backToList();
    } catch (err: any) {
      setError(err.message);
      setArchiveTarget(null);
    }
  };

  const openCreateModule = () => {
    setEditingModule(null);
    setModuleModalMode('create');
    setModuleModalOpen(true);
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleModalMode('edit');
    setModuleModalOpen(true);
  };

  const handleCreateModule = async (data: CreateModuleData): Promise<Module> => {
    if (!selectedOffering) throw new Error('No hay oferta seleccionada');
    const result = await createModule(selectedOffering.id, data);
    await loadModules(selectedOffering.id);
    return result;
  };

  const handleUpdateModule = async (moduleId: string, data: UpdateModuleData): Promise<Module> => {
    if (!selectedOffering) throw new Error('No hay oferta seleccionada');
    const result = await updateModule(selectedOffering.id, moduleId, data);
    await loadModules(selectedOffering.id);
    return result;
  };

  const handleDeleteModule = async (module: Module) => {
    if (!selectedOffering) return;
    try {
      await deleteModule(selectedOffering.id, module.id);
      await loadModules(selectedOffering.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const moveModule = async (module: Module, direction: 'up' | 'down') => {
    if (!selectedOffering) return;
    const sorted = [...modules].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((m) => m.id === module.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const other = sorted[swapIndex];
    try {
      await updateModule(selectedOffering.id, module.id, { order: other.order });
      await updateModule(selectedOffering.id, other.id, { order: module.order });
      await loadModules(selectedOffering.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filtered = offerings.filter((o) => o.status === tab);
  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'DRAFT', label: `Borradores (${offerings.filter((o) => o.status === 'DRAFT').length})` },
    { key: 'PUBLISHED', label: `Publicadas (${offerings.filter((o) => o.status === 'PUBLISHED').length})` },
    { key: 'ARCHIVED', label: `Archivadas (${offerings.filter((o) => o.status === 'ARCHIVED').length})` },
  ];

  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
    background: C.accent, border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <ProGate isPro={isPro}>
      <div>
        {error && (
          <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 10, marginBottom: 14, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {!selectedOffering ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <GraduationCap size={20} /> Talleres y Cursos
              </h2>
              <button style={btnPrimary} onClick={openCreateOffering} disabled={!profileId}>
                <Plus size={16} /> Nueva oferta
              </button>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: 'none', border: 'none',
                    color: tab === t.key ? C.accent : C.muted,
                    borderBottom: tab === t.key ? `2px solid ${C.accent}` : '2px solid transparent',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <OfferingList
              C={C}
              offerings={filtered}
              loading={loading}
              emptyMessage={
                tab === 'DRAFT' ? 'No tienes borradores. Crea tu primera oferta!'
                : tab === 'PUBLISHED' ? 'No tienes ofertas publicadas'
                : 'No tienes ofertas archivadas'
              }
              onEdit={openEditOffering}
              onOpen={openOffering}
              onTogglePublish={handleTogglePublish}
              onArchive={confirmArchive}
            />
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <button onClick={backToList} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>
                <ArrowLeft size={15} /> Mis ofertas
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...btnPrimary, background: 'transparent', border: `1px solid ${C.border}`, color: C.text }} onClick={() => openEditOffering(selectedOffering)}>
                  Editar datos basicos
                </button>
                {selectedOffering.status !== 'ARCHIVED' && (
                  <button style={btnPrimary} onClick={() => handleTogglePublish(selectedOffering)}>
                    {selectedOffering.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                  </button>
                )}
              </div>
            </div>

            <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>{selectedOffering.title}</h3>

            {modulesLoading ? (
              <p style={{ color: C.muted, fontSize: 14 }}>Cargando modulos...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {sortedModules.map((module, i) => {
                  const deleteDisabled = selectedOffering.status === 'PUBLISHED' && sortedModules.length <= 1;
                  return (
                    <div key={module.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                      background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button
                          disabled={i === 0}
                          onClick={() => moveModule(module, 'up')}
                          style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? C.border : C.text, display: 'flex' }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          disabled={i === sortedModules.length - 1}
                          onClick={() => moveModule(module, 'down')}
                          style={{ background: 'none', border: 'none', cursor: i === sortedModules.length - 1 ? 'default' : 'pointer', color: i === sortedModules.length - 1 ? C.border : C.text, display: 'flex' }}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <span style={{ fontSize: 18 }}>{MODULE_ICON[module.type]}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{module.title}</p>
                        {module.description && <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0' }}>{module.description}</p>}
                      </div>
                      <button onClick={() => openEditModule(module)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 7, cursor: 'pointer', display: 'flex', color: C.text }}>
                        <Pencil size={14} />
                      </button>
                      <button
                        title={deleteDisabled ? 'Despublica la oferta primero' : 'Eliminar'}
                        disabled={deleteDisabled}
                        onClick={() => handleDeleteModule(module)}
                        style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 7, cursor: deleteDisabled ? 'default' : 'pointer', display: 'flex', color: deleteDisabled ? C.border : '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button style={{ ...btnPrimary, background: 'transparent', border: `1px solid ${C.border}`, color: C.text }} onClick={openCreateModule}>
              <Plus size={16} /> Agregar modulo
            </button>
          </>
        )}

        <OfferingFormModal
          C={C}
          isOpen={offeringModalOpen}
          mode={offeringModalMode}
          offering={editingOffering}
          profileId={profileId}
          onClose={() => setOfferingModalOpen(false)}
          onSubmit={handleOfferingSubmit}
        />

        {selectedOffering && (
          <ModuleFormModal
            C={C}
            isOpen={moduleModalOpen}
            mode={moduleModalMode}
            module={editingModule}
            offeringId={selectedOffering.id}
            onClose={() => setModuleModalOpen(false)}
            onCreate={handleCreateModule}
            onUpdate={handleUpdateModule}
          />
        )}

        {archiveTarget && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setArchiveTarget(null)} />
            <div style={{ position: 'relative', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, maxWidth: 380, width: '100%', padding: 20 }}>
              <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Archivar oferta</h3>
              <p style={{ color: C.muted, fontSize: 13, margin: '0 0 18px' }}>
                Esta accion es <strong>permanente y no se puede deshacer</strong>. "{archiveTarget.title}" dejara de ser visible y no podra publicarse de nuevo.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setArchiveTarget(null)} style={{ padding: '8px 14px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button onClick={handleArchive} style={{ padding: '8px 14px', background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Archivar</button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </ProGate>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TalleresCursos.tsx
git commit -m "feat: add TalleresCursos dashboard tab (list + offering editor)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Frontend — register the tab in `Dashboard.tsx`

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Add the import**

Near the other page imports (e.g. right after `import Pacientes from './Pacientes';`):

```typescript
import TalleresCursos from './TalleresCursos';
```

Find this existing import block:

```typescript
import {
  Plus, LogOut, Calendar, Clock,
  CalendarDays, Facebook, Instagram, Linkedin, MessageCircle,
  Home, Star, Briefcase, Pencil, Camera,
  Sun, Moon, Copy, ExternalLink, Users,
} from 'lucide-react';
```

Replace it with (adding `GraduationCap`):

```typescript
import {
  Plus, LogOut, Calendar, Clock,
  CalendarDays, Facebook, Instagram, Linkedin, MessageCircle,
  Home, Star, Briefcase, Pencil, Camera,
  Sun, Moon, Copy, ExternalLink, Users, GraduationCap,
} from 'lucide-react';
```

- [ ] **Step 2: Extend the `Tab` type**

Find:

```typescript
type Tab = 'inicio' | 'citas' | 'resenas' | 'agenda' | 'cuenta' | 'pacientes';
```

Replace with:

```typescript
type Tab = 'inicio' | 'citas' | 'resenas' | 'agenda' | 'cuenta' | 'pacientes' | 'talleres';
```

- [ ] **Step 3: Add the tab entry to `TABS`**

Find:

```typescript
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'inicio',     label: 'Inicio',           icon: <Home className="h-4 w-4" /> },
    { id: 'agenda',     label: 'Configurar Agenda', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'pacientes',  label: 'Pacientes',          icon: <Users className="h-4 w-4" /> },
    { id: 'citas',      label: 'Mis Citas',         icon: <Calendar className="h-4 w-4" /> },
    { id: 'resenas',    label: 'Reseñas',            icon: <Star className="h-4 w-4" /> },
  ];
```

Replace with:

```typescript
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'inicio',     label: 'Inicio',           icon: <Home className="h-4 w-4" /> },
    { id: 'agenda',     label: 'Configurar Agenda', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'pacientes',  label: 'Pacientes',          icon: <Users className="h-4 w-4" /> },
    { id: 'talleres',   label: 'Talleres y Cursos',  icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'citas',      label: 'Mis Citas',         icon: <Calendar className="h-4 w-4" /> },
    { id: 'resenas',    label: 'Reseñas',            icon: <Star className="h-4 w-4" /> },
  ];
```

- [ ] **Step 4: Add the render block**

Find the `pacientes` render block:

```tsx
              <div style={{ display: activeTab === 'pacientes' ? undefined : 'none' }}>
                <Pacientes C={C} isPairTherapist={isPairTherapist} isPro={(isPro ?? false) || canPacientes} isActive={activeTab === 'pacientes'} />
              </div>
```

Add immediately after it:

```tsx
              <div style={{ display: activeTab === 'talleres' ? undefined : 'none' }}>
                <TalleresCursos C={C} isActive={activeTab === 'talleres'} isPro={isPro ?? false} />
              </div>
```

- [ ] **Step 5: Verify it compiles**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\frontend" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: register Talleres y Cursos tab in the Dashboard sidebar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Backend — empirical verification of the `order` change

No test suite exists; verify against the live dev server with disposable Prisma test data (same style as Fase 4's Task 11).

- [ ] **Step 1: Confirm a free port and start the dev server**

```bash
netstat -ano | grep ":4532"
```
Expected: no output. If occupied, pick another free port and use it below instead of 4532.

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase5-dashboard-gestion\backend"
PORT=4532 npm run dev > /tmp/fase5-dev.log 2>&1 &
disown
sleep 8
curl -s -o /dev/null -w "health: %{http_code}\n" http://localhost:4532/api/health
```
Expected: `health: 200`.

- [ ] **Step 2: Create disposable test data (a Pro user + profile + offering + two modules) via Prisma**

Save as `backend/setup-fase5-test-data.tmp.ts`, run with `npx tsx setup-fase5-test-data.tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from './src/config/env';

const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now().toString(36);
  const user = await prisma.user.create({
    data: { email: `test-fase5-${suffix}@example.com`, password: 'x', name: 'Test Fase 5', plan: 'PRO' },
  });
  const profile = await prisma.profile.create({
    data: { userId: user.id, slug: `test-fase5-${suffix}`, title: 'Test Fase 5 Profile', profession: 'Psicologo' },
  });
  const offering = await prisma.offering.create({
    data: { profileId: profile.id, type: 'RECORDED_COURSE', title: 'Curso de prueba Fase 5', priceUSD: 10, status: 'DRAFT' },
  });
  const moduleA = await prisma.module.create({
    data: { offeringId: offering.id, order: 1, title: 'Modulo A', type: 'TEXT', textContent: 'contenido A' },
  });
  const moduleB = await prisma.module.create({
    data: { offeringId: offering.id, order: 2, title: 'Modulo B', type: 'TEXT', textContent: 'contenido B' },
  });

  // Firmar con env.JWT_SECRET (backend/src/config/env.ts), NO con process.env.JWT_SECRET
  // directo -- env.ts aplica un fallback ('dev-secret-change-me') si la variable no esta en
  // .env, y el servidor en ejecucion verifica tokens con ese mismo valor via env.JWT_SECRET
  // (ver backend/src/services/authService.ts). Firmar con process.env sin el fallback
  // produciria un token valido solo si .env define JWT_SECRET explicitamente.
  const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '1h' });

  console.log(JSON.stringify({
    offeringId: offering.id, moduleAId: moduleA.id, moduleBId: moduleB.id,
    token, userId: user.id, profileId: profile.id,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Confirm the initial order, then swap it**

```bash
curl -s http://localhost:4532/api/offerings/<offeringId>/modules -H "Authorization: Bearer <token>"
```
Expected: `moduleA` has `order: 1`, `moduleB` has `order: 2`.

```bash
curl -s -X PUT "http://localhost:4532/api/offerings/<offeringId>/modules/<moduleAId>" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"order": 2}'
curl -s -X PUT "http://localhost:4532/api/offerings/<offeringId>/modules/<moduleBId>" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"order": 1}'
```
Expected: both return `200` with the updated module (check the `order` field in each response matches what was sent).

```bash
curl -s http://localhost:4532/api/offerings/<offeringId>/modules -H "Authorization: Bearer <token>"
```
Expected: `moduleA` now has `order: 2`, `moduleB` now has `order: 1` — confirming the swap persisted.

- [ ] **Step 4: Confirm the rest of the create/edit/publish flow still works** (sanity check that nothing broke)

```bash
curl -s -X PATCH "http://localhost:4532/api/offerings/<offeringId>/publish" -H "Authorization: Bearer <token>"
```
Expected: `200`, `status: "PUBLISHED"` (the offering has 2 TEXT modules, no QUESTIONNAIRE gate to satisfy).

- [ ] **Step 5: Clean up test data**

Save as `backend/cleanup-fase5-test-data.tmp.ts`, run with `npx tsx cleanup-fase5-test-data.tmp.ts <profileId> <userId>`:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const profileId = process.argv[2];
  const userId = process.argv[3];
  const offerings = await prisma.offering.findMany({ where: { profileId }, select: { id: true } });
  const offeringIds = offerings.map((o) => o.id);
  await prisma.module.deleteMany({ where: { offeringId: { in: offeringIds } } });
  await prisma.offering.deleteMany({ where: { profileId } });
  await prisma.profile.delete({ where: { id: profileId } });
  await prisma.user.delete({ where: { id: userId } });
  console.log('cleanup done');
}
main().finally(() => prisma.$disconnect());
```

Independently re-query (by the test user's email pattern `test-fase5-`) to confirm zero residual rows before moving on.

- [ ] **Step 6: Stop the dev server and delete the temp scripts**

```bash
rm -f backend/setup-fase5-test-data.tmp.ts backend/cleanup-fase5-test-data.tmp.ts /tmp/fase5-dev.log
```

Find and stop the dev server process holding port 4532 (via `netstat`/`Get-CimInstance Win32_Process`, same approach as previous phases), then confirm the port is free again.

---

### Task 11: Frontend — manual browser verification

This task has no code changes — it's a hands-on walkthrough of the entire feature against the running dev servers (backend from Task 10's server, or a fresh one; frontend via `npm run dev` in the worktree's `frontend/`), using a real Pro-plan test account. Unlike Task 10, this one cannot be scripted with `curl` — it's the actual UI.

- [ ] **Step 1:** Log in as a Pro (or admin) user. Open the Dashboard, confirm the new "Talleres y Cursos" tab appears in the sidebar with the graduation-cap icon, between "Pacientes" and "Mis Citas".
- [ ] **Step 2:** Click it. Confirm the empty state ("No tienes borradores...") and the three filter tabs (Borradores/Publicadas/Archivadas) with counts.
- [ ] **Step 3:** Click "+ Nueva oferta". Create a `RECORDED_COURSE` with title, price USD, description, and a cover image upload. Confirm it lands in "Borradores" after creation and opens the editor automatically.
- [ ] **Step 4:** In the editor, click "+ Agregar modulo". Create one `TEXT` module, one `VIDEO` module (upload a small real video file), one `PDF` module (upload a real PDF), and one `QUESTIONNAIRE` module.
- [ ] **Step 5:** For the `QUESTIONNAIRE` module, immediately after creating it (the modal stays open), add: one `FREE_TEXT` question, one `SINGLE_CHOICE` question with 2 options, one `MULTIPLE_CHOICE` question with 3 options — confirm each appears in the list with the right type/option-count label. Add two scoring rules with non-overlapping ranges and confirm they appear.
- [ ] **Step 6:** Close the module modal. Confirm all 4 modules appear in the editor's list, in creation order.
- [ ] **Step 7:** Use the ↑/↓ arrows to move the last module to the top. Reload the page (re-enter the editor) and confirm the new order persisted.
- [ ] **Step 8:** Click "Editar" on the `TEXT` module, change its title, save, confirm the change reflects in the list.
- [ ] **Step 9:** Click "Publicar". Confirm it succeeds (the offering has modules and the questionnaire has both questions and scoring rules, so the gate should pass) and the status badge updates to "Publicada".
- [ ] **Step 10:** Create a second offering of type `LIVE_WORKSHOP` WITHOUT filling in the externalLink field, and confirm the create modal blocks submission with the client-side error before even hitting the backend.
- [ ] **Step 11:** Fill in the externalLink and date/time, create it successfully. In its editor, try to publish it with zero modules — confirm the exact backend gate message ("Agrega al menos un modulo antes de publicar") appears as a toast/error banner.
- [ ] **Step 12:** Go back to "Mis ofertas", confirm both offerings show in their correct filter tabs (first in Publicadas, second in Borradores) with correct module/purchase counts.
- [ ] **Step 13:** Archive the second (draft) offering. Confirm the confirmation dialog's wording, confirm it moves to "Archivadas", and confirm there's no way to un-archive it in the UI (matching the accepted limitation).
- [ ] **Step 14:** Toggle dark mode (if the Dashboard theme switcher is reachable) and spot-check that the new tab, both modals, and the editor are all legibly themed in dark mode too — per this project's standing rule to check both light and dark mode for any visual change.
- [ ] **Step 15:** Log in (or switch) to a non-Pro account and confirm the "Talleres y Cursos" tab shows the dimmed `ProGate` lock overlay instead of the working UI.

Report any step that didn't match its expected outcome before moving to Task 12 — fix the underlying code, not the test.

---

### Task 12: Revisión final y cierre de rama

- [ ] **Step 1:** Dispatch the `superpowers:code-reviewer` agent over the full branch diff against `master`, with special attention to: whether `OfferingFormModal`/`ModuleFormModal` correctly block submission client-side for every backend-enforced invariant they mirror (LIVE_WORKSHOP requiring scheduledAt+externalLink, TEXT requiring textContent, VIDEO/PDF requiring fileUrl), whether the reorder swap logic in `TalleresCursos.tsx` (`moveModule`) can leave modules in a bad state if the second `PUT` fails after the first succeeds, whether any component leaks data across offerings/modules that don't belong to the signed-in professional (should be impossible since every call goes through the already-IDOR-safe backend routes, but worth an explicit look), and whether the dark/light theming (`C.isDark` branches) is applied consistently across all five new files.
- [ ] **Step 2:** Fix whatever the reviewer finds, re-verify (re-run `tsc --noEmit`, and for anything behavior-affecting, repeat the relevant steps of Task 11 manually).
- [ ] **Step 3:** Use `superpowers:finishing-a-development-branch` to present the 4 standard closure options (merge locally / push+PR / keep as-is / discard) and execute whichever the user chooses.

---

## Qué sigue después de esta Fase 5

Con esta fase, el profesional puede gestionar completamente sus Talleres y Cursos desde el panel, sin tocar la API directamente. Lo que sigue (no planeado todavía, mencionado en el spec de esta fase) es la **Fase 6: compradores y métricas** — una vista de quién compró cada oferta y cifras básicas de ingresos/conversión, que requiere un endpoint nuevo de backend que hoy no existe.
