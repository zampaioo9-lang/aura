import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

const COUNTRIES = [
  { flag: '🇩🇪', name: 'Alemania',           code: '+49'   },
  { flag: '🇦🇷', name: 'Argentina',           code: '+54'   },
  { flag: '🇦🇺', name: 'Australia',           code: '+61'   },
  { flag: '🇧🇴', name: 'Bolivia',             code: '+591'  },
  { flag: '🇧🇷', name: 'Brasil',              code: '+55'   },
  { flag: '🇨🇦', name: 'Canadá',             code: '+1'    },
  { flag: '🇨🇱', name: 'Chile',               code: '+56'   },
  { flag: '🇨🇳', name: 'China',               code: '+86'   },
  { flag: '🇨🇴', name: 'Colombia',            code: '+57'   },
  { flag: '🇨🇷', name: 'Costa Rica',          code: '+506'  },
  { flag: '🇨🇺', name: 'Cuba',                code: '+53'   },
  { flag: '🇩🇴', name: 'Rep. Dominicana',     code: '+1809' },
  { flag: '🇪🇨', name: 'Ecuador',             code: '+593'  },
  { flag: '🇸🇻', name: 'El Salvador',         code: '+503'  },
  { flag: '🇪🇸', name: 'España',              code: '+34'   },
  { flag: '🇺🇸', name: 'Estados Unidos',      code: '+1'    },
  { flag: '🇫🇷', name: 'Francia',             code: '+33'   },
  { flag: '🇬🇹', name: 'Guatemala',           code: '+502'  },
  { flag: '🇭🇳', name: 'Honduras',            code: '+504'  },
  { flag: '🇮🇳', name: 'India',               code: '+91'   },
  { flag: '🇮🇹', name: 'Italia',              code: '+39'   },
  { flag: '🇯🇵', name: 'Japón',              code: '+81'   },
  { flag: '🇲🇽', name: 'México',              code: '+52'   },
  { flag: '🇳🇮', name: 'Nicaragua',           code: '+505'  },
  { flag: '🇵🇦', name: 'Panamá',             code: '+507'  },
  { flag: '🇵🇾', name: 'Paraguay',            code: '+595'  },
  { flag: '🇵🇪', name: 'Perú',               code: '+51'   },
  { flag: '🇵🇹', name: 'Portugal',            code: '+351'  },
  { flag: '🇵🇷', name: 'Puerto Rico',         code: '+1787' },
  { flag: '🇬🇧', name: 'Reino Unido',         code: '+44'   },
  { flag: '🇺🇾', name: 'Uruguay',             code: '+598'  },
  { flag: '🇻🇪', name: 'Venezuela',           code: '+58'   },
];

function parsePhone(value: string): { dialCode: string; number: string } {
  if (!value) return { dialCode: '+52', number: '' };
  const clean = value.replace(/\s/g, '');
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (clean.startsWith(c.code)) return { dialCode: c.code, number: clean.slice(c.code.length) };
  }
  return { dialCode: '+52', number: value };
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  optional?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
  isDark?: boolean;
  accent?: string;
}

