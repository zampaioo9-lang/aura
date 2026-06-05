// frontend/src/components/landing/CylindricalDrum.tsx

interface Props { scrollProgress: number; }

// Words in [brackets] render highlighted (white, bold).
// Empty string = spacer line.
const RAW_LINES = [
  'Bienvenido al espacio donde [el bienestar mental]',
  'deja de ser un lujo y se convierte en [un derecho].',
  'Conectamos a personas que buscan [apoyo real]',
  'con especialistas que [transforman vidas].',
  'Aquí no hay [barreras de distancia] ni',
  '[listas de espera interminables].',
  'Solo [terapeutas verificados] dispuestos',
  'a acompañarte en [cada paso del camino].',
  'Nuestra plataforma fue diseñada para [eliminar]',
  'los [obstáculos] que separan a las personas',
  'de la [ayuda que merecen].',
  'Porque [buscar apoyo] es un acto de [valentía],',
  'no de debilidad.',
  'Cada psicólogo en [Aliax] ha sido',
  'cuidadosamente [seleccionado] para garantizar',
  '',
  'que recibas la [más alta calidad] de atención.',
  'Con [reseñas verificadas], [horarios flexibles]',
  'y [reservas en minutos], ponemos el [control]',
  'de tu bienestar [en tus manos].',
  'No esperes más para dar [el primer paso].',
  'Tu [transformación personal] comienza',
  'con una sola [sesión].',
  '[Aliax] es el puente entre [quienes necesitan ayuda]',
  'y los [especialistas] que saben cómo brindarla.',
  'Un ecosistema diseñado con [empatía],',
  '[tecnología] y [propósito].',
  'Porque mereces un [espacio seguro],',
  'un [profesional comprometido],',
  'y una [plataforma que funciona].',
  'El cambio que buscas [ya está aquí].',
  'Tu [nueva vida] comienza [hoy].',
];

type Segment = { text: string; highlight: boolean };

function parseLine(raw: string): Segment[] {
  const parts: Segment[] = [];
  let i = 0;
  while (i < raw.length) {
    const start = raw.indexOf('[', i);
    if (start === -1) { parts.push({ text: raw.slice(i), highlight: false }); break; }
    if (start > i) parts.push({ text: raw.slice(i, start), highlight: false });
    const end = raw.indexOf(']', start);
    if (end === -1) { parts.push({ text: raw.slice(start), highlight: false }); break; }
    parts.push({ text: raw.slice(start + 1, end), highlight: true });
    i = end + 1;
  }
  return parts;
}

const LINES = RAW_LINES.map(parseLine);
const R = 380;
const LINE_H = 32;
const c01 = (v: number) => Math.max(0, Math.min(1, v));

export default function CylindricalDrum({ scrollProgress }: Props) {
  const targetIndex = c01((scrollProgress - 1.45) / 2.05) * (LINES.length - 1);

  return (
    <div
      className="absolute inset-y-0 left-0 w-full sm:w-[65%] md:w-[60%] z-30 flex flex-col items-start justify-center pointer-events-none select-none pl-6 sm:pl-12 md:pl-20 py-16"
      style={{ perspective: '1000px', perspectiveOrigin: '25% 50%' }}
    >
      <div
        className="relative w-full h-[85vh] flex flex-col justify-center items-start overflow-visible"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {LINES.map((segments, idx) => {
          const diff = idx - targetIndex;
          const ty = diff * LINE_H;
          const angleRad = ty / R;
          const angleDeg = angleRad * (180 / Math.PI);
          const tz = Math.cos(angleRad) * R - R;
          const scale = 0.78 + Math.cos(angleRad) * 0.22;
          const opacity = Math.max(0, (Math.cos(angleRad) - 0.2) / 0.8);
          const blur = Math.min(8, Math.max(0, (Math.abs(diff) - 1.5) * 0.75));
          const isEmpty = segments.length === 1 && segments[0].text === '';

          return (
            <p
              key={idx}
              style={{
                position: 'absolute',
                margin: 0,
                transform: `translateY(${ty}px) translateZ(${tz}px) rotateX(${-angleDeg * 0.8}deg) scale(${scale})`,
                transformOrigin: 'left center',
                opacity: isEmpty ? opacity * 0.3 : opacity,
                filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
                whiteSpace: 'nowrap',
                lineHeight: 0.9,
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 600,
                fontSize: 'clamp(15px, 2vw, 30px)',
                letterSpacing: '-0.035em',
              }}
            >
              {isEmpty
                ? ' '
                : segments.map((seg, si) => (
                    <span
                      key={si}
                      style={{
                        color: seg.highlight ? '#fff' : 'rgba(255,255,255,0.55)',
                        fontWeight: seg.highlight ? 700 : 600,
                      }}
                    >
                      {seg.text}
                    </span>
                  ))}
            </p>
          );
        })}
      </div>
    </div>
  );
}
