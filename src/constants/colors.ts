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
  success: '#4CB782',
  warning: '#E4B450',
  focus: '#D7B98A',
  placeholder: '#7D8488',
  disabledBackground: '#20282C',
  disabledText: '#7D8488',
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
  textMuted: '#626B67',
  accent: '#8C5B28',
  accentDark: '#7A4E24',
  accentSoft: '#F2E3C6',
  rating: '#8C5B28',
  danger: '#A73F35',
  success: '#287A50',
  warning: '#8B5E12',
  focus: '#8C5B28',
  placeholder: '#626B67',
  disabledBackground: '#EEE5D9',
  disabledText: '#626B67',
  white: '#FFFFFF',
} as const;

export const theme = {
  dark: darkPalette,
  light: lightPalette,
} as const;

export type ThemeName = keyof typeof theme;
export type Palette = { [Key in keyof typeof darkPalette]: string };
export type ColorToken = keyof Palette;

function hexChannels(value: string): string {
  const hex = value.slice(1);
  const full = hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);
  return `${red} ${green} ${blue}`;
}

export function getThemeVariables(themeName: ThemeName): Record<string, string> {
  return Object.fromEntries(
    Object.entries(theme[themeName]).map(([name, value]) => [
      `--bb-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      hexChannels(value),
    ]),
  );
}
