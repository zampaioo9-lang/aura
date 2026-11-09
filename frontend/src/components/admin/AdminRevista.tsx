import { useEffect, useState } from 'react';
import { Newspaper, Tag, Plus, Users, Download } from 'lucide-react';
import { useArticles, type Category, type CategoryAudience, type Article, type Subscriber } from '../../hooks/useArticles';
import { useToast } from '../Toast';
import ArticleEditor from './ArticleEditor';

interface Colors {
  page: string; header: string; headerBorder: string; card: string; cardBorder: string;
  text: string; textMuted: string; textFaint: string; tableHdr: string; tableRow: string;
  tableRowAlt: string; tableRowHover: string; expandedBg: string; inputBg: string;
  inputBorder: string; subCard: string; subCardShadow: string; accent: string; accentLight: string;
}

interface Props {
  C: Colors;
  onSendAsNewsletter: (preview: { subject: string; html: string; name: string }) => void;
}

export default function AdminRevista({ C, onSendAsNewsletter }: Props) {
  const { listCategories, createCategory, updateCategory, listArticles, deleteArticle, publishArticle, unpublishArticle, publishSiteChanges, getRebuildStatus, getNewsletterPreview, listSubscribers, exportSubscribersCsv, unsubscribeSubscriber } = useArticles();
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<'categorias' | 'articulos' | 'suscriptores'>('articulos');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberFilter, setSubscriberFilter] = useState<CategoryAudience | 'TODOS'>('TODOS');
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newAudience, setNewAudience] = useState<CategoryAudience>('PACIENTES');
  const [creating, setCreating] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [creatingArticle, setCreatingArticle] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [publishingSite, setPublishingSite] = useState(false);

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

  const loadRebuildStatus = async () => {
    try {
      const { hasPendingChanges } = await getRebuildStatus();
      setHasPendingChanges(hasPendingChanges);
    } catch {
      // Silent -- this is just a status indicator, not worth a toast if it fails to load.
    }
  };

  const loadSubscribers = async (filter: CategoryAudience | 'TODOS') => {
    setLoadingSubscribers(true);
    try {
      setSubscribers(await listSubscribers(filter === 'TODOS' ? undefined : filter));
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await exportSubscribersCsv(subscriberFilter === 'TODOS' ? undefined : subscriberFilter);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleUnsubscribe = async (subscriber: Subscriber) => {
    if (!window.confirm(`¿Dar de baja a ${subscriber.fullName || subscriber.email}?`)) return;
    try {
      await unsubscribeSubscriber(subscriber.id);
      toast('Suscriptor dado de baja', 'success');
      await loadSubscribers(subscriberFilter);
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handlePublishSiteChanges = async () => {
    setPublishingSite(true);
    try {
      await publishSiteChanges();
      toast('Cambios publicados en el sitio', 'success');
      await loadRebuildStatus();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setPublishingSite(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadArticles(); }, []);
  useEffect(() => { loadRebuildStatus(); }, []);
  useEffect(() => {
    if (subTab === 'suscriptores') loadSubscribers(subscriberFilter);
  }, [subTab, subscriberFilter]);

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
    } catch (err: any) {
      toast(err.message || 'No se pudo crear la categoria', 'error');
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
        <button style={tabBtn(subTab === 'suscriptores')} onClick={() => setSubTab('suscriptores')}>
          <Users size={15} /> Suscriptores
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
            <ArticleEditor
              C={C}
              articleId={creatingArticle ? null : editingArticleId}
              categories={categories}
              onClose={() => { setEditingArticleId(null); setCreatingArticle(false); loadRebuildStatus(); }}
              onSaved={loadArticles}
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <button
                  onClick={() => setCreatingArticle(true)}
                  style={{
                    padding: '9px 18px', background: C.accent, border: 'none',
                    borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Plus size={15} /> Nuevo articulo
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {hasPendingChanges && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                      Cambios sin publicar
                    </span>
                  )}
                  <button
                    onClick={handlePublishSiteChanges}
                    disabled={!hasPendingChanges || publishingSite}
                    style={{
                      padding: '9px 18px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: hasPendingChanges ? C.accent : C.tableRowAlt,
                      color: hasPendingChanges ? '#fff' : C.textMuted,
                      cursor: (!hasPendingChanges || publishingSite) ? 'not-allowed' : 'pointer',
                      opacity: publishingSite ? 0.6 : 1,
                    }}
                  >
                    {publishingSite ? 'Publicando...' : hasPendingChanges ? 'Publicar cambios en el sitio' : 'Sin cambios pendientes'}
                  </button>
                </div>
              </div>
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
                            await loadRebuildStatus();
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
                      {article.status === 'PUBLISHED' && (
                        <button
                          onClick={async () => {
                            try {
                              const preview = await getNewsletterPreview(article.id);
                              onSendAsNewsletter(preview);
                            } catch (err: any) {
                              toast(err.message, 'error');
                            }
                          }}
                          style={{
                            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                            border: 'none', background: C.accentLight, color: C.accent, cursor: 'pointer',
                          }}
                        >
                          Enviar como newsletter
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Borrar "${article.title}"?`)) return;
                          try {
                            await deleteArticle(article.id);
                            await loadArticles();
                            await loadRebuildStatus();
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

      {subTab === 'suscriptores' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['TODOS', 'TERAPEUTAS', 'PACIENTES'] as const).map((f) => (
                <button key={f} style={tabBtn(subscriberFilter === f)} onClick={() => setSubscriberFilter(f)}>
                  {f === 'TODOS' ? 'Todos' : f === 'TERAPEUTAS' ? 'Terapeutas' : 'Pacientes'}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 600, cursor: exportingCsv ? 'not-allowed' : 'pointer' }}
            >
              <Download size={14} /> {exportingCsv ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.tableHdr }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Nombre</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Correo</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Audiencia</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: C.textMuted, fontWeight: 600 }}>Fecha</th>
                  <th style={{ padding: '10px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loadingSubscribers && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: C.textMuted }}>Cargando...</td></tr>
                )}
                {!loadingSubscribers && subscribers.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: C.textMuted }}>Sin suscriptores todavia</td></tr>
                )}
                {!loadingSubscribers && subscribers.map((s, i) => {
                  const audiencePill = s.audience === 'TERAPEUTAS'
                    ? { bg: 'rgba(13,148,136,0.12)', color: '#0d9488', label: 'Terapeuta' }
                    : { bg: 'rgba(139,92,246,0.12)', color: '#7c3aed', label: 'Paciente' };
                  const statusPill = s.status === 'CONFIRMED'
                    ? { bg: 'rgba(22,163,74,0.12)', color: '#16a34a', label: 'Confirmado' }
                    : s.status === 'PENDING'
                    ? { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Pendiente' }
                    : { bg: C.tableRowAlt, color: C.textMuted, label: 'Baja' };
                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? C.tableRow : C.tableRowAlt }}>
                      <td style={{ padding: '10px 16px', color: C.text }}>{s.fullName || 'Sin nombre'}</td>
                      <td style={{ padding: '10px 16px', color: C.text }}>{s.email}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: audiencePill.bg, color: audiencePill.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{audiencePill.label}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: statusPill.bg, color: statusPill.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{statusPill.label}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: C.textMuted }}>{new Date(s.createdAt).toLocaleDateString('es-MX')}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {s.status !== 'UNSUBSCRIBED' && (
                          <button
                            onClick={() => handleUnsubscribe(s)}
                            style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Dar de baja
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
