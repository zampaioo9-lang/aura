import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { CITIES_BY_COUNTRY } from '../lib/cities';

interface CitySelectProps {
  country: string;
  value: string;
  onChange: (value: string) => void;
  isDark?: boolean;
  className?: string;
}


const ACCENT_MAP: Record<string, string> = {
  profesional: '#9333ea', bold: '#deb607', elegante: '#3e99c9',
  creative: '#d948f0', carbono: '#14463f', aguamarina: '#2dd4bf', nocturno: '#581c9b',
};
function darkBg(amount = 0.45): string {
  const hex = ACCENT_MAP[localStorage.getItem('aliax_accent') || 'profesional'] ?? '#9333ea';
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * amount)},${Math.round(g * amount)},${Math.round(b * amount)})`;
}

export default function CitySelect({ country, value, onChange, isDark = false, className }: CitySelectProps) {
  const cities = CITIES_BY_COUNTRY[country] ?? [];
  const hasCities = cities.length > 0;

  const [showInput, setShowInput] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onChange('');
    setShowInput(false);
    setOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  useEffect(() => {
    if (hasCities && value && !cities.includes(value)) {
      setShowInput(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const baseInput: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${isDark ? 'rgba(45,212,191,0.2)' : 'rgba(13,148,136,0.25)'}`,
    borderRadius: 8,
    background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
    backdropFilter: isDark ? 'blur(8px)' : 'none',
    WebkitBackdropFilter: isDark ? 'blur(8px)' : 'none',
    color: isDark ? '#e8f0f0' : '#334155',
    fontSize: 14,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 500,
    color: isDark ? '#e8f0f0' : '#334155', marginBottom: 4,
  };

  const dropdownBg = isDark ? darkBg(0.45) : '#ffffff';
  const textColor  = isDark ? '#e8f0f0' : '#334155';
  const mutedColor = isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8';

  if (!hasCities) {
    return (
      <div className={className}>
        <label style={labelStyle}>Ciudad</label>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Ej: Ciudad de México, Bogotá..."
          style={baseInput}
        />
      </div>
    );
  }

  const displayLabel = showInput
    ? 'Otra ciudad...'
    : value || 'Selecciona una ciudad';
  const labelColor = (!showInput && value) ? textColor : mutedColor;

  return (
    <div className={className} ref={ref} style={{ position: 'relative' }}>
      <label style={labelStyle}>Ciudad</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...baseInput,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ color: labelColor, fontSize: 14 }}>{displayLabel}</span>
        <ChevronDown size={14} style={{ flexShrink: 0, color: mutedColor, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: dropdownBg,
          border: `1px solid ${isDark ? 'rgba(45,212,191,0.2)' : '#e2e8f0'}`,
          borderRadius: 10, overflow: 'hidden',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.1)',
          maxHeight: 220, overflowY: 'auto', zIndex: 100,
        }}>
          {cities.map(c => {
            const active = !showInput && value === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setShowInput(false); onChange(c); setOpen(false); }}
                style={{
                  width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontSize: 14, fontFamily: 'inherit',
                  background: active ? 'rgba(45,212,191,0.12)' : 'transparent',
                  color: active ? '#2dd4bf' : textColor,
                  borderLeft: active ? '3px solid #2dd4bf' : '3px solid transparent',
                  fontWeight: active ? 600 : 400,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(45,212,191,0.04)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {c}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => { setShowInput(true); onChange(''); setOpen(false); }}
            style={{
              width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer',
              textAlign: 'left', fontSize: 14, fontFamily: 'inherit', fontStyle: 'italic',
              background: showInput ? 'rgba(45,212,191,0.12)' : 'transparent',
              color: showInput ? '#2dd4bf' : mutedColor,
              borderLeft: showInput ? '3px solid #2dd4bf' : '3px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!showInput) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(45,212,191,0.04)'; }}
            onMouseLeave={e => { if (!showInput) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            Otra ciudad...
          </button>
        </div>
      )}

      {showInput && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Escribe tu ciudad"
          style={{ ...baseInput, marginTop: 6 }}
          autoFocus
        />
      )}
    </div>
  );
}
