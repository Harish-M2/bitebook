/**
 * Bitebook design tokens — typography.
 *
 * Hierarchy per spec section 6, "Typography". Font is Inter, loaded via
 * @expo-google-fonts/inter (see src/app/_layout.tsx).
 */
import type { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

type TypeScaleEntry = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontFamily'>;

export const typeScale = {
  display: { fontSize: 36, lineHeight: 42, fontFamily: fontFamily.bold },
  h1: { fontSize: 30, lineHeight: 36, fontFamily: fontFamily.bold },
  h2: { fontSize: 23, lineHeight: 28, fontFamily: fontFamily.semiBold },
  h3: { fontSize: 19, lineHeight: 25, fontFamily: fontFamily.semiBold },
  body: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.regular },
  bodyMedium: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.medium },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular },
  metadata: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.medium },
} satisfies Record<string, TypeScaleEntry>;

export type TypeScaleToken = keyof typeof typeScale;
