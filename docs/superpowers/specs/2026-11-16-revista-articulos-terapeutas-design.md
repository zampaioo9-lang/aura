# Artículos de terapeutas en la Revista Aliax: diseño

Fecha: 2026-11-16. Estado: pendiente de revisión de César.

## Objetivo

Que los terapeutas con plan Pro o Pro IA escriban artículos desde su panel, los envíen a revisión y, cuando César los apruebe, se publiquen en la Revista Aliax firmados, con enlace a su perfil. La página pública para psicólogos ya promete "Publica desde tu panel tus propios artículos, con tu firma y enlace a tu perfil", así que este módulo cierra esa promesa.

## Decisiones ya tomadas por César (2026-11-16)

1. Cada artículo pasa por la revisión de César antes de publicarse.
2. Solo pueden escribir usuarios con plan Pro o Pro IA.
3. La primera versión NO incluye borradores con IA (se construirán más adelante).
4. Un artículo ya publicado queda bloqueado para el terapeuta. Si quiere cambios, se los pide a César, que los edita desde el panel de administrador.
5. Solo César asigna la categoría y la audiencia (Pacientes o Terapeutas) al revisar. El terapeuta no elige categoría.

## Lo que ya existe y se reutiliza

- Modelos `Article`, `ArticleBlock` y `Category` (con audiencia) en `backend/prisma/schema.prisma`.
- Editor por bloques (`frontend/src/components/admin/ArticleEditor.tsx` y `BlockEditor.tsx`): texto, imagen, botón, subtítulo y lista con viñetas.
- Subida de imágenes (`/api/upload`).
- Botón "Publicar cambios en el sitio" y reconstrucción de las páginas estáticas de la Revista (`triggerBlogRebuild()`, `markContentEdited()` en `backend/src/routes/articles.ts`).
- Correo con Resend (`emailService.ts`) y destino de avisos al administrador `env.ADMIN_EMAIL`.
- Función `isProUser` (incluye `CLINICO`) en `backend/src/lib/planUtils.ts`.

Hoy todas las rutas de `articles.ts` exigen `adminMiddleware`, y los artículos no tienen dueño.

## Modelo de datos

Cambios aditivos en `Article`:

| Campo | Tipo | Para qué |
|---|---|---|
| `authorUserId` | `String?` (relación a `User`) | Dueño del artículo. Nulo en los artículos de César. |
| `reviewNote` | `String?` | Nota de César cuando pide cambios. |
| `submittedAt` | `DateTime?` | Cuándo se envió a revisión. |
| `categoryId` | pasa de `String` a `String?` | Un borrador del terapeuta aún no tiene categoría. |

`ArticleStatus` gana dos valores: `PENDING_REVIEW` y `CHANGES_REQUESTED` (además de `DRAFT` y `PUBLISHED`).

Reglas:
- Publicar exige `author` y `categoryId` (hoy `author` ya se exige; se añade categoría).
- Los artículos de César siguen funcionando igual (`authorUserId` nulo).
- Todo el código que lea `article.category` debe tolerar `null` solo en estados que no son `PUBLISHED`. La API pública solo devuelve `PUBLISHED`, que siempre tiene categoría.

## Máquina de estados

```
DRAFT --enviar--> PENDING_REVIEW --publicar (César)--> PUBLISHED
                       |  
                       +--pedir cambios (César, con nota)--> CHANGES_REQUESTED --enviar--> PENDING_REVIEW
DRAFT / CHANGES_REQUESTED: el terapeuta edita.
PENDING_REVIEW: el terapeuta no edita (puede retirar y volver a DRAFT).
PUBLISHED: bloqueado para el terapeuta.
```

## Backend

Nuevo router `backend/src/routes/my-articles.ts`, montado en AMBOS puntos de entrada (`src/index.ts` y `api/index.ts`), con `authMiddleware` y verificación de plan con `isProUser` (admin pasa). Todas las rutas verifican que el artículo pertenezca al usuario (`authorUserId`).

| Ruta | Acción |
|---|---|
| `GET /api/my-articles` | Lista de sus artículos con estado y nota de revisión |
| `POST /api/my-articles` | Crea borrador. Autor = nombre del usuario. Sin categoría |
| `GET /api/my-articles/:id` | Detalle con bloques |
| `PUT /api/my-articles/:id` | Edita título, extracto, meta descripción y portada (solo `DRAFT` o `CHANGES_REQUESTED`) |
| `POST/PUT/DELETE /api/my-articles/:id/blocks[...]` y `PATCH .../blocks/swap` | Bloques (mismas reglas de orden que el admin: `max(order)+1`, swap en transacción) |
| `POST /api/my-articles/:id/submit` | `DRAFT`/`CHANGES_REQUESTED` a `PENDING_REVIEW`; exige título, extracto de al menos 10 caracteres y al menos un bloque de texto; envía correo a `ADMIN_EMAIL` |
| `POST /api/my-articles/:id/withdraw` | `PENDING_REVIEW` a `DRAFT` |
| `DELETE /api/my-articles/:id` | Borra un borrador propio |

