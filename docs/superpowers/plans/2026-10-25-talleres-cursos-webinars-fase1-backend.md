# Talleres/Cursos/Webinars — Fase 1 (Backend: modelo de datos + CRUD de Offering/Module) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un profesional con plan Pro o Clínico puede, vía API, crear un Offering (Taller en vivo o Curso grabado), agregarle Módulos de tipo Texto/Video/PDF, y publicarlo — con todo persistido correctamente en Neon.

**Architecture:** Se agregan 7 modelos nuevos a Prisma (ya diseñados en el spec, incluyendo Question/QuestionOption/ScoringRule/Purchase/Answer aunque sus rutas de API se construyen en fases posteriores — es más simple hacer un solo `db push` con el modelo relacional completo que fragmentarlo). Un solo router nuevo `offerings.ts`, montado en `/api/offerings`, siguiendo el mismo patrón que `services.ts` (que ya mete sub-recursos, ahí "imágenes del servicio", en el mismo archivo). Se extiende `cloudinaryService.ts` con soporte de PDF (hoy solo soporta imagen y video).

**Tech Stack:** Express + Prisma + Zod + Cloudinary (ya integrados en el repo, mismo patrón que `services.ts`/`upload.ts`/`validation.ts`).

**Fuera de esta Fase 1 (planes futuros, spec ya los documenta como separados):** constructor de preguntas/cuestionario con scoring, checkout de invitado + pago, generación de PDF de respuestas, visor de contenido para el comprador, integración en Explorar/perfil público del frontend.

> **Nota post-implementación (26 oct 2026):** el código real en `src/routes/offerings.ts` divergió de los bloques de código de este plan durante las rondas de revisión — en particular el handler `PUT /:id` y las rutas de módulo incluyen fixes de seguridad/invariantes que no estaban en el borrador original (ver commits `ffbc023..6aabfa1` en la rama `feature/talleres-cursos-webinars`, incluye una corrección de un IDOR crítico encontrado y verificado empíricamente). **El archivo en disco es la fuente de verdad, no el código mostrado abajo.** Pendiente real detectado en la revisión final, no bloqueante para esta fase pero a tener en cuenta en Fase 3/4: `GET /:id` y `GET /:offeringId/modules` sirven el contenido completo (`fileUrl`/`textContent`) sin ningún control de compra — ya marcado con `TODO` en el código — hay que cerrar eso en cuanto exista `Purchase`.

---

### Task 1: Modelo de datos — Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Agregar los modelos nuevos al final del archivo**

Abrir `backend/prisma/schema.prisma`, ir al final del archivo (después de `model CrisisReferral`), y agregar:

```prisma

model Offering {
  id           String         @id @default(uuid())
  profileId    String
  type         OfferingType
  title        String
  description  String?
  coverImage   String?
  priceUSD     Decimal
  priceMXN     Decimal?
  status       OfferingStatus @default(DRAFT)
  // Solo aplica si type = LIVE_WORKSHOP
  scheduledAt  DateTime?
  capacity     Int?
  externalLink String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  profile   Profile    @relation(fields: [profileId], references: [id], onDelete: Cascade)
  modules   Module[]
  purchases Purchase[]

  @@index([profileId])
  @@index([status])
}

enum OfferingType {
  LIVE_WORKSHOP
  RECORDED_COURSE
}

enum OfferingStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Module {
  id          String     @id @default(uuid())
  offeringId  String
  order       Int
  title       String
  description String?
  type        ModuleType
  textContent String?    // solo type = TEXT
  fileUrl     String?    // solo type = VIDEO | PDF (Cloudinary)
  createdAt   DateTime   @default(now())

  offering     Offering      @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  questions    Question[]
  scoringRules ScoringRule[]

  @@index([offeringId])
}

enum ModuleType {
  TEXT
  VIDEO
  PDF
  QUESTIONNAIRE
}

model Question {
  id       String       @id @default(uuid())
  moduleId String
  order    Int
  text     String
  type     QuestionType

  module  Module           @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  options QuestionOption[]
  answers Answer[]

  @@index([moduleId])
}

enum QuestionType {
  FREE_TEXT
  SINGLE_CHOICE
  MULTIPLE_CHOICE
}

model QuestionOption {
  id         String @id @default(uuid())
  questionId String
  label      String
  value      Int

  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([questionId])
}

model ScoringRule {
  id       String @id @default(uuid())
  moduleId String
  minScore Int
  maxScore Int
  message  String

  module Module @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@index([moduleId])
}

model Purchase {
  id          String    @id @default(uuid())
  offeringId  String
  buyerName   String
  buyerEmail  String
  buyerPhone  String?
  accessToken String    @unique
  paidAt      DateTime?
  amountPaid  Decimal?
  createdAt   DateTime  @default(now())

  offering Offering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  answers  Answer[]

  @@index([offeringId])
  @@index([accessToken])
}

model Answer {
  id             String   @id @default(uuid())
  purchaseId     String
  questionId     String
  valueText      String?
  valueOptionIds String[] @default([])
  createdAt      DateTime @default(now())

  purchase Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([purchaseId])
  @@index([questionId])
}
```

