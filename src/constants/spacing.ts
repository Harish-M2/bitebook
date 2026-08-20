/**
 * Bitebook design tokens — spacing.
 *
 * 4px/8px-based spacing scale (spec section 6, "Spacing"). Always reach for one
 * of these values instead of an arbitrary number so spacing stays consistent.
 */
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

/**
 * Corner radii (spec section 6, "Radius").
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
