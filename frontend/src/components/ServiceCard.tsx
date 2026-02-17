import { Clock, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import { formatPrice, formatDuration } from '../lib/utils';
import type { Service } from '../hooks/useServices';

interface ServiceCardProps {
  service: Service;
  showActions?: boolean;
  onEdit?: (service: Service) => void;
  onDelete?: (service: Service) => void;
  onToggle?: (service: Service) => void;
  onBook?: (serviceId: string) => void;
  variant?: 'default' | 'public';
}

export default function ServiceCard({
  service, showActions = false, onEdit, onDelete, onToggle, onBook, variant = 'default',
}: ServiceCardProps) {
  return (
    <div className={`bg-white rounded-xl border transition-all hover:shadow-md overflow-hidden ${
      !service.isActive ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {service.image && (
        <img src={service.image} alt={service.name} className="w-full h-40 object-cover" />
      )}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 truncate">{service.name}</h4>
            {!service.isActive && (
              <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] rounded-full mt-1">
                Inactivo
              </span>
            )}
          </div>
          <span className="text-lg font-bold text-indigo-600 ml-3 flex-shrink-0">
            {formatPrice(service.price, service.currency)}
          </span>
        </div>

        {/* Description */}
        {service.description && (
          <p className="text-sm text-slate-500 mb-3 line-clamp-2">{service.description}</p>
        )}

        {/* Duration + Actions */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(service.durationMinutes)}
          </span>

          {showActions && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggle?.(service)}
                title={service.isActive ? 'Desactivar' : 'Activar'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                aria-label={service.isActive ? 'Desactivar servicio' : 'Activar servicio'}
              >
                {service.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              </button>
              <button
                onClick={() => onEdit?.(service)}
                title="Editar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                aria-label="Editar servicio"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete?.(service)}
                title="Eliminar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Eliminar servicio"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {onBook && variant === 'public' && service.isActive && (
            <button
              onClick={() => onBook(service.id)}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Reservar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