- [ ] **Step 2: Agregar la relación inversa en `model Profile`**

Dentro de `model Profile` (línea ~287, junto a `services Service[]`), agregar:

```prisma
  offerings Offering[]
```

- [ ] **Step 3: Aplicar el cambio a la base de datos (Neon)**

Run: `npm run db:push`
Expected: termina con `Your database is now in sync with your Prisma schema.` sin errores. Si pide confirmar un posible data loss, revisar que sea solo por los modelos nuevos (no debe afectar ninguna tabla existente).

- [ ] **Step 4: Regenerar el cliente de Prisma**

Run: `npm run db:generate`
Expected: `Generated Prisma Client` sin errores. Esto es lo que hace disponibles `prisma.offering`, `prisma.module`, etc. en TypeScript.

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin salida (0 errores) — el schema nuevo no debería romper nada existente ya que solo se agregó, no se modificó, ningún modelo previo (aparte de la relación inversa en Profile).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Offering/Module/Question/Purchase models for talleres y cursos"
```

---

### Task 2: Cloudinary — soporte de subida de PDF

Hoy `cloudinaryService.ts` solo soporta imagen y video. Los módulos tipo PDF necesitan esto nuevo.

**Files:**
- Modify: `backend/src/services/cloudinaryService.ts`
- Modify: `backend/src/middleware/upload.ts`
- Modify: `backend/src/routes/upload.ts`

- [ ] **Step 1: Agregar `uploadPdf` a `cloudinaryService.ts`**

En `backend/src/services/cloudinaryService.ts`, después de la función `uploadVideo` (antes de `deleteFile`), agregar:

```typescript
export async function uploadPdf(
  fileBuffer: Buffer,
  folder: string = 'aura/documents'
): Promise<{ url: string; publicId: string }> {
  if (!isConfigured()) {
    throw new Error('Cloudinary not configured');
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw',
        allowed_formats: ['pdf'],
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    ).end(fileBuffer);
  });
}
```

- [ ] **Step 2: Extender `deleteFile` para aceptar PDFs (`resource_type: 'raw'`)**

En el mismo archivo, cambiar la firma de `deleteFile`:

```typescript
export async function deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<boolean> {
```

(el cuerpo de la función no cambia, ya recibe `resourceType` como parámetro y lo pasa tal cual a `cloudinary.uploader.destroy`).

- [ ] **Step 3: Agregar middleware `uploadPdf` (multer) en `upload.ts`**

En `backend/src/middleware/upload.ts`, agregar las constantes y el middleware, siguiendo el mismo patrón que `uploadVideo`:

```typescript
const PDF_MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_PDF_TYPES = ['application/pdf'];

export const uploadPdf = multer({
  storage,
  limits: { fileSize: PDF_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_PDF_TYPES.includes(file.mimetype)) {
      return cb(new AppError(400, 'Solo se permiten archivos PDF'));
    }
    cb(null, true);
  },
}).single('file');
```

- [ ] **Step 4: Agregar `POST /api/upload/pdf` en `routes/upload.ts`**

En `backend/src/routes/upload.ts`:

1. Modificar el import existente para incluir el nuevo middleware:

```typescript
import { uploadImage as uploadImageMiddleware, uploadVideo as uploadVideoMiddleware, uploadPdf as uploadPdfMiddleware } from '../middleware/upload';
import { uploadImage, uploadVideo, uploadPdf, isCloudinaryConfigured } from '../services/cloudinaryService';
```

2. Agregar el endpoint, después del bloque `POST /api/upload/video` y antes de `export default router;`:

```typescript
// POST /api/upload/pdf
router.post('/pdf', authMiddleware, (req, res, next) => {
  uploadPdfMiddleware(req, res, (err) => {
    if (err) return next(err instanceof Error ? err : new AppError(400, 'Error al subir PDF'));
    next();
  });
}, async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No se envio ningun PDF');

    if (!isCloudinaryConfigured()) {
      const url = saveLocal(req.file.buffer, '.pdf');
      return res.json({ url, publicId: `local-pdf-${Date.now()}` });
    }

    const result = await uploadPdf(req.file.buffer);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 5: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 6: Probar manualmente con curl**

Primero obtener un token real haciendo login con una cuenta de prueba existente (plan Pro o Clínico):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<tu-email-de-prueba>","password":"<tu-password>"}'
```

Copiar el `token` de la respuesta, luego:

```bash
curl -X POST http://localhost:3000/api/upload/pdf \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/ruta/a/un/archivo/de/prueba.pdf"
```

Expected: `200 OK` con `{"url": "https://res.cloudinary.com/...", "publicId": "aura/documents/..."}`.

- [ ] **Step 7: Commit**

```bash
git add src/services/cloudinaryService.ts src/middleware/upload.ts src/routes/upload.ts
git commit -m "feat: add PDF upload support (Cloudinary raw resource)"
```

---

### Task 3: Validación — esquemas Zod para Offering y Module

**Files:**
- Modify: `backend/src/utils/validation.ts`

- [ ] **Step 1: Agregar los esquemas**

Al final de `backend/src/utils/validation.ts`, agregar:

```typescript
export const createOfferingSchema = z.object({
  profileId: z.string(),
  type: z.enum(['LIVE_WORKSHOP', 'RECORDED_COURSE']),
  title: z.string().min(3, 'Minimo 3 caracteres').max(150, 'Maximo 150 caracteres'),
  description: z.string().max(1000, 'Maximo 1000 caracteres').optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  priceUSD: z.number().min(0, 'El precio no puede ser negativo').max(10000, 'Precio maximo 10,000'),
  priceMXN: z.number().min(0).max(200000).optional(),
  scheduledAt: z.string().datetime().optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
  externalLink: z.string().url('Debe ser una URL valida (ej. enlace de Zoom o Meet)').optional(),
}).refine(
  (data) => data.type !== 'LIVE_WORKSHOP' || (data.scheduledAt && data.externalLink),
  { message: 'Un taller en vivo requiere fecha/hora y enlace externo' }
);

export const updateOfferingSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  priceUSD: z.number().min(0).max(10000).optional(),
  priceMXN: z.number().min(0).max(200000).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  capacity: z.number().int().min(1).max(1000).optional().nullable(),
  externalLink: z.string().url().optional().nullable(),
});

