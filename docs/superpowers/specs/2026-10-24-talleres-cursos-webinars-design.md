# Talleres, cursos y webinars vendibles por profesional

## Contexto y objetivo

Cada profesional (Pro/Clínico) podrá vender sus propios talleres en vivo y cursos grabados directamente desde Aliax, mostrados como una "vitrina" dentro de su propio perfil público y también visibles en Explorar como canal de descubrimiento adicional (no solo retención de sus pacientes actuales).

Nace de un análisis competitivo (AgendeTerapia, un SaaS más pequeño para terapeutas en LatAm que vende "espacio web + agenda + talleres de formación para terapeutas") y de investigación de mercado (Hotmart, Teachable, Kajabi, Podia, y especialmente **Encuadrado**, una "Vitrina" en español para psicólogos que resuelve casi exactamente este mismo problema). Encuadrado confirma el patrón elegido: el taller se integra en el perfil ya existente del profesional, con un enlace único de inscripción/pago, sin construir video propio (nadie en la industria lo hace, todos usan Zoom/Meet externo).

El patrón de contenido (módulos de Texto/Video/PDF/Escala dentro de un "Programa") replica directamente lo que ya existe y funciona en producción en **PsiqueCreativa** (`psiquecreativa.com/admin/programs/:id/edit`, programa "Raíces"), otro proyecto del mismo usuario — no es un concepto nuevo, es portar un patrón ya validado.

## Estado actual verificado (no asumido)

- Aliax usa Prisma + PostgreSQL (Neon). Modelos relevantes ya existentes: `User` (profesional, único con login/password), `Profile` (perfil público, pertenece a `User`), `Service` (servicio vendible, pertenece a `Profile`, con `price`/`currency`/`durationMinutes`), `Booking` (reserva, liga `profileId`+`serviceId`+`professionalId`).
- **Hallazgo clave que corrigió el diseño:** `Booking` NO usa cuentas de cliente con login — captura `clientName`, `clientEmail`, `clientPhone` como texto directo. Ningún modelo del schema (revisados los 22 existentes) implementa autenticación de pacientes/compradores. Por eso este diseño usa el mismo patrón (checkout de invitado + enlace único por correo) en vez de inventar un sistema de cuentas nuevo.
- Pagos ya integrados: Stripe + PayPal (usados hoy para suscripciones de planes; aquí se extienden a cobro único por Offering).
- `ANTHROPIC_API_KEY` y `CLOUDINARY_API_KEY` ya están configuradas en el backend de Vercel (`backend` → api.aliax.io) — Cloudinary ya disponible para subir/servir video y PDF, no hace falta contratar/integrar nada nuevo para eso.
- PsiqueCreativa (proyecto hermano, no el mismo repo) tiene el patrón de referencia ya en producción: un "Programa" es una lista ordenada de "Módulos", cada uno tipado (Texto/Video/PDF/Escala). El tipo "Escala" ahí NO tiene constructor de preguntas editable por el usuario (son preguntas fijas por desarrollador) — ese constructor es la pieza genuinamente nueva de este diseño, no algo que se porta 1:1.
- La página pública de Tests de PsiqueCreativa (`/test/satisfaccion-relacion`) confirma un componente visual reusable como referencia de UX: una pregunta a la vez, opciones tipo radio, barra de progreso, resultado final con barra de rango + mensaje de interpretación — pero sin botón de descargar PDF (captura correo en su lugar). El PDF descargable de este diseño es pieza nueva.

## Alcance

**Incluido:**
- Dos tipos de Offering por profesional Pro/Clínico: Taller en vivo (fecha/hora fija, enlace externo tipo Zoom/Meet) y Curso grabado (módulos).
- Offering con lista ordenada de Módulos tipados: Texto, Video (Cloudinary), PDF (Cloudinary), Cuestionario.
- Dentro de un módulo Cuestionario: constructor de preguntas (texto libre, opción única, opción múltiple, cada opción con valor numérico) + reglas de puntuación (rangos de suma total → mensaje de interpretación).
- Checkout de invitado (nombre + correo + pago, sin cuenta) para cualquier comprador, sea o no paciente existente del profesional.
- Acceso al contenido comprado vía enlace único enviado por correo tras el pago (sin password).
- El comprador responde el cuestionario y descarga un PDF con sus respuestas + resultado.
- Visible en el perfil público del profesional y en Explorar.
- Recordatorios/confirmaciones por correo para talleres en vivo, reutilizando el sistema de notificaciones ya existente para `Booking`.

