import ServiceCard from './ServiceCard';
import type { Service } from '../hooks/useServices';

interface ServiceListProps {
  services: Service[];
  loading: boolean;
  emptyMessage?: string;
  showActions?: boolean;
  onEdit?: (service: Service) => void;
  onDelete?: (service: Service) => void;
  onToggle?: (service: Service) => void;
  onBook?: (serviceId: string) => void;
  variant?: 'default' | 'public';
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-5 bg-slate-200 rounded w-40" />
        <div className="h-5 bg-slate-200 rounded w-16" />
      </div>
      <div className="h-4 bg-slate-100 rounded w-full mb-2" />
      <div className="h-4 bg-slate-100 rounded w-2/3 mb-3" />
      <div className="flex justify-between">
        <div className="h-4 bg-slate-100 rounded w-20" />
        <div className="h-8 bg-slate-100 rounded w-24" />
      </div>
    </div>
  );
}

export default function ServiceList({
  services, loading, emptyMessage = 'No hay servicios', showActions, onEdit, onDelete, onToggle, onBook, variant = 'default',
}: ServiceListProps) {
  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {services.map(service => (
        <ServiceCard
          key={service.id}
          service={service}
          showActions={showActions}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onBook={onBook}
          variant={variant}
        />
      ))}
    </div>
  );
}
