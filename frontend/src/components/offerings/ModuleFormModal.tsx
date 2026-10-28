import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useUpload } from '../../hooks/useUpload';
import QuestionnaireEditor from './QuestionnaireEditor';
import type { Module, CreateModuleData, UpdateModuleData } from '../../hooks/useOfferings';

interface Colors {
  text: string;
  muted: string;
  accent: string;
  accentLight: string;
  border: string;
  cardBg: string;
  isDark: boolean;
}

interface Props {
  C: Colors;
  isOpen: boolean;
  mode: 'create' | 'edit';
  module: Module | null;
  offeringId: string;
  onClose: () => void;
  onCreate: (data: CreateModuleData) => Promise<Module>;
  onUpdate: (moduleId: string, data: UpdateModuleData) => Promise<Module>;
}

type ModuleType = 'TEXT' | 'VIDEO' | 'PDF' | 'QUESTIONNAIRE';

const MODULE_TYPE_LABEL: Record<ModuleType, string> = {
  TEXT: 'Texto',
  VIDEO: 'Video',
  PDF: 'PDF',
  QUESTIONNAIRE: 'Cuestionario',
};

export default function ModuleFormModal({ C, isOpen, mode, module, offeringId, onClose, onCreate, onUpdate }: Props) {
  const { uploadVideo, uploadPdf, uploading, progress } = useUpload();

  const [type, setType] = useState<ModuleType>('TEXT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [textContent, setTextContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedModuleId, setSavedModuleId] = useState<string | null>(null);
  const typeRef = useRef(type);
  useEffect(() => { typeRef.current = type; }, [type]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && module) {
      setType(module.type);
      setTitle(module.title);
      setDescription(module.description || '');
      setTextContent(module.textContent || '');
      setFileUrl(module.fileUrl || '');
      setSavedModuleId(module.id);
    } else {
      setType('TEXT');
      setTitle('');
      setDescription('');
      setTextContent('');
      setFileUrl('');
      setSavedModuleId(null);
    }
    setFormError('');
  }, [isOpen, mode, module]);

  if (!isOpen) return null;

  // handleFileUpload captura `type` al momento de llamar (uploadType), y typeRef siempre
  // apunta al `type` mas reciente -- si el profesional cambia el tipo (VIDEO -> PDF, etc.)
  // mientras una subida sigue en vuelo, al resolver comparamos ambos: si ya no coinciden, la
  // subida se descarta en vez de guardar la URL de un archivo que ya no corresponde al tipo
  // actualmente seleccionado (sin esto, un PDF podia terminar guardado con la URL de un video).
  const handleFileUpload = async (file: File) => {
    const uploadType = type;
    const result = uploadType === 'VIDEO' ? await uploadVideo(file) : await uploadPdf(file);
    if (result && typeRef.current === uploadType) setFileUrl(result.url);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (title.trim().length < 2) {
      setFormError('El titulo debe tener al menos 2 caracteres');
      return;
    }
    if (type === 'TEXT' && !textContent.trim()) {
      setFormError('Un modulo de texto requiere contenido');
      return;
    }
    if ((type === 'VIDEO' || type === 'PDF') && !fileUrl) {
      setFormError(`Un modulo de ${type === 'VIDEO' ? 'video' : 'PDF'} requiere subir un archivo`);
      return;
    }

    setSubmitting(true);
    try {
      // La rama se decide por `savedModuleId`, NO por `mode`: en modo "create", la PRIMERA
      // vez que se guarda crea el modulo (sin savedModuleId todavia); si el tipo es
      // QUESTIONNAIRE el modal se queda abierto despues para agregar preguntas/reglas, y
      // cualquier guardado posterior en esa misma sesion (ej. corregir el titulo) ya debe
      // actualizar ese mismo modulo en vez de intentar crear uno nuevo. En modo "edit",
      // savedModuleId ya viene prellenado desde el useEffect de arriba, asi que esta misma
      // rama de actualizar se usa desde el primer guardado.
      if (!savedModuleId) {
        const data: CreateModuleData = {
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          textContent: type === 'TEXT' ? textContent.trim() : undefined,
          fileUrl: type === 'VIDEO' || type === 'PDF' ? fileUrl : undefined,
        };
        const created = await onCreate(data);
        setSavedModuleId(created.id);
        if (type !== 'QUESTIONNAIRE') onClose();
      } else {
        const data: UpdateModuleData = {
          title: title.trim(),
          description: description.trim() || '',
          textContent: type === 'TEXT' ? textContent.trim() : undefined,
          fileUrl: type === 'VIDEO' || type === 'PDF' ? fileUrl : undefined,
        };
        await onUpdate(savedModuleId, data);
        if (type !== 'QUESTIONNAIRE') onClose();
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const inp: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, width: '100%', boxSizing: 'border-box',
    background: C.isDark ? 'rgba(255,255,255,0.06)' : 'white',
    border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase',
    letterSpacing: '0.5px', display: 'block', marginBottom: 5, marginTop: 14,
  };
  const btnPrimary: React.CSSProperties = {
    padding: '10px 18px', background: C.accent, border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };
  const btnSecondary: React.CSSProperties = {
    padding: '10px 18px', background: 'transparent', border: `1px solid ${C.border}`,
    borderRadius: 10, color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };

  // true una vez que el modulo ya existe en el servidor (recien creado en esta sesion, o
  // abierto en mode="edit") Y su tipo es QUESTIONNAIRE -- en ese momento se muestra el editor
  // de preguntas/reglas debajo del formulario. El boton Guardar sigue funcionando normalmente
  // en todo momento (ver handleSubmit), asi que Titulo/Descripcion nunca necesitan bloquearse.
  const showQuestionnaireEditor = type === 'QUESTIONNAIRE' && !!savedModuleId;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
            {mode === 'create' ? 'Nuevo modulo' : 'Editar modulo'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <label style={lbl}>Tipo</label>
        {mode === 'create' ? (
          <select style={inp} value={type} onChange={(e) => { setType(e.target.value as ModuleType); setFileUrl(''); }}>
            <option value="TEXT">Texto</option>
            <option value="VIDEO">Video</option>
            <option value="PDF">PDF</option>
            <option value="QUESTIONNAIRE">Cuestionario</option>
          </select>
        ) : (
          <input style={{ ...inp, opacity: 0.6 }} value={MODULE_TYPE_LABEL[type]} disabled />
        )}

        <label style={lbl}>Titulo</label>
        <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del modulo" />

        <label style={lbl}>Descripcion</label>
        <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />

        {type === 'TEXT' && (
          <>
            <label style={lbl}>Contenido</label>
            <textarea style={{ ...inp, minHeight: 140, resize: 'vertical' }} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Texto que vera el comprador" />
          </>
        )}

        {(type === 'VIDEO' || type === 'PDF') && (
          <>
            <label style={lbl}>Archivo ({type === 'VIDEO' ? 'video' : 'PDF'})</label>
            <input
              type="file"
              accept={type === 'VIDEO' ? 'video/*' : 'application/pdf'}
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            {uploading && <p style={{ fontSize: 12, color: C.muted, margin: '4px 0' }}>Subiendo... {progress}%</p>}
            {fileUrl && !uploading && <p style={{ fontSize: 12, color: C.accent, margin: '4px 0' }}>Archivo listo ✓</p>}
          </>
        )}

        {formError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{formError}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button style={{ ...btnSecondary, opacity: submitting ? 0.6 : 1 }} onClick={onClose} disabled={submitting}>{savedModuleId ? 'Cerrar' : 'Cancelar'}</button>
          <button style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : savedModuleId ? 'Guardar cambios' : 'Crear modulo'}
          </button>
        </div>

        {showQuestionnaireEditor && (
          <QuestionnaireEditor key={savedModuleId} C={C} offeringId={offeringId} moduleId={savedModuleId!} />
        )}
      </div>
    </div>,
    document.body
  );
}