export const createModuleSchema = z.object({
  title: z.string().min(2, 'Minimo 2 caracteres').max(150, 'Maximo 150 caracteres'),
  description: z.string().max(500).optional().or(z.literal('')),
  type: z.enum(['TEXT', 'VIDEO', 'PDF'], {
    errorMap: () => ({ message: 'Tipo de modulo no valido (en esta version: TEXT, VIDEO o PDF)' }),
  }),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional(),
}).refine(
  (data) => data.type !== 'TEXT' || !!data.textContent,
  { message: 'Un modulo de texto requiere contenido' }
).refine(
  (data) => data.type === 'TEXT' || !!data.fileUrl,
  { message: 'Un modulo de video o PDF requiere un archivo subido primero (fileUrl)' }
);

export const updateModuleSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  textContent: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional(),
});
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/utils/validation.ts
git commit -m "feat: add Zod schemas for Offering and Module"
```

---

### Task 4: API — CRUD de Offering y Module

**Files:**
- Create: `backend/src/routes/offerings.ts`

- [ ] **Step 1: Crear el archivo completo**

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createOfferingSchema, updateOfferingSchema, createModuleSchema, updateModuleSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { isProUser } from '../lib/planUtils';
import { verifyToken } from '../services/authService';

const router = Router();
const prisma = new PrismaClient();

// Helper: verify user owns the profile that owns the offering
async function verifyOfferingOwnership(offeringId: string, userId: string) {
  const offering = await prisma.offering.findUnique({
    where: { id: offeringId },
    include: { profile: { select: { userId: true } } },
  });
  if (!offering) throw new AppError(404, 'Oferta no encontrada');
  if (offering.profile.userId !== userId) throw new AppError(403, 'No autorizado');
  return offering;
}

// POST /api/offerings — Create offering (auth, solo Pro/Clinico)
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, plan: true, planExpiresAt: true },
    });
    if (!user || !isProUser(user)) {
      throw new AppError(403, 'Vender talleres y cursos es un beneficio de los planes Pro y Clinico');
    }

    const data = createOfferingSchema.parse(req.body);

    const profile = await prisma.profile.findUnique({ where: { id: data.profileId } });
    if (!profile || profile.userId !== req.userId) throw new AppError(403, 'No autorizado');

    const { scheduledAt, ...rest } = data;
    const offering = await prisma.offering.create({
      data: { ...rest, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined },
    });
    res.status(201).json(offering);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/me — My offerings with stats (auth)
router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.userId },
      select: { id: true },
    });
    const profileIds = profiles.map(p => p.id);

    const offerings = await prisma.offering.findMany({
      where: { profileId: { in: profileIds } },
      include: {
        _count: { select: { modules: true, purchases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(offerings);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/profile/:profileId — Public: published offerings for a profile
router.get('/profile/:profileId', async (req, res, next) => {
  try {
    const offerings = await prisma.offering.findMany({
      where: { profileId: req.params.profileId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    });
    res.json(offerings);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/:id — Detail (public if PUBLISHED, owner can see any status)
router.get('/:id', async (req, res, next) => {
  try {
    const offering = await prisma.offering.findUnique({
      where: { id: req.params.id },
      include: {
        profile: { select: { title: true, slug: true, avatar: true, userId: true } },
        modules: { orderBy: { order: 'asc' } },
      },
    });
    if (!offering) throw new AppError(404, 'Oferta no encontrada');

    const authHeader = req.headers.authorization;
    let isOwner = false;
    if (authHeader?.startsWith('Bearer ') && offering.status !== 'PUBLISHED') {
      // Reusa la misma logica de authMiddleware sin bloquear la ruta para publico
      const payload = verifyToken(authHeader.slice(7));
      isOwner = !!payload && payload.userId === offering.profile.userId;
    }

    if (offering.status !== 'PUBLISHED' && !isOwner) {
      throw new AppError(404, 'Oferta no encontrada');
    }

    res.json(offering);
  } catch (err) {
    next(err);
  }
});

// PUT /api/offerings/:id — Update (auth, owner)
router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.id, req.userId!);
    const data = updateOfferingSchema.parse(req.body);
    const { scheduledAt, ...rest } = data;

    const offering = await prisma.offering.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
      },
    });
    res.json(offering);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/offerings/:id/publish — Toggle PUBLISHED/DRAFT (auth, owner)
router.patch('/:id/publish', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const existing = await verifyOfferingOwnership(req.params.id, req.userId!);

    if (existing.status === 'DRAFT') {
      const moduleCount = await prisma.module.count({ where: { offeringId: existing.id } });
      if (moduleCount === 0) {
        throw new AppError(400, 'Agrega al menos un modulo antes de publicar');
      }
    }

    const newStatus = existing.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const offering = await prisma.offering.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });
    res.json(offering);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offerings/:id — Archive (auth, owner; no se borra fisicamente)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.id, req.userId!);
    const offering = await prisma.offering.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });
    res.json({ message: 'Oferta archivada', offering });
  } catch (err) {
    next(err);
  }
});

// POST /api/offerings/:offeringId/modules — Add module (auth, owner)
router.post('/:offeringId/modules', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.offeringId, req.userId!);
    const data = createModuleSchema.parse(req.body);

    const currentCount = await prisma.module.count({ where: { offeringId: req.params.offeringId } });

    const module = await prisma.module.create({
      data: { ...data, offeringId: req.params.offeringId, order: currentCount + 1 },
    });
    res.status(201).json(module);
  } catch (err) {
    next(err);
  }
});

// GET /api/offerings/:offeringId/modules — List modules (public if offering PUBLISHED)
router.get('/:offeringId/modules', async (req, res, next) => {
  try {
    const offering = await prisma.offering.findUnique({ where: { id: req.params.offeringId } });
    if (!offering) throw new AppError(404, 'Oferta no encontrada');
    if (offering.status !== 'PUBLISHED') throw new AppError(404, 'Oferta no encontrada');

    const modules = await prisma.module.findMany({
      where: { offeringId: req.params.offeringId },
      orderBy: { order: 'asc' },
    });
    res.json(modules);
  } catch (err) {
    next(err);
  }
});

// PUT /api/offerings/:offeringId/modules/:moduleId — Update module (auth, owner)
router.put('/:offeringId/modules/:moduleId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.offeringId, req.userId!);
    const data = updateModuleSchema.parse(req.body);

    const module = await prisma.module.update({
      where: { id: req.params.moduleId },
      data,
    });
    res.json(module);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/offerings/:offeringId/modules/:moduleId — Delete module (auth, owner)
router.delete('/:offeringId/modules/:moduleId', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await verifyOfferingOwnership(req.params.offeringId, req.userId!);
    await prisma.module.delete({ where: { id: req.params.moduleId } });
    res.json({ message: 'Modulo eliminado' });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 3: Commit**

```bash
git add src/routes/offerings.ts
git commit -m "feat: add Offering and Module CRUD routes"
```

---

### Task 5: Registrar las rutas en ambos entry points + prueba end-to-end

Recordatorio del patrón ya documentado en otra spec de este repo: **toda ruta nueva debe registrarse en `backend/src/index.ts` (dev) Y en `backend/api/index.ts` (entry point real de Vercel/producción)** — olvidar uno de los dos causó un bug real antes (reseñas).

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/api/index.ts`

