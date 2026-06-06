import { useState, useEffect } from 'react';

interface Props { scrollProgress: number; }

const TILES = [
  { label: 'Perfil verificado gratis', offset: 120 },
  { label: 'Aparece en búsquedas',     offset: 180 },
  { label: 'Agenda sin comisiones',    offset: 240 },
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

  const ep = c01((scrollProgress - 0.07) / 0.22);
  const baseH = isMobile ? 52 : 56;

  return (
    <div className="hidden md:flex absolute md:left-[64px] md:top-1/2 md:-translate-y-1/2 flex-col md:gap-[10px] z-40 pointer-events-auto">
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
              background: '#2dd4bf',
              boxShadow: '0 8px 28px rgba(45,212,191,0.45), 0 2px 8px rgba(45,212,191,0.2)',
            }}
            className="h-[44px] sm:h-[52px] md:h-[56px] rounded-2xl md:rounded-[28px] flex items-center justify-center px-5 sm:px-8 whitespace-nowrap cursor-pointer"
          >
            <span
              className="font-medium text-[11px] sm:text-[13px] md:text-[14px] tracking-tight text-[#0a1f2e]"
              style={{ fontFamily: 'Michroma, sans-serif', letterSpacing: '-0.02em' }}>
              {tile.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
