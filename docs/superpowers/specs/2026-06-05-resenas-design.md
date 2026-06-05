# Diseño: Sistema de Reseñas Verificadas

**Fecha:** 2026-06-05  
**Plan:** Solo Pro  
**Estado:** Aprobado

---

## Resumen

Los pacientes reciben un email al completarse su cita con un link de un solo uso para dejar una reseña (rating 1–5 + comentario). Las reseñas aparecen en el perfil público del terapeuta y en el directorio Explorar. El terapeuta las ve completas en su Dashboard.

---

## Flujo

```
Terapeuta marca cita como COMPLETED
  → si es Pro: genera ReviewToken (uuid, expira 7 días)
              envía email al paciente con link /review/:token

Paciente abre /review/:token
  → backend valida: token existe, no expirado, no usado
  → frontend muestra: nombre del terapeuta + formulario (stars + comentario)
  → paciente envía → Review guardado, token.usedAt = now()

Reseñas visibles en:
  - Perfil público (/p/:slug): sección inferior, nombre abreviado ("María G.")
  - Explorar: promedio ★ + total en tarjeta (solo si tiene ≥1 reseña)
  - Dashboard > Reseñas: lista completa con nombre completo
```

---

## Schema (Prisma)

### Nuevos modelos

```prisma
model ReviewToken {
  id        String    @id @default(uuid())
  bookingId String    @unique
  token     String    @unique @default(uuid())
  usedAt    DateTime?
  expiresAt DateTime
  createdAt DateTime  @default(now())

  booking   Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
}

model Review {
  id         String   @id @default(uuid())
  bookingId  String   @unique
  profileId  String
  rating     Int      // 1–5
  comment    String?
  clientName String   // copiado de Booking.clientName al momento de crear
  isVisible  Boolean  @default(true)
  createdAt  DateTime @default(now())

  booking    Booking  @relation(fields: [bookingId], references: [id])
  profile    Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
}
```

### Cambios en modelos existentes

```prisma
// Booking — agregar relaciones:
reviewToken  ReviewToken?
review       Review?

// Profile — agregar relación:
reviews      Review[]
```

---

## Backend

### Archivo nuevo: `backend/src/routes/reviews.ts`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/reviews/token/:token` | No | Valida token; retorna `{ valid, professionalName, profileSlug }` |
| POST | `/api/reviews/submit/:token` | No | Crea Review + marca token usado. Body: `{ rating, comment? }` |
| GET | `/api/reviews/profile/:profileId` | No | Reseñas visibles de un perfil (solo si terapeuta es Pro) |
| GET | `/api/reviews/mine` | Sí (Pro) | Todas las reseñas del profesional autenticado |
| PUT | `/api/reviews/:id/visibility` | Sí (Pro) | Toggle `isVisible` |

### Cambios en `bookingService.ts` — `completeBooking`

Después de actualizar el status a COMPLETED:
1. Verificar `booking.profile.user.plan === 'pro'` usando `isPro()` de `planUtils.ts`
2. Si es Pro: crear `ReviewToken` con `expiresAt = now() + 7 días`
3. Enviar email al `booking.clientEmail` con el template `reviewRequest`

### Nuevo template en `emailService.ts` — `reviewRequest`

```
Para: clientEmail
Asunto: "¿Cómo fue tu sesión con {professionalName}? — Aliax"
CTA: "Dejar mi reseña" → https://www.aliax.io/review/{token}
Texto: "Tu opinión ayuda a otros a encontrar el apoyo que necesitan."
Expira en 7 días (mencionado en el email).
```

---

## Frontend

### Nueva página: `frontend/src/pages/ReviewPage.tsx`

- Ruta: `/review/:token`
- Registrada en `App.tsx` como ruta pública
- Al montar: `GET /api/reviews/token/:token`
  - Si inválido/expirado/usado → muestra mensaje de error apropiado
  - Si válido → muestra nombre del terapeuta + formulario
- Formulario: 5 estrellas interactivas + textarea para comentario (opcional) + botón enviar
- Al enviar: `POST /api/reviews/submit/:token`
- Estado post-envío: mensaje de agradecimiento, sin redirección

### Dashboard — `TabResenas` en `Dashboard.tsx`

- Reemplaza el placeholder con lista de reseñas reales
- Fetch: `GET /api/reviews/mine`
- Muestra por reseña: rating (estrellas), comentario, nombre completo del paciente, fecha
- Botón toggle visibilidad (ojo abierto/cerrado) → `PUT /api/reviews/:id/visibility`
- Estado vacío: mantiene el diseño actual del placeholder
- Resumen superior: promedio general + total de reseñas

### Perfil público — `MinimalistTemplate.tsx`

- Sección nueva al final del perfil, antes del footer (si existe)
- Fetch: `GET /api/reviews/profile/:profileId` (incluido en el fetch del perfil o llamada separada)
- Muestra: promedio ★ + total, luego cards individuales (máx 5 visibles, "Ver más" si hay más)
- Nombre mostrado: primer nombre + inicial del apellido ("María G.")
- Solo se renderiza si el terapeuta es Pro y tiene ≥1 reseña visible

### Explorar — `Explorar.tsx`

- El endpoint `GET /api/profiles` (o el que usa Explorar) debe incluir en cada perfil: `averageRating` y `reviewCount`
- En la tarjeta del terapeuta: mostrar `★ 4.8 (12)` debajo del nombre, solo si `reviewCount > 0` y es Pro
- El backend calcula `averageRating` como `AVG(rating)` de reseñas visibles

---

## Pro Gating

| Acción | Free | Pro |
|---|---|---|
| Email de reseña enviado al completar cita | No | Sí |
| Reseñas visibles en perfil público | No | Sí |
| Rating en Explorar | No | Sí |
| Dashboard > tab Reseñas (datos reales) | No (placeholder) | Sí |

**Downgrade:** si un Pro baja a Free, sus reseñas se ocultan del perfil público y Explorar, pero no se borran. Si vuelve a Pro, reaparecen.

---

## Privacidad

- Perfil público y Explorar: nombre abreviado ("María G.")
- Dashboard del terapeuta: nombre completo (es su propio paciente)
- El paciente no necesita cuenta — el link con token es suficiente
- Un token solo puede usarse una vez; expirado o usado muestra mensaje informativo

---

## Casos edge

- Si la cita ya tiene reseña (token reutilizado): error 409 en submit
- Si el terapeuta baja de Pro antes de que expire el token: el paciente aún puede dejar la reseña (el token ya fue generado), pero no será visible hasta que vuelva a Pro
- `comment` es opcional; solo `rating` es obligatorio (1–5)
- El terapeuta no puede editar ni borrar reseñas, solo ocultarlas
