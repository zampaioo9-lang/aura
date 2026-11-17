import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Plus, ArrowLeft, Lock, ExternalLink, MessageSquareWarning, Clock, Trash2 } from 'lucide-react';
import { useMyArticles, type MyArticleSummary } from '../../hooks/useMyArticles';
import type { Article, ArticleStatus } from '../../hooks/useArticles';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../Toast';
import BlockEditor, { type BlockEditorHandle } from '../admin/BlockEditor';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  cardShadow?: string;
  isDark: boolean;
}

interface Props {
  C: Colors;
  isActive?: boolean;
  isPro: boolean;
  /** Nombre del terapeuta; se muestra como autor (no editable) mientras el articulo no existe. */
  authorName?: string;
}

const STATUS_LABEL: Record<ArticleStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_REVIEW: 'En revisión',
  CHANGES_REQUESTED: 'Cambios solicitados',
  PUBLISHED: 'Publicado',
};

function statusColors(status: ArticleStatus, isDark: boolean): { bg: string; fg: string } {
  switch (status) {
    case 'PENDING_REVIEW': return isDark ? { bg: 'rgba(251,191,36,0.16)', fg: '#fbbf24' } : { bg: 'rgba(217,119,6,0.12)', fg: '#92400e' };
    case 'CHANGES_REQUESTED': return isDark ? { bg: 'rgba(251,146,60,0.18)', fg: '#fdba74' } : { bg: 'rgba(234,88,12,0.12)', fg: '#9a3412' };
    case 'PUBLISHED': return isDark ? { bg: 'rgba(52,211,153,0.16)', fg: '#6ee7b7' } : { bg: 'rgba(5,150,105,0.12)', fg: '#065f46' };
    default: return isDark ? { bg: 'rgba(255,255,255,0.08)', fg: '#c4d4d3' } : { bg: 'rgba(0,0,0,0.06)', fg: '#475569' };
  }
}

