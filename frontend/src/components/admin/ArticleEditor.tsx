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
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ArticleEditor({ C, articleId, categories, onClose, onSaved }: Props) {
  const { getArticle, createArticle, updateArticle } = useArticles();
  const { uploadImage, uploading } = useUpload();
  const { toast } = useToast();

  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    getArticle(articleId).then(a => {
      setArticle(a);
      setTitle(a.title);
      setExcerpt(a.excerpt);
      setMetaDescription(a.metaDescription || '');
      setCategoryId(a.categoryId);
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

  const handleSave = async () => {
    if (title.trim().length < 3) { toast('El titulo debe tener al menos 3 caracteres', 'error'); return; }
    if (excerpt.trim().length < 10) { toast('El extracto debe tener al menos 10 caracteres', 'error'); return; }
    if (!categoryId) { toast('Elige una categoria', 'error'); return; }

    setSaving(true);
    try {
      if (!article) {
        const created = await createArticle({
          title: title.trim(), excerpt: excerpt.trim(), metaDescription: metaDescription.trim() || undefined, categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(created);
      } else {
        const updated = await updateArticle(article.id, {
          title: title.trim(), excerpt: excerpt.trim(), metaDescription: metaDescription.trim() || undefined, categoryId,
          coverImage: coverImage || undefined, featured,
        });
        setArticle(updated);
      }
      toast('Guardado', 'success');
      onSaved();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 4, marginTop: 14,
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12, padding: 24 }}>
      <button onClick={onClose} style={{ fontSize: 13, color: C.textFaint, marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Volver a articulos</button>

      <label style={lbl}>Titulo</label>
      <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titulo del articulo" />

      <label style={lbl}>Extracto</label>
      <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Resumen corto, se usa en el listado" />

      <label style={lbl}>Meta descripcion (SEO)</label>
      <textarea style={{ ...inp, minHeight: 50, resize: 'vertical' }} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Opcional. Si la dejas vacia, se usa el Extracto. Esto es lo que aparece en Google y al compartir el enlace." maxLength={300} />

      <label style={lbl}>Categoria</label>
      <select style={inp} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">Elige una categoria</option>
        <optgroup label="Pacientes">
          {pacientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
        <optgroup label="Terapeutas">
          {terapeutas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </optgroup>
      </select>

      <label style={lbl}>Imagen de portada</label>
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
      {uploading && <p style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>Subiendo...</p>}
      {coverImage && !uploading && <img src={coverImage} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 14, color: C.text }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Destacado (tarjeta grande en el listado)
      </label>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 20, padding: '9px 18px', background: C.accent, border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Guardando...' : article ? 'Guardar cambios' : 'Crear articulo'}
      </button>

      {article && <BlockEditor C={C} articleId={article.id} />}
    </div>
  );
}