export default function PhoneInput({
  value,
  onChange,
  label,
  optional,
  required,
  error,
  placeholder = '55 1234 5678',
  isDark = false,
  accent,
}: PhoneInputProps) {
  const [dialCode, setDialCode] = useState('+52');
  const [number, setNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parsePhone(value);
    setDialCode(parsed.dialCode);
    setNumber(parsed.number);
  }, [value]);

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
      const top = spaceBelow >= 300 ? r.bottom + 4 : r.top - 300 - 4;
      setCoords({ top, left: r.left });
    }
    setOpen(o => !o);
    setSearch('');
  };

  const handleDialChange = (code: string) => {
    setDialCode(code);
    setOpen(false);
    setSearch('');
    onChange(code + number);
  };

  const handleNumberChange = (n: string) => {
    setNumber(n);
    onChange(dialCode + n);
  };

  const selectedCountry = COUNTRIES.find(c => c.code === dialCode) ?? COUNTRIES.find(c => c.name === 'México')!;
  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.includes(search)
      )
    : COUNTRIES;

  // Derive accent tokens
  const m = accent?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const [ar, ag, ab] = m ? [+m[1], +m[2], +m[3]] : [45, 212, 191];
  const accentMain = `rgb(${ar},${ag},${ab})`;
  const accentBgDark = `rgba(${ar},${ag},${ab},0.15)`;
  const accentBgLight = `rgba(${ar},${ag},${ab},0.1)`;

  // Input field shared styles
  const fieldBorder = `1px solid ${error ? '#f87171' : isDark ? `rgba(${ar},${ag},${ab},0.2)` : '#cbd5e1'}`;
  const fieldBg = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const fieldColor = isDark ? '#f1f0f5' : '#0f172a';

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: 288,
        zIndex: 99999,
        background: isDark
          ? `linear-gradient(145deg, rgb(${Math.round(ar * 0.12)},${Math.round(ag * 0.12)},${Math.round(ab * 0.12)}) 0%, rgb(${Math.round(ar * 0.05)},${Math.round(ag * 0.05)},${Math.round(ab * 0.05)}) 100%)`
          : '#ffffff',
        border: `1px solid ${isDark ? `rgba(${ar},${ag},${ab},0.2)` : '#e2e8f0'}`,
        borderRadius: 12,
        boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}
    >
      {/* Search */}
      <div style={{ padding: 8, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
          borderRadius: 8,
        }}>
          <Search size={14} style={{ color: isDark ? '#6b7280' : '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar país..."
            autoFocus
            style={{
              flex: 1, background: 'transparent', outline: 'none', border: 'none',
              fontSize: 13, fontFamily: 'DM Sans, sans-serif',
              color: isDark ? '#e8e8e8' : '#374151',
            }}
          />
        </div>
      </div>
      {/* List */}
      <div style={{ maxHeight: 224, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `rgba(${ar},${ag},${ab},0.4) transparent` }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: isDark ? '#6b7280' : '#94a3b8', textAlign: 'center', padding: '16px 0' }}>Sin resultados</p>
        ) : (
          filtered.map(c => {
            const isActive = dialCode === c.code && selectedCountry.name === c.name;
            return (
              <button
                key={c.flag + c.name}
                type="button"
                onClick={() => handleDialChange(c.code)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', border: 'none', cursor: 'pointer',
                  background: isActive ? (isDark ? accentBgDark : accentBgLight) : 'transparent',
                  color: isActive ? accentMain : isDark ? '#d0d0d0' : '#374151',
                  fontSize: 13, textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{c.flag}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.55 }}>{c.code}</span>
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: isDark ? '#f1f0f5' : '#334155', marginBottom: 4 }}>
          {label}{' '}
          {required && <span style={{ color: '#f87171' }}>*</span>}
          {optional && <span style={{ color: isDark ? '#6b7280' : '#94a3b8', fontWeight: 400 }}>(opcional)</span>}
        </label>
      )}
      <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
        {/* Country selector button */}
        <button
          ref={btnRef}
          type="button"
          onClick={handleOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px',
            border: fieldBorder,
            borderRadius: 8,
            background: fieldBg,
            color: fieldColor,
            fontSize: 14, cursor: 'pointer', flexShrink: 0, outline: 'none',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'border-color .15s',
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{selectedCountry.flag}</span>
          <span style={{ fontWeight: 500 }}>{dialCode}</span>
          <ChevronDown size={13} style={{ color: isDark ? '#9ca3af' : '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>

        {/* Number input */}
        <input
          type="tel"
          value={number}
          onChange={e => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '8px 12px',
            border: fieldBorder,
            borderRadius: 8,
            background: fieldBg,
            color: fieldColor,
            fontSize: 14, outline: 'none',
            fontFamily: 'DM Sans, sans-serif',
          }}
        />

        {dropdown}
      </div>
      {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  );
}