// Caja de artículos: en claro lleva el borde del color del tema; en oscuro se tiñe con el color del tema, translúcido.
function cardRing(C: Colors): string {
  return C.isDark ? '0 0 0 1px rgba(255,255,255,0.08)' : `0 0 0 1px ${C.border}${C.cardShadow ? ", " + C.cardShadow : ""}`;
}
function cardFill(C: Colors): string {
  return C.isDark ? `color-mix(in srgb, ${C.accent} 14%, transparent)` : C.cardBg;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

const canEdit = (status: ArticleStatus) => status === 'DRAFT' || status === 'CHANGES_REQUESTED';

export default function MyArticles({ C, isActive, isPro, authorName }: Props) {
  const api = useMyArticles();
  const [articles, setArticles] = useState<MyArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // undefined = lista; null = articulo nuevo; string = id de un articulo existente
  const [editing, setEditing] = useState<string | null | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      setArticles(await api.list());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && isPro) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isPro]);

  const ring = cardRing(C);
  const cardBg = cardFill(C);
  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 18px',
    background: C.accent, border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
  };

  // ---- Usuarios sin plan Pro: invitacion ----
  if (!isPro) {
    return (
      <div style={{ background: cardBg, boxShadow: ring, borderRadius: 16, padding: '36px 24px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.accentLight, color: C.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Lock size={22} />
        </div>
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Escribe en la Revista Aliax</h2>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
          Con el plan Pro puedes escribir artículos, enviarlos a revisión y, cuando se aprueban, se publican en la Revista firmados con el enlace a tu perfil.
        </p>
        <Link to="/pricing" style={btnPrimary}>Ver planes</Link>
      </div>
    );
  }

  if (editing !== undefined) {
    return (
      <ArticleForm
        C={C}
        ring={ring}
        articleId={editing}
        authorName={authorName}
        onBack={() => { setEditing(undefined); load(); }}
        onChanged={load}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <PenLine size={20} /> Mis artículos
        </h2>
        <button style={btnPrimary} onClick={() => setEditing(null)}>
          <Plus size={16} /> Nuevo artículo
        </button>
      </div>

      {error && (
        <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && articles.length === 0 && <p style={{ color: C.muted, fontSize: 14 }}>Cargando...</p>}

      {!loading && !error && articles.length === 0 && (
        <div style={{ background: cardBg, boxShadow: ring, borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
          <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Aún no tienes artículos</p>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Escribe el primero y envíalo a revisión para que se publique en la Revista.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {articles.map((a) => {
          const sc = statusColors(a.status, C.isDark);
          const date = a.status === 'PUBLISHED' ? formatDate(a.publishedAt) : a.status === 'PENDING_REVIEW' ? formatDate(a.submittedAt) : formatDate(a.updatedAt);
          const dateLabel = a.status === 'PUBLISHED' ? 'Publicado el' : a.status === 'PENDING_REVIEW' ? 'Enviado el' : 'Actualizado el';
          return (
            <button
              key={a.id}
              onClick={() => setEditing(a.id)}
              style={{ textAlign: 'left', width: '100%', background: cardBg, boxShadow: ring, borderRadius: 14, padding: 16, border: 'none', cursor: 'pointer', display: 'block' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ color: C.text, fontSize: 15, fontWeight: 700, flex: '1 1 200px', minWidth: 0, overflowWrap: 'anywhere' }}>{a.title}</span>
                <span style={{ background: sc.bg, color: sc.fg, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
              {date && (
                <div style={{ color: C.muted, fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={12} /> {dateLabel} {date}
                </div>
              )}
              {a.status === 'CHANGES_REQUESTED' && a.reviewNote && (
                <ReviewNote C={C} note={a.reviewNote} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewNote({ C, note }: { C: Colors; note: string }) {
  const sc = statusColors('CHANGES_REQUESTED', C.isDark);
  return (
    <div style={{ marginTop: 12, background: sc.bg, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <MessageSquareWarning size={16} style={{ color: sc.fg, flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color: sc.fg, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Cambios que te pidió César</div>
        <div style={{ color: C.text, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{note}</div>
      </div>
    </div>
  );
}

interface FormProps {
  C: Colors;
  ring: string;
  articleId: string | null;
  authorName?: string;
  onBack: () => void;
  onChanged: () => void;
}

function ArticleForm({ C, ring, articleId, authorName, onBack, onChanged }: FormProps) {
  const cardBg = cardFill(C);
  const api = useMyArticles();
  const { uploadImage, uploading, error: uploadError } = useUpload();
  const { toast } = useToast();

  const [article, setArticle] = useState<Article | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(!!articleId);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [busy, setBusy] = useState<'save' | 'submit' | 'withdraw' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editorRef = useRef<BlockEditorHandle>(null);

  const fill = (a: Article) => {
    setArticle(a);
    setTitle(a.title);
    setExcerpt(a.excerpt || '');
    setMetaDescription(a.metaDescription || '');
    setCoverImage(a.coverImage || '');
  };

  useEffect(() => {
    if (!articleId) return;
    setLoadingArticle(true);
    api.get(articleId).then(fill).catch((err: any) => toast(err.message, 'error')).finally(() => setLoadingArticle(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const editable = !article || canEdit(article.status);
  const working = busy !== null || uploading;

  const handleCoverUpload = async (file: File) => {
    const result = await uploadImage(file);
    if (result) setCoverImage(result.url);
  };

  const validateFields = (forSubmit: boolean): string | null => {
    if (title.trim().length < 3) return 'Escribe un título de al menos 3 caracteres';
    if (excerpt.length > 300) return 'El extracto no puede superar los 300 caracteres';
    if (coverImage && !/^https?:\/\//i.test(coverImage)) return 'La URL debe empezar con http:// o https://';
    if (forSubmit && excerpt.trim().length < 10) return 'Escribe un extracto de al menos 10 caracteres';
    return null;
  };

  // Guarda los campos (crea el articulo si aun no existe) y devuelve el articulo guardado.
  const persist = async (): Promise<Article> => {
    const data = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      metaDescription: metaDescription.trim() || undefined,
      coverImage: coverImage || undefined,
    };
    const saved = article ? await api.update(article.id, data) : await api.create(data);
    // El PUT/POST no trae el nombre del autor en el estado local; conservamos lo que ya teniamos.
    setArticle((prev) => ({ ...(prev ?? ({} as Article)), ...saved }));
    return saved;
  };

  const handleSave = async () => {
    const problem = validateFields(false);
    if (problem) { toast(problem, 'error'); return; }
    setBusy('save');
    try {
      await persist();
      toast('Guardado', 'success');
      onChanged();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async () => {
    const problem = validateFields(true);
    if (problem) { toast(problem, 'error'); return; }
    setBusy('submit');
    try {
      // Primero el contenido de los bloques: si algo no se guarda, no se envia.
      await editorRef.current?.flush();
      const saved = await persist();
      const submitted = await api.submit(saved.id);
      setArticle((prev) => ({ ...(prev ?? ({} as Article)), ...submitted }));
      toast('Enviado a revisión', 'success');
      onChanged();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleWithdraw = async () => {
    if (!article) return;
    setBusy('withdraw');
    try {
      const withdrawn = await api.withdraw(article.id);
      setArticle((prev) => ({ ...(prev ?? ({} as Article)), ...withdrawn }));
      toast('Artículo retirado de revisión. Vuelve a ser un borrador', 'success');
      onChanged();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    setBusy('delete');
    try {
      await api.remove(article.id);
      toast('Borrador eliminado', 'success');
      onBack(); // vuelve a la lista y la recarga
    } catch (err: any) {
      toast(err.message, 'error');
      setConfirmDelete(false);
    } finally {
      setBusy(null);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: 'none',
    background: C.isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    boxShadow: `inset 0 0 0 1px ${C.isDark ? 'rgba(255,255,255,0.14)' : `color-mix(in srgb, ${C.accent} 45%, transparent)`}`,
    color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit',
    opacity: editable ? 1 : 0.75,
  };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5, marginTop: 16 };
  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 18px',
    background: C.accent, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700,
    cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.6 : 1,
  };
  const btnSecondary: React.CSSProperties = {
    ...btnPrimary, background: C.accentLight, color: C.accent,
  };

  const blockColors = {
    page: C.cardBg, header: C.cardBg, headerBorder: C.border, card: C.cardBg, cardBorder: C.border,
    text: C.text, textMuted: C.muted, textFaint: C.muted, tableHdr: C.accentLight, tableRow: C.cardBg,
    tableRowAlt: C.accentLight, tableRowHover: C.accentLight, expandedBg: C.cardBg,
    inputBg: C.isDark ? 'rgba(255,255,255,0.05)' : '#fff',
    inputBorder: C.isDark ? 'rgba(255,255,255,0.18)' : `color-mix(in srgb, ${C.accent} 45%, transparent)`,
    subCard: C.cardBg, subCardShadow: 'none', accent: C.accent, accentLight: C.accentLight,
  };

  const statusStyle = article ? statusColors(article.status, C.isDark) : null;

  return (
    <div>
      <style>{`.ma-input:focus { box-shadow: inset 0 0 0 2px ${C.accent} !important; }`}</style>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted, marginBottom: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <ArrowLeft size={15} /> Volver a mis artículos
      </button>

      <div style={{ background: cardBg, boxShadow: ring, borderRadius: 16, padding: 'clamp(16px, 4vw, 24px)' }}>
        {loadingArticle ? (
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Cargando...</p>
        ) : (
          <>
            {article && statusStyle && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ background: statusStyle.bg, color: statusStyle.fg, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                  {STATUS_LABEL[article.status]}
                </span>
              </div>
            )}

            {article?.status === 'CHANGES_REQUESTED' && article.reviewNote && <ReviewNote C={C} note={article.reviewNote} />}

            {article?.status === 'PENDING_REVIEW' && (
              <div style={{ marginTop: 12, background: statusColors('PENDING_REVIEW', C.isDark).bg, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 13, lineHeight: 1.5 }}>
                Tu artículo está en revisión. No puedes editarlo mientras tanto; si necesitas hacer cambios, retíralo y vuelve a enviarlo después.
              </div>
            )}

            {article?.status === 'PUBLISHED' && (
              <div style={{ marginTop: 12, background: statusColors('PUBLISHED', C.isDark).bg, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 13, lineHeight: 1.6 }}>
                <a href={`/revista/${article.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  Ver en la Revista <ExternalLink size={13} />
                </a>
                <div style={{ marginTop: 4 }}>Para hacer cambios, escríbenos a hola@aliax.io</div>
              </div>
            )}

            <label style={lbl}>Autor</label>
            <input style={{ ...inp, opacity: 0.75 }} value={article?.author || authorName || ''} readOnly disabled />

            <label style={lbl}>Título</label>
            <input className="ma-input" style={inp} value={title} readOnly={!editable} onChange={(e) => setTitle(e.target.value)} placeholder="Título del artículo" maxLength={150} />

            <label style={lbl}>
              Extracto <span style={{ fontWeight: 400 }}>({excerpt.length}/300, resumen corto que aparece en el listado)</span>
            </label>
            <textarea className="ma-input" style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={excerpt} readOnly={!editable} onChange={(e) => setExcerpt(e.target.value)} placeholder="Resumen corto de tu artículo" maxLength={300} />

            <label style={lbl}>Meta descripción (SEO)</label>
            <textarea className="ma-input" style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={metaDescription} readOnly={!editable} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Opcional. Es lo que aparece en Google al compartir el enlace. Si la dejas vacía se usa el extracto." maxLength={300} />

            <label style={lbl}>Imagen de portada</label>
            {editable && <input type="file" accept="image/*" className="article-file-input" style={{ color: C.text }} onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />}
            {uploading && <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Subiendo imagen...</p>}
            {uploadError && !uploading && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{uploadError}</p>}
            {coverImage && !uploading && <img src={coverImage} alt="" style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 10, marginTop: 8, display: 'block' }} />}
            {!editable && !coverImage && <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Sin portada</p>}

            {editable && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
                <button style={btnSecondary} disabled={working} onClick={handleSave}>
                  {uploading ? 'Subiendo imagen...' : busy === 'save' ? 'Guardando...' : article ? 'Guardar cambios' : 'Guardar borrador'}
                </button>
                <button style={btnPrimary} disabled={working} onClick={handleSubmit}>
                  {busy === 'submit' ? 'Enviando...' : 'Enviar a revisión'}
                </button>
              </div>
            )}

            {editable && article && (
              <div style={{ marginTop: 14 }}>
                {!confirmDelete ? (
                  <button
                    style={{ ...btnSecondary, background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}
                    disabled={working}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 size={14} /> Eliminar borrador
                  </button>
                ) : (
                  <div role="alertdialog" aria-label="Confirmar eliminación" style={{ background: 'rgba(239,68,68,0.08)', boxShadow: ring, borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>¿Eliminar este borrador? No se puede deshacer.</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button style={{ ...btnPrimary, background: '#ef4444' }} disabled={working} onClick={handleDelete}>
                        {busy === 'delete' ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                      <button style={btnSecondary} disabled={working} onClick={() => setConfirmDelete(false)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {article?.status === 'PENDING_REVIEW' && (
              <div style={{ marginTop: 22 }}>
                <button style={btnSecondary} disabled={working} onClick={handleWithdraw}>
                  {busy === 'withdraw' ? 'Retirando...' : 'Retirar de revisión'}
                </button>
              </div>
            )}

            {article ? (
              <BlockEditor ref={editorRef} C={blockColors} articleId={article.id} basePath="/my-articles" readOnly={!editable} />
            ) : (
              <p style={{ color: C.muted, fontSize: 13, marginTop: 22, marginBottom: 0 }}>
                Guarda el borrador para empezar a agregar el contenido de tu artículo.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
