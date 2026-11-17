import { useEffect, useState } from 'react';
import { useArticles, type Article, type Category } from '../../hooks/useArticles';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../Toast';
import BlockEditor from './BlockEditor';

interface Colors {
  page: string; header: string; headerBorder: string; card: string; cardBorder: string;
  text: string; textMuted: string; textFaint: string; tableHdr: string; tableRow: string;
  tableRowAlt: string; tableRowHover: string; expandedBg: string; inputBg: string;
  inputBorder: string; subCard: string; subCardShadow: string; accent: string; accentLight: string;
}

interface Props {
  C: Colors;
  articleId: string | null; // null = creating a new one
  authorName?: string | null; // nombre del terapeuta autor (articulos de terapeutas)
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ArticleEditor({ C, articleId, categories, authorName, onClose, onSaved }: Props) {
  const { getArticle, createArticle, updateArticle, publishArticle, requestChanges } = useArticles();
  const { uploadImage, uploading } = useUpload();
  const { toast } = useToast();

  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesNote, setChangesNote] = useState('');

  useEffect(() => {
    if (!articleId) return;
    getArticle(articleId).then(a => {
      setArticle(a);
      setTitle(a.title);
      setExcerpt(a.excerpt);
      setMetaDescription(a.metaDescription || '');
      setAuthor(a.author || '');
      setCategoryId(a.categoryId ?? '');
      setCoverImage(a.coverImage || '');
      setFeatured(a.featured);
    }).catch(() => toast('No se pudo cargar el articulo', 'error'));
  }, [articleId]);

  const activeCategories = categories.filter(c => c.active);
  const pacientes = activeCategories.filter(c => c.audience === 'PACIENTES');
  const terapeutas = activeCategories.filter(c => c.audience === 'TERAPEUTAS');

  const handleCoverUpload = async (file: File) => {
    const result = await uploadImage(file);
    if (result) setCoverImage(result.url);
  };

