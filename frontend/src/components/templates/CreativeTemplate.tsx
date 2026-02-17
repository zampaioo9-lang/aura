import { Clock } from 'lucide-react';
import { formatPrice, formatDuration } from '../../lib/utils';
import AvailabilitySummary from '../availability/AvailabilitySummary';

interface TemplateProps {
  profile: any;
  onBook: (serviceId: string) => void;
}

export default function CreativeTemplate({ profile, onBook }: TemplateProps) {
  const activeServices = (profile.services || []).filter((s: any) => s.isActive !== false);
  const visibleServices = activeServices.slice(0, 6);
  const hasMore = activeServices.length > 6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-10">
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 text-center border border-purple-200/50">
          {profile.avatar && (
            <img src={profile.avatar} alt={profile.title}
              className="w-28 h-28 rounded-3xl mx-auto mb-5 object-cover shadow-lg shadow-purple-200" />
          )}
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
            {profile.title}
          </h1>
          <p className="text-purple-500 font-medium">{profile.profession}</p>
          {profile.bio && (
            <p className="mt-4 text-slate-600 max-w-lg mx-auto">{profile.bio}</p>
          )}

          {profile.videoUrl && (
            <div className="mt-6 max-w-md mx-auto">
              <video src={profile.videoUrl} controls className="w-full rounded-2xl shadow-lg shadow-purple-200" />
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      {visibleServices.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 pb-16">
          <h2 className="text-xl font-bold text-purple-700 mb-5">Mis Servicios</h2>
          <div className="space-y-4">
            {visibleServices.map((s: any) => (
              <div key={s.id} className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl overflow-hidden">
                {s.image && (
                  <img src={s.image} alt={s.name} className="w-full h-44 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{s.name}</h4>
                    <span className="font-bold text-lg text-purple-700">{formatPrice(s.price, s.currency)}</span>
                  </div>
                  {s.description && <p className="text-sm text-slate-500 mb-3">{s.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMinutes)}
                    </span>
                    <button onClick={() => onBook(s.id)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-all">
                      Reservar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <p className="text-center text-sm text-purple-400 mt-4">
              Y {activeServices.length - 6} servicios mas...
            </p>
          )}
        </div>
      )}

      {profile.availabilitySlots?.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 pb-16">
          <AvailabilitySummary
            slots={profile.availabilitySlots}
            className="text-slate-700"
          />
        </div>
      )}
    </div>
  );
}
