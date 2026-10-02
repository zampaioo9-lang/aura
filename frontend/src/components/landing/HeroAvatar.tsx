import { useRef, useEffect, useState } from 'react';
import { Search, Star, Mic, ChevronLeft, ChevronRight, Heart, CalendarClock } from 'lucide-react';

interface Props { scrollProgress: number; }

const THERAPISTS = [
  { initials: 'DM', name: 'Psic. Daniela Martínez', focus: 'Terapia Cognitivo Conductual', city: 'CDMX', rating: 5, reviews: 28 },
  { initials: 'AL', name: 'Psic. Andrés López',     focus: 'Terapia de Pareja',            city: 'Guadalajara', rating: 5, reviews: 16 },
  { initials: 'CR', name: 'Psic. Camila Rojas',     focus: 'Terapia Infantil y Adolescente', city: 'Monterrey', rating: 5, reviews: 21 },
];

const SOAP_ROWS: { letter: string; label: string }[] = [
  { letter: 'S', label: 'Subjetivo' },
  { letter: 'O', label: 'Objetivo' },
  { letter: 'A', label: 'Análisis' },
  { letter: 'P', label: 'Plan' },
];

// Máscara orgánica del Hero (escritorio) — SOLO afecta la geometría del
// clip-path, no la fotografía, su tamaño, posición ni object-position.
const TOP_X = 0.10;
const PINCH_X = 0.05;
const PINCH_Y = 0.40;
const OPEN_X = 0.35;
const OPEN_Y = 0.85;

const BLOB_PATH_D =
  `M ${TOP_X},0 ` +
  `C ${TOP_X - 0.04},0.15 ${PINCH_X},0.28 ${PINCH_X},${PINCH_Y} ` +
  `C ${PINCH_X},0.55 0.15,0.72 ${OPEN_X},${OPEN_Y} ` +
  `C 0.55,0.95 0.80,0.99 1,1 ` +
  `L 1,0 Z`;

function HubIcon({ size }: { size: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {([0, 0.65, 1.3] as number[]).map((delay, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '1.5px solid rgba(45,212,191,0.8)',
          animation: `aliax-ring-hub 1.95s ease-out ${delay}s infinite`,
          opacity: 0,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: '#0a1a1f',
        border: '1.5px solid rgba(45,212,191,0.5)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.45), inset 0 0 12px rgba(45,212,191,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'Michroma, sans-serif', fontWeight: 700, color: '#2dd4bf', fontSize: size * 0.38 }}>A</span>
      </div>
    </div>
  );
}

// Contenido de cada mockup, compartido entre la versión de escritorio
// (tarjetas flotantes ancladas al hub) y la versión móvil (carrusel
// horizontal de una tarjeta a la vez, ver más abajo).

function IABody({ rows, showWaveform }: { rows: number; showWaveform: boolean }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <Mic size={11} color="#7c3aed" />
        <p style={{ fontWeight: 700, fontSize: 10, margin: 0, whiteSpace: 'nowrap' }}>IA que trabaja para ti</p>
      </div>
      <p style={{ fontSize: 7, color: '#64748b', margin: '0 0 5px' }}>Describe la sesión o sube el audio</p>
      {showWaveform && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, background: '#f8fafc', borderRadius: 8, padding: '4px 6px', marginBottom: 7 }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} style={{ width: 1.4, height: 3 + ((i * 37) % 9), background: '#94a3b8', borderRadius: 1 }} />
          ))}
          <span style={{ fontSize: 6.5, color: '#94a3b8', marginLeft: 3, whiteSpace: 'nowrap' }}>04:35</span>
        </div>
      )}
      <p style={{ fontSize: 8, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Nota clínica generada por IA</p>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        <span style={{ fontSize: 6.5, fontWeight: 700, color: '#7c3aed', borderBottom: '1.5px solid #7c3aed', paddingBottom: 2 }}>SOAP</span>
        <span style={{ fontSize: 6.5, color: '#94a3b8' }}>Centrada en soluciones</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
        {SOAP_ROWS.slice(0, rows).map(r => (
          <div key={r.letter} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 13, height: 13, borderRadius: 4, background: '#ede9fe', color: '#7c3aed',
              fontSize: 7, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{r.letter}</span>
            <span style={{ fontSize: 7, color: '#334155' }}>{r.label}</span>
            <span style={{ flex: 1, height: 1, background: '#e2e8f0', borderRadius: 1 }} />
          </div>
        ))}
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, background: '#0f766e', color: '#fff',
        fontSize: 6.5, fontWeight: 600, borderRadius: 20, padding: '4px 8px',
      }}>
        <Heart size={9} fill="#fff" /> Lenguaje centrado en recursos
      </div>
    </>
  );
}

