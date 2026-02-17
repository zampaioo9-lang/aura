import { Clock } from 'lucide-react';
import { formatPrice, formatDuration } from '../../lib/utils';
import AvailabilitySummary from '../availability/AvailabilitySummary';

interface TemplateProps {
  profile: any;
  onBook: (serviceId: string) => void;
}

export default function BoldTemplate({ profile, onBook }: TemplateProps) {
  const activeServices = (profile.services || []).filter((s: any) => s.isActive !== false);
  const visibleServices = activeServices.slice(0, 6);
  const hasMore = activeServices.length > 6;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {profile.coverImage && (
          <div className="absolute inset-0">
            <img src={profile.coverImage} alt="" className="w-full h-full object-cover opacity-30" />
          </div>
        )}
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          {profile.avatar && (
            <img src={profile.avatar} alt={profile.title}
              className="w-28 h-28 rounded-2xl mx-auto mb-6 object-cover border-4 border-yellow-400" />
          )}
          <h1 className="text-5xl font-black mb-2 tracking-tight">{profile.title}</h1>
          <p className="text-yellow-400 text-xl font-bold uppercase tracking-wide">{profile.profession}</p>
          {profile.bio && (
            <p className="mt-6 text-slate-300 max-w-xl mx-auto text-lg">{profile.bio}</p>
          )}

          {profile.videoUrl && (
            <div className="mt-8 max-w-lg mx-auto">
              <video src={profile.videoUrl} controls className="w-full rounded-xl border-2 border-yellow-400/30" />
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      {visibleServices.length > 0 && (
        <div className="max-w-3xl mx-auto px-6 pb-20">
          <h2 className="text-2xl font-black mb-6 text-yellow-400">SERVICIOS</h2>
          <div className="space-y-4">
            {visibleServices.map((s: any) => (
              <div key={s.id} className="bg-slate-800 rounded-2xl overflow-hidden">
                {s.image && (
                  <img src={s.image} alt={s.name} className="w-full h-44 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{s.name}</h4>
                    <span className="font-bold text-lg">{formatPrice(s.price, s.currency)}</span>
                  </div>
                  {s.description && <p className="text-sm text-slate-300 mb-3">{s.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {formatDuration(s.durationMinutes)}
                    </span>
                    <button onClick={() => onBook(s.id)}
                      className="px-4 py-1.5 text-sm font-bold rounded-lg bg-yellow-400 text-slate-900 hover:bg-yellow-300 transition-colors">
                      Reservar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <p className="text-center text-sm text-slate-500 mt-4">
              Y {activeServices.length - 6} servicios mas...
            </p>
          )}

        </div>
      )}

      {profile.availabilitySlots?.length > 0 && (
        <div className="max-w-3xl mx-auto px-6 pb-20">
          <AvailabilitySummary
            slots={profile.availabilitySlots}
            className="text-slate-300"
          />
        </div>
      )}
    </div>
  );
}
