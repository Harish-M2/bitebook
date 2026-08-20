import { Text, type TextProps } from 'react-native';

import { colors, type ColorToken } from '@/constants/colors';
import { typeScale, type TypeScaleToken } from '@/constants/typography';

export type TypographyProps = TextProps & {
  color?: ColorToken;
};

function typeStyle(token: TypeScaleToken) {
  return typeScale[token];
}

function withColor(color: ColorToken) {
  return { color: colors[color] };
}

/** Large hero-sized text — page heroes, big numbers (spec section 6: Display 32–40). */
export function DisplayText({ style, color = 'textPrimary', ...rest }: TypographyProps) {
  return <Text style={[typeStyle('display'), withColor(color), style]} {...rest} />;
}

/** Section/page heading. `level` maps to H1/H2/H3 from the type hierarchy. */
export function Heading({
  style,
  color = 'textPrimary',
  level = 1,
  ...rest
}: TypographyProps & { level?: 1 | 2 | 3 }) {
  const token: TypeScaleToken = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
  return <Text style={[typeStyle(token), withColor(color), style]} {...rest} />;
}

/** Standard paragraph/body copy. Pass `medium` for the emphasised weight. */
export function BodyText({
  style,
  color = 'textPrimary',
  medium = false,
  ...rest
}: TypographyProps & { medium?: boolean }) {
  return <Text style={[typeStyle(medium ? 'bodyMedium' : 'body'), withColor(color), style]} {...rest} />;
}

/** Small supporting copy — quotes, descriptions. */
export function Caption({ style, color = 'textSecondary', ...rest }: TypographyProps) {
  return <Text style={[typeStyle('caption'), withColor(color), style]} {...rest} />;
}

/** Smallest text — timestamps, counts, labels. */
export function MetadataText({ style, color = 'textMuted', ...rest }: TypographyProps) {
  return <Text style={[typeStyle('metadata'), withColor(color), style]} {...rest} />;
}
