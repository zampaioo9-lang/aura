import { useState, useEffect } from 'react';

interface Props { scrollProgress: number; }

const TILES = [
  { label: 'Psicólogos verificados', offset: 120 },
  { label: 'Reserva en 2 minutos',   offset: 180 },
  { label: 'Reseñas de pacientes',   offset: 240 },
];

const c01 = (v: number) => Math.max(0, Math.min(1, v));

export default function SoapTiles({ scrollProgress }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const ep = c01((scrollProgress - 0.3) / 0.22);
  const baseH = isMobile ? 52 : 56;

  return (
    <div className="absolute left-4 md:left-[64px] top-[58%] md:top-1/2 -translate-y-1/2 flex flex-col gap-2 md:gap-[10px] z-40 pointer-events-auto">
      {TILES.map((tile, i) => {
        const delay = i * 0.07;
        const tp = c01((ep - delay) / Math.max(0.01, 1 - delay));
        const offset = isMobile ? tile.offset * 0.25 : tile.offset;
        const tx = (tp - 1) * offset;
        const isHov = hovered === i;
        const neighborShift = hovered !== null && !isHov
          ? (i < (hovered ?? 0) ? -1 : 1) * baseH * 0.1
          : 0;
        const scale = isHov && !isMobile ? 1.2 : 1;
        return (
          <div
            key={tile.label}
            onMouseEnter={() => !isMobile && setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              transform: `translateX(${tx}px) translateY(${neighborShift}px) scale(${scale})`,
              opacity: tp,
              filter: `blur(${(1 - tp) * 12}px)`,
              transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
              transformOrigin: 'left center',
            }}
            className="h-[44px] sm:h-[52px] md:h-[56px] bg-white text-black rounded-2xl md:rounded-[28px] flex items-center justify-center px-5 sm:px-8 whitespace-nowrap cursor-pointer"
          >
            <span
              className="font-medium text-[11px] sm:text-[13px] md:text-[14px] tracking-tight"
              style={{ fontFamily: 'Michroma, sans-serif', letterSpacing: '-0.02em' }}>
              {tile.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
