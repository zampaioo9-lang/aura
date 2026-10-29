import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { useArticles, type ArticleBlock, type ArticleBlockType } from '../../hooks/useArticles';
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
}

export default function BlockEditor({ C, articleId }: Props) {
  const { getArticle, createBlock, updateBlock, deleteBlock } = useArticles();
  const { uploadImage, uploading } = useUpload();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<ArticleBlock[]>([]);
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null);

  const loadBlocks = async () => {
    try {
      const article = await getArticle(articleId);
      setBlocks(article.blocks ?? []);
    } catch {
      toast('No se pudieron cargar los bloques', 'error');
    }
  };

  useEffect(() => { loadBlocks(); }, [articleId]);

  const handleAddBlock = async (type: ArticleBlockType) => {
    try {
      if (type === 'TEXT') await createBlock(articleId, { type, text: 'Escribe aqui...' });
      else if (type === 'BUTTON') await createBlock(articleId, { type, buttonLabel: 'Ver mas', buttonUrl: 'https://' });
      else await createBlock(articleId, { type, imageUrl: '', imageAlt: '' }); // IMAGE needs upload before it can be saved as non-empty; see handleImageUpload below
      await loadBlocks();
    } catch {
      toast('No se pudo agregar el bloque', 'error');
    }
  };

  const handleTextChange = async (block: ArticleBlock, text: string) => {
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, text } : b));
  };
  const handleTextBlur = async (block: ArticleBlock) => {
    try { await updateBlock(articleId, block.id, { text: block.text ?? '' }); } catch { toast('No se pudo guardar el texto', 'error'); }
  };

  const handleButtonChange = (block: ArticleBlock, field: 'buttonLabel' | 'buttonUrl', value: string) => {
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, [field]: value } : b));
  };
  const handleButtonBlur = async (block: ArticleBlock) => {
    try {
      await updateBlock(articleId, block.id, { buttonLabel: block.buttonLabel ?? '', buttonUrl: block.buttonUrl ?? '' });
    } catch { toast('No se pudo guardar el boton', 'error'); }
  };

  const handleImageUpload = async (block: ArticleBlock, file: File) => {
    const result = await uploadImage(file);
    if (!result) return;
    try {
      const updated = await updateBlock(articleId, block.id, { imageUrl: result.url });
      setBlocks(prev => prev.map(b => b.id === block.id ? updated : b));
    } catch { toast('No se pudo guardar la imagen', 'error'); }
  };

  const handleDelete = async (block: ArticleBlock) => {
    try {
      await deleteBlock(articleId, block.id);
      await loadBlocks();
    } catch { toast('No se pudo borrar el bloque', 'error'); }
  };

  // Mirrors moveModule's pattern in TalleresCursos.tsx: swap `order` on two adjacent
  // blocks via two PUT calls, with an in-flight guard against double-clicks, and a
  // reload on failure so the UI never shows a stale order after a partial failure.
  const moveBlock = async (block: ArticleBlock, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === block.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= blocks.length) return;
    const swapWith = blocks[swapIndex];

    setMovingBlockId(block.id);
    try {
      await updateBlock(articleId, block.id, { order: swapWith.order });
      await updateBlock(articleId, swapWith.id, { order: block.order });
      await loadBlocks();
    } catch {
      toast('No se pudo reordenar', 'error');
      await loadBlocks();
    } finally {
      setMovingBlockId(null);
    }
  };

  return (
    <div style={{ marginTop: 24, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Contenido</h3>

      {blocks.map((block, i) => (
        <div key={block.id} style={{ background: C.tableRowAlt, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: 'uppercase' }}>
              {block.type === 'TEXT' ? 'Texto' : block.type === 'IMAGE' ? 'Imagen' : 'Boton'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button disabled={i === 0 || movingBlockId === block.id} onClick={() => moveBlock(block, 'up')} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, opacity: (i === 0 || movingBlockId === block.id) ? 0.3 : 1 }}>
                <ArrowUp size={14} />
              </button>
              <button disabled={i === blocks.length - 1 || movingBlockId === block.id} onClick={() => moveBlock(block, 'down')} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, opacity: (i === blocks.length - 1 || movingBlockId === block.id) ? 0.3 : 1 }}>
                <ArrowDown size={14} />
              </button>
              <button onClick={() => handleDelete(block)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {block.type === 'TEXT' && (
            <textarea
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, minHeight: 80, outline: 'none' }}
              value={block.text ?? ''}
              onChange={(e) => handleTextChange(block, e.target.value)}
              onBlur={() => handleTextBlur(block)}
            />
          )}

          {block.type === 'IMAGE' && (
            <div>
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(block, e.target.files[0])} />
              {uploading && <p style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>Subiendo...</p>}
              {block.imageUrl && <img src={block.imageUrl} alt="" style={{ width: 128, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
            </div>
          )}

          {block.type === 'BUTTON' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none' }}
                placeholder="Texto del boton"
                value={block.buttonLabel ?? ''}
                onChange={(e) => handleButtonChange(block, 'buttonLabel', e.target.value)}
                onBlur={() => handleButtonBlur(block)}
              />
              <input
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.text, fontSize: 14, outline: 'none' }}
                placeholder="URL"
                value={block.buttonUrl ?? ''}
                onChange={(e) => handleButtonChange(block, 'buttonUrl', e.target.value)}
                onBlur={() => handleButtonBlur(block)}
              />
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => handleAddBlock('TEXT')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <Plus size={13} /> Texto
        </button>
        <button onClick={() => handleAddBlock('IMAGE')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <Plus size={13} /> Imagen
        </button>
        <button onClick={() => handleAddBlock('BUTTON')} style={{ padding: '7px 12px', background: C.tableRowAlt, color: C.textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <Plus size={13} /> Boton
        </button>
      </div>
    </div>
  );
}
