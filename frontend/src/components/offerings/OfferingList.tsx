import { Pencil, Eye, EyeOff, Archive } from 'lucide-react';
import type { Offering } from '../../hooks/useOfferings';

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
  offerings: Offering[];
  loading: boolean;
  emptyMessage: string;
  onEdit: (offering: Offering) => void;
  onOpen: (offering: Offering) => void;
  onTogglePublish: (offering: Offering) => void;
  onArchive: (offering: Offering) => void;
}

const STATUS_LABEL: Record<Offering['status'], string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  ARCHIVED: 'Archivada',
};

const STATUS_COLOR: Record<Offering['status'], string> = {
  DRAFT: '#f59e0b',
  PUBLISHED: '#22c55e',
  ARCHIVED: '#6b7280',
};

export default function OfferingList({ C, offerings, loading, emptyMessage, onEdit, onOpen, onTogglePublish, onArchive }: Props) {
  if (loading) {
    return <p style={{ color: C.muted, fontSize: 14, padding: 20, textAlign: 'center' }}>Cargando...</p>;
  }
  if (offerings.length === 0) {
    return <p style={{ color: C.muted, fontSize: 14, padding: 20, textAlign: 'center' }}>{emptyMessage}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {offerings.map((offering) => (
        <div
          key={offering.id}
          style={{
            background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}
        >
          <div onClick={() => onOpen(offering)} style={{ flex: 1, minWidth: 180, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: STATUS_COLOR[offering.status],
                background: `${STATUS_COLOR[offering.status]}22`, borderRadius: 6, padding: '2px 7px',
                textTransform: 'uppercase',
              }}>
                {STATUS_LABEL[offering.status]}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>
                {offering.type === 'LIVE_WORKSHOP' ? 'Taller en vivo' : 'Curso grabado'}
              </span>
            </div>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{offering.title}</p>
            <p style={{ color: C.muted, fontSize: 12, margin: '4px 0 0' }}>
              ${offering.priceUSD} USD · {offering._count.modules} modulo{offering._count.modules === 1 ? '' : 's'} · {offering._count.purchases} compra{offering._count.purchases === 1 ? '' : 's'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              title="Editar datos basicos"
              onClick={() => onEdit(offering)}
              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', color: C.text }}
            >
              <Pencil size={15} />
            </button>
            {offering.status !== 'ARCHIVED' && (
              <button
                title={offering.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                onClick={() => onTogglePublish(offering)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', color: C.text }}
              >
                {offering.status === 'PUBLISHED' ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            )}
            {offering.status !== 'ARCHIVED' && (
              <button
                title="Archivar"
                onClick={() => onArchive(offering)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', color: '#ef4444' }}
              >
                <Archive size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
