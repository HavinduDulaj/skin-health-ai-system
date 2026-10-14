import type { ThemeMode } from '../types';

export const palettes = {
  light: {
    background: '#F6FAFC',
    card: '#FFFFFF',
    primary: '#0F62D9',
    primarySoft: '#EAF3FF',
    buttonText: '#FFFFFF',
    text: '#102033',
    secondaryText: '#526376',
    muted: '#94A3B8',
    border: '#DDE8F0',
    surface: '#EDF7F6',
    subtleSurface: '#FAFCFE',
    success: '#12805C',
    danger: '#D64545',
    dangerSoft: '#FDECEC',
    warning: '#E08A1E',
    teal: '#14A39A',
    shadow: 'rgba(15, 98, 217, 0.12)',
  },
  dark: {
    background: '#08131D',
    card: '#102030',
    primary: '#5EA3FF',
    primarySoft: '#173A5E',
    buttonText: '#06121F',
    text: '#F5FAFF',
    secondaryText: '#B9C9D8',
    muted: '#94A3B8',
    border: '#22384D',
    surface: '#0F2A36',
    subtleSurface: '#0D1A27',
    success: '#4DD8A6',
    danger: '#FF7A7A',
    dangerSoft: '#3A1F2A',
    warning: '#FDBA55',
    teal: '#42D4C8',
    shadow: 'rgba(0, 0, 0, 0.34)',
  },
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 8,
  xl: 8,
};

export const getPalette = (mode: ThemeMode) => palettes[mode];
