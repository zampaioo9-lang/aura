import { useEffect } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
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
        <div className="p-5">
          <ServiceForm
            onSubmit={onSubmit}
            initialData={service}
            mode={mode}
            loading={loading}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
