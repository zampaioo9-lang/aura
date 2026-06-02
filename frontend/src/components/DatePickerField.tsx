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
}

export default function DatePickerField({ label, value, onChange, min, isDark = true }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          background: 'var(--sc-inner)', border: `1px solid ${open ? '#2dd4bf' : 'var(--sc-border)'}`,
          borderRadius: 8, padding: '10px 14px',
          color: displayValue ? 'var(--sc-text)' : 'var(--sc-muted)',
          fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer',
          transition: 'border-color .15s', outline: 'none', width: '100%',
        }}
      >
        <span>{displayValue || 'dd/mm/aaaa'}</span>
        <CalendarDays size={15} style={{ color: open ? '#2dd4bf' : 'var(--sc-muted)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#fff',
          border: '1px solid rgba(45,212,191,0.3)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: '8px 4px',
        }}>
          <style>{`
            .rdp-root {
              --rdp-accent-color: #2dd4bf;
              --rdp-accent-background-color: rgba(45,212,191,0.15);
              font-family: 'DM Sans', sans-serif;
            }
            /* Días — texto oscuro sobre blanco */
            .rdp-day_button {
              color: #1a1a1a !important;
              font-size: 14px;
              border-radius: 50% !important;
              font-weight: 500;
            }
            /* Día seleccionado */
            .rdp-selected .rdp-day_button,
            .rdp-day_button[aria-selected="true"] {
              background-color: #2dd4bf !important;
              color: #fff !important;
              font-weight: 700 !important;
            }
            /* Hoy */
            .rdp-today .rdp-day_button {
              color: #2dd4bf !important;
              font-weight: 700 !important;
              border: 2px solid #2dd4bf !important;
            }
            /* Hover */
            .rdp-day_button:hover:not([aria-selected="true"]):not([disabled]) {
              background-color: rgba(45,212,191,0.12) !important;
              color: #0d9488 !important;
            }
            /* Días deshabilitados y outside */
            .rdp-disabled .rdp-day_button,
            .rdp-outside .rdp-day_button {
              color: rgba(0,0,0,0.25) !important;
            }
            /* Cabecera del mes */
            .rdp-caption_label, .rdp-month_caption {
              color: #1a1a1a !important;
              font-weight: 700 !important;
              font-size: 15px !important;
            }
            /* Días de la semana */
            .rdp-weekday {
              color: #2dd4bf !important;
              font-size: 11px !important;
              font-weight: 700 !important;
            }
            /* Flechas de navegación */
            .rdp-nav button, .rdp-button_previous, .rdp-button_next {
              color: #2dd4bf !important;
              border-radius: 8px !important;
            }
            .rdp-nav button:hover, .rdp-button_previous:hover, .rdp-button_next:hover {
              background: rgba(45,212,191,0.12) !important;
            }
            .rdp-nav button svg, .rdp-button_previous svg, .rdp-button_next svg {
              fill: #2dd4bf !important;
              stroke: #2dd4bf !important;
              color: #2dd4bf !important;
            }
          `}</style>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={es}
            disabled={minDate ? { before: minDate } : undefined}
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px 2px', borderTop: `1px solid rgba(45,212,191,0.25)`, marginTop: 4 }}>
                <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                  style={{ fontSize: 13, color: '#2dd4bf', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                  Borrar
                </button>
                <button type="button" onClick={() => handleSelect(new Date())}
                  style={{ fontSize: 13, color: '#2dd4bf', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans' }}>
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
