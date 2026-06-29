import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, CalendarClock } from 'lucide-react';

interface Props {
  onNavigate?: (ratio: number) => void;
}

const NAV = [
  { label: 'Explorar', to: '/explorar' },
  { label: 'Precios',  to: '/pricing'  },
];

export default function LandingHeader({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);

  const logoContent = (
    <>
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Anillos expansivos */}
        {([0, 0.65, 1.3] as number[]).map((delay, i) => (
          <div key={i} style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1.5px solid #9b87f5',
            animation: `aliax-ring 1.95s ease-out ${delay}s infinite`,
            opacity: 0,
          }} />
        ))}
        {/* A */}
        <span style={{ fontFamily: 'Michroma, sans-serif', fontWeight: 700, color: '#9b87f5', fontSize: 15, lineHeight: 1, position: 'relative', zIndex: 1 }}>A</span>
      </div>
      <div className="hidden sm:flex flex-col leading-none gap-[3px]">
        <span className="text-white text-[13px] font-medium tracking-wide" style={{ fontFamily: 'Michroma, sans-serif' }}>ALIAX</span>
        <span className="text-white/50 text-[10px]" style={{ fontFamily: 'Manrope, sans-serif' }}>Salud Mental</span>
      </div>
    </>
  );

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-16 md:py-8">
      {/* Logo */}
      {onNavigate ? (
        <button onClick={() => onNavigate(0)} className="flex items-center gap-3">
          {logoContent}
        </button>
      ) : (
        <Link to="/" className="flex items-center gap-3 no-underline">
          {logoContent}
        </Link>
      )}

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV.map(l => (
          <Link key={l.to} to={l.to}
            className="text-white text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-white hover:text-[#0f0a1a] transition-all duration-300"
            style={{ fontFamily: 'Manrope, sans-serif' }}>
            {l.label}
          </Link>
        ))}
        <a href="https://www.aliax.io/demo"
          className="ml-1 inline-flex items-center gap-1.5 text-[#2dd4bf] border border-[#2dd4bf]/50 text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-[#2dd4bf]/10 transition-all duration-300"
          style={{ fontFamily: 'Manrope, sans-serif' }}>
          <CalendarClock size={13} />
          Reservar demo
        </a>
        <Link to="/login"
          className="ml-2 text-[#0f0a1a] bg-[#9b87f5] text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-white transition-all duration-300"
          style={{ fontFamily: 'Manrope, sans-serif' }}>
          Entrar
        </Link>
      </nav>

      {/* Mobile burger */}
      <button onClick={() => setOpen(true)}
        className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
        <Menu size={18} className="text-white" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-[#0f0a1a]/95 backdrop-blur-xl z-[100] flex flex-col">
          <div className="flex justify-end p-6">
            <button onClick={() => setOpen(false)}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
              <X size={18} className="text-white" />
            </button>
          </div>
          <div className="flex flex-col mt-8 px-6 gap-1">
            {NAV.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className="py-4 px-6 border-b border-white/5 text-white text-[16px] uppercase tracking-widest"
                style={{ fontFamily: 'Manrope, sans-serif' }}>
                {l.label}
              </Link>
            ))}
            <a href="https://www.aliax.io/demo" onClick={() => setOpen(false)}
              className="py-4 px-6 border-b border-white/5 text-[#2dd4bf] text-[16px] uppercase tracking-widest flex items-center gap-2"
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              <CalendarClock size={16} />
              Reservar demo
            </a>
            <Link to="/login" onClick={() => setOpen(false)}
              className="py-4 px-6 text-[#9b87f5] text-[16px] uppercase tracking-widest font-semibold"
              style={{ fontFamily: 'Manrope, sans-serif' }}>
              Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
