// frontend/src/components/landing/CylindricalDrum.tsx
// TODO: Replace first 3 professionals with real DB entries

interface Props { scrollProgress: number; }

interface Professional {
  name: string;
  specialty: string;
  location: string;
  rating: number;
  initials: string;
  color: string;
}

type DrumItem = { type: 'comparison' } | { type: 'professional'; data: Professional };

const PROFESSIONALS: Professional[] = [
  { name: 'Dra. Sofía Ramírez',    specialty: 'Ansiedad · TCC',           location: 'Ciudad de México', rating: 4.9, initials: 'SR', color: '#2dd4bf' },
  { name: 'Psic. Marcos López',    specialty: 'Terapia de Pareja',         location: 'Monterrey',        rating: 4.8, initials: 'ML', color: '#7c3aed' },
  { name: 'Dra. Valentina Castro', specialty: 'Trauma · EMDR',             location: 'Bogotá',           rating: 5.0, initials: 'VC', color: '#0d9488' },
  { name: 'Psic. Alejandro Ríos',  specialty: 'Estrés · Burnout',          location: 'Buenos Aires',     rating: 4.7, initials: 'AR', color: '#6366f1' },
  { name: 'Dra. Isabella Morales', specialty: 'Psicología Infantil',       location: 'Guadalajara',      rating: 4.9, initials: 'IM', color: '#f59e0b' },
  { name: 'Psic. Diego Herrera',   specialty: 'Neuropsicología',           location: 'Lima',             rating: 4.8, initials: 'DH', color: '#10b981' },
  { name: 'Dra. Camila Torres',    specialty: 'Desarrollo Personal',       location: 'Santiago',         rating: 4.9, initials: 'CT', color: '#ec4899' },
  { name: 'Psic. Rodrigo Salinas', specialty: 'Mindfulness · Meditación',  location: 'Ciudad de México', rating: 5.0, initials: 'RS', color: '#3b82f6' },
];

const BEFORE = [
  'Búsqueda en Google sin filtros',
  'Sin saber si está verificado',
  'Agenda por teléfono o WhatsApp',
  'Precios ocultos, sin reseñas',
];

const AFTER = [
  'Encuentra en minutos con filtros',
  'Perfiles 100% verificados',
  'Reserva online en 2 clics',
  'Precios claros y reseñas reales',
];

const ITEMS: DrumItem[] = [
  { type: 'comparison' },
  ...PROFESSIONALS.map((data): DrumItem => ({ type: 'professional', data })),
];

const LINE_H = 90;
const R      = 240;
const c01 = (v: number) => Math.max(0, Math.min(1, v));

export default function CylindricalDrum({ scrollProgress }: Props) {
  const targetIndex = c01((scrollProgress - 0.92) / 0.60) * (ITEMS.length - 1);

  return (
    <div
      className="hidden sm:flex absolute inset-y-0 left-0 w-full sm:w-[65%] md:w-[60%] z-30 flex-col items-start justify-center pointer-events-none select-none pl-10 sm:pl-20 md:pl-32 pr-4 py-16"
      style={{ perspective: '1200px', perspectiveOrigin: '30% 50%' }}
    >
      <div
        className="relative w-full h-[85vh] flex flex-col justify-center items-start overflow-visible"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {ITEMS.map((item, idx) => {
          const diff     = idx - targetIndex;
          const ty       = diff * LINE_H;
          const angleRad = ty / R;
          const angleDeg = angleRad * (180 / Math.PI);
          const tz       = Math.cos(angleRad) * R - R;
          const scale    = 0.5 + Math.cos(angleRad) * 0.5;
          const opacity  = Math.max(0, (Math.cos(angleRad) - 0.15) / 0.85);
          const blurAmt  = Math.min(6, Math.max(0, (Math.abs(diff) - 1.5) * 1.5));

          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            width: '100%',
            maxWidth: 540,
            transform: `translateY(${ty}px) translateZ(${tz}px) rotateX(${-angleDeg * 0.8}deg) scale(${scale})`,
            transformOrigin: 'left center',
            opacity,
            filter: blurAmt > 0.1 ? `blur(${blurAmt}px)` : undefined,
          };

          if (item.type === 'comparison') {
            return (
              <div key="comparison" style={{ ...baseStyle, marginTop: -48 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 20,
                  padding: '16px 18px',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Sin Aliax */}
                    <div>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Sin Aliax
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {BEFORE.map((text, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                            <span style={{ color: '#f87171', fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>✕</span>
                            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Con Aliax */}
                    <div>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 700, color: '#2dd4bf', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Con Aliax ✓
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {AFTER.map((text, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                            <span style={{ color: '#2dd4bf', fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, color: '#fff', lineHeight: 1.4 }}>{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const pro = item.data;
          return (
            <div key={idx} style={baseStyle}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 20, padding: '12px 16px',
                border: '1px solid rgba(255,255,255,0.09)',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: pro.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 15,
                  color: '#0a1f2e', position: 'relative',
                }}>
                  {pro.initials}
                  <div style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#22c55e', border: '2px solid #0f0a1a',
                  }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{pro.name}</p>
                    <span style={{ color: '#2dd4bf', fontSize: 12 }}>✓</span>
                  </div>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#2dd4bf', margin: '3px 0 0', lineHeight: 1, whiteSpace: 'nowrap' }}>{pro.specialty}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, whiteSpace: 'nowrap' }}>{pro.location}</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#fff', fontWeight: 600, margin: '3px 0 0' }}>★ {pro.rating}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