- [ ] **Step 1: Registrar en `src/index.ts`**

Agregar el import junto a los demás (cerca de la línea 28):

```typescript
import offeringRoutes from './routes/offerings';
```

Agregar el `app.use` junto a los demás (cerca de la línea 58, después de `app.use('/api/crisis-referrals', crisisReferralsRoutes);`):

```typescript
app.use('/api/offerings', offeringRoutes);
```

- [ ] **Step 2: Registrar en `api/index.ts`**

Mismo import y mismo `app.use`, en los mismos puntos relativos de ese archivo (después de `app.use('/api/crisis-referrals', crisisReferralsRoutes);`, línea ~81).

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 4: Levantar el servidor de desarrollo**

Run: `npm run dev`
Expected: arranca sin errores, log de "Server running on port 3000" (o el puerto configurado).

- [ ] **Step 5: Prueba manual end-to-end con curl**

Con el servidor corriendo en otra terminal, y ya con un token de una cuenta Pro/Clinico (obtenido como en el Task 2, Step 6):

```bash
# 1. Crear un offering de prueba (reemplaza <TOKEN> y <PROFILE_ID> por los tuyos reales)
curl -X POST http://localhost:3000/api/offerings \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"profileId":"<PROFILE_ID>","type":"RECORDED_COURSE","title":"Curso de prueba","priceUSD":10}'
```

