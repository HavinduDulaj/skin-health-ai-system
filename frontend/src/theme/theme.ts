import type { ThemeMode } from '../types';

export const palettes = {
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    primary: '#2563EB',
    primarySoft: '#EAF1FF',
    text: '#111827',
    secondaryText: '#475569',
    muted: '#94A3B8',
    border: '#E2E8F0',
    surface: '#EFF6FF',
    subtleSurface: '#F8FBFF',
    success: '#16A34A',
    danger: '#DC2626',
    shadow: 'rgba(37, 99, 235, 0.18)',
  },
  dark: {
    background: '#111827',
    card: '#1F2937',
    primary: '#60A5FA',
    primarySoft: '#1D4ED8',
    text: '#F9FAFB',
    secondaryText: '#CBD5E1',
    muted: '#94A3B8',
    border: '#374151',
    surface: '#172554',
    subtleSurface: '#18212F',
    success: '#4ADE80',
    danger: '#F87171',
    shadow: 'rgba(96, 165, 250, 0.18)',
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
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
};

export const getPalette = (mode: ThemeMode) => palettes[mode];
