/**
 * Bitebook design tokens — colours.
 *
 * The app now supports a premium dark and light mode with a warmer luxury palette.
 * Keep the token names stable so the rest of the UI can swap theme values without
 * chasing hard-coded hex values across the codebase.
 */

const darkPalette = {
  background: '#0B0D0E',
  surface: '#12171A',
  surfaceElevated: '#1A2125',
  surfaceMuted: '#20282C',
  border: '#2F383D',
  textPrimary: '#F4F1EC',
  textSecondary: '#BAB7B1',
  textMuted: '#7D8488',
  accent: '#D7B98A',
  accentDark: '#A6814D',
  accentSoft: '#F2E4C9',
  rating: '#E5B566',
  danger: '#E86F5D',
  white: '#FFFFFF',
} as const;

const lightPalette = {
  background: '#F3EFE9',
  surface: '#FFFFFF',
  surfaceElevated: '#F8F3EE',
  surfaceMuted: '#EEE5D9',
  border: '#D9CBB7',
  textPrimary: '#171A1D',
  textSecondary: '#545E66',
  textMuted: '#7A7F82',
  accent: '#A66E3A',
  accentDark: '#7A4E24',
  accentSoft: '#F2E3C6',
  rating: '#D69A4D',
  danger: '#C85A4F',
  white: '#FFFFFF',
} as const;

export const colors = darkPalette;

export const theme = {
  dark: darkPalette,
  light: lightPalette,
} as const;

export type ThemeName = keyof typeof theme;
export type ColorToken = keyof typeof colors;
