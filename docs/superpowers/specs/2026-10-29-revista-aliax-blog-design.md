# Revista Aliax — blog (Fase 1: contenido, CMS y SEO) — Design Spec

**Fecha:** 2026-10-29
**Depende de:** nada nuevo — reutiliza el patrón de subida de imágenes (Cloudinary) y el patrón de bloques reordenables ya construidos para Talleres/Cursos (`Offering`/`Module`).
**No incluye (fases futuras, decididas explícitamente):** envío por correo de los artículos como newsletter, suscripción/consentimiento de la base de datos de contactos, y que terapeutas Pro puedan subir sus propios artículos (moderación). Esta fase es solo el blog en sí: contenido, CMS y SEO.

## Resumen

Aliax no tiene hoy ningún blog ni superficie de contenido editorial, y tampoco tiene SEO básico (no existe `sitemap.xml` ni `robots.txt` en el repo). Esta fase construye "Revista Aliax": un blog con dos audiencias (pacientes y terapeutas), un editor de artículos por bloques dentro de AdminPanel (solo tú, como admin, publicas en esta fase), y páginas públicas generadas como HTML estático para que cada artículo sea indexable y comparta bien en redes sociales sin depender de que el crawler ejecute JavaScript.

## Decisión de diseño visual

Diseño aprobado por mockup interactivo (ver conversación): reutiliza exactamente la paleta y tipografía que ya usa Aliax — fondo oscuro `#080414` con acentos radiales, teal `#2dd4bf` como acento, `Bebas Neue` para títulos y `Urbanist` para cuerpo de texto. Dos plantillas: listado (`/revista`) y artículo (`/revista/:slug`), ambas con banda de "Suscríbete" al final (el formulario queda visualmente listo desde ahora; el envío real de newsletter es una fase posterior — en esta fase el formulario puede quedar inactivo o simplemente no se construye su backend).

## Alcance

### 1. Modelo de datos (backend)

```prisma
model Category {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  audience  CategoryAudience   // PACIENTES | TERAPEUTAS
  active    Boolean  @default(true)
  order     Int      @default(0)
  articles  Article[]
}

enum CategoryAudience {
  PACIENTES
  TERAPEUTAS
}

model Article {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  excerpt     String
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  coverImage  String?
  featured    Boolean  @default(false)
  status      ArticleStatus @default(DRAFT)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  blocks      ArticleBlock[]
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
}

model ArticleBlock {
  id          String   @id @default(cuid())
  articleId   String
  article     Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  order       Int
  type        ArticleBlockType  // TEXT | IMAGE | BUTTON
  text        String?
  imageUrl    String?
  imageAlt    String?
  buttonLabel String?
  buttonUrl   String?
}

enum ArticleBlockType {
  TEXT
  IMAGE
  BUTTON
}
```

Categorías iniciales a precargar (seed, editable después desde el CMS):
- **Pacientes:** Terapia, Ansiedad y estrés, Ánimo y depresión, Pareja, Familia y crianza, Autoestima y límites, Duelo y cambios de vida, Trabajo y burnout, Sexualidad.
- **Terapeutas:** Marca personal y marketing, Primeros pasos profesionales, Gestión de la práctica, Actualización profesional, Autocuidado del terapeuta.

### 2. CRUD de backend (admin-only, auth + `isAdmin`)

- `Category`: crear, editar, desactivar (no borrar — un artículo ya publicado mantiene su categoría aunque se desactive para nuevos artículos).
- `Article` + `ArticleBlock`: CRUD completo, con el mismo patrón de validación por tipo de bloque que ya existe para `Module` (no se puede publicar un bloque IMAGE sin `imageUrl`, ni un bloque BUTTON sin `buttonLabel`+`buttonUrl`).
- Endpoint público: `GET /api/articles?category=...` y `GET /api/articles/:slug` (solo `status: PUBLISHED`), usados por el script de generación estática, no por el navegador del visitante final.
- Publicar/despublicar/editar un artículo publicado dispara una llamada a un Vercel Deploy Hook (URL guardada en variable de entorno del backend) — reintenta una vez si falla, y si falla dos veces solo deja un log de advertencia (la publicación en base de datos ya se guardó correctamente; el build desactualizado se corrige en el siguiente deploy manual o la siguiente publicación).

