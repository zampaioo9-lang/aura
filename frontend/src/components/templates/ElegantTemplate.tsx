import { Clock } from 'lucide-react';
import { formatPrice, formatDuration } from '../../lib/utils';
import AvailabilitySummary from '../availability/AvailabilitySummary';

interface TemplateProps {
  profile: any;
  onBook: (serviceId: string) => void;
}

export default function ElegantTemplate({ profile, onBook }: TemplateProps) {
  const activeServices = (profile.services || []).filter((s: any) => s.isActive !== false);
  const visibleServices = activeServices.slice(0, 6);
  const hasMore = activeServices.length > 6;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-amber-200">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          {profile.avatar && (
            <img src={profile.avatar} alt={profile.title}
              className="w-24 h-24 rounded-full mx-auto mb-6 object-cover ring-2 ring-amber-300 ring-offset-4" />
          )}
          <h1 className="text-3xl font-serif text-stone-800 mb-1">{profile.title}</h1>
          <p className="text-amber-700 font-medium tracking-wide text-sm uppercase">{profile.profession}</p>
          {profile.bio && (
            <p className="mt-6 text-stone-600 max-w-lg mx-auto leading-relaxed font-light">{profile.bio}</p>
          )}

          {profile.videoUrl && (
            <div className="mt-8 max-w-md mx-auto">
              <video src={profile.videoUrl} controls className="w-full rounded-xl ring-1 ring-amber-200" />
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      {visibleServices.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h2 className="text-center text-sm uppercase tracking-[0.2em] text-amber-700 font-medium mb-8">Servicios</h2>
          <div className="space-y-4">
            {visibleServices.map((s: any) => (
              <div key={s.id} className="bg-white border border-amber-200 rounded-lg overflow-hidden">
                {s.image && (
                  <img src={s.image} alt={s.name} className="w-full h-40 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-stone-800">{s.name}</h4>
                    <span className="font-bold text-lg text-stone-800">{formatPrice(s.price, s.currency)}</span>
                  </div>
                  {s.description && <p className="text-sm text-stone-500 mb-3">{s.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMinutes)}
                    </span>
                    <button onClick={() => onBook(s.id)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors">
                      Reservar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <p className="text-center text-sm text-stone-400 mt-4">
              Y {activeServices.length - 6} servicios mas...
            </p>
          )}
        </div>
      )}

      {profile.availabilitySlots?.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 pb-12">
          <AvailabilitySummary
            slots={profile.availabilitySlots}
            className="text-stone-700"
          />
        </div>
      )}
    </div>
  );
}
