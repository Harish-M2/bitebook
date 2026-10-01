import { Text, type TextProps } from 'react-native';

import { type ColorToken } from '@/constants/colors';
import { typeScale, type TypeScaleToken } from '@/constants/typography';
import { useAppTheme } from '@/hooks/useTheme';

export type TypographyProps = TextProps & {
  color?: ColorToken;
};

function typeStyle(token: TypeScaleToken) {
  return typeScale[token];
}

function withColor(color: ColorToken, palette: Record<string, string>) {
  return { color: palette[color] };
}

/** Large hero-sized text — page heroes, big numbers (spec section 6: Display 32–40). */
export function DisplayText({ style, color = 'textPrimary', ...rest }: TypographyProps) {
  const { colors: palette } = useAppTheme();
  return <Text style={[typeStyle('display'), withColor(color, palette), style]} {...rest} />;
}

/** Section/page heading. `level` maps to H1/H2/H3 from the type hierarchy. */
export function Heading({
  style,
  color = 'textPrimary',
  level = 1,
  ...rest
}: TypographyProps & { level?: 1 | 2 | 3 }) {
  const { colors: palette } = useAppTheme();
  const token: TypeScaleToken = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
  return <Text style={[typeStyle(token), withColor(color, palette), style]} {...rest} />;
}

/** Standard paragraph/body copy. Pass `medium` for the emphasised weight. */
export function BodyText({
  style,
  color = 'textPrimary',
  medium = false,
  ...rest
}: TypographyProps & { medium?: boolean }) {
  const { colors: palette } = useAppTheme();
  return <Text style={[typeStyle(medium ? 'bodyMedium' : 'body'), withColor(color, palette), style]} {...rest} />;
}

/** Small supporting copy — quotes, descriptions. */
export function Caption({ style, color = 'textSecondary', ...rest }: TypographyProps) {
  const { colors: palette } = useAppTheme();
  return <Text style={[typeStyle('caption'), withColor(color, palette), style]} {...rest} />;
}

/** Smallest text — timestamps, counts, labels. */
export function MetadataText({ style, color = 'textMuted', ...rest }: TypographyProps) {
  const { colors: palette } = useAppTheme();
  return <Text style={[typeStyle('metadata'), withColor(color, palette), style]} {...rest} />;
}
