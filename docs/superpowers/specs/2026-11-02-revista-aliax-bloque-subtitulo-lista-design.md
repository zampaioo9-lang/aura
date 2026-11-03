# Revista Aliax — bloques "Subtítulo" y "Lista con viñetas" — Design Spec

**Fecha:** 2026-11-02
**Depende de:** Fase 1 de Revista Aliax y su cierre de brecha visual, ya en producción (ver `docs/superpowers/specs/2026-10-29-revista-aliax-blog-design.md` y `docs/superpowers/specs/2026-11-02-revista-aliax-fase1-gap-design.md`).
**No incluye:** rediseño del bloque de párrafo existente, edición de texto enriquecido (negritas/itálicas dentro de un párrafo), tablas, ni ningún otro tipo de bloque nuevo.

## Resumen

Los artículos de Revista Aliax hoy solo tienen tres tipos de bloque: Texto (un párrafo plano), Imagen y Botón. El usuario quiere poder separar y resaltar subtítulos de sección dentro de un artículo, y armar listas con viñetas, sin tener que simular eso con texto plano. Esta spec agrega dos tipos de bloque nuevos — **Subtítulo** y **Lista con viñetas** — al mismo sistema de bloques reordenables que ya existe, exclusivo de Revista Aliax (`frontend/src/components/admin/BlockEditor.tsx`, usado solo por `ArticleEditor.tsx`; **no** se comparte con el editor de bloques de Talleres/Cursos, que vive en `frontend/src/components/offerings/` como archivos independientes — confirmado revisando el código, no es una suposición).

## Alcance

### 1. Modelo de datos (backend)

```prisma
enum ArticleBlockType {
  TEXT
  IMAGE
  BUTTON
  SUBTITLE
  BULLET_LIST
}
```

Sin columnas nuevas en `ArticleBlock`: tanto `SUBTITLE` como `BULLET_LIST` reutilizan el campo `text` ya existente.
- `SUBTITLE`: `text` guarda el texto corto del encabezado (una línea).
- `BULLET_LIST`: `text` guarda varias líneas; cada línea no vacía es una viñeta.

### 2. Validación backend (`backend/src/utils/validation.ts`)

`createArticleBlockSchema`/`updateArticleBlockSchema`:
- El enum de `type` se amplía a `['TEXT', 'IMAGE', 'BUTTON', 'SUBTITLE', 'BULLET_LIST']`.
- El `.refine()` que hoy exige `text` no vacío solo para `TEXT` se generaliza a `TEXT`, `SUBTITLE` y `BULLET_LIST` (los tres bloques "basados en texto" no pueden guardarse vacíos). `IMAGE` sigue exigiendo `imageUrl`, `BUTTON` sigue exigiendo `buttonLabel`+`buttonUrl`, sin cambios ahí.

### 3. CMS (`frontend/src/components/admin/BlockEditor.tsx`)

- La fila de botones "Agregar bloque" pasa de 3 a 5: Texto / Subtítulo / Lista / Imagen / Botón.
- Bloque **Subtítulo**: un `<input>` de una sola línea (no un `<textarea>`, el subtítulo es corto), mismo patrón de guardado automático al salir del campo (`onBlur`) que ya usa el bloque Texto.
- Bloque **Lista con viñetas**: un `<textarea>` (mismo componente que ya usa el bloque Texto), con una pista visible ("Un punto por línea") y el mismo guardado automático al salir del campo.
- Ambos reutilizan `handleTextChange`/`handleTextBlur` ya existentes en el archivo — no se necesita estado ni lógica de guardado nueva, solo las dos ramas de renderizado del formulario y las dos entradas nuevas en la fila de botones.
- Etiqueta visible en la cabecera de cada bloque (hoy dice "Texto"/"Imagen"/"Boton"): se agregan "Subtitulo"/"Lista".

### 4. Página pública (`frontend/scripts/generate-blog.ts`)

En `renderBlock(block)`, dos ramas nuevas (manteniendo el `throw` final para cualquier tipo no reconocido, agregado en el cierre de la brecha de Fase 1):

- `SUBTITLE` → se renderiza como encabezado, reutilizando el mismo estilo que ya usan los títulos del sitio (familia `Bebas Neue`, color blanco), con más margen superior que un párrafo normal para separar visualmente la sección.
- `BULLET_LIST` → el texto se divide por saltos de línea, se descartan líneas vacías, y cada línea se envuelve en un `<li>` dentro de un `<ul>`. El texto de cada viñeta usa el mismo tamaño/color que un párrafo normal (`Urbanist`, `rgba(255,255,255,0.75)`); el punto de la viñeta (el marcador) usa el color de acento teal `#2dd4bf` — único elemento del bloque con ese color, el texto en sí no cambia.

`escapeHtml` se aplica igual que en el resto del archivo: a cada línea de `BULLET_LIST` individualmente (no al bloque completo antes de dividir, para no escapar los saltos de línea que se usan para dividir) y al texto completo de `SUBTITLE`.

### 5. Tipos TypeScript

- `ArticleBlockType` en `frontend/src/hooks/useArticles.ts` gana `'SUBTITLE' | 'BULLET_LIST'`.
- La interfaz `ArticleBlock` (duplicada, sin compartir, dentro de `frontend/scripts/generate-blog.ts` — ese script corre en Node en build time, no importa tipos del frontend) gana los mismos dos valores en su propio `type`.

## Fuera de alcance (explícito)

- Texto enriquecido dentro de un párrafo (negritas, itálicas, enlaces en medio de una oración) — no solicitado.
- Listas numeradas (1, 2, 3...) — solo viñetas, como se pidió.
- Subtítulos anidados (H2 vs H3, niveles de jerarquía) — un solo nivel de subtítulo.
- Cualquier cambio al editor de bloques de Talleres/Cursos (`ModuleFormModal.tsx`/`QuestionnaireEditor.tsx`) — son archivos independientes, no se tocan.

## Verificación

Sin suite de tests en este repo. Verificación empírica:

1. Crear un artículo de prueba con al menos un bloque Subtítulo y un bloque Lista (3-4 viñetas, incluyendo una línea vacía en medio del texto para confirmar que se descarta), publicar.
2. Confirmar en el HTML generado (`view-source` o `curl`) que el subtítulo aparece como encabezado y la lista como `<ul><li>` con el marcador en color de acento.
3. Confirmar visualmente en navegador que el subtítulo se ve claramente separado de los párrafos y que las viñetas tienen el punto en teal.
4. Confirmar que un bloque Subtítulo o Lista vacío no se puede guardar/publicar (mismo mensaje de error que ya existe para un párrafo vacío).
5. Limpiar el artículo de prueba al terminar.
