import { useState, useEffect } from 'react';

interface Props { scrollProgress: number; }

interface Professional {
  name: string; specialty: string; location: string;
  rating: number; initials: string; color: string;
}

type DrumItem = { type: 'comparison' } | { type: 'professional'; data: Professional };

const PROFESSIONALS: Professional[] = [
  { name: 'Dra. Sofía Ramírez',    specialty: 'Ansiedad · TCC',          location: 'Ciudad de México', rating: 4.9, initials: 'SR', color: '#2dd4bf' },
  { name: 'Psic. Marcos López',    specialty: 'Terapia de Pareja',        location: 'Monterrey',        rating: 4.8, initials: 'ML', color: '#7c3aed' },
  { name: 'Dra. Valentina Castro', specialty: 'Trauma · EMDR',            location: 'Bogotá',           rating: 5.0, initials: 'VC', color: '#0d9488' },
  { name: 'Psic. Alejandro Ríos',  specialty: 'Estrés · Burnout',         location: 'Buenos Aires',     rating: 4.7, initials: 'AR', color: '#6366f1' },
  { name: 'Dra. Isabella Morales', specialty: 'Psicología Infantil',      location: 'Guadalajara',      rating: 4.9, initials: 'IM', color: '#f59e0b' },
  { name: 'Psic. Diego Herrera',   specialty: 'Neuropsicología',          location: 'Lima',             rating: 4.8, initials: 'DH', color: '#10b981' },
  { name: 'Dra. Camila Torres',    specialty: 'Desarrollo Personal',      location: 'Santiago',         rating: 4.9, initials: 'CT', color: '#ec4899' },
  { name: 'Psic. Rodrigo Salinas', specialty: 'Mindfulness · Meditación', location: 'Ciudad de México', rating: 5.0, initials: 'RS', color: '#3b82f6' },
];

const BEFORE = ['Búsqueda en Google sin filtros', 'Sin saber si está verificado', 'Agenda por teléfono o WhatsApp', 'Precios ocultos, sin reseñas'];
const AFTER  = ['Encuentra en minutos con filtros', 'Perfiles 100% verificados', 'Reserva online en 2 clics', 'Precios claros y reseñas reales'];

const ALL_ITEMS: DrumItem[] = [
  { type: 'comparison' },
  ...PROFESSIONALS.map((data): DrumItem => ({ type: 'professional', data })),
];

// Mobile: comparison + first 4 professionals only
const MOBILE_ITEMS: DrumItem[] = [
  { type: 'comparison' },
  ...PROFESSIONALS.slice(0, 4).map((data): DrumItem => ({ type: 'professional', data })),
];

const c01 = (v: number) => Math.max(0, Math.min(1, v));

