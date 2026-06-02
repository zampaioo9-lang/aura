import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ServiceForm from './ServiceForm';
import type { Service } from '../hooks/useServices';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
  mode: 'create' | 'edit';
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export default function ServiceFormModal({ isOpen, onClose, service, mode, onSubmit, loading }: ServiceFormModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Modal — stops 80px above viewport bottom (tab bar = 72px) */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 80,
          zIndex: 9999,
          maxHeight: 'calc(100svh - 100px)',
          borderRadius: '20px 20px 0 0',
          background: 'white',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
            {mode === 'create' ? 'Nuevo Servicio' : 'Editar Servicio'}
          </h3>
          <button
            onClick={onClose}
            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <ServiceForm
            onSubmit={onSubmit}
            initialData={service}
            mode={mode}
            loading={loading}
            onCancel={onClose}
          />
        </div>
      </div>
    </>,
    document.body
  );
}
