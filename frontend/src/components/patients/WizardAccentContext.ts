import { createContext, useContext } from 'react';

export interface WizardAccent {
  bg: string;
  savedBg: string;
  savedColor: string;
  border: string;
  borderFocus: string;
  lblColor: string;
  shadow: string;
  modalBg: string;      // wizard modal body background (dark mode)
  modalBgLight: string; // wizard modal body background (light mode)
  chipBg: string;       // subtle chip/tag background
  noteBg: string;       // note card row background
}

const DEFAULT: WizardAccent = {
  bg: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
  savedBg: 'rgba(45,212,191,0.15)',
  savedColor: '#2dd4bf',
  border: 'rgba(45,212,191,0.22)',
  borderFocus: 'rgba(45,212,191,0.55)',
  lblColor: 'rgba(45,212,191,0.75)',
  shadow: '0 2px 8px rgba(45,212,191,0.32)',
  modalBg: 'linear-gradient(135deg, rgb(5,25,23) 0%, rgb(2,11,10) 100%)',
  modalBgLight: 'rgb(230, 250, 247)',
  chipBg: 'rgba(45,212,191,0.12)',
  noteBg: 'rgba(45,212,191,0.06)',
};

export const WizardAccentContext = createContext<WizardAccent>(DEFAULT);
export const useWizardAccent = () => useContext(WizardAccentContext);

export function accentTokens(accentRgb: string): WizardAccent {
  const m = accentRgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return DEFAULT;
  const [r, g, b] = [+m[1], +m[2], +m[3]];
  const mk = (f: number) => `rgb(${Math.round(r*f)}, ${Math.round(g*f)}, ${Math.round(b*f)})`;
  const mix = (f: number) => `rgb(${Math.round(255*f + r*(1-f))}, ${Math.round(255*f + g*(1-f))}, ${Math.round(255*f + b*(1-f))})`;
  return {
    bg: accentRgb,
    savedBg: `rgba(${r}, ${g}, ${b}, 0.15)`,
    savedColor: accentRgb,
    border: `rgba(${r}, ${g}, ${b}, 0.22)`,
    borderFocus: `rgba(${r}, ${g}, ${b}, 0.55)`,
    lblColor: `rgba(${r}, ${g}, ${b}, 0.75)`,
    shadow: `0 2px 8px rgba(${r}, ${g}, ${b}, 0.32)`,
    modalBg: `linear-gradient(135deg, ${mk(0.12)} 0%, ${mk(0.05)} 100%)`,
    modalBgLight: mix(0.88), // 12% accent blended with white → light aquamarine
    chipBg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    noteBg: `rgba(${r}, ${g}, ${b}, 0.06)`,
  };
}