Expected: `201` con el offering creado, `status: "DRAFT"`. Copiar su `id` como `<OFFERING_ID>`.

```bash
# 2. Intentar publicarlo sin modulos (debe fallar)
curl -X PATCH http://localhost:3000/api/offerings/<OFFERING_ID>/publish \
  -H "Authorization: Bearer <TOKEN>"
```

Expected: `400` con `"error": "Agrega al menos un modulo antes de publicar"`.

```bash
# 3. Agregar un modulo de texto
curl -X POST http://localhost:3000/api/offerings/<OFFERING_ID>/modules \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Introduccion","type":"TEXT","textContent":"Bienvenido al curso."}'
```

Expected: `201` con el modulo creado, `order: 1`.

```bash
# 4. Publicar (ahora si deberia funcionar)
curl -X PATCH http://localhost:3000/api/offerings/<OFFERING_ID>/publish \
  -H "Authorization: Bearer <TOKEN>"
```

Expected: `200` con `status: "PUBLISHED"`.

```bash
# 5. Verlo como publico (sin token)
curl http://localhost:3000/api/offerings/<OFFERING_ID>
```

Expected: `200` con el offering y su array `modules` incluido.

```bash
# 6. Limpieza — archivar el offering de prueba
curl -X DELETE http://localhost:3000/api/offerings/<OFFERING_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

Expected: `200` con `status: "ARCHIVED"`.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts api/index.ts
git commit -m "feat: register offerings routes in both entry points"
```

---

## Qué sigue después de esta Fase 1 (no construir todavía)

- **Fase 2:** constructor de preguntas (Question/QuestionOption) + reglas de puntuacion (ScoringRule) — API + UI del profesional.
- **Fase 3:** checkout de invitado + pago (Stripe/PayPal) + creacion de Purchase + envio de correo con accessToken.
- **Fase 4:** pagina de acceso del comprador (sin login, via accessToken), visor de modulos, responder cuestionario, generar y descargar PDF de respuestas.
- **Fase 5 (frontend, en paralelo a 2-4 según se vaya pudiendo probar):** dashboard "Mis Talleres y Cursos" para el profesional, vitrina en el perfil publico, listado en Explorar.

Cada una de estas merece su propio plan cuando llegue el momento, siguiendo el mismo proceso (spec ya escrito, falta el plan bite-sized).
