/**
 * Bitebook design tokens — colours.
 *
 * Source of truth: Bitebook_Build_Instructions.md, section 6 "Visual Design System".
 * Do not hard-code these hex values elsewhere in the app — always import from here
 * (or use the matching Tailwind/NativeWind utility class, e.g. `bg-background`).
 *
 * MVP is dark-only. `light` is a placeholder so a future light theme can slot in
 * without changing every call site.
 */
export const colors = {
  background: '#080A09',
  surface: '#111412',
  surfaceElevated: '#171A18',
  surfaceMuted: '#202420',
  border: '#2A2E2B',
  textPrimary: '#F5F5F2',
  textSecondary: '#A8ADA8',
  textMuted: '#737973',
  accent: '#39E56A',
  accentDark: '#1B8F3A',
  rating: '#FFB547',
  danger: '#FF5C5C',
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;

export const theme = {
  dark: colors,
  // Reserved for a future light theme (see spec section 6, "Light mode").
  light: colors,
} as const;

export type ThemeName = keyof typeof theme;