  // Guarda el articulo; devuelve true si quedo guardado. quiet evita el aviso de exito (lo usa Publicar).
  const persist = async (quiet = false): Promise<boolean> => {
    if (title.trim().length < 3) { toast('El titulo debe tener al menos 3 caracteres', 'error'); return false; }
    if (excerpt.trim().length < 10) { toast('El extracto debe tener al menos 10 caracteres', 'error'); return false; }
    if (excerpt.trim().length > 300) { toast('El extracto no puede superar los 300 caracteres (es un resumen corto; el contenido completo va en los bloques de abajo)', 'error'); return false; }
    if (!categoryId) { toast('Elige una categoria', 'error'); return false; }

    setSaving(true);
    try {
      if (!article) {
        const created = await createArticle({
          title: title.trim(), excerpt: excerpt.trim(), metaDescription: metaDescription.trim() || undefined, author: author.trim() || undefined, categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(created);
      } else {
        const updated = await updateArticle(article.id, {
          title: title.trim(), excerpt: excerpt.trim(), metaDescription: metaDescription.trim() || undefined, author: author.trim() || undefined, categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(updated);
      }
      if (!quiet) toast('Guardado', 'success');
      onSaved();
      return true;
    } catch (err: any) {
      toast(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => { void persist(); };

  const isTherapistArticle = !!(article?.authorUserId || authorName);
  const inReview = article?.status === 'PENDING_REVIEW';
  const noteLen = changesNote.trim().length;
  const noteValid = noteLen >= 3 && noteLen <= 2000;

  const handleReviewPublish = async () => {
    if (!article || !categoryId) return;
    setReviewBusy(true);
    setReviewError('');
    try {
      // Guarda primero (incluye la categoria elegida) y luego publica.
      if (!(await persist(true))) return;
      await publishArticle(article.id);
      toast('Articulo publicado', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      setReviewError(err.message || 'No se pudo publicar');
    } finally {
      setReviewBusy(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!article || !noteValid) return;
    setReviewBusy(true);
    setReviewError('');
    try {
      await requestChanges(article.id, changesNote.trim());
      toast('Se devolvio el articulo al autor', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      setReviewError(err.message || 'No se pudo pedir cambios');
    } finally {
      setReviewBusy(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none',
  };
  // Las opciones nativas no heredan el fondo translucido: sin un fondo solido quedan blanco sobre blanco
  const optStyle: React.CSSProperties = { background: C.card.startsWith('#') ? C.card : '#0b1f1d', color: C.text };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4, marginTop: 14,
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 24 }}>
      <button onClick={onClose} style={{ fontSize: 13, color: C.textFaint, marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Volver a articulos</button>

      {isTherapistArticle && article && (
        <div style={{ background: C.accentLight, borderRadius: 10, padding: 16, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
            Articulo de terapeuta{authorName ? `: ${authorName}` : ''}
          </p>
          {article.reviewNote && article.status === 'CHANGES_REQUESTED' && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.textMuted }}>Nota enviada al autor: {article.reviewNote}</p>
          )}
          {inReview ? (
            <>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: C.textMuted }}>
                Esta en revision. Elige la categoria abajo (obligatoria) y publica, o devuelve el articulo con una nota.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handleReviewPublish}
                  disabled={!categoryId || reviewBusy || saving || uploading}
                  title={!categoryId ? 'Elige una categoria para publicar' : undefined}
                  style={{ padding: '9px 18px', background: C.accent, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: (!categoryId || reviewBusy) ? 'not-allowed' : 'pointer', opacity: (!categoryId || reviewBusy) ? 0.5 : 1 }}
                >
                  {reviewBusy && !changesOpen ? 'Publicando...' : 'Publicar'}
                </button>
                <button
                  onClick={() => { setChangesOpen(o => !o); setReviewError(''); }}
                  disabled={reviewBusy}
                  style={{ padding: '9px 18px', background: C.tableRowAlt, border: 'none', borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 700, cursor: reviewBusy ? 'not-allowed' : 'pointer' }}
                >
                  Pedir cambios
                </button>
              </div>
              {!categoryId && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#f59e0b' }}>Falta elegir la categoria para poder publicar.</p>}
              {changesOpen && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4 }}>
                    Nota para el autor <span style={{ color: noteValid || noteLen === 0 ? C.textFaint : '#ef4444', fontWeight: 400 }}>({noteLen}/2000, minimo 3)</span>
                  </label>
                  <textarea
                    style={{ ...inp, minHeight: 90, resize: 'vertical' }}
                    value={changesNote}
                    onChange={(e) => setChangesNote(e.target.value)}
                    maxLength={2000}
                    placeholder="Explica que debe ajustar el autor"
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={handleRequestChanges}
                      disabled={!noteValid || reviewBusy}
                      style={{ padding: '8px 16px', background: '#f59e0b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: (!noteValid || reviewBusy) ? 'not-allowed' : 'pointer', opacity: (!noteValid || reviewBusy) ? 0.5 : 1 }}
                    >
                      {reviewBusy ? 'Enviando...' : 'Enviar nota y devolver'}
                    </button>
                    <button
                      onClick={() => { setChangesOpen(false); setChangesNote(''); setReviewError(''); }}
                      disabled={reviewBusy}
                      style={{ padding: '8px 16px', background: 'none', border: 'none', color: C.textMuted, fontSize: 13, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {reviewError && <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{reviewError}</p>}
            </>
          ) : (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.textMuted }}>
              Estado actual: {article.status === 'PUBLISHED' ? 'Publicado' : article.status === 'CHANGES_REQUESTED' ? 'Cambios solicitados' : 'Borrador del autor'}. Solo se puede revisar cuando esta en revision.
            </p>
          )}
        </div>
      )}

      <label style={lbl}>Titulo</label>
      <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titulo del articulo" />

      <label style={lbl}>Extracto <span style={{ color: C.textFaint, fontWeight: 400 }}>({excerpt.length}/300 — resumen corto, no el contenido completo)</span></label>
      <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Resumen corto, se usa en el listado" maxLength={300} />

      <label style={lbl}>Meta descripcion (SEO)</label>
      <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' }} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Opcional. Si la dejas vacia, se usa el Extracto. Esto es lo que aparece en Google y al compartir el enlace." maxLength={300} />

      <label style={lbl}>Autor <span style={{ color: C.textFaint, fontWeight: 400 }}>(requerido para publicar)</span></label>
      <input style={inp} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Ej. Cesar A." />

      <label style={lbl}>Categoria</label>
      <select style={inp} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option style={optStyle} value="">Elige una categoria</option>
        <optgroup style={optStyle} label="Pacientes">
          {pacientes.map(c => <option key={c.id} style={optStyle} value={c.id}>{c.name}</option>)}
        </optgroup>
        <optgroup style={optStyle} label="Terapeutas">
          {terapeutas.map(c => <option key={c.id} style={optStyle} value={c.id}>{c.name}</option>)}
        </optgroup>
      </select>

      <label style={lbl}>Imagen de portada</label>
      <input type="file" accept="image/*" className="article-file-input" style={{ color: C.text }} onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
      {uploading && <p style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>Subiendo...</p>}
      {coverImage && !uploading && <img src={coverImage} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 14, color: C.text }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Destacado (tarjeta grande en el listado)
      </label>

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        style={{
          marginTop: 20, padding: '9px 18px', background: C.accent, border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: (saving || uploading) ? 'not-allowed' : 'pointer', opacity: (saving || uploading) ? 0.6 : 1,
        }}
      >
        {uploading ? 'Subiendo imagen...' : saving ? 'Guardando...' : article ? 'Guardar cambios' : 'Crear articulo'}
      </button>

      {article && <BlockEditor C={C} articleId={article.id} />}
    </div>
  );
}
