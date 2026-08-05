import { Link } from 'react-router-dom';
import { AlertTriangle, Mail } from 'lucide-react';

interface Props {
  lerpedProgress: number;
}

const c01 = (v: number) => Math.max(0, Math.min(1, v));

const COLUMNS = [
  {
    title: 'Producto',
    links: [
      { label: 'Explorar terapeutas', to: '/explorar' },
      { label: 'Precios', to: '/pricing' },
      { label: 'Reservar demo', to: '/demo', external: true },
    ],
  },
  {
    title: 'Cuenta',
    links: [
      { label: 'Iniciar sesión', to: '/login' },
      { label: 'Crear perfil gratis', to: '/register' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Política de privacidad', to: '/privacidad' },
    ],
  },
];

export default function FourthScreen({ lerpedProgress }: Props) {
  const sp    = c01((lerpedProgress - 1.36) / 0.13);
  const eased = 1 - Math.pow(1 - sp, 3);

  return (
    <div
      className="absolute bottom-0 left-0 w-full h-full rounded-t-[48px] overflow-hidden z-[60]"
      style={{
        background: 'linear-gradient(160deg, #0f0a1a 0%, #150a28 100%)',
        transform: `translateY(${(1 - eased) * 100}%)`,
        visibility: sp > 0 ? 'visible' : 'hidden',
        willChange: 'transform',
      }}
    >
      {/* Grab handle */}
      <div className="absolute top-3 sm:top-5 left-1/2 -translate-x-1/2 w-16 h-[5px] bg-white/20 rounded-full z-50 pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-5 sm:px-12 md:px-20 py-10">
        <div className="w-full max-w-[880px] flex flex-col gap-5 sm:gap-7">

          {/* Brand + columns */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-4">
            <div className="max-w-[260px]">
              <span className="text-white font-bold" style={{ fontFamily: 'Michroma, sans-serif', fontSize: 15, letterSpacing: '0.02em' }}>
                ALIAX
              </span>
              <p className="text-white/45 text-[12px] sm:text-[13px] leading-relaxed mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Automatiza tu nota clínica. La plataforma para psicólogos y psicoterapeutas en México y LATAM.
              </p>
              <a href="mailto:hola@aliax.io" className="inline-flex items-center gap-1.5 text-[#2dd4bf] text-[12px] mt-3 no-underline"
                style={{ fontFamily: 'Manrope, sans-serif' }}>
                <Mail size={13} /> hola@aliax.io
              </a>
            </div>

            <div className="flex flex-row gap-8 sm:gap-12 flex-wrap">
              {COLUMNS.map(col => (
                <div key={col.title} className="flex flex-col gap-2">
                  <span className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-medium mb-1"
                    style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {col.title}
                  </span>
                  {col.links.map(l => (
                    l.external ? (
                      <a key={l.label} href={l.to} className="text-white/70 text-[13px] no-underline hover:text-[#2dd4bf] transition-colors"
                        style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {l.label}
                      </a>
                    ) : (
                      <Link key={l.label} to={l.to} className="text-white/70 text-[13px] no-underline hover:text-[#2dd4bf] transition-colors"
                        style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {l.label}
                      </Link>
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Crisis disclaimer */}
          <div
            className="rounded-xl p-3.5 sm:p-4 flex items-start gap-3"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-[2px]" style={{ color: '#fbbf24' }} />
            <p className="text-white/60 text-[11.5px] sm:text-[12.5px] leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Aliax es una plataforma de directorio y gestión clínica, no un servicio de emergencia. Si tú o alguien que conoces está en crisis o en riesgo, comunícate a la Línea de la Vida en México (800&nbsp;911&nbsp;2000, 24/7) o a los servicios de emergencia de tu localidad.
            </p>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-white/[0.08]">
            <span className="text-white/30 text-[11px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              &copy; {new Date().getFullYear()} Aliax.io. Todos los derechos reservados.
            </span>
            <span className="text-white/30 text-[11px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              México &amp; LATAM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
