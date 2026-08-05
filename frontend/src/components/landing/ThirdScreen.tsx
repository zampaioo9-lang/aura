import { Mic, Sparkles, FileText, CalendarClock, Users, BarChart3 } from 'lucide-react';

interface Props {
  lerpedProgress: number;
}

const c01 = (v: number) => Math.max(0, Math.min(1, v));

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Notas con IA',
    desc: 'Formatos SOAP, Libre, Diamante TBCS y Centrada en Soluciones.',
    color: '#a78bfa',
  },
  {
    icon: FileText,
    title: 'Historia Clínica',
    desc: 'Expediente digital individual y de pareja, siempre a la mano.',
    color: '#60a5fa',
  },
  {
    icon: CalendarClock,
    title: 'Agenda y reservas',
    desc: 'Tus pacientes reservan en línea y reciben recordatorios automáticos.',
    color: '#f472b6',
  },
  {
    icon: Users,
    title: 'Directorio verificado',
    desc: 'Aparece por enfoque terapéutico, ciudad y modalidad.',
    color: '#fbbf24',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Ingresos, clientes y progreso clínico en un solo tablero.',
    color: '#34d399',
  },
];

export default function ThirdScreen({ lerpedProgress }: Props) {
  const sp    = c01((lerpedProgress - 1.05) / 0.28);
  const eased = 1 - Math.pow(1 - sp, 3);

  return (
    <div
      className="absolute bottom-0 left-0 w-full h-full rounded-t-[48px] overflow-hidden z-50"
      style={{
        background: 'linear-gradient(160deg, #0a1420 0%, #0e2633 55%, #0f0a1a 100%)',
        transform: `translateY(${(1 - eased) * 100}%)`,
        visibility: sp > 0 ? 'visible' : 'hidden',
        willChange: 'transform',
      }}
    >
      {/* Grab handle */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-16 h-[5px] bg-white/20 rounded-full z-50 pointer-events-none" />

      {/* Teal glow */}
      <div className="absolute top-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2dd4bf 0%, transparent 70%)' }} />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 sm:px-10 md:px-16 py-16 sm:py-10">
        <div className="w-full max-w-[1000px]">
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-[#2dd4bf] text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-medium mb-2"
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              Todo lo que necesitas
            </p>
            <h2 className="text-white font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(24px,3.4vw,38px)', letterSpacing: '-0.02em' }}>
              Un módulo para cada parte de tu consulta
            </h2>
          </div>

          {/* Featured: Transcripción */}
          <div
            className="rounded-3xl p-5 sm:p-7 mb-4 sm:mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
            style={{
              background: 'linear-gradient(120deg, rgba(45,212,191,0.16) 0%, rgba(124,58,237,0.14) 100%)',
              border: '1.5px solid rgba(45,212,191,0.4)',
              boxShadow: '0 8px 32px rgba(45,212,191,0.18)',
            }}
          >
            <div
              className="flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', boxShadow: '0 4px 16px rgba(45,212,191,0.4)' }}
            >
              <Mic size={26} color="#0a1a1a" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-white font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(17px,2vw,22px)' }}>
                  Transcripción de audio → Nota clínica
                </h3>
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-[3px] rounded-full flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: '#0a1a1a' }}
                >
                  Módulo estrella
                </span>
              </div>
              <p className="text-white/65 text-[13px] sm:text-[14.5px] leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif', maxWidth: 560 }}>
                Grabas hasta 1 hora de audio de tu sesión y la IA la transcribe y genera tu nota clínica completa, automáticamente. Sin escribir nada. El audio nunca se almacena.
              </p>
            </div>
          </div>

          {/* Rest of the modules */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-2xl p-4 sm:p-5 flex flex-col gap-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Icon size={20} style={{ color }} />
                <h4 className="text-white font-semibold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(12.5px,1.3vw,14px)' }}>
                  {title}
                </h4>
                <p className="text-white/50 text-[11px] sm:text-[12px] leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
