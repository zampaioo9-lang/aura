import {
  Mic, Sparkles, ClipboardList, FileText, CalendarClock, BellRing,
  Users, Link2, Palette, BarChart3, Search,
} from 'lucide-react';

interface Props {
  lerpedProgress: number;
}

const c01 = (v: number) => Math.max(0, Math.min(1, v));

const FEATURES = [
  { icon: Search,        title: 'Matching inteligente',        desc: 'Encuentra al profesional ideal por enfoque y necesidad.', color: '#f97316' },
  { icon: Sparkles,       title: 'Notas con IA',                desc: 'SOAP, Libre, Diamante TBCS y más, generadas por IA.',      color: '#a78bfa' },
  { icon: ClipboardList,  title: 'Diferentes notas clínicas',   desc: 'Elige el formato que mejor se adapte a tu estilo.',        color: '#f472b6' },
  { icon: FileText,       title: 'Historia Clínica',            desc: 'Expediente digital individual y de pareja.',              color: '#60a5fa' },
  { icon: CalendarClock,  title: 'Agenda y reservas',           desc: 'Tus pacientes reservan en línea, sin comisiones.',         color: '#34d399' },
  { icon: BellRing,       title: 'Recordatorios automáticos',   desc: 'WhatsApp y correo antes de cada sesión.',                  color: '#fbbf24' },
  { icon: Users,          title: 'Directorio verificado',       desc: 'Aparece por especialidad, ciudad y modalidad.',            color: '#22d3ee' },
  { icon: Link2,          title: 'Enlace personalizado',        desc: 'Tu propia página: aliax.io/tu-nombre.',                    color: '#c084fc' },
  { icon: Palette,        title: 'Templates y colores',         desc: 'Varias plantillas y colores para tu perfil.',              color: '#f87171' },
  { icon: BarChart3,      title: 'Analytics',                   desc: 'Ingresos, clientes y progreso clínico.',                   color: '#4ade80' },
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
      <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 w-16 h-[5px] bg-white/20 rounded-full z-50 pointer-events-none" />

      {/* Teal glow */}
      <div className="absolute top-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #2dd4bf 0%, transparent 70%)' }} />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-10 md:px-16 py-8 sm:py-8">
        <div className="w-full max-w-[1100px]">
          <div className="text-center mb-3 sm:mb-5">
            <p className="text-[#2dd4bf] text-[9px] sm:text-[11px] uppercase tracking-[0.2em] font-medium mb-1"
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              Todo lo que necesitas
            </p>
            <h2 className="text-white font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(20px,2.8vw,34px)', letterSpacing: '-0.02em' }}>
              Un módulo para cada parte de tu consulta
            </h2>
          </div>

          {/* Featured: Transcripción */}
          <div
            className="rounded-2xl sm:rounded-3xl p-3 sm:p-5 mb-2.5 sm:mb-4 flex flex-row items-center gap-3 sm:gap-5"
            style={{
              background: 'linear-gradient(120deg, rgba(45,212,191,0.16) 0%, rgba(124,58,237,0.14) 100%)',
              border: '1.5px solid rgba(45,212,191,0.4)',
              boxShadow: '0 8px 32px rgba(45,212,191,0.18)',
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl sm:rounded-2xl flex-shrink-0"
              style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', boxShadow: '0 4px 16px rgba(45,212,191,0.4)' }}
            >
              <Mic size={22} color="#0a1a1a" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className="text-white font-bold" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(14px,1.7vw,19px)' }}>
                  Transcripción de audio → Nota clínica
                </h3>
                <span
                  className="text-[9px] font-bold uppercase tracking-wide px-2 py-[2px] rounded-full flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: '#0a1a1a' }}
                >
                  Módulo estrella
                </span>
              </div>
              <p className="text-white/65 text-[11px] sm:text-[13px] leading-snug" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Grabas hasta 1 hora de audio y la IA transcribe y genera tu nota clínica completa, automáticamente.
              </p>
            </div>
          </div>

          {/* Rest of the modules */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col gap-1 sm:gap-1.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Icon size={16} style={{ color }} />
                <h4 className="text-white font-semibold leading-tight" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(11px,1.15vw,12.5px)' }}>
                  {title}
                </h4>
                <p className="text-white/45 leading-snug" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(9.5px,1vw,10.5px)' }}>
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
