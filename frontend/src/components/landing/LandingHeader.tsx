import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

interface Props {
  onNavigate: (ratio: number) => void;
}

const NAV = [
  { label: 'Explorar', to: '/explorar' },
  { label: 'Precios',  to: '/pricing'  },
];

export default function LandingHeader({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-16 md:py-8">
      {/* Logo */}
      <button onClick={() => onNavigate(0)} className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#2dd4bf] flex items-center justify-center shrink-0">
          <span className="font-bold text-[#0f0a1a] text-sm leading-none" style={{ fontFamily: 'Michroma, sans-serif' }}>A</span>
        </div>
        <div className="hidden sm:flex flex-col leading-none gap-[3px]">
          <span className="text-white text-[13px] font-medium tracking-wide" style={{ fontFamily: 'Michroma, sans-serif' }}>ALIAX</span>
          <span className="text-white/50 text-[10px]" style={{ fontFamily: 'Manrope, sans-serif' }}>Salud Mental</span>
        </div>
      </button>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV.map(l => (
          <Link key={l.to} to={l.to}
            className="text-white text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-white hover:text-[#0f0a1a] transition-all duration-300"
            style={{ fontFamily: 'Manrope, sans-serif' }}>
            {l.label}
          </Link>
        ))}
        <Link to="/login"
          className="ml-2 text-[#0f0a1a] bg-[#2dd4bf] text-[12px] font-medium tracking-wider px-4 py-2 rounded-full hover:bg-white transition-all duration-300"
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
                style={{ fontFamily: 'Michroma, sans-serif' }}>
                {l.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setOpen(false)}
              className="py-4 px-6 text-[#2dd4bf] text-[16px] uppercase tracking-widest font-semibold"
              style={{ fontFamily: 'Michroma, sans-serif' }}>
              Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