function CalendarBody({ showTimeSlots = true }: { showTimeSlots?: boolean }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <ChevronLeft size={10} color="#94a3b8" />
        <p style={{ fontWeight: 700, fontSize: 9.5, margin: 0 }}>Junio 2025</p>
        <ChevronRight size={10} color="#94a3b8" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1.5, marginBottom: 6 }}>
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <span key={i} style={{ fontSize: 6, color: '#94a3b8', textAlign: 'center' }}>{d}</span>
        ))}
        {/* Junio 2025 empieza en domingo -> 6 celdas vacías antes del día 1 */}
        {Array.from({ length: 6 }).map((_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: 30 }).map((_, i) => {
          const day = i + 1;
          const selected = day === 12;
          return (
            <span key={i} style={{
              fontSize: 6.5, textAlign: 'center', padding: '1.5px 0', borderRadius: 4,
              background: selected ? '#7c3aed' : 'transparent',
              color: selected ? '#fff' : '#334155', fontWeight: selected ? 700 : 400,
            }}>{day}</span>
          );
        })}
      </div>
      {showTimeSlots && (
        <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
          {['10:00','11:00','12:00','17:00'].map(t => (
            <span key={t} style={{
              fontSize: 6, padding: '3px 4px', borderRadius: 6, flex: '1 0 40%', textAlign: 'center',
              background: t === '11:00' ? '#ccfbf1' : '#f8fafc',
              color: t === '11:00' ? '#0d9488' : '#64748b',
              border: t === '11:00' ? '1px solid #2dd4bf' : '1px solid #e2e8f0',
              fontWeight: t === '11:00' ? 700 : 400,
            }}>{t}</span>
          ))}
        </div>
      )}
      <div style={{ background: '#0d9488', color: '#fff', fontSize: 8, fontWeight: 700, textAlign: 'center', borderRadius: 7, padding: '5px 0' }}>
        Confirmar cita
      </div>
    </>
  );
}

function EncuentraBody({ rows, showSearch = true }: { rows: number; showSearch?: boolean }) {
  return (
    <>
      <p style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>Encuentra a tu terapeuta</p>
      <p style={{ fontSize: 10, color: '#64748b', margin: '1px 0 8px' }}>
        Con matching por <span style={{ color: '#7c3aed', fontWeight: 700 }}>IA</span>
      </p>
      {showSearch && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0, border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 6px', fontSize: 8.5, color: '#334155' }}>Enfoque terapéutico</div>
          <div style={{ flex: 1, minWidth: 0, border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 6px', fontSize: 8.5, color: '#334155' }}>Ciudad</div>
          <div style={{ width: 22, height: 22, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Search size={11} color="#fff" />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {THERAPISTS.slice(0, rows).map(t => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#cbd5e1,#94a3b8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, fontWeight: 700, color: '#fff',
            }}>{t.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 8.5, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</p>
              <p style={{ fontSize: 7.5, color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.focus} · {t.city}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 1 }}>
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={7} fill="#f59e0b" color="#f59e0b" />)}
                <span style={{ fontSize: 7, color: '#94a3b8', marginLeft: 2 }}>({t.reviews})</span>
              </div>
            </div>
            <span style={{ fontSize: 7, fontWeight: 700, color: '#0d9488', border: '1px solid #99f6e4', borderRadius: 6, padding: '2px 5px', whiteSpace: 'nowrap' }}>Ver perfil</span>
          </div>
        ))}
      </div>
    </>
  );
}

// Tarjeta de módulo para móvil — mismo lenguaje visual que los "módulos"
// de ThirdScreen.tsx (icono de color + título + descripción corta sobre
// fondo oscuro translúcido), en vez de intentar replicar el mockup de UI
// completo dentro de una tarjeta blanca flotante. Se ven 3 fijas, sin
// carrusel ni gestos — solo lectura, ancladas debajo de la foto.
function MobileModuleCard({ icon: Icon, color, title, desc }: { icon: typeof Mic; color: string; title: string; desc: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 14, padding: '10px 12px', backdropFilter: 'blur(6px)',
    }}>
      <Icon size={18} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 12.5, fontFamily: 'Manrope, sans-serif' }}>{title}</p>
        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 10.5, fontFamily: 'Manrope, sans-serif', lineHeight: 1.3 }}>{desc}</p>
      </div>
    </div>
  );
}

