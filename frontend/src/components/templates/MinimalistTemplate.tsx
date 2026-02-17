import { Clock } from 'lucide-react';
import { formatPrice, formatDuration } from '../../lib/utils';
import AvailabilitySummary from '../availability/AvailabilitySummary';

interface TemplateProps {
  profile: any;
  onBook: (serviceId: string) => void;
}

export default function MinimalistTemplate({ profile, onBook }: TemplateProps) {
  const activeServices = (profile.services || []).filter((s: any) => s.isActive !== false);
  const visibleServices = activeServices.slice(0, 6);
  const hasMore = activeServices.length > 6;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          {profile.avatar && (
            <img src={profile.avatar} alt={profile.title}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
          )}
          <h1 className="text-3xl font-light text-slate-900 mb-1">{profile.title}</h1>
          <p className="text-slate-500">{profile.profession}</p>
          {profile.bio && (
            <p className="mt-4 text-slate-600 max-w-lg mx-auto leading-relaxed">{profile.bio}</p>
          )}

          {profile.videoUrl && (
            <div className="mt-6 max-w-md mx-auto">
              <video src={profile.videoUrl} controls className="w-full rounded-lg" />
            </div>
          )}
        </div>

        {/* Services */}
        {visibleServices.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-slate-900 mb-4">Servicios</h2>
            <div className="space-y-3">
              {visibleServices.map((s: any) => (
                <div key={s.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {s.image && (
                    <img src={s.image} alt={s.name} className="w-full h-40 object-cover" />
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{s.name}</h4>
                      <span className="font-bold text-lg text-slate-900">{formatPrice(s.price, s.currency)}</span>
                    </div>
                    {s.description && <p className="text-sm text-slate-500 mb-3">{s.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMinutes)}
                      </span>
                      <button onClick={() => onBook(s.id)}
                        className="px-4 py-1.5 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                        Reservar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <p className="text-center text-sm text-slate-400 mt-4">
                Y {activeServices.length - 6} servicios mas...
              </p>
            )}
          </div>
        )}

        {profile.availabilitySlots?.length > 0 && (
          <AvailabilitySummary
            slots={profile.availabilitySlots}
            className="mt-10 text-slate-700"
          />
        )}
      </div>
    </div>
  );
}
