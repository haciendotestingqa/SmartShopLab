/** Design System SmartShopLab — tokens neon (logo) dark + light */

export const neon = {
  pink: '#f714aa',
  orange: '#f97b3a',
  yellow: '#f9d20c',
} as const;

export const theme = {
  neon,
  colors: {
    /** Alias legacy / Tailwind: header & dark surfaces */
    primaryDark: '#0a0912',
    primaryMain: neon.pink,
    accent: neon.orange,
    background: '#F8F7FC',
    backgroundDark: '#0a0912',
    surface: '#FFFFFF',
    surfaceDark: '#12101c',
    text: '#0a0912',
    textOnDark: '#F8F7FC',
    textMuted: '#475569',
    textMutedDark: '#94A3B8',
    white: '#FFFFFF',
    black: '#000000',
  },
  typography: {
    fontFamily: "'Inter', system-ui, sans-serif",
    weights: {
      regular: 400,
      semibold: 600,
      bold: 700,
    },
  },
  gradient: `linear-gradient(135deg, ${neon.pink} 0%, ${neon.orange} 50%, ${neon.yellow} 100%)`,
} as const;

export type Theme = typeof theme;
export type ColorMode = 'light' | 'dark';