### 3. CMS (AdminPanel)

Nueva pestaña lateral "Revista", con dos vistas:
- **Categorías:** lista simple, crear/editar nombre y audiencia, activar/desactivar.
- **Artículos:** lista con estado (Borrador/Publicado) y botón "Nuevo artículo". Editor: título, slug (autogenerado, editable), categoría (dropdown agrupado por audiencia), extracto, imagen de portada, checkbox "Destacado", y el cuerpo como lista de bloques reordenables (arrastrar para reordenar, botón "Agregar bloque" con las 3 opciones: Texto / Imagen / Botón con enlace) — mismo patrón de editor que `ModuleFormModal`/`QuestionnaireEditor` de Talleres/Cursos. Botones "Guardar borrador" y "Publicar".

### 4. Generación estática (SEO)

Nuevo script de build en `frontend/` (ej. `scripts/generate-blog.ts`), que corre como parte de `npm run build`:
1. Llama a `GET /api/articles` (todas las publicadas) contra la API de producción.
2. Para cada artículo, renderiza un `.html` estático (plantilla aprobada en el mockup) con `<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:image`, `canonical`, y el contenido real de los bloques ya renderizado — se escribe a `frontend/public/revista/<slug>.html` (antes del build de Vite, para que quede en `dist/`).
3. Renderiza `frontend/public/revista/index.html` (el listado) con todas las tarjetas ya en el HTML; los pills de filtro son JS plano que muestra/oculta por categoría, sin esconder nada del HTML inicial.
4. Genera/actualiza `frontend/public/sitemap.xml` (incluye `/revista`, cada `/revista/:slug`, y las rutas públicas principales ya existentes) y `frontend/public/robots.txt` (si no existen, se crean; si existen, se regeneran desde cero cada build — nunca a mano).
5. `vercel.json` gana una entrada de rewrite genérica: `{"source": "/revista/:slug", "destination": "/revista/:slug.html"}` y `{"source": "/revista", "destination": "/revista/index.html"}`, antes del catch-all `/(.*)` que ya existe.

Si el script falla (ej. la API no responde durante el build), el build completo falla — no se despliega una versión del sitio con el blog roto o desactualizado silenciosamente.

### 5. Página de agregar enlace en navegación

El link "Revista" se agrega al nav principal (Landing y demás páginas públicas), apuntando a `/revista` — mismo lugar donde está en el mockup aprobado.

## Fuera de alcance (explícito)

- Envío de artículos por correo (newsletter) — fase futura.
- Suscripción, consentimiento y base de datos de contactos — fase futura.
- Que terapeutas Pro suban sus propios artículos (moderación, flujo de borrador→revisión) — fase futura.
- Comentarios, reacciones, o cualquier interacción social en los artículos — no solicitado.
- La banda de "Suscríbete" del mockup **no se incluye** en el HTML generado en esta fase — mostrar un formulario que no envía nada a un visitante real es peor que no mostrarlo. Se agrega cuando se construya la fase de newsletter.

## Verificación

Sin suite de tests en este repo. Verificación empírica:
1. Crear 2-3 categorías de prueba (una de cada audiencia) y 2-3 artículos de prueba (uno destacado, con los 3 tipos de bloque), vía CMS.
2. Publicar y confirmar que el build genera `/revista/index.html` y cada `/revista/<slug>.html` con las etiquetas meta correctas (`view-source` o `curl`).
3. Confirmar que `sitemap.xml` y `robots.txt` existen y listan las rutas esperadas.
4. Confirmar que despublicar un artículo y volver a buildear lo quita del listado y del sitemap.
5. Confirmar visualmente en navegador que el listado y el artículo coinciden con el mockup aprobado (colores, tipografía, filtros por categoría).
6. Limpiar todos los datos de prueba (categorías y artículos) al terminar, con verificación independiente de que quedaron borrados.
