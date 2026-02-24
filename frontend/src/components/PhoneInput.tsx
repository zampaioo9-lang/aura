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
  error?: string;
  placeholder?: string;
}

export default function PhoneInput({
  value,
  onChange,
  label,
  optional,
  error,
  placeholder = '11 1234-5678',
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
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}{' '}
          {optional && <span className="text-slate-400 font-normal">(opcional)</span>}
        </label>
      )}
      <div ref={ref} className="relative flex gap-2">
        {/* Selector de país */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm shrink-0 transition-colors"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-slate-700 font-medium">{dialCode}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Input número */}
        <input
          type="tel"
          value={number}
          onChange={e => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-colors ${
            error ? 'border-red-300 bg-red-50' : 'border-slate-300'
          }`}
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