Ajustes en `backend/src/routes/articles.ts` (admin):
- `GET /` incluye `authorUserId`, `submittedAt`, `reviewNote` y el nombre del autor, y permite filtrar por `PENDING_REVIEW`.
- `PATCH /:id/publish` acepta artículos en `PENDING_REVIEW`; exige categoría; limpia `reviewNote`; envía correo de aprobación al terapeuta; dispara la reconstrucción como hoy.
- Nueva `PATCH /:id/request-changes` con `{ note }` (obligatoria): estado `CHANGES_REQUESTED`, guarda `reviewNote`, correo al terapeuta.
- `GET /public` añade `authorProfileSlug` (slug del primer perfil publicado del autor, o nulo).

Plantillas de correo nuevas en `emailService.ts`: aviso a César de artículo por revisar, aprobación al terapeuta y cambios solicitados al terapeuta. Sin guion largo.

## Frontend

Terapeuta:
- Pestaña nueva "Mis artículos" en `Dashboard.tsx` (mismo patrón que `talleres`), visible con `useFeature` de Pro. Para usuarios Free: pantalla con la invitación a pasar a Pro (mismo estilo de los demás módulos).
- Lista con estado de cada artículo (Borrador, En revisión, Cambios solicitados con la nota de César, Publicado).
- Editor: reutiliza `BlockEditor`. Campos: título, extracto (máx. 300), meta descripción, portada. Sin categoría, sin destacado y sin slug. El autor se muestra, no se edita.
- Botón "Enviar a revisión". En revisión: solo lectura con "Retirar". Publicado: solo lectura con el enlace público y el aviso "Para cambios, escríbenos".

César (`AdminRevista.tsx`):
- Filtro o bandeja "Por revisar" con contador.
- Vista de revisión: ve el artículo completo, elige categoría (obligatoria), y pulsa "Publicar" o "Pedir cambios" (con nota obligatoria).

Revista pública (`frontend/scripts/generate-blog.ts`):
- La firma muestra el nombre del autor y, si `authorProfileSlug` existe, enlaza a `https://www.aliax.io/<slug>` (verificar la forma real de la URL del perfil público antes de implementar).
- Artículos de César sin cambios.

Página para psicólogos: sin cambios; el texto actual de la tarjeta ya queda cumplido.

## Casos límite

- Si el plan del terapeuta vence, sus artículos publicados siguen publicados; no puede crear ni enviar nuevos.
- El terapeuta no puede ver ni tocar artículos de otros (404 si no es dueño).
- Una portada o imagen subida por el terapeuta se guarda igual que las del admin.
- Un artículo `PENDING_REVIEW` no aparece en la API pública.
- Si el envío del correo a César falla, el artículo igual queda en revisión (el correo no bloquea).

## Fuera de alcance (primera versión)

- Borradores con IA.
- Edición por el terapeuta después de publicar.
- Comentarios, reacciones y pago por artículo.
- Revisión por un segundo psicólogo verificado (el plan original la mencionaba; en esta versión revisa solo César).

## Despliegue

- Cambio de esquema aditivo: dos valores nuevos en un enum y `categoryId` opcional. Se aplica a la base de producción compartida con autorización explícita de César, con el mismo procedimiento de las migraciones anteriores de Revista (`prisma db push` más archivo de migración y `migrate resolve --applied`).
- Orden: backend primero (el frontend nuevo depende de las rutas nuevas), luego frontend desde la raíz del repo al proyecto "aura" con `promote`. Después de mergear: `git push origin master` siempre, para que la reconstrucción de la Revista no revierta el sitio.
- Cada despliegue se confirma con César por separado.

## Pruebas

El backend no tiene ejecutor de pruebas. Se verifica con `npx tsc --noEmit` (backend) y `npx tsc -b` (frontend), scripts desechables con `tsx` para las reglas de estado y permisos, y un recorrido completo con una cuenta de prueba: crear, enviar, pedir cambios, reenviar, publicar, ver la firma con enlace en la Revista. Nunca contra contenido real de la Revista.
