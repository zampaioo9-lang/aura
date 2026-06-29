import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

const COUNTRIES = [
  { flag: '🇩🇪', name: 'Alemania' },
  { flag: '🇦🇷', name: 'Argentina' },
  { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇧🇴', name: 'Bolivia' },
  { flag: '🇧🇷', name: 'Brasil' },
  { flag: '🇨🇦', name: 'Canadá' },
  { flag: '🇨🇱', name: 'Chile' },
  { flag: '🇨🇳', name: 'China' },
  { flag: '🇨🇴', name: 'Colombia' },
  { flag: '🇨🇷', name: 'Costa Rica' },
  { flag: '🇨🇺', name: 'Cuba' },
  { flag: '🇩🇴', name: 'Rep. Dominicana' },
  { flag: '🇪🇨', name: 'Ecuador' },
  { flag: '🇸🇻', name: 'El Salvador' },
  { flag: '🇪🇸', name: 'España' },
  { flag: '🇺🇸', name: 'Estados Unidos' },
  { flag: '🇫🇷', name: 'Francia' },
  { flag: '🇬🇹', name: 'Guatemala' },
  { flag: '🇭🇳', name: 'Honduras' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇮🇹', name: 'Italia' },
  { flag: '🇯🇵', name: 'Japón' },
  { flag: '🇲🇽', name: 'México' },
  { flag: '🇳🇮', name: 'Nicaragua' },
  { flag: '🇵🇦', name: 'Panamá' },
  { flag: '🇵🇾', name: 'Paraguay' },
  { flag: '🇵🇪', name: 'Perú' },
  { flag: '🇵🇹', name: 'Portugal' },
  { flag: '🇵🇷', name: 'Puerto Rico' },
  { flag: '🇬🇧', name: 'Reino Unido' },
  { flag: '🇺🇾', name: 'Uruguay' },
  { flag: '🇻🇪', name: 'Venezuela' },
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  isDark?: boolean;
  accent?: string;
}

export default function CountrySelect({
  value,
  onChange,
  label,
  placeholder = 'Selecciona tu país',
  required,
  isDark = false,
  accent,
}: CountrySelectProps) {
  const m = accent?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const [ar, ag, ab] = m ? [+m[1], +m[2], +m[3]] : [45, 212, 191];

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const dropH = 280;
      const top = spaceBelow >= dropH ? r.bottom + 4 : r.top - dropH - 4;
      setCoords({ top, left: r.left, width: r.width });
    }
    setOpen(o => !o);
    setSearch('');
  };

  const selected = COUNTRIES.find(c => c.name === value);
  const filtered = search
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : COUNTRIES;

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const dropBg = isDark
    ? `rgb(${Math.round(ar * 0.12)},${Math.round(ag * 0.12)},${Math.round(ab * 0.12)})`
    : '#ffffff';

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 99999,
        background: dropBg,
        border: `1px solid rgba(${ar},${ag},${ab},${isDark ? '0.25' : '0.2'})`,
        borderRadius: 10,
        boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.7)' : '0 8px 32px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 8, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
          borderRadius: 8,
        }}>
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar país..."
            style={{ flex: 1, background: 'transparent', fontSize: 13, outline: 'none', color: isDark ? '#e8f0f0' : '#334155', border: 'none' }}
            autoFocus
          />
        </div>
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `rgba(${ar},${ag},${ab},0.4) transparent` }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8', textAlign: 'center', padding: '16px 0' }}>Sin resultados</p>
        ) : (
          filtered.map(c => (
            <button
              key={c.name}
              type="button"
              onClick={() => handleSelect(c.name)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 13, fontFamily: 'inherit',
                background: value === c.name ? `rgba(${ar},${ag},${ab},0.15)` : 'transparent',
                color: value === c.name ? `rgb(${ar},${ag},${ab})` : (isDark ? '#e8f0f0' : '#334155'),
                borderLeft: value === c.name ? `3px solid rgb(${ar},${ag},${ab})` : '3px solid transparent',
                fontWeight: value === c.name ? 600 : 400,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (value !== c.name) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.07)' : `rgba(${ar},${ag},${ab},0.07)`; }}
              onMouseLeave={e => { if (value !== c.name) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>{c.flag}</span>
              <span>{c.name}</span>
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: isDark ? '#f1f0f5' : '#334155', marginBottom: 4 }}>
          {label} {required && <span style={{ color: '#f87171' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <button
          ref={btnRef}
          type="button"
          onClick={handleOpen}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            border: `1px solid ${isDark ? `rgba(${ar},${ag},${ab},0.2)` : '#cbd5e1'}`,
            borderRadius: 8,
            background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
            backdropFilter: isDark ? 'blur(8px)' : 'none',
            color: isDark ? '#e8f0f0' : '#334155',
            fontSize: 14, cursor: 'pointer', outline: 'none', textAlign: 'left',
          }}
        >
          {selected ? (
            <>
              <span className="text-base leading-none">{selected.flag}</span>
              <span style={{ flex: 1 }}>{selected.name}</span>
              <X
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: isDark ? '#6b7280' : '#94a3b8' }}
                onClick={handleClear}
              />
            </>
          ) : (
            <>
              <span style={{ flex: 1, color: isDark ? '#6b7280' : '#94a3b8' }}>{placeholder}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: isDark ? '#6b7280' : '#94a3b8' }} />
            </>
          )}
        </button>
        {dropdown}
      </div>
    </div>
  );
}
