import { useState, useEffect, useRef } from 'react';
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
}

export default function CountrySelect({
  value,
  onChange,
  label,
  placeholder = 'Selecciona tu país',
  required,
  isDark = false,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: isDark ? '#f1f0f5' : '#334155', marginBottom: 4 }}>
          {label} {required && <span style={{ color: '#f87171' }}>*</span>}
        </label>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
            borderRadius: 8,
            background: isDark ? '#2a2640' : '#ffffff',
            color: isDark ? '#f1f0f5' : '#334155',
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

        {open && (
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
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
                    key={c.name}
                    type="button"
                    onClick={() => handleSelect(c.name)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-indigo-50 transition-colors ${
                      value === c.name ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
