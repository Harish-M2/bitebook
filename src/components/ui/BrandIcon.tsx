import { Image } from 'expo-image';

import { brandIcons, type BrandIconName, type BrandIconVariant } from '@/constants/branding';

type BrandIconProps = {
  name: BrandIconName;
  variant?: BrandIconVariant;
  size?: number;
  muted?: boolean;
};

export function BrandIcon({ name, variant = 'ivory', size = 24, muted = false }: BrandIconProps) {
  return (
    <Image source={brandIcons[name][variant]} contentFit="contain" transition={0}
      accessible={false} accessibilityLabel="" pointerEvents="none"
      testID={`brand-icon-${name}-${variant}`}
      style={{ width: size, height: size, opacity: muted ? 0.65 : 1 }} />
  );
}