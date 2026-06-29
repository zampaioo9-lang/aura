import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format, parse, isValid } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import 'react-day-picker/dist/style.css';

interface Props {
  label: string;
  value: string;        // YYYY-MM-DD
  onChange: (v: string) => void;
  min?: string;         // YYYY-MM-DD
  isDark?: boolean;
  accent?: string;      // rgb(r, g, b)
}

function parseAccent(accent?: string) {
  const m = accent?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const [r, g, b] = m ? [+m[1], +m[2], +m[3]] : [45, 212, 191];
  const mkRgb = (f: number) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
  return {
    main: `rgb(${r},${g},${b})`,
    dark2: mkRgb(0.55),
    bg15: `rgba(${r},${g},${b},0.15)`,
    bg12: `rgba(${r},${g},${b},0.12)`,
    border30: `rgba(${r},${g},${b},0.3)`,
    border25: `rgba(${r},${g},${b},0.25)`,
    popupBg: `linear-gradient(145deg, ${mkRgb(0.14)} 0%, ${mkRgb(0.06)} 100%)`,
  };
}

export default function DatePickerField({ label, value, onChange, min, isDark = false, accent }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const AC = parseAccent(accent);

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const minDate  = min  ? parse(min,   'yyyy-MM-dd', new Date()) : undefined;

  const displayValue = selected && isValid(selected)
    ? format(selected, 'dd/MM/yyyy')
    : '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (day: Date | undefined) => {
    if (day) { onChange(format(day, 'yyyy-MM-dd')); setOpen(false); }
  };

  const popupBg = isDark ? AC.popupBg : '#fff';
  const dayTextColor = isDark ? '#e8f0f0' : '#1a1a1a';
  const dimColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.25)';
  const monthColor = isDark ? '#e8f0f0' : '#1a1a1a';

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      <label style={{ fontSize: 12, color: 'var(--sc-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--sc-inner)', border: `1px solid ${open ? AC.main : 'var(--sc-border)'}`,
          borderRadius: 8, padding: '10px 14px',
          color: displayValue ? 'var(--sc-text)' : 'var(--sc-muted)',
          fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer',
          transition: 'border-color .15s', outline: 'none', width: '100%',
        }}
      >
        <span>{displayValue || 'dd/mm/aaaa'}</span>
        <CalendarDays size={15} style={{ color: open ? AC.main : 'var(--sc-muted)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: popupBg,
          border: `1px solid ${AC.border25}`,
          borderRadius: 14,
          boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.2)',
          padding: '8px 4px',
        }}>
          <style>{`
            .rdp-root {
              --rdp-accent-color: ${AC.main};
              --rdp-accent-background-color: ${AC.bg15};
              font-family: 'DM Sans', sans-serif;
            }
            .rdp-day_button {
              color: ${dayTextColor} !important;
              font-size: 14px;
              border-radius: 50% !important;
              font-weight: 500;
            }
            .rdp-selected .rdp-day_button,
            .rdp-day_button[aria-selected="true"] {
              background-color: ${AC.main} !important;
              color: #fff !important;
              font-weight: 700 !important;
            }
            .rdp-today .rdp-day_button {
              color: ${AC.main} !important;
              font-weight: 700 !important;
              border: 2px solid ${AC.main} !important;
            }
            .rdp-day_button:hover:not([aria-selected="true"]):not([disabled]) {
              background-color: ${AC.bg12} !important;
              color: ${AC.dark2} !important;
            }
            .rdp-disabled .rdp-day_button,
            .rdp-outside .rdp-day_button {
              color: ${dimColor} !important;
            }
            .rdp-caption_label, .rdp-month_caption {
              color: ${monthColor} !important;
              font-weight: 700 !important;
              font-size: 15px !important;
            }
            .rdp-weekday {
              color: ${AC.main} !important;
              font-size: 11px !important;
              font-weight: 700 !important;
            }
            .rdp-nav button, .rdp-button_previous, .rdp-button_next {
              color: ${AC.main} !important;
              border-radius: 8px !important;
            }
            .rdp-nav button:hover, .rdp-button_previous:hover, .rdp-button_next:hover {
              background: ${AC.bg12} !important;
            }
            .rdp-nav button svg, .rdp-button_previous svg, .rdp-button_next svg {
              fill: ${AC.main} !important;
              stroke: ${AC.main} !important;
              color: ${AC.main} !important;
            }
          `}</style>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={es}
            disabled={minDate ? { before: minDate } : undefined}
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px 2px', borderTop: `1px solid ${AC.border25}`, marginTop: 4 }}>
                <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                  style={{ fontSize: 13, color: AC.main, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                  Borrar
                </button>
                <button type="button" onClick={() => handleSelect(new Date())}
                  style={{ fontSize: 13, color: AC.main, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                  Hoy
                </button>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
