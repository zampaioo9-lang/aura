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

const TAB_BAR_H = 72;

export default function ServiceFormModal({ isOpen, onClose, service, mode, onSubmit, loading }: ServiceFormModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true"
      style={{ paddingBottom: `calc(${TAB_BAR_H}px + env(safe-area-inset-bottom, 0px))` }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl animate-slide-in overflow-hidden"
        style={{
          boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
          borderRadius: '20px 20px 0 0',
          maxHeight: `calc(100dvh - ${TAB_BAR_H}px - env(safe-area-inset-bottom, 0px) - 24px)`,
          display: 'flex', flexDirection: 'column',
        }}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-900">
            {mode === 'create' ? 'Nuevo Servicio' : 'Editar Servicio'}
          </h3>
          <button onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="p-5">
            <ServiceForm onSubmit={onSubmit} initialData={service} mode={mode} loading={loading} onCancel={onClose} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
