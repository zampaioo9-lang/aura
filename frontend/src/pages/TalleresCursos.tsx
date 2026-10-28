import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ArrowUp, ArrowDown, Pencil, Trash2, GraduationCap } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import { useOfferings, type Offering, type Module, type CreateModuleData, type UpdateModuleData, type CreateOfferingData, type UpdateOfferingData } from '../hooks/useOfferings';
import ProGate from '../components/ProGate';
import OfferingFormModal from '../components/offerings/OfferingFormModal';
import OfferingList from '../components/offerings/OfferingList';
import ModuleFormModal from '../components/offerings/ModuleFormModal';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

type StatusTab = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const MODULE_ICON: Record<Module['type'], string> = {
  TEXT: '📄', VIDEO: '🎥', PDF: '📎', QUESTIONNAIRE: '❓',
};

export default function TalleresCursos({ C, isActive, isPro }: { C: Colors; isActive?: boolean; isPro: boolean }) {
  const {
    offerings, loading, error, setError, fetchOfferings,
    createOffering, updateOffering, togglePublish, archiveOffering,
    fetchModules, createModule, updateModule, deleteModule,
  } = useOfferings();

  const [tab, setTab] = useState<StatusTab>('DRAFT');
  const [profileId, setProfileId] = useState('');
  const [offeringModalOpen, setOfferingModalOpen] = useState(false);
  const [offeringModalMode, setOfferingModalMode] = useState<'create' | 'edit'>('create');
  const [editingOffering, setEditingOffering] = useState<Offering | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Offering | null>(null);

  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleModalMode, setModuleModalMode] = useState<'create' | 'edit'>('create');
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [movingModuleId, setMovingModuleId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState('');

  useEffect(() => {
    if (isActive) fetchOfferings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    api.get('/profiles').then((res) => {
      if (res.data.length > 0) setProfileId(res.data[0].id);
    });
  }, [isActive]);

  const loadModules = async (offeringId: string) => {
    setModulesLoading(true);
    try {
      const data = await fetchModules(offeringId);
      setModules(data);
    } finally {
      setModulesLoading(false);
    }
  };

  const openOffering = async (offering: Offering) => {
    setSelectedOffering(offering);
    await loadModules(offering.id);
  };

  const backToList = () => {
    setSelectedOffering(null);
    setModules([]);
    fetchOfferings();
  };

  const openCreateOffering = () => {
    setEditingOffering(null);
    setOfferingModalMode('create');
    setOfferingModalOpen(true);
  };

  const openEditOffering = (offering: Offering) => {
    setEditingOffering(offering);
    setOfferingModalMode('edit');
    setOfferingModalOpen(true);
  };

  const handleOfferingSubmit = async (data: CreateOfferingData | UpdateOfferingData) => {
    if (offeringModalMode === 'create') {
      const created = await createOffering(data as CreateOfferingData);
      setOfferingModalOpen(false);
      await openOffering(created);
    } else if (editingOffering) {
      const updated = await updateOffering(editingOffering.id, data as UpdateOfferingData);
      if (selectedOffering?.id === updated.id) setSelectedOffering(updated);
    }
  };

  const handleTogglePublish = async (offering: Offering) => {
    try {
      const updated = await togglePublish(offering.id);
      // togglePublish() ya refresca la lista `offerings` por dentro, pero `selectedOffering`
      // es un state local separado (la oferta clickeada, no derivada de `offerings`) -- sin
      // esto, publicar/despublicar desde dentro del editor actualiza el backend y la lista,
      // pero el boton/badge del encabezado del editor se queda mostrando el estado viejo
      // hasta salir y volver a entrar.
      if (selectedOffering?.id === updated.id) setSelectedOffering(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmArchive = (offering: Offering) => { setArchiveTarget(offering); setArchiveError(''); };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiveError('');
    try {
      await archiveOffering(archiveTarget.id);
      const wasSelected = selectedOffering?.id === archiveTarget.id;
      setArchiveTarget(null);
      if (wasSelected) backToList();
    } catch (err: any) {
      // A diferencia de handleTogglePublish/handleDeleteModule (donde el banner superior es
      // suficiente), esta es una accion irreversible -- cerrar el dialogo de confirmacion
      // tras una falla daria la falsa impresion de que se archivo. Se deja abierto, mismo
      // patron que OfferingFormModal/ModuleFormModal (error inline donde el usuario ya esta
      // mirando), en vez de delegar todo al banner superior que puede quedar fuera de vista.
      setArchiveError(err.message);
    }
  };

  const openCreateModule = () => {
    setEditingModule(null);
    setModuleModalMode('create');
    setModuleModalOpen(true);
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleModalMode('edit');
    setModuleModalOpen(true);
  };

  const handleCreateModule = async (data: CreateModuleData): Promise<Module> => {
    if (!selectedOffering) throw new Error('No hay oferta seleccionada');
    const result = await createModule(selectedOffering.id, data);
    await loadModules(selectedOffering.id);
    return result;
  };

  const handleUpdateModule = async (moduleId: string, data: UpdateModuleData): Promise<Module> => {
    if (!selectedOffering) throw new Error('No hay oferta seleccionada');
    const result = await updateModule(selectedOffering.id, moduleId, data);
    await loadModules(selectedOffering.id);
    return result;
  };

  const handleDeleteModule = async (module: Module) => {
    if (!selectedOffering) return;
    try {
      await deleteModule(selectedOffering.id, module.id);
      await loadModules(selectedOffering.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const moveModule = async (module: Module, direction: 'up' | 'down') => {
    if (!selectedOffering || movingModuleId) return;
    const sorted = [...modules].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((m) => m.id === module.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const other = sorted[swapIndex];
    setMovingModuleId(module.id);
    try {
      await updateModule(selectedOffering.id, module.id, { order: other.order });
      await updateModule(selectedOffering.id, other.id, { order: module.order });
      await loadModules(selectedOffering.id);
    } catch (err: any) {
      setError(err.message);
      // Las dos llamadas de arriba no son atomicas (ver nota de diseno del plan): si la
      // primera tuvo exito y la segunda fallo, el servidor ya quedo con dos modulos
      // compartiendo el mismo order. Sin este refetch, `modules` se queda con el orden viejo
      // (pre-intento) mientras el servidor ya cambio -- un reintento recalcularia el swap
      // sobre datos obsoletos y podria empeorar la inconsistencia. Refrescar aqui muestra el
      // estado real del servidor, aunque siga teniendo el order duplicado hasta el proximo
      // swap exitoso.
      await loadModules(selectedOffering.id);
    } finally {
      setMovingModuleId(null);
    }
  };

  const filtered = offerings.filter((o) => o.status === tab);
  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'DRAFT', label: `Borradores (${offerings.filter((o) => o.status === 'DRAFT').length})` },
    { key: 'PUBLISHED', label: `Publicadas (${offerings.filter((o) => o.status === 'PUBLISHED').length})` },
    { key: 'ARCHIVED', label: `Archivadas (${offerings.filter((o) => o.status === 'ARCHIVED').length})` },
  ];

  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
    background: C.accent, border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <ProGate isPro={isPro}>
      <div>
        {error && (
          <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 10, marginBottom: 14, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {!selectedOffering ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <GraduationCap size={20} /> Talleres y Cursos
              </h2>
              <button style={btnPrimary} onClick={openCreateOffering} disabled={!profileId}>
                <Plus size={16} /> Nueva oferta
              </button>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: 'none', border: 'none',
                    color: tab === t.key ? C.accent : C.muted,
                    borderBottom: tab === t.key ? `2px solid ${C.accent}` : '2px solid transparent',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <OfferingList
              C={C}
              offerings={filtered}
              loading={loading}
              emptyMessage={
                tab === 'DRAFT' ? 'No tienes borradores. Crea tu primera oferta!'
                : tab === 'PUBLISHED' ? 'No tienes ofertas publicadas'
                : 'No tienes ofertas archivadas'
              }
              onEdit={openEditOffering}
              onOpen={openOffering}
              onTogglePublish={handleTogglePublish}
              onArchive={confirmArchive}
            />
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <button onClick={backToList} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>
                <ArrowLeft size={15} /> Mis ofertas
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...btnPrimary, background: 'transparent', border: `1px solid ${C.border}`, color: C.text }} onClick={() => openEditOffering(selectedOffering)}>
                  Editar datos basicos
                </button>
                {selectedOffering.status !== 'ARCHIVED' && (
                  <button style={btnPrimary} onClick={() => handleTogglePublish(selectedOffering)}>
                    {selectedOffering.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                  </button>
                )}
              </div>
            </div>

            <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>{selectedOffering.title}</h3>

            {modulesLoading ? (
              <p style={{ color: C.muted, fontSize: 14 }}>Cargando modulos...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {sortedModules.map((module, i) => {
                  const deleteDisabled = selectedOffering.status === 'PUBLISHED' && sortedModules.length <= 1;
                  return (
                    <div key={module.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                      background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button
                          aria-label="Mover arriba"
                          disabled={i === 0 || !!movingModuleId}
                          onClick={() => moveModule(module, 'up')}
                          style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? C.border : C.text, display: 'flex' }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          aria-label="Mover abajo"
                          disabled={i === sortedModules.length - 1 || !!movingModuleId}
                          onClick={() => moveModule(module, 'down')}
                          style={{ background: 'none', border: 'none', cursor: i === sortedModules.length - 1 ? 'default' : 'pointer', color: i === sortedModules.length - 1 ? C.border : C.text, display: 'flex' }}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <span style={{ fontSize: 18 }}>{MODULE_ICON[module.type]}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{module.title}</p>
                        {module.description && <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0' }}>{module.description}</p>}
                      </div>
                      <button aria-label="Editar modulo" onClick={() => openEditModule(module)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 7, cursor: 'pointer', display: 'flex', color: C.text }}>
                        <Pencil size={14} />
                      </button>
                      <button
                        title={deleteDisabled ? 'Despublica la oferta primero' : 'Eliminar'}
                        aria-label={deleteDisabled ? 'Despublica la oferta primero' : 'Eliminar modulo'}
                        disabled={deleteDisabled}
                        onClick={() => handleDeleteModule(module)}
                        style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 7, cursor: deleteDisabled ? 'default' : 'pointer', display: 'flex', color: deleteDisabled ? C.border : '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button style={{ ...btnPrimary, background: 'transparent', border: `1px solid ${C.border}`, color: C.text }} onClick={openCreateModule}>
              <Plus size={16} /> Agregar modulo
            </button>
          </>
        )}

        <OfferingFormModal
          C={C}
          isOpen={offeringModalOpen}
          mode={offeringModalMode}
          offering={editingOffering}
          profileId={profileId}
          onClose={() => setOfferingModalOpen(false)}
          onSubmit={handleOfferingSubmit}
        />

        {selectedOffering && (
          <ModuleFormModal
            C={C}
            isOpen={moduleModalOpen}
            mode={moduleModalMode}
            module={editingModule}
            offeringId={selectedOffering.id}
            onClose={() => setModuleModalOpen(false)}
            onCreate={handleCreateModule}
            onUpdate={handleUpdateModule}
          />
        )}

        {archiveTarget && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setArchiveTarget(null)} />
            <div style={{ position: 'relative', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, maxWidth: 380, width: '100%', padding: 20 }}>
              <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Archivar oferta</h3>
              <p style={{ color: C.muted, fontSize: 13, margin: '0 0 18px' }}>
                Esta accion es <strong>permanente y no se puede deshacer</strong>. "{archiveTarget.title}" dejara de ser visible y no podra publicarse de nuevo.
              </p>
              {archiveError && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 14px' }}>{archiveError}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setArchiveTarget(null)} style={{ padding: '8px 14px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button onClick={handleArchive} style={{ padding: '8px 14px', background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Archivar</button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </ProGate>
  );
}