**Explícitamente fuera de alcance (decisión del usuario, 22-24 oct 2026):**
- Paquetes/combos de varios talleres o cursos con precio especial — fase futura.
- Paquetes de sesiones 1:1 prepagadas — proyecto completamente aparte, se integrará después a `Service`, no a este diseño.
- Apertura a plan Free con comisión de Aliax sobre cada venta — solo Pro/Clínico pueden vender, sin comisión, en esta versión.
- Cuentas de cliente con login/password — se usa checkout de invitado (ver hallazgo arriba).
- Videollamada integrada dentro de Aliax — siempre enlace externo que pega el profesional.
- Reordenar módulos arrastrando — quedan en el orden en que se crean.
- Certificados de finalización.
- Lógica de puntuación condicional o ponderación distinta por pregunta — solo suma simple de valores + rangos de interpretación.
- Grabar el taller en vivo y ofrecerlo como "replay" (módulo de video posterior) — se planteó como idea pero no se confirmó, queda pendiente de decidir si se agrega en una iteración futura.
- Dashboard analítico agregado de resultados de cuestionario entre todos los compradores — el profesional ve respuestas individuales, no agregados/estadísticas.

## Modelo de datos

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
  accessToken String    @unique // enlace único de acceso post-pago, sin password
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
  valueText      String?  // solo QuestionType = FREE_TEXT
  valueOptionIds String[] @default([]) // ids de QuestionOption elegidas (1 para SINGLE_CHOICE, N para MULTIPLE_CHOICE)
  createdAt      DateTime @default(now())

  purchase Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([purchaseId])
  @@index([questionId])
}
```

Se agrega la relación inversa `offerings Offering[]` en `model Profile`.

## Flujos de usuario

### Profesional creando un Offering

1. Nuevo ítem de menú en el dashboard ("Mis Talleres y Cursos"), visible solo si `user.plan` es Pro o Clínico — mismo patrón de gating ya usado en otras funciones Pro (ej. Notas IA).
2. Lista de sus propios Offerings (título, precio, estado Borrador/Publicado, ventas) — igual al panel "Programas" de PsiqueCreativa.
3. Crear uno nuevo, 2 pasos:
   - **Paso 1:** tipo (Taller en vivo / Curso grabado), título, descripción, precio (USD y MXN, igual al patrón ya usado en `Service`), imagen de portada (Cloudinary). Si es Taller en vivo: además `scheduledAt`, `capacity` opcional, `externalLink`.
   - **Paso 2 — Módulos:** agregar módulos uno a uno (título, descripción opcional, tipo). Si el tipo es Cuestionario, sub-formulario: agregar preguntas una a una (texto, tipo, opciones con valor numérico si aplica), y después definir las reglas de puntuación (rangos → mensaje).
4. Publicar: cambia `status` de DRAFT a PUBLISHED — en ese momento aparece en su perfil público y en Explorar.

### Comprador (puede o no ser paciente existente)

1. Descubre el Offering en el perfil del profesional o en Explorar.
2. Checkout de invitado: nombre, correo, teléfono opcional, pago (Stripe/PayPal, cobro único).
3. Tras el pago: se crea `Purchase` con `accessToken` único, y se envía un correo con el enlace de acceso (reutiliza el sistema de envío de correos ya existente, ej. Resend, usado hoy para confirmaciones de `Booking`).
4. El comprador entra por ese enlace (sin login) y ve los módulos del Offering en orden.
5. En un módulo Cuestionario: responde pregunta por pregunta (una a la vez, con barra de progreso — mismo patrón visual que los Tests públicos de PsiqueCreativa), ve el resultado (suma + mensaje de interpretación del rango correspondiente), y puede descargar un PDF con sus respuestas y resultado (generado server-side, mismo enfoque de HTML→PDF ya usado en este proyecto para otros documentos).
6. Si es Taller en vivo: el correo de acceso incluye también el enlace externo de la videollamada, más un recordatorio automático antes de la fecha (reutiliza el sistema de `Notification` ya existente para `Booking`).

## No incluido en esta versión (fast-follow explícito, no ambigüedad)

- "Replay" del taller en vivo como módulo de video posterior a la fecha.
- Certificados de finalización.
- Comisión de Aliax para que profesionales Free también puedan vender.
- Cualquier forma de cuenta/login para compradores — si en el futuro hace falta (ej. que un comprador vea el historial de todo lo que ha comprado de varios profesionales en un solo lugar), es un proyecto aparte, no una extensión menor de este.

## Verificación

Este repo no tiene framework de tests (confirmado en trabajo previo de otras specs). Verificación igual al patrón ya usado en este proyecto:
- `tsc --noEmit` en backend y frontend tras cada cambio.
- Pruebas manuales vía curl y navegador contra Neon, con un Offering y una Purchase de prueba desechables (creados y borrados en la propia tarea de implementación), nunca con datos reales de profesionales o pacientes de Aliax.
- Confirmar explícitamente el flujo completo de punta a punta al menos una vez: crear Offering con un módulo Cuestionario → publicar → comprar como invitado → responder cuestionario → descargar PDF → confirmar que el PDF generado tiene las respuestas y el resultado correctos.
