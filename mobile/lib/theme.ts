export const darkColors = {
  background: '#0a0b14',
  surface: '#141419',
  surfaceLight: '#1e1e26',
  border: '#2a2a35',
  borderLight: '#3a3a48',

  text: '#f5f5f7',
  textSecondary: '#a0a0b0',
  textMuted: '#6b6b7b',

  amber: '#f0a830',
  amberGlow: '#d97706',
  amberLight: '#f5c96a',
  amberDark: '#92400e',
  amberSubtle: 'rgba(240, 168, 48, 0.08)',
  amberWash: 'rgba(240, 168, 48, 0.08)',
  amberWashStrong: 'rgba(240, 168, 48, 0.15)',

  glass: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',

  success: '#22c55e',
  error: '#ef4444',
  warning: '#f0a830',
  info: '#3b82f6',
};

export const lightColors: typeof darkColors = {
  background: '#f7f7fa',
  surface: '#ffffff',
  surfaceLight: '#eeeef2',
  border: '#d8d8e0',
  borderLight: '#c8c8d0',

  text: '#1a1a2e',
  textSecondary: '#5a5a6e',
  textMuted: '#9a9aaa',

  amber: '#d97706',
  amberGlow: '#b45309',
  amberLight: '#f59e0b',
  amberDark: '#92400e',
  amberSubtle: 'rgba(217, 119, 6, 0.08)',
  amberWash: 'rgba(217, 119, 6, 0.08)',
  amberWashStrong: 'rgba(217, 119, 6, 0.15)',

  glass: 'rgba(0, 0, 0, 0.02)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',

  success: '#22c55e',
  error: '#ef4444',
  warning: '#d97706',
  info: '#3b82f6',
};

export type ThemeColors = typeof darkColors;

// Backwards compat alias
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
};
