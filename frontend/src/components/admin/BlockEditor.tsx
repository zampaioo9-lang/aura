import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { useArticles, type ArticleBlock, type ArticleBlockType } from '../../hooks/useArticles';
import { useMyArticles } from '../../hooks/useMyArticles';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../Toast';

interface Colors {
  page: string; header: string; headerBorder: string; card: string; cardBorder: string;
  text: string; textMuted: string; textFaint: string; tableHdr: string; tableRow: string;
  tableRowAlt: string; tableRowHover: string; expandedBg: string; inputBg: string;
  inputBorder: string; subCard: string; subCardShadow: string; accent: string; accentLight: string;
}

interface Props {
  C: Colors;
  articleId: string;
  /** '/articles' (admin, por defecto) o '/my-articles' (terapeuta). */
  basePath?: '/articles' | '/my-articles';
  /** Solo lectura: oculta controles de edicion (articulo en revision o publicado). */
  readOnly?: boolean;
}

/** Metodo expuesto por ref (lo usa el terapeuta antes de enviar a revision). */
export interface BlockEditorHandle {
  /** Espera los guardados en curso, guarda lo pendiente y LANZA un error si algo falla. */
  flush: () => Promise<void>;
}

const BlockEditor = forwardRef<BlockEditorHandle, Props>(function BlockEditor({ C, articleId, basePath = '/articles', readOnly = false }, ref) {
  const admin = useArticles();
  const mine = useMyArticles();
  const mineMode = basePath === '/my-articles';
  const getArticle = mineMode ? mine.get : admin.getArticle;
  const createBlock = mineMode ? mine.addBlock : admin.createBlock;
  const updateBlock = mineMode ? mine.updateBlock : admin.updateBlock;
  const deleteBlock = mineMode ? mine.deleteBlock : admin.deleteBlock;
  const swapBlockOrder = mineMode ? mine.swapBlocks : admin.swapBlockOrder;
  const { uploadImage, uploading } = useUpload();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Seguimiento de guardados para flush(): promesas en curso y bloques con cambios sin guardar.
  const blocksRef = useRef<ArticleBlock[]>([]);
  blocksRef.current = blocks;
  const pendingRef = useRef<Set<Promise<unknown>>>(new Set());
  const dirtyRef = useRef<Set<string>>(new Set());
  const track = <T,>(p: Promise<T>): Promise<T> => {
    pendingRef.current.add(p);
    const done = () => { pendingRef.current.delete(p); };
    p.then(done, done);
    return p;
  };

  // En modo terapeuta se muestra el mensaje real del backend; el admin conserva los textos de siempre.
  const fail = (e: any, fallback: string) => toast(mineMode && e?.message ? e.message : fallback, 'error');

  const loadBlocks = async () => {
    try {
      const article = await getArticle(articleId);
      setBlocks(article.blocks ?? []);
    } catch (e) {
      fail(e, 'No se pudieron cargar los bloques');
    }
  };

  useEffect(() => { loadBlocks(); }, [articleId]);

  const handleAddBlock = async (type: ArticleBlockType) => {
    if (adding) return;
    setAdding(true);
    try {
      if (type === 'TEXT') await createBlock(articleId, { type, text: 'Escribe aqui...' });
      else if (type === 'SUBTITLE') await createBlock(articleId, { type, text: 'Subtitulo' });
      else if (type === 'BULLET_LIST') await createBlock(articleId, { type, text: 'Primer punto\nSegundo punto' });
      else if (type === 'BUTTON') await createBlock(articleId, { type, buttonLabel: 'Ver mas', buttonUrl: 'https://aliax.io' });
      else await createBlock(articleId, { type, imageUrl: '', imageAlt: '' }); // IMAGE needs upload before it can be saved as non-empty; see handleImageUpload below
      await loadBlocks();
    } catch (e) {
      fail(e, 'No se pudo agregar el bloque');
    } finally {
      setAdding(false);
    }
  };

  // Guarda los campos actuales del bloque (leidos del ref, no de un cierre viejo). Lanza si falla.
  const saveBlockFields = (id: string): Promise<void> => track((async () => {
    const block = blocksRef.current.find(b => b.id === id);
    if (!block) { dirtyRef.current.delete(id); return; }
    dirtyRef.current.delete(id);
    try {
      if (block.type === 'BUTTON') {
        await updateBlock(articleId, id, { buttonLabel: block.buttonLabel ?? '', buttonUrl: block.buttonUrl ?? '' });
      } else {
        await updateBlock(articleId, id, { text: block.text ?? '' });
      }
    } catch (e) {
      dirtyRef.current.add(id);
      throw e;
    }
  })());

  useImperativeHandle(ref, () => ({
    flush: async () => {
      // 1) esperar guardados en curso (sus errores se revisan abajo al reintentar lo sucio)
      while (pendingRef.current.size > 0) await Promise.allSettled([...pendingRef.current]);
      // 2) forzar el guardado de lo que siga con cambios sin guardar
      const results = await Promise.allSettled([...dirtyRef.current].map(saveBlockFields));
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) throw (failed.reason instanceof Error ? failed.reason : new Error('No se pudo guardar el contenido'));
    },
  }));

  const handleTextChange = (block: ArticleBlock, text: string) => {
    dirtyRef.current.add(block.id);
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, text } : b));
  };
  const handleTextBlur = async (block: ArticleBlock) => {
    try { await saveBlockFields(block.id); } catch (e) { fail(e, 'No se pudo guardar el texto'); }
  };

  const handleButtonChange = (block: ArticleBlock, field: 'buttonLabel' | 'buttonUrl', value: string) => {
    dirtyRef.current.add(block.id);
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, [field]: value } : b));
  };
  const handleButtonBlur = async (block: ArticleBlock) => {
    try { await saveBlockFields(block.id); } catch (e) { fail(e, 'No se pudo guardar el boton'); }
  };

  const handleImageUpload = async (block: ArticleBlock, file: File) => {
    const result = await uploadImage(file);
    if (!result) return;
    try {
      const updated = await track(updateBlock(articleId, block.id, { imageUrl: result.url }));
      setBlocks(prev => prev.map(b => b.id === block.id ? updated : b));
    } catch (e) { fail(e, 'No se pudo guardar la imagen'); }
  };

  const handleDelete = async (block: ArticleBlock) => {
    try {
      await deleteBlock(articleId, block.id);
      await loadBlocks();
    } catch (e) { fail(e, 'No se pudo borrar el bloque'); }
  };

  // swapBlockOrder does both updates in one backend transaction, so a failure can
  // never leave two blocks sharing the same `order` value (the old two-PUT version
  // could, if the second PUT failed after the first succeeded -- that's what caused
  // the up/down arrows to misbehave on articles that already hit this: Postgres
  // doesn't guarantee a stable tie-break order for two equal `order` values, so
  // which block "wins" on each reload became arbitrary). The in-flight guard stays
  // global (movingBlockId truthy, not "does this row match"), because a per-row
  // guard would still let a SECOND, different row start its own moveBlock while the
  // first is mid-flight, both reading `blocks`/`order` from the same stale state.
  const moveBlock = async (block: ArticleBlock, direction: 'up' | 'down') => {
    if (movingBlockId) return;
    const index = blocks.findIndex(b => b.id === block.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= blocks.length) return;
    const swapWith = blocks[swapIndex];

    setMovingBlockId(block.id);
    try {
      await swapBlockOrder(articleId, block.id, swapWith.id);
      await loadBlocks();
    } catch (e) {
      fail(e, 'No se pudo reordenar');
      await loadBlocks();
    } finally {
      setMovingBlockId(null);
    }
  };

  // Modo terapeuta: sin border; el contorno de los campos es una sombra inset sutil.
  const fieldFrame: React.CSSProperties = mineMode
    ? { border: 'none', boxShadow: `inset 0 0 0 1px ${C.inputBorder}` }
    : { border: `1px solid ${C.inputBorder}` };

  return (
    <div style={mineMode ? { marginTop: 28, paddingTop: 4 } : { marginTop: 24, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Contenido</h3>

      {blocks.map((block, i) => (
        <div key={block.id} style={{ background: C.tableRowAlt, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: 'uppercase' }}>
              {block.type === 'TEXT' ? 'Texto' : block.type === 'SUBTITLE' ? 'Subtitulo' : block.type === 'BULLET_LIST' ? 'Lista' : block.type === 'IMAGE' ? 'Imagen' : 'Boton'}
            </span>
            {!readOnly && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button aria-label="Mover arriba" disabled={i === 0 || !!movingBlockId} onClick={() => moveBlock(block, 'up')} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, opacity: (i === 0 || !!movingBlockId) ? 0.3 : 1 }}>
                <ArrowUp size={14} />
              </button>
              <button aria-label="Mover abajo" disabled={i === blocks.length - 1 || !!movingBlockId} onClick={() => moveBlock(block, 'down')} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, opacity: (i === blocks.length - 1 || !!movingBlockId) ? 0.3 : 1 }}>
                <ArrowDown size={14} />
              </button>
              <button onClick={() => handleDelete(block)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>}
          </div>

          {block.type === 'TEXT' && (
            <textarea
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, ...fieldFrame, background: C.inputBg, color: C.text, fontSize: 14, minHeight: 80, outline: 'none' }}
              maxLength={5000}
              value={block.text ?? ''}
              onChange={(e) => handleTextChange(block, e.target.value)}
              onBlur={() => handleTextBlur(block)}
              readOnly={readOnly}
            />
          )}

          {block.type === 'SUBTITLE' && (
            <input
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, ...fieldFrame, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none' }}
              value={block.text ?? ''}
              onChange={(e) => handleTextChange(block, e.target.value)}
              onBlur={() => handleTextBlur(block)}
              readOnly={readOnly}
            />
          )}

          {block.type === 'BULLET_LIST' && (
            <div>
              <textarea
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, ...fieldFrame, background: C.inputBg, color: C.text, fontSize: 14, minHeight: 80, outline: 'none' }}
                maxLength={5000}
                value={block.text ?? ''}
                onChange={(e) => handleTextChange(block, e.target.value)}
                onBlur={() => handleTextBlur(block)}
              readOnly={readOnly}
              />
              <p style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>Un punto por linea</p>
            </div>
          )}

          {block.type === 'IMAGE' && (
            <div>
              {!readOnly && <input type="file" accept="image/*" className="article-file-input" style={{ color: C.text }} onChange={(e) => e.target.files?.[0] && handleImageUpload(block, e.target.files[0])} />}
              {uploading && <p style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>Subiendo...</p>}
              {block.imageUrl && <img src={block.imageUrl} alt="" style={{ width: 128, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
            </div>
          )}

          {block.type === 'BUTTON' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, ...fieldFrame, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none' }}
                placeholder="Texto del boton"
                value={block.buttonLabel ?? ''}
                onChange={(e) => handleButtonChange(block, 'buttonLabel', e.target.value)}
                onBlur={() => handleButtonBlur(block)}
                readOnly={readOnly}
              />
              <input
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, ...fieldFrame, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none' }}
                placeholder="URL"
                value={block.buttonUrl ?? ''}
                onChange={(e) => handleButtonChange(block, 'buttonUrl', e.target.value)}
                onBlur={() => handleButtonBlur(block)}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>
      ))}

      {!readOnly && <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button disabled={adding} onClick={() => handleAddBlock('TEXT')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Texto
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('SUBTITLE')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Subtitulo
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('BULLET_LIST')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Lista
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('IMAGE')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Imagen
        </button>
        <button disabled={adding} onClick={() => handleAddBlock('BUTTON')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: adding ? 'not-allowed' : 'pointer', opacity: adding ? 0.5 : 1 }}>
          <Plus size={13} /> Boton
        </button>
      </div>}
    </div>
  );
});

export default BlockEditor;
