import { useState, useEffect } from 'react';
import { CITIES_BY_COUNTRY } from '../lib/cities';

interface CitySelectProps {
  country: string;
  value: string;
  onChange: (value: string) => void;
  isDark?: boolean;
  className?: string;
}

const OTHER = '__otra__';

export default function CitySelect({ country, value, onChange, isDark = false, className }: CitySelectProps) {
  const cities = CITIES_BY_COUNTRY[country] ?? [];
  const hasCities = cities.length > 0;

  const [showInput, setShowInput] = useState(false);

  // When country changes, reset city and input mode
  useEffect(() => {
    onChange('');
    setShowInput(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // On mount or when value changes externally, detect if value is a custom city
  useEffect(() => {
    if (hasCities && value && !cities.includes(value)) {
      setShowInput(true);
    }
  }, []);  // only on mount

  const baseInput: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
    borderRadius: 8,
    background: isDark ? '#2a2640' : '#ffffff',
    color: isDark ? '#f1f0f5' : '#334155',
    fontSize: 14,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: isDark ? '#f1f0f5' : '#334155',
    marginBottom: 4,
  };

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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === OTHER) {
      setShowInput(true);
      onChange('');
    } else {
      setShowInput(false);
      onChange(val);
    }
  };

  const selectValue = showInput ? OTHER : (value || '');

  return (
    <div className={className}>
      <label style={labelStyle}>Ciudad</label>
      <select value={selectValue} onChange={handleSelectChange} style={baseInput}>
        <option value="">Selecciona una ciudad</option>
        {cities.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
        <option value={OTHER}>Otra ciudad...</option>
      </select>
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