const MOBILE_MODULES = [
  { icon: Mic, color: '#a78bfa', title: 'IA que trabaja para ti', desc: 'Transcribe tu sesión y genera la nota clínica automáticamente.' },
  { icon: CalendarClock, color: '#34d399', title: 'Agenda tu cita', desc: 'Tus pacientes reservan en línea, sin comisiones.' },
  { icon: Search, color: '#f97316', title: 'Encuentra a tu terapeuta', desc: 'Matching por IA según enfoque y necesidad.' },
];

function MiniCard({ children, style, className, cardRef }: { children: React.ReactNode; style: React.CSSProperties; className?: string; cardRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        position: 'absolute',
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 10px 32px rgba(15,23,42,0.22), 0 2px 8px rgba(15,23,42,0.12)',
        padding: '10px 12px',
        color: '#0f172a',
        fontFamily: 'Manrope, sans-serif',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface LinePoint { x1: number; y1: number; x2: number; y2: number; viaX?: number; viaY?: number; }

export default function HeroAvatar({ scrollProgress }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [lines, setLines] = useState<LinePoint[]>([]);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Mide posiciones reales en el DOM para que las líneas SIEMPRE toquen el
  // borde de cada tarjeta y del hub, sin importar el tamaño de pantalla
  // (evita el desfase que da usar coordenadas fijas en un viewBox estirado).
  // Solo aplica en escritorio: en móvil los mockups viven en un carrusel
  // aparte, no flotando alrededor del hub.
  useEffect(() => {
    if (isMobile) { setLines([]); return; }

    function recompute() {
      const container = containerRef.current;
      const hub = hubRef.current;
      if (!container || !hub) return;
      const cRect = container.getBoundingClientRect();
      const hRect = hub.getBoundingClientRect();
      const hubCenter = { x: hRect.left + hRect.width / 2 - cRect.left, y: hRect.top + hRect.height / 2 - cRect.top };

      const card1El = card1Ref.current;
      const card2El = card2Ref.current;
      const notch = (card1El && card2El) ? (() => {
        const r1 = card1El.getBoundingClientRect();
        const r2 = card2El.getBoundingClientRect();
        const card1BottomLeft = { x: r1.left - cRect.left, y: r1.bottom - cRect.top };
        const card2TopRight = { x: r2.right - cRect.left, y: r2.top - cRect.top };
        return { x: (card1BottomLeft.x + card2TopRight.x) / 2, y: (card1BottomLeft.y + card2TopRight.y) / 2 };
      })() : null;

      const newLines = [card1Ref, card2Ref, card3Ref].map((ref, i) => {
        const el = ref.current;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const rect = { left: r.left - cRect.left, right: r.right - cRect.left, top: r.top - cRect.top, bottom: r.bottom - cRect.top };
        // La tarjeta "IA que trabaja para ti" (i===0) siempre conecta por
        // su borde LATERAL IZQUIERDO, no por el punto más cercano.
        const useLeftEdge = i === 0;
        const nearestX = useLeftEdge ? rect.left : Math.max(rect.left, Math.min(hubCenter.x, rect.right));
        const nearestY = useLeftEdge ? (rect.top + rect.bottom) / 2 : Math.max(rect.top, Math.min(hubCenter.y, rect.bottom));
        // Separa el punto conector del borde de la tarjeta, hacia el hub,
        // para que se vea "despegado" en vez de tocar el mockup.
        const dx = hubCenter.x - nearestX;
        const dy = hubCenter.y - nearestY;
        const dist = Math.hypot(dx, dy) || 1;
        const gap = 8;
        const x2 = useLeftEdge ? nearestX - gap : nearestX + (dx / dist) * gap;
        const y2 = useLeftEdge ? nearestY : nearestY + (dy / dist) * gap;
        // La línea hacia card1 pasa por el hueco entre la esquina inferior
        // izquierda de card1 y la esquina superior derecha del calendario.
        const hasVia = i === 0 && notch;
        const line: LinePoint = {
          x1: hubCenter.x, y1: hubCenter.y, x2, y2,
          viaX: hasVia ? notch.x : undefined,
          viaY: hasVia ? notch.y : undefined,
        };
        return line;
      }).filter((l): l is LinePoint => l !== null);

      setLines(newLines);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recompute);
    const t1 = setTimeout(recompute, 150);
    const t2 = setTimeout(recompute, 500);
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute); clearTimeout(t1); clearTimeout(t2); };
  }, [isMobile]);

  const exit = Math.min(1, scrollProgress);
  const opacity = isMobile ? Math.max(0, 1 - exit / 0.25) : 1 - exit * 0.9;
  const tx = isMobile ? 0 : exit * 60;

  const hubSize = isMobile ? 34 : 56;

  // Curva suave: arco perpendicular a la línea recta hub→tarjeta.
  const curvePath = (l: LinePoint) => {
    const mx = (l.x1 + l.x2) / 2;
    const my = (l.y1 + l.y2) / 2;
    const dx = l.x2 - l.x1;
    const dy = l.y2 - l.y1;
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.min(24, len * 0.18);
    const cx = mx + (-dy / len) * bow;
    const cy = my + (dx / len) * bow;
    return `M ${l.x1},${l.y1} Q ${cx},${cy} ${l.x2},${l.y2}`;
  };

  // Curva que pasa por un punto intermedio (el hueco entre dos tarjetas)
  // sin dejar esquina: el punto de control de salida es el reflejo del de
  // entrada respecto al punto intermedio, así el ángulo (la tangente) es
  // continuo en la unión — una sola curva fluida, no dos segmentos rectos.
  const curvePathVia = (l: LinePoint, viaX: number, viaY: number) => {
    const dx = viaX - l.x1;
    const dy = viaY - l.y1;
    const len = Math.hypot(dx, dy) || 1;
    const bow = 14;
    const mx = (l.x1 + viaX) / 2;
    const my = (l.y1 + viaY) / 2;
    const c1x = mx + (-dy / len) * bow;
    const c1y = my + (dx / len) * bow;
    const c2x = viaX * 2 - c1x;
    const c2y = viaY * 2 - c1y;
    return `M ${l.x1},${l.y1} Q ${c1x},${c1y} ${viaX},${viaY} Q ${c2x},${c2y} ${l.x2},${l.y2}`;
  };

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 h-full w-full pointer-events-none z-10"
      style={{ opacity, transform: `translateX(${tx}px)` }}
    >
      <div ref={containerRef} className="relative h-full w-full">

        {isMobile ? (
          <>
            {/* Foto — solo móvil. Protagonista única del Hero móvil: los
                3 mockups ya NO flotan encima/alrededor (saturaban la
                pantalla), viven en el carrusel de abajo. */}
            <div
              className="absolute overflow-hidden"
              style={{
                left: '18%', top: '31%', width: '64%', aspectRatio: '1.3 / 1',
                borderRadius: '50%',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.45)',
              }}
            >
              <img
                src="/hero-therapy-photo.png"
                alt="Terapeuta y paciente en sesión"
                draggable={false}
                className="w-full h-full object-cover select-none"
                style={{ objectPosition: '58% 32%' }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(200deg, rgba(10,10,25,0) 55%, rgba(10,10,25,0.30) 100%)' }} />
            </div>
            <div
              className="absolute pointer-events-none"
              style={{
                left: '18%', top: '31%', width: '64%', aspectRatio: '1.3 / 1',
                borderRadius: '50%',
                background: 'radial-gradient(60% 60% at 50% 50%, rgba(45,212,191,0.18), rgba(124,58,237,0.10) 70%, transparent 90%)',
                filter: 'blur(14px)',
                transform: 'scale(1.06)',
              }}
            />
          </>
        ) : (
          <>
            {/* Definición del clip-path orgánico (escala con objectBoundingBox) */}
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
              <defs>
                <clipPath id="heroBlobClip" clipPathUnits="objectBoundingBox">
                  <path d={BLOB_PATH_D} />
                </clipPath>
              </defs>
            </svg>

            {/* Halo suave detrás de la foto — MISMO tamaño/posición exacta
                que el contenedor de la foto, para que el mismo clip-path
                dibuje la misma silueta en los dos sin "línea fantasma". El
                contenedor es un panel ANCLADO A LA DERECHA (no ancho
                completo) — así la foto y la máscara quedan siempre dentro
                del lado derecho del Hero, lejos del texto. Bottom-[16%]
                deja espacio para el wordmark "Aliax" de abajo. */}
            <div
              className="absolute left-[39%] right-0 top-0 bottom-[16%]"
              style={{
                clipPath: 'url(#heroBlobClip)', WebkitClipPath: 'url(#heroBlobClip)',
                background: 'radial-gradient(120% 100% at 30% 50%, rgba(45,212,191,0.25), rgba(124,58,237,0.10) 60%, transparent 80%)',
                filter: 'blur(18px)',
                transform: 'scale(1.02)',
              }}
            />

            {/* Foto con máscara orgánica */}
            <div
              className="absolute left-[39%] right-0 top-0 bottom-[16%] overflow-hidden"
              style={{ clipPath: 'url(#heroBlobClip)', WebkitClipPath: 'url(#heroBlobClip)' }}
            >
              <img
                src="/hero-therapy-photo.png"
                alt="Terapeuta y paciente en sesión"
                draggable={false}
                className="w-full h-full object-cover select-none"
                style={{ objectPosition: '45% 25%' }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(200deg, rgba(10,10,25,0) 55%, rgba(10,10,25,0.30) 100%)' }} />
              {/* Difuminado interno junto al borde izquierdo para suavizar la transición */}
              <div className="absolute inset-0" style={{ boxShadow: 'inset 24px 0 40px -20px rgba(10,10,25,0.55)' }} />
            </div>
          </>
        )}

        {/* Líneas conectoras (curvas, medidas en tiempo real) — solo escritorio */}
        {!isMobile && lines.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            <g fill="none" strokeLinecap="round">
              {lines.map((l, i) => (
                <path
                  key={i}
                  d={l.viaX !== undefined && l.viaY !== undefined ? curvePathVia(l, l.viaX, l.viaY) : curvePath(l)}
                  stroke={i === 0 ? '#a78bfa' : 'rgba(153,246,228,0.4)'}
                  strokeWidth={i === 0 ? 2 : 1.1}
                  opacity={i === 0 ? 0.95 : 1}
                />
              ))}
            </g>
            {lines.map((l, i) => (
              <circle key={i} cx={l.x2} cy={l.y2} r="4.5" fill={i === 0 ? '#7c3aed' : '#2dd4bf'} opacity={0.9} />
            ))}
          </svg>
        )}

        {/* Ícono central Aliax (hub) — decorativo sobre la foto en ambas
            versiones; en móvil ya no conecta con nada, las 3 tarjetas de
            módulo viven fijas debajo de la foto, sin líneas. */}
        <div
          className="absolute pointer-events-auto"
          style={{ left: isMobile ? '50%' : '72%', top: isMobile ? '54%' : '63%', transform: 'translate(-50%,-50%)' }}
          ref={hubRef}
        >
          <HubIcon size={hubSize} />
        </div>

        {isMobile ? (
          /* 3 tarjetas de módulo FIJAS (sin carrusel, sin gestos) debajo
             de la foto — mismo lenguaje visual que los módulos de
             ThirdScreen.tsx: icono de color + título + descripción corta
             sobre fondo oscuro translúcido, no un mockup de UI blanco. */
          <div className="absolute" style={{ left: '6%', width: '88%', top: '60%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOBILE_MODULES.map(m => <MobileModuleCard key={m.title} {...m} />)}
          </div>
        ) : (
          <>
            {/* Tarjeta: IA que trabaja para ti (audio + nota SOAP) */}
            <MiniCard
              cardRef={card1Ref}
              className="pointer-events-auto"
              style={{ left: '64%', top: '15%', width: 200 }}
            >
              <IABody rows={4} showWaveform />
            </MiniCard>

            {/* Tarjeta: Agenda tu cita (calendario completo) */}
            <MiniCard
              cardRef={card2Ref}
              className="pointer-events-auto"
              style={{ left: '47%', top: '48%', width: 178 }}
            >
              <CalendarBody />
            </MiniCard>

            {/* Tarjeta: Encuentra a tu terapeuta (matching IA) */}
            <MiniCard
              cardRef={card3Ref}
              className="pointer-events-auto"
              style={{ right: '2%', top: '56%', width: 240 }}
            >
              <EncuentraBody rows={3} />
            </MiniCard>
          </>
        )}

      </div>
    </div>
  );
}
