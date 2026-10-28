import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import CustomDatePicker from '../CustomDatePicker';
import { useUpload } from '../../hooks/useUpload';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import type { Offering, CreateOfferingData, UpdateOfferingData } from '../../hooks/useOfferings';

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
  offering: Offering | null;
  profileId: string;
  onClose: () => void;
  onSubmit: (data: CreateOfferingData | UpdateOfferingData) => Promise<void>;
}

function splitScheduledAt(scheduledAt: string | null): { date: string; time: string } {
  if (!scheduledAt) return { date: '', time: '' };
  const d = new Date(scheduledAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

export default function OfferingFormModal({ C, isOpen, mode, offering, profileId, onClose, onSubmit }: Props) {
  const { uploadImage, uploading, progress } = useUpload();
  const { rate: exchangeRate } = useExchangeRate();

  const [type, setType] = useState<'LIVE_WORKSHOP' | 'RECORDED_COURSE'>('RECORDED_COURSE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [priceMXN, setPriceMXN] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && offering) {
      setType(offering.type);
      setTitle(offering.title);
      setDescription(offering.description || '');
      setPriceUSD(offering.priceUSD);
      setPriceMXN(offering.priceMXN || '');
      setCoverImage(offering.coverImage || '');
      const { date, time } = splitScheduledAt(offering.scheduledAt);
      setScheduledDate(date);
      setScheduledTime(time);
      setCapacity(offering.capacity != null ? String(offering.capacity) : '');
      setExternalLink(offering.externalLink || '');
    } else {
      setType('RECORDED_COURSE');
      setTitle('');
      setDescription('');
      setPriceUSD('');
      setPriceMXN('');
      setCoverImage('');
      setScheduledDate('');
      setScheduledTime('');
      setCapacity('');
      setExternalLink('');
    }
    setFormError('');
  }, [isOpen, mode, offering]);

  if (!isOpen) return null;

  const handleCoverUpload = async (file: File) => {
    const result = await uploadImage(file);
    if (result) setCoverImage(result.url);
  };

  // Al escribir el precio en MXN, recalcula USD con el tipo de cambio del dia (si ya cargo).
  // El campo USD se queda editable despues -- esto solo lo rellena como punto de partida,
  // no bloquea que el profesional lo ajuste a mano (ej. redondear a $49 en vez de $48.72).
  const handlePriceMXNChange = (value: string) => {
    setPriceMXN(value);
    if (exchangeRate && value) {
      const mxnNum = Number(value);
      if (!Number.isNaN(mxnNum)) {
        setPriceUSD((mxnNum / exchangeRate).toFixed(2));
      }
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!title.trim() || title.trim().length < 3) {
      setFormError('El titulo debe tener al menos 3 caracteres');
      return;
    }
    const priceNum = Number(priceUSD);
    // Limites espejo de createOfferingSchema/updateOfferingSchema (backend/src/utils/validation.ts):
    // sin esto, un valor fuera de rango pasa esta validacion, viaja al backend, y vuelve como
    // el {error: "Datos invalidos"} generico del ZodError (ver errorHandler.ts) -- el mensaje
    // especifico solo vive en `details`, que useOfferings.errorMessage() no lee. Validar aqui
    // evita ese viaje redondo sin feedback util.
    if (!priceUSD || Number.isNaN(priceNum) || priceNum < 0 || priceNum > 10000) {
      setFormError('El precio USD debe ser un numero entre 0 y 10,000');
      return;
    }
    if (priceMXN) {
      const priceMXNNum = Number(priceMXN);
      if (Number.isNaN(priceMXNNum) || priceMXNNum < 0 || priceMXNNum > 200000) {
        setFormError('El precio MXN debe ser un numero entre 0 y 200,000');
        return;
      }
    }
    let scheduledAtIso: string | undefined;
    if (type === 'LIVE_WORKSHOP') {
      if (!scheduledDate || !scheduledTime) {
        setFormError('Un taller en vivo requiere fecha y hora');
        return;
      }
      if (!externalLink.trim()) {
        setFormError('Un taller en vivo requiere un enlace externo');
        return;
      }
      if (capacity) {
        const capacityNum = Number(capacity);
        if (Number.isNaN(capacityNum) || capacityNum < 1 || capacityNum > 1000) {
          setFormError('El cupo debe ser un numero entre 1 y 1,000');
          return;
        }
      }
      scheduledAtIso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        const data: CreateOfferingData = {
          profileId,
          type,
          title: title.trim(),
          priceUSD: priceNum,
          description: description.trim() || undefined,
          coverImage: coverImage || undefined,
          priceMXN: priceMXN ? Number(priceMXN) : undefined,
          scheduledAt: scheduledAtIso,
          capacity: capacity ? Number(capacity) : undefined,
          externalLink: type === 'LIVE_WORKSHOP' ? externalLink.trim() : undefined,
        };
        await onSubmit(data);
      } else {
        const data: UpdateOfferingData = {
          title: title.trim(),
          priceUSD: priceNum,
          description: description.trim() || '',
          coverImage: coverImage || '',
          priceMXN: priceMXN ? Number(priceMXN) : null,
          scheduledAt: scheduledAtIso ?? null,
          capacity: capacity ? Number(capacity) : null,
          externalLink: type === 'LIVE_WORKSHOP' ? externalLink.trim() : null,
        };
        await onSubmit(data);
      }
      onClose();
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
            {mode === 'create' ? 'Nueva oferta' : 'Editar datos basicos'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <label style={lbl}>Tipo</label>
        {mode === 'create' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setType('RECORDED_COURSE')}
              style={{ ...btnSecondary, flex: 1, background: type === 'RECORDED_COURSE' ? C.accentLight : 'transparent', borderColor: type === 'RECORDED_COURSE' ? C.accent : C.border }}
            >
              Curso grabado
            </button>
            <button
              onClick={() => setType('LIVE_WORKSHOP')}
              style={{ ...btnSecondary, flex: 1, background: type === 'LIVE_WORKSHOP' ? C.accentLight : 'transparent', borderColor: type === 'LIVE_WORKSHOP' ? C.accent : C.border }}
            >
              Taller en vivo
            </button>
          </div>
        ) : (
          <input style={{ ...inp, opacity: 0.6 }} value={type === 'LIVE_WORKSHOP' ? 'Taller en vivo' : 'Curso grabado'} disabled />
        )}

        <label style={lbl}>Titulo</label>
        <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la oferta" />

        <label style={lbl}>Descripcion</label>
        <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Precio USD</label>
            <input style={inp} type="number" min={0} max={10000} value={priceUSD} onChange={(e) => setPriceUSD(e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Precio MXN (opcional)</label>
            <input style={inp} type="number" min={0} max={200000} value={priceMXN} onChange={(e) => handlePriceMXNChange(e.target.value)} placeholder="0" />
          </div>
        </div>
        {exchangeRate && (
          <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>
            Al escribir el precio en MXN, el precio USD se calcula automaticamente (1 USD ≈ ${exchangeRate.toFixed(2)} MXN). Puedes ajustarlo despues.
          </p>
        )}

        <label style={lbl}>Imagen de portada (opcional)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
        />
        {uploading && <p style={{ fontSize: 12, color: C.muted, margin: '4px 0' }}>Subiendo... {progress}%</p>}
        {coverImage && !uploading && (
          <img src={coverImage} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 6 }} />
        )}

        {type === 'LIVE_WORKSHOP' && (
          <>
            <label style={lbl}>Fecha y hora</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <CustomDatePicker value={scheduledDate} onChange={setScheduledDate} accent={C.accent} isDark={C.isDark} style={{ flex: 1 }} />
              <input style={{ ...inp, flex: 1 }} type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </div>

            <label style={lbl}>Cupo (opcional)</label>
            <input style={inp} type="number" min={1} max={1000} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Sin limite" />

            <label style={lbl}>Enlace externo (Zoom, Meet, etc.)</label>
            <input style={inp} value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://..." />
          </>
        )}

        {formError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{formError}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button style={{ ...btnSecondary, opacity: submitting ? 0.6 : 1 }} onClick={onClose} disabled={submitting}>Cancelar</button>
          <button style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : mode === 'create' ? 'Crear oferta' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
