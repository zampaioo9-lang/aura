import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  placeholder?: string;
  accent?: string; // rgb(r, g, b)
  highlightedDays?: Set<number>; // day-of-week numbers (0=Sun…6=Sat) that have availability
  allowYearPicker?: boolean;     // enables clicking the header to pick a year (birthdate UX)
  isDark?: boolean;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const YEARS_PER_PAGE = 20;

function makeColors(accent?: string, isDark = true) {
  const m = accent?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const [r, g, b] = m ? [+m[1], +m[2], +m[3]] : [45, 212, 191];
  const mkRgb = (f: number) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
  const mk = (a: number) => `rgba(${r},${g},${b},${a})`;
  return {
    main: `rgb(${r},${g},${b})`,
    popupBg: `linear-gradient(145deg, ${mkRgb(0.14)} 0%, ${mkRgb(0.06)} 100%)`,
    border: mk(0.25),
    borderFocus: mk(0.5),
    borderLight: mk(0.15),
    selectedBg: `linear-gradient(135deg, rgb(${r},${g},${b}), ${mkRgb(0.55)})`,
    selectedShadow: mk(0.35),
    todayBg: mk(0.15),
    hoverBg: mk(0.12),
    availableBg: mk(0.10),
    mutedText: mkRgb(0.48),
    icon: isDark ? 'rgba(255,255,255,0.6)' : mkRgb(0.45),
    dimDay: mk(0.1),
    footerBorder: mk(0.1),
    todayBtnBg: mk(0.12),
    todayBtnBorder: mk(0.3),
    r, g, b,
  };
}

// Convert grid position (0=Mon…6=Sun) back to JS dow (0=Sun…6=Sat)
function gridDowToJs(grid: number): number {
  return grid === 6 ? 0 : grid + 1;
}

