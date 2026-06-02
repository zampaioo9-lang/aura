import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface Option { value: string; label: string; }

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}

export default function CustomSelect({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value) ?? options[0];

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const dropH = Math.min(options.length * 44, 220);
      const top = spaceBelow >= dropH + 8
        ? r.bottom + 4
        : r.top - dropH - 4;
      setCoords({ top, left: r.left, width: r.width });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const dropdown = open ? createPortal(
    <div ref={dropRef} style={{
      position: 'fixed',
      top: coords.top, left: coords.left, width: coords.width,
      zIndex: 99999,
      background: '#fff',
      border: '1px solid rgba(45,212,191,0.3)',
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      overflow: 'hidden',
      maxHeight: 220,
      overflowY: 'auto',
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); setOpen(false); }}
          style={{
            width: '100%', textAlign: 'left', padding: '10px 14px',
            background: opt.value === value ? 'rgba(45,212,191,0.12)' : 'transparent',
            color: opt.value === value ? '#0d9488' : '#1a1a1a',
            fontFamily: 'DM Sans', fontSize: 14,
            border: 'none', cursor: 'pointer',
            borderLeft: opt.value === value ? '3px solid #2dd4bf' : '3px solid transparent',
            fontWeight: opt.value === value ? 600 : 400,
            transition: 'background .12s',
            display: 'block',
          }}
          onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,212,191,0.06)'; }}
          onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          {opt.label}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--sc-inner)', border: `1px solid ${open ? '#2dd4bf' : 'var(--sc-border)'}`,
          borderRadius: 8, padding: '10px 14px',
          color: 'var(--sc-text)', fontFamily: 'DM Sans', fontSize: 14,
          cursor: 'pointer', outline: 'none', transition: 'border-color .15s',
        }}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} style={{ color: 'var(--sc-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
      </button>
      {dropdown}
    </div>
  );
}
