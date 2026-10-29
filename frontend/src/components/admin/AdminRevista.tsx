import { useEffect, useState } from 'react';
import { Newspaper, Tag, Plus } from 'lucide-react';
import { useArticles, type Category, type CategoryAudience, type Article } from '../../hooks/useArticles';
import { useToast } from '../Toast';

interface Colors {
  page: string; header: string; headerBorder: string; card: string; cardBorder: string;
  text: string; textMuted: string; textFaint: string; tableHdr: string; tableRow: string;
  tableRowAlt: string; tableRowHover: string; expandedBg: string; inputBg: string;
  inputBorder: string; subCard: string; subCardShadow: string; accent: string; accentLight: string;
}

interface Props {
  C: Colors;
}

export default function AdminRevista({ C }: Props) {
  const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle } = useArticles();
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<'categorias' | 'articulos'>('articulos');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newAudience, setNewAudience] = useState<CategoryAudience>('PACIENTES');
  const [creating, setCreating] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [creatingArticle, setCreatingArticle] = useState(false);

  const loadCategories = async () => {
    try {
      setCategories(await listCategories());
    } catch {
      toast('No se pudieron cargar las categorias', 'error');
    }
  };

  const loadArticles = async () => {
    try {
      setArticles(await listArticles());
    } catch {
      toast('No se pudieron cargar los articulos', 'error');
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadArticles(); }, []);

  const handleCreateCategory = async () => {
    if (newName.trim().length < 2) {
      toast('El nombre debe tener al menos 2 caracteres', 'error');
      return;
    }
    setCreating(true);
    try {
      await createCategory({ name: newName.trim(), audience: newAudience });
      setNewName('');
      await loadCategories();
      toast('Categoria creada', 'success');
    } catch {
      toast('No se pudo crear la categoria', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await updateCategory(category.id, { active: !category.active });
      await loadCategories();
    } catch {
      toast('No se pudo actualizar la categoria', 'error');
    }
  };

  const pacientes = categories.filter(c => c.audience === 'PACIENTES');
  const terapeutas = categories.filter(c => c.audience === 'TERAPEUTAS');

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
    background: active ? C.accent : C.card, color: active ? '#fff' : C.textMuted,
  });
  const card: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12,
  };
  const inp: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.inputBorder}`,
    background: C.inputBg, color: C.text, fontSize: 14, outline: 'none',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <button style={tabBtn(subTab === 'articulos')} onClick={() => setSubTab('articulos')}>
          <Newspaper size={15} /> Articulos
        </button>
        <button style={tabBtn(subTab === 'categorias')} onClick={() => setSubTab('categorias')}>
          <Tag size={15} /> Categorias
        </button>
      </div>

      {subTab === 'categorias' && (
        <div>
          <div style={{ ...card, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>Nueva categoria</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ ...inp, width: 256 }}
                  placeholder="Ej. Ansiedad y estres"
                />
              </div>
              <div>
                <label style={lbl}>Audiencia</label>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value as CategoryAudience)}
                  style={inp}
                >
                  <option value="PACIENTES">Pacientes</option>
                  <option value="TERAPEUTAS">Terapeutas</option>
                </select>
              </div>
              <button
                onClick={handleCreateCategory}
                disabled={creating}
                style={{
                  padding: '9px 18px', background: C.accent, border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Plus size={15} /> {creating ? 'Creando...' : 'Agregar'}
              </button>
            </div>
          </div>

          {([['Pacientes', pacientes], ['Terapeutas', terapeutas]] as const).map(([label, list]) => (
            <div key={label} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>{label}</h3>
              <div style={card}>
                {list.map((category, i) => (
                  <div
                    key={category.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${C.cardBorder}`,
                    }}
                  >
                    <span style={{
                      fontSize: 14, color: category.active ? C.text : C.textFaint,
                      textDecoration: category.active ? 'none' : 'line-through',
                    }}>
                      {category.name}
                    </span>
                    <button
                      onClick={() => handleToggleActive(category)}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
                        border: 'none', cursor: 'pointer',
                        background: category.active ? C.accentLight : C.tableRowAlt,
                        color: category.active ? C.accent : C.textMuted,
                      }}
                    >
                      {category.active ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                ))}
                {list.length === 0 && <p style={{ padding: '12px 16px', fontSize: 14, color: C.textFaint }}>Sin categorias aun.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'articulos' && (
        <div>
          {editingArticleId || creatingArticle ? (
            <div>{/* Task 9/10 fill in the editor here */}</div>
          ) : (
            <>
              <button
                onClick={() => setCreatingArticle(true)}
                style={{
                  marginBottom: 16, padding: '9px 18px', background: C.accent, border: 'none',
                  borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Plus size={15} /> Nuevo articulo
              </button>
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 12 }}>
                {articles.map((article, i) => (
                  <div
                    key={article.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${C.cardBorder}`,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{article.title}</p>
                      <p style={{ fontSize: 12, color: C.textFaint, margin: 0 }}>{article.category?.name ?? ''}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
                        background: article.status === 'PUBLISHED' ? C.accentLight : C.tableRowAlt,
                        color: article.status === 'PUBLISHED' ? C.accent : C.textMuted,
                      }}>
                        {article.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                      </span>
                      <button
                        onClick={() => setEditingArticleId(article.id)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                          border: 'none', background: C.tableRowAlt, color: C.textMuted, cursor: 'pointer',
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            if (article.status === 'PUBLISHED') await unpublishArticle(article.id);
                            else await publishArticle(article.id);
                            await loadArticles();
                          } catch (err: any) {
                            toast(err.message, 'error');
                          }
                        }}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                          border: 'none', background: C.tableRowAlt, color: C.textMuted, cursor: 'pointer',
                        }}
                      >
                        {article.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Borrar "${article.title}"?`)) return;
                          try {
                            await deleteArticle(article.id);
                            await loadArticles();
                          } catch (err: any) {
                            toast(err.message, 'error');
                          }
                        }}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                          border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer',
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
                {articles.length === 0 && <p style={{ padding: '12px 16px', fontSize: 14, color: C.textFaint }}>Sin articulos aun.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
