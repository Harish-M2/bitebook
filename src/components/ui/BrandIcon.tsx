import { Image } from 'expo-image';

import { brandIcons, type BrandIconName, type BrandIconVariant } from '@/constants/branding';
import type { ColorToken } from '@/constants/colors';
import { useAppTheme } from '@/hooks/useTheme';

type BrandIconProps = {
  name: BrandIconName;
  variant?: BrandIconVariant;
  size?: number;
  muted?: boolean;
  color?: ColorToken;
};

export function BrandIcon({ name, variant = 'ivory', size = 24, muted = false, color }: BrandIconProps) {
  const { colors } = useAppTheme();
  const tintColor = color ? colors[color]
    : variant === 'gold' ? colors.accent : variant === 'green' ? colors.accentDark : colors.textPrimary;
  return (
    <Image source={brandIcons[name][variant]} contentFit="contain" transition={0}
      tintColor={tintColor}
      accessible={false} accessibilityLabel="" pointerEvents="none"
      testID={`brand-icon-${name}-${variant}`}
      style={{ width: size, height: size, opacity: muted ? 0.65 : 1 }} />
  );
}