import { useState, useEffect, useRef } from 'react';
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
    if (clean.startsWith(c.code)) {
      return { dialCode: c.code, number: clean.slice(c.code.length) };
    }
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
}: PhoneInputProps) {
  const [dialCode, setDialCode] = useState('+52');
  const [number, setNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parsePhone(value);
    setDialCode(parsed.dialCode);
    setNumber(parsed.number);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: isDark ? '#f1f0f5' : '#334155', marginBottom: 4 }}>
          {label}{' '}
          {required && <span style={{ color: '#f87171' }}>*</span>}
          {optional && <span style={{ color: isDark ? '#6b7280' : '#94a3b8', fontWeight: 400 }}>(opcional)</span>}
        </label>
      )}
      <div ref={ref} className="relative flex gap-2">
        {/* Selector de país */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px',
            border: `1px solid ${isDark ? 'rgba(45,212,191,0.2)' : '#cbd5e1'}`,
            borderRadius: 8,
            background: isDark ? 'rgba(45,212,191,0.06)' : '#ffffff',
            backdropFilter: isDark ? 'blur(8px)' : 'none',
            WebkitBackdropFilter: isDark ? 'blur(8px)' : 'none',
            color: isDark ? '#f1f0f5' : '#334155',
            fontSize: 14, cursor: 'pointer', flexShrink: 0, outline: 'none',
          }}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span style={{ fontWeight: 500 }}>{dialCode}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: isDark ? '#9ca3af' : '#94a3b8' }} />
        </button>

        {/* Input número */}
        <input
          type="tel"
          value={number}
          onChange={e => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '8px 12px',
            border: `1px solid ${error ? '#f87171' : isDark ? 'rgba(45,212,191,0.2)' : '#cbd5e1'}`,
            borderRadius: 8,
            background: isDark ? 'rgba(45,212,191,0.06)' : '#ffffff',
            backdropFilter: isDark ? 'blur(8px)' : 'none',
            WebkitBackdropFilter: isDark ? 'blur(8px)' : 'none',
            color: isDark ? '#f1f0f5' : '#0f172a',
            fontSize: 14, outline: 'none',
          }}
        />

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar país..."
                  className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder-slate-400"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin resultados</p>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.flag + c.name}
                    type="button"
                    onClick={() => handleDialChange(c.code)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-indigo-50 transition-colors ${
                      dialCode === c.code && selectedCountry.name === c.name
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700'
                    }`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-slate-400 text-xs font-mono">{c.code}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