export default function CylindricalDrum({ scrollProgress }: Props) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const ITEMS = isMobile ? MOBILE_ITEMS : ALL_ITEMS;
  const R     = isMobile ? 185 : 240;

  // Desktop: 140px after comparison block, then 90px between pro cards
  const DESK_OFFSETS = [0, 140, 230, 320, 410, 500, 590, 680, 770];
  // Mobile: 145px after comparison block, then 70px between pro cards
  const MOB_OFFSETS  = [0, 145, 215, 285, 355];

  const getOffset = (fi: number, offsets: number[]) => {
    const lo = Math.floor(fi), hi = Math.min(Math.ceil(fi), offsets.length - 1);
    return offsets[lo] + (offsets[hi] - offsets[lo]) * (fi - lo);
  };

  const targetIndex = c01((scrollProgress - 0.92) / 0.60) * (ITEMS.length - 1);

  return (
    <div
      className={
        isMobile
          ? 'flex absolute top-10 left-0 right-0 h-[50%] z-30 flex-col items-start justify-center pointer-events-none select-none pl-4 pr-4 py-4'
          : 'flex absolute inset-y-0 left-0 w-[65%] md:w-[60%] z-30 flex-col items-start justify-center pointer-events-none select-none pl-10 sm:pl-20 md:pl-32 pr-4 py-16'
      }
      style={{ perspective: '1200px', perspectiveOrigin: isMobile ? '50% 50%' : '30% 50%' }}
    >
      <div
        className="relative w-full flex flex-col justify-center items-start overflow-visible"
        style={{ height: isMobile ? '100%' : '85vh', transformStyle: 'preserve-3d' }}
      >
        {ITEMS.map((item, idx) => {
          const diff     = idx - targetIndex;
          const offsets  = isMobile ? MOB_OFFSETS : DESK_OFFSETS;
          const ty       = getOffset(idx, offsets) - getOffset(targetIndex, offsets);
          const angleRad = ty / R;
          const angleDeg = angleRad * (180 / Math.PI);
          const tz       = Math.cos(angleRad) * R - R;
          const scale    = 0.5 + Math.cos(angleRad) * 0.5;
          const opacity  = Math.max(0, (Math.cos(angleRad) - 0.15) / 0.85);
          const blurAmt  = Math.min(6, Math.max(0, (Math.abs(diff) - 1.5) * 1.5));

          const maxW = isMobile ? 'calc(100vw - 32px)' : 540;

          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            width: '100%',
            maxWidth: maxW,
            transform: `translateY(${ty}px) translateZ(${tz}px) rotateX(${-angleDeg * 0.8}deg) scale(${scale})`,
            transformOrigin: 'left center',
            opacity,
            filter: blurAmt > 0.1 ? `blur(${blurAmt}px)` : undefined,
          };

          if (item.type === 'comparison') {
            const fs = isMobile ? 11 : 13;
            const fsBody = isMobile ? 12 : 14;
            const pad = isMobile ? '10px 12px' : '16px 18px';
            return (
              <div key="comparison" style={baseStyle}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: pad, border: '1px solid rgba(255,255,255,0.09)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 10 : 14 }}>
                    <div>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: fs, fontWeight: 700, color: 'rgba(255,255,255,0.45)', margin: `0 0 ${isMobile ? 6 : 10}px`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sin Aliax</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 7 }}>
                        {BEFORE.map((text, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <span style={{ color: '#f87171', fontSize: fs, lineHeight: 1.4, flexShrink: 0 }}>✕</span>
                            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: fsBody, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: fs, fontWeight: 700, color: '#2dd4bf', margin: `0 0 ${isMobile ? 6 : 10}px`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Con Aliax ✓</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 7 }}>
                        {AFTER.map((text, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <span style={{ color: '#2dd4bf', fontSize: fs, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: fsBody, color: '#fff', lineHeight: 1.4 }}>{text}</span>
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
          const avatarSize = isMobile ? 38 : 48;
          const nameFz = isMobile ? 12 : 14;
          const specFz = isMobile ? 11 : 12;
          const locFz  = isMobile ? 10 : 11;
          const starFz = isMobile ? 12 : 13;
          const cardPad = isMobile ? '8px 12px' : '12px 16px';

          return (
            <div key={idx} style={baseStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12, background: 'rgba(255,255,255,0.06)', borderRadius: isMobile ? 14 : 20, padding: cardPad, border: '1px solid rgba(255,255,255,0.09)' }}>
                <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', background: pro.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: nameFz, color: '#0a1f2e', position: 'relative' }}>
                  {pro.initials}
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '2px solid #0f0a1a' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: nameFz, color: '#fff', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{pro.name}</p>
                    <span style={{ color: '#2dd4bf', fontSize: nameFz - 2 }}>✓</span>
                  </div>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: specFz, color: '#2dd4bf', margin: '2px 0 0', lineHeight: 1, whiteSpace: 'nowrap' }}>{pro.specialty}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: locFz, color: 'rgba(255,255,255,0.45)', margin: 0, whiteSpace: 'nowrap' }}>{pro.location}</p>
                  <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: starFz, color: '#fff', fontWeight: 600, margin: '2px 0 0' }}>★ {pro.rating}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
