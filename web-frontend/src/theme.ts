/** Design System SmartShopLab — tokens de color y tipografía (WCAG AA) */

export const theme = {
  colors: {
    primaryDark: '#1E293B',
    primaryMain: '#2563EB',
    accent: '#7C3AED',
    background: '#F9FAFB',
    text: '#0F172A',
    textMuted: '#475569',
    white: '#FFFFFF',
  },
  typography: {
    fontFamily: "'Inter', system-ui, sans-serif",
    weights: {
      regular: 400,
      semibold: 600,
      bold: 700,
    },
  },
} as const;

export type Theme = typeof theme;
