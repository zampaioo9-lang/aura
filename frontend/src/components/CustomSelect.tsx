import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface Option { value: string; label: string; }

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  dark?: boolean;
  accent?: string; // rgb(r, g, b)
  triggerStyle?: React.CSSProperties;
}

function makeAccentTokens(accent?: string) {
  const isObsidiana = accent === 'rgb(21,17,32)';
  const m = (isObsidiana ? undefined : accent)?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const [r, g, b] = m ? [+m[1], +m[2], +m[3]] : [45, 212, 191];
  const mkRgb = (f: number) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
  const mk = (a: number) => `rgba(${r},${g},${b},${a})`;
  return {
    main: `rgb(${r},${g},${b})`,
    darkBg: `linear-gradient(145deg, ${mkRgb(0.14)} 0%, ${mkRgb(0.06)} 100%)`,
    border: mk(0.25),
    borderOpen: mk(0.5),
    optionActiveBg: mk(0.15),
    optionHoverBg: mk(0.08),
    optionHoverBgLight: mk(0.06),
    icon: mkRgb(0.62),
    mutedDark: mkRgb(0.48),
  };
}

export default function CustomSelect({ value, onChange, options, placeholder = 'Seleccionar', dark = false, accent, triggerStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);
  const AC = makeAccentTokens(accent);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const dropH = Math.min(options.length * 40, 220);
      const top = spaceBelow >= dropH + 8 ? r.bottom + 4 : r.top - dropH - 4;
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

  const D = {
    dropBg: AC.darkBg,
    dropBorder: AC.border,
    dropShadow: '0 16px 48px rgba(0,0,0,0.6)',
    optionActive: AC.optionActiveBg,
    optionActiveText: AC.main,
    optionHover: AC.optionHoverBg,
    optionText: '#cde0de',
    optionBorder: AC.main,
  };

  const L = {
    dropBg: '#fff',
    dropBorder: AC.border,
    dropShadow: '0 8px 24px rgba(0,0,0,0.18)',
    optionActive: AC.optionActiveBg,
    optionActiveText: AC.main,
    optionHover: AC.optionHoverBgLight,
    optionText: '#1a1a1a',
    optionBorder: AC.main,
  };

  const T = dark ? D : L;

  const defaultTriggerStyle: React.CSSProperties = dark
    ? {
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.11)',
        border: `1px solid ${open ? AC.borderOpen : 'rgba(45,212,191,0.45)'}`,
        borderRadius: 8, padding: '10px 14px',
        color: selected ? '#e8f0f0' : 'rgba(255,255,255,0.62)',
        fontFamily: 'DM Sans, sans-serif', fontSize: 14,
        cursor: 'pointer', outline: 'none', transition: 'border-color .15s',
        boxSizing: 'border-box',
      }
    : {
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--sc-inner, #fff)',
        border: `1px solid ${open ? AC.main : 'var(--sc-border, #d1d5db)'}`,
        borderRadius: 8, padding: '10px 14px',
        color: 'var(--sc-text, #111)',
        fontFamily: 'DM Sans, sans-serif', fontSize: 14,
        cursor: 'pointer', outline: 'none', transition: 'border-color .15s',
        boxSizing: 'border-box',
      };

  const computedTriggerStyle: React.CSSProperties = triggerStyle
    ? {
        ...defaultTriggerStyle,
        ...triggerStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        outline: 'none',
        boxSizing: 'border-box' as const,
      }
    : defaultTriggerStyle;

  const dropdown = open ? createPortal(
    <div ref={dropRef} style={{
      position: 'fixed',
      top: coords.top, left: coords.left, width: coords.width,
      zIndex: 99999,
      background: T.dropBg,
      border: `1px solid ${T.dropBorder}`,
      borderRadius: 10,
      boxShadow: T.dropShadow,
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
            background: opt.value === value ? T.optionActive : 'transparent',
            color: opt.value === value ? T.optionActiveText : T.optionText,
            fontFamily: 'DM Sans, sans-serif', fontSize: 14,
            border: 'none', cursor: 'pointer',
            borderLeft: `3px solid ${opt.value === value ? T.optionBorder : 'transparent'}`,
            fontWeight: opt.value === value ? 600 : 400,
            transition: 'background .1s',
            display: 'block',
          }}
          onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = T.optionHover; }}
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
      <button ref={btnRef} type="button" onClick={handleOpen} style={computedTriggerStyle}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? <span style={{ color: dark ? AC.mutedDark : 'var(--sc-muted, #9ca3af)' }}>{placeholder}</span>}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: dark ? AC.icon : 'var(--sc-muted, #9ca3af)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .15s',
            flexShrink: 0, marginLeft: 6,
          }}
        />
      </button>
      {dropdown}
    </div>
  );
}
