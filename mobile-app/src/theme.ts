/** SmartShopLab design system — neon tokens (aligned with web-frontend/src/theme.ts) */

export const neon = {
  pink: '#f714aa',
  orange: '#f97b3a',
  yellow: '#f9d20c',
} as const;

export type ColorMode = 'light' | 'dark';

export const theme = {
  neon,
  colors: {
    primaryDark: '#0a0912',
    primaryMain: neon.pink,
    accent: neon.orange,
    background: '#F8F7FC',
    backgroundDark: '#0a0912',
    surface: '#FFFFFF',
    surfaceDark: '#12101c',
    surfaceMuted: '#eeeaf8',
    surfaceMutedDark: '#1a1728',
    text: '#0a0912',
    textOnDark: '#F8F7FC',
    textMuted: '#475569',
    textMutedDark: '#94A3B8',
    white: '#FFFFFF',
    black: '#000000',
    header: '#12101c',
    headerDark: '#0a0912',
  },
} as const;

export function palette(mode: ColorMode) {
  const dark = mode === 'dark';
  return {
    bg: dark ? theme.colors.backgroundDark : theme.colors.background,
    surface: dark ? theme.colors.surfaceDark : theme.colors.surface,
    surfaceMuted: dark ? theme.colors.surfaceMutedDark : theme.colors.surfaceMuted,
    text: dark ? theme.colors.textOnDark : theme.colors.text,
    textMuted: dark ? theme.colors.textMutedDark : theme.colors.textMuted,
    header: dark ? theme.colors.headerDark : theme.colors.header,
    pink: neon.pink,
    orange: neon.orange,
    yellow: neon.yellow,
  };
}

export type Theme = typeof theme;
