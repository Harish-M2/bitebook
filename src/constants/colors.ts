/**
 * Bitebook design tokens — colours.
 *
 * The app uses the supplied forest, champagne, ivory, and charcoal branding.
 * Keep the token names stable so the rest of the UI can swap theme values without
 * chasing hard-coded hex values across the codebase.
 */

export const brandColors = {
  forest: '#0E2F26',
  gold: '#D4AF7C',
  ivory: '#F8F5ED',
  charcoal: '#1A1A1A',
} as const;

const darkPalette = {
  background: '#0B0D0E',
  surface: brandColors.charcoal,
  surfaceElevated: '#242424',
  surfaceMuted: '#2A2A2A',
  border: '#3C403D',
  textPrimary: brandColors.ivory,
  textSecondary: '#BAB7B1',
  textMuted: '#8E9590',
  accent: brandColors.gold,
  accentDark: brandColors.forest,
  accentSoft: '#F2E4C9',
  rating: brandColors.gold,
  danger: '#E86F5D',
  white: '#FFFFFF',
} as const;

const lightPalette = {
  background: brandColors.ivory,
  surface: '#FFFFFF',
  surfaceElevated: '#FDFCF9',
  surfaceMuted: '#EEEAE1',
  border: '#D5D1C7',
  textPrimary: brandColors.forest,
  textSecondary: '#485951',
  textMuted: '#68766F',
  accent: brandColors.gold,
  accentDark: brandColors.forest,
  accentSoft: '#EEE7D8',
  rating: brandColors.gold,
  danger: '#B64E43',
  white: '#FFFFFF',
} as const;

export const colors = darkPalette;

export const theme = {
  dark: darkPalette,
  light: lightPalette,
} as const;

export type ThemeName = keyof typeof theme;
export type ColorToken = keyof typeof colors;