export default function CustomDatePicker({
  value, onChange, style, triggerStyle,
  placeholder = 'Seleccionar fecha',
  accent, highlightedDays, allowYearPicker, isDark = true,
}: Props) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value ? +value.split('-')[0] : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? +value.split('-')[1] - 1 : today.getMonth());
  const [pickerMode, setPickerMode] = useState<'days' | 'years'>('days');
  const [yearPageStart, setYearPageStart] = useState(() => {
    const yr = value ? +value.split('-')[0] : today.getFullYear();
    return Math.floor(yr / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  });

  const ref = useRef<HTMLDivElement>(null);
  const C = makeColors(accent, isDark);

  // Light/dark popup theme
  const P = {
    bg:      isDark ? C.popupBg : 'rgba(255,255,255,0.98)',
    shadow:  isDark ? `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${C.dimDay}` : `0 8px 32px rgba(0,0,0,0.14)`,
    text:    isDark ? '#e8f0f0' : '#1a2e2b',
    muted:   isDark ? C.mutedText : 'rgba(0,0,0,0.45)',
    dim:     isDark ? C.dimDay : 'rgba(0,0,0,0.2)',
    dayNorm: isDark ? '#cde0de' : '#2d3748',
    navBg:   isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    hoverBg: C.hoverBg,
    border:  C.border,
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPickerMode('days');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (value) {
      const yr = +value.split('-')[0];
      setViewYear(yr);
      setViewMonth(+value.split('-')[1] - 1);
      setYearPageStart(Math.floor(yr / YEARS_PER_PAGE) * YEARS_PER_PAGE);
    }
  }, [value]);

  // ── Month nav ──
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // ── Day grid ──
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const rawFirstDay = new Date(viewYear, viewMonth, 1).getDay();
  const firstDay = rawFirstDay === 0 ? 6 : rawFirstDay - 1;

  const cells: { day: number; curr: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, curr: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, curr: true });
  while (cells.length < 42) cells.push({ day: cells.length - daysInMonth - firstDay + 1, curr: false });

  const handleDay = (day: number) => {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(ds);
    setOpen(false);
  };

  // ── Year grid ──
  const yearCells: number[] = [];
  for (let y = yearPageStart; y < yearPageStart + YEARS_PER_PAGE; y++) yearCells.push(y);

  const displayValue = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const defaultTrigBtn: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, textAlign: 'left',
    background: isDark ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${open ? C.borderFocus : C.border}`,
    color: displayValue ? (isDark ? '#e8f0f0' : '#1a2e2b') : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)'),
    fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.15s',
  };

  const trigBtn: React.CSSProperties = triggerStyle
    ? { ...defaultTrigBtn, ...triggerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' as const }
    : defaultTrigBtn;

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={trigBtn}>
        <span>{displayValue || placeholder}</span>
        <Calendar size={14} color={C.icon} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          background: P.bg,
          border: `1px solid ${P.border}`,
          borderRadius: 14, padding: '14px 14px 10px',
          boxShadow: P.shadow,
          width: 270, userSelect: 'none',
        }}>

          {/* ── YEAR PICKER mode ── */}
          {pickerMode === 'years' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button
                  onClick={() => setYearPageStart(y => y - YEARS_PER_PAGE)}
                  style={{ background: P.navBg, border: 'none', cursor: 'pointer', color: C.icon, width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronLeft size={15} />
                </button>
                <span style={{ color: P.text, fontSize: 13, fontWeight: 600 }}>
                  {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
                </span>
                <button
                  onClick={() => setYearPageStart(y => y + YEARS_PER_PAGE)}
                  style={{ background: P.navBg, border: 'none', cursor: 'pointer', color: C.icon, width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {yearCells.map(yr => {
                  const isSel = yr === viewYear;
                  return (
                    <button
                      key={yr}
                      onClick={() => { setViewYear(yr); setPickerMode('days'); }}
                      style={{
                        padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12,
                        background: isSel ? C.selectedBg : 'transparent',
                        color: isSel ? '#fff' : P.dayNorm,
                        fontWeight: isSel ? 700 : 400,
                        outline: 'none',
                      }}
                      onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = P.hoverBg; }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.footerBorder}`, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setPickerMode('days')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.muted, fontSize: 12, padding: '4px 8px', borderRadius: 6 }}>
                  Cancelar
                </button>
              </div>
            </>
          )}

          {/* ── DAYS mode ── */}
          {pickerMode === 'days' && (
            <>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button onClick={prevMonth} style={{ background: P.navBg, border: 'none', cursor: 'pointer', color: C.icon, width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => allowYearPicker ? setPickerMode('years') : undefined}
                  style={{
                    background: allowYearPicker ? P.navBg : 'none',
                    border: 'none', cursor: allowYearPicker ? 'pointer' : 'default',
                    color: P.text, fontSize: 14, fontWeight: 600,
                    padding: '4px 10px', borderRadius: 7,
                  }}
                  title={allowYearPicker ? 'Seleccionar año' : undefined}
                >
                  {MONTHS[viewMonth]} {viewYear}
                </button>
                <button onClick={nextMonth} style={{ background: P.navBg, border: 'none', cursor: 'pointer', color: C.icon, width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Availability legend */}
              {highlightedDays && highlightedDays.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, fontSize: 10, color: C.mutedText }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.main, opacity: 0.7 }} />
                  Días con disponibilidad
                </div>
              )}

              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                {WEEKDAYS.map((d, i) => {
                  // i: 0=Lu…6=Do in grid. Convert to JS dow.
                  const jsDow = gridDowToJs(i);
                  const isAvailDay = highlightedDays?.has(jsDow);
                  return (
                    <div key={d} style={{
                      textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '3px 0', letterSpacing: '0.05em',
                      color: isAvailDay ? C.main : C.mutedText,
                    }}>
                      {d}
                    </div>
                  );
                })}
              </div>

              {/* Days grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {cells.map((cell, i) => {
                  if (!cell.curr) {
                    return <div key={i} style={{ textAlign: 'center', padding: '6px 0', color: P.dim, fontSize: 12 }}>{cell.day}</div>;
                  }
                  const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                  const isSelected = ds === value;
                  const isToday = ds === todayStr;

                  // day-of-week for this cell
                  const cellDow = new Date(viewYear, viewMonth, cell.day).getDay();
                  const isAvail = highlightedDays?.has(cellDow) && !isSelected;

                  return (
                    <button
                      key={i}
                      onClick={() => handleDay(cell.day)}
                      style={{
                        position: 'relative',
                        textAlign: 'center', padding: '6px 0', fontSize: 13, border: 'none',
                        borderRadius: 7, cursor: 'pointer', fontWeight: isSelected ? 700 : 400,
                        background: isSelected ? C.selectedBg : isAvail ? C.availableBg : isToday ? C.todayBg : 'transparent',
                        color: isSelected ? '#fff' : isToday ? C.main : P.dayNorm,
                        outline: 'none', transition: 'background 0.1s',
                        boxShadow: isSelected ? `0 2px 8px ${C.selectedShadow}` : 'none',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = C.hoverBg; }}
                      onMouseLeave={e => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background =
                          isAvail ? C.availableBg : isToday ? C.todayBg : 'transparent';
                      }}
                    >
                      {cell.day}
                      {isAvail && (
                        <span style={{
                          position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                          width: 4, height: 4, borderRadius: '50%',
                          background: `rgba(${C.r},${C.g},${C.b},0.65)`,
                          display: 'block',
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.footerBorder}` }}>
                <button onClick={() => { onChange(''); setOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.muted, fontSize: 12, padding: '4px 8px', borderRadius: 6 }}>
                  Borrar
                </button>
                <button onClick={() => { onChange(todayStr); setOpen(false); }} style={{ background: C.todayBtnBg, border: `1px solid ${C.todayBtnBorder}`, cursor: 'pointer', color: C.main, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6 }}>
                  Hoy
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
