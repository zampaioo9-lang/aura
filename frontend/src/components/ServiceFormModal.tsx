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
  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      style={{ paddingBottom: 'max(80px, env(safe-area-inset-bottom, 80px))' }}
      role="dialog" aria-modal="true"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl animate-slide-in overflow-hidden"
        style={{
          boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
          maxHeight: 'calc(100dvh - 90px)',
          borderRadius: '20px 20px 0 0',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-900">
            {mode === 'create' ? 'Nuevo Servicio' : 'Editar Servicio'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <ServiceForm
            onSubmit={onSubmit}
            initialData={service}
            mode={mode}
            loading={loading}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
