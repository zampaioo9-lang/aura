# Revista Aliax — cerrar brecha visual de Fase 1 — Design Spec

**Fecha:** 2026-11-02
**Depende de:** Fase 1 de Revista Aliax, ya en producción (ver `docs/superpowers/specs/2026-10-29-revista-aliax-blog-design.md` y su plan). Esta no es una fase nueva — cierra una brecha entre el mockup que el usuario aprobó entonces y lo que realmente se implementó en `frontend/scripts/generate-blog.ts`.
**No incluye (fases futuras, ya documentadas y confirmadas fuera de alcance en esta sesión):** newsletter/suscripción por correo, y que terapeutas Pro suban sus propios artículos.

## Resumen

Al comparar el mockup aprobado (dos imágenes: listado y artículo) contra el código real en producción, se encontró que `generate-blog.ts` quedó bastante más simple de lo acordado: sin tabs de audiencia/categoría, sin tratamiento de artículo "Destacado", sin autor/fecha/tiempo de lectura, sin caja de conversión hacia terapeutas, y sin sección de artículos relacionados. Esta spec cierra esa brecha. De paso, se encontró y se corrige un bug real: el formulario del CMS permite guardar un artículo sin esperar a que termine de subirse la imagen de portada, lo que deja `coverImage` vacío silenciosamente.

## Alcance

### 1. Modelo de datos y backend

- `Article` gana un campo `author: String?` (nullable en la base).
- `createArticleSchema`/`updateArticleSchema` (`backend/src/utils/validation.ts`): `author` se exige únicamente cuando el artículo se publica (`status: 'PUBLISHED'`), mismo patrón que ya existe para `excerpt`.
- Migración de Prisma para el nuevo campo.
- Sin cambios en `GET /api/articles/public` — ya incluye todos los campos escalares del modelo vía `include`, sin `select` restrictivo.

### 2. CMS (`frontend/src/components/admin/ArticleEditor.tsx`)

- Campo de texto "Autor" en el formulario principal, junto al selector de Categoría. Vacío por defecto.
- **Fix de bug:** los botones "Guardar borrador"/"Publicar" deben deshabilitarse mientras `uploading === true` (el hook `useUpload`), igual que ya se deshabilitan mientras `saving === true`. Hoy no hay ningún guard sobre `uploading` en `handleSave`, lo que permite guardar con `coverImage` vacío si se hace clic antes de que termine de subir la imagen — causa raíz confirmada del artículo en producción (`programa-1`) sin imagen de portada.

### 3. Generación estática — listado (`generateListingPage` en `generate-blog.ts`)

**Selección del artículo destacado (hero):**
- Se usa el artículo con `featured: true` más reciente (`publishedAt` descendente).
- Si ningún artículo tiene `featured: true`, se usa el artículo publicado más reciente de todos (el hero nunca queda vacío).
- Si hay más de uno con `featured: true`, se usa el más reciente de ellos; los demás aparecen como tarjeta normal en el grid, no se excluyen del listado.

**Tabs de audiencia + categoría:**
- Fila superior: pills "Todos" / "Para pacientes" / "Para terapeutas" — filtra por `category.audience`.
- Fila inferior de categorías específicas (ej. Ansiedad, Pareja, Marca personal...): **oculta cuando el tab activo es "Todos"**, visible y poblada con las categorías de la audiencia activa cuando se elige "Para pacientes" o "Para terapeutas".
- Todo el filtrado es JS plano embebido en el HTML (atributos `data-audience`/`data-category` en cada tarjeta y en el hero, un script que muestra/oculta por coincidencia) — consistente con que el sitio es HTML estático sin framework del lado del cliente.
- El hero también se filtra: si su audiencia/categoría no coincide con el filtro activo, se oculta igual que cualquier tarjeta del grid.

**Tarjetas del grid:** agregan autor y fecha (ya mostraban categoría, título, extracto e imagen).

### 4. Generación estática — artículo (`generateArticlePage` en `generate-blog.ts`)

**Metadatos visibles:**
- Autor, fecha de publicación y "X min de lectura" bajo el título, junto al avatar circular con iniciales (ya en el mockup).
- Tiempo de lectura calculado en build time: `Math.max(1, Math.ceil(palabras_en_bloques_TEXT / 200))`. Sin campo nuevo en la base de datos.

**Caja "¿Quieres hablar con un profesional?":**
- Se renderiza únicamente cuando `article.category.audience === 'PACIENTES'`.
- Botón "Explorar terapeutas" enlaza a `/explorar`.
- Posición: insertada después del bloque que cae a la mitad del total de bloques del artículo (`Math.floor(blocks.length / 2)`), no al final ni al principio.

**"También te puede interesar":**
- 3 artículos publicados más recientes de la misma audiencia que el artículo actual (`category.audience`), excluyendo el artículo actual.
- Si hay menos de 3 disponibles, se muestran los que haya (sin relleno de otra audiencia).

### 5. Fuera de alcance (explícito, reconfirmado en esta sesión)

- Newsletter / envío por correo / consentimiento / base de contactos — fase futura ya documentada en el spec de Fase 1.
- Que terapeutas Pro suban sus propios artículos — fase futura ya documentada en el spec de Fase 1.
- Video promocional por artículo: no requiere cambios de código. Se resuelve con los bloques IMAGE (miniatura) + BUTTON (enlace a la red social) que ya existen en el editor — el usuario puede usarlo hoy mismo sin esperar a este trabajo. No se construye un tipo de bloque VIDEO ni una caja visual especial para esto.
- Comentarios/reacciones — no solicitado.

## Verificación

Sin suite de tests en este repo. Verificación empírica, siguiendo el mismo patrón que el spec de Fase 1:

1. Migrar el campo `author` y confirmar que el backend rechaza publicar sin autor (y acepta guardar como borrador sin él).
2. Confirmar en el CMS que "Publicar"/"Guardar" quedan deshabilitados mientras una imagen está subiendo (simular con conexión lenta o verificar el estado `uploading` en devtools).
3. Crear artículos de prueba: al menos 2 por audiencia, uno marcado `featured`, con distintos números de bloques (incluir uno con 0 bloques TEXT para confirmar que el tiempo de lectura mínimo es 1 min).
4. Confirmar visualmente que el listado coincide con el mockup aprobado: hero correcto, tabs filtran hero+grid consistentemente, fila de categorías aparece/desaparece según el tab.
5. Confirmar que un artículo "Para pacientes" muestra la caja "¿Quieres hablar con un profesional?" a la mitad del contenido, y que un artículo "Para terapeutas" no la muestra.
6. Confirmar que "También te puede interesar" solo lista artículos de la misma audiencia, nunca el artículo actual, y maneja bien el caso de haber menos de 3 disponibles.
7. Limpiar todos los datos de prueba al terminar, con verificación independiente de que quedaron borrados.
