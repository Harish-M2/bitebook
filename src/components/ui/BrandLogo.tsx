import { Image } from 'expo-image';

import { brandAssets } from '@/constants/branding';

type BrandLogoProps = {
  variant?: 'horizontal' | 'stacked' | 'symbol' | 'wordmark';
  width?: number;
  onLight?: boolean;
  decorative?: boolean;
};

export function BrandLogo({ variant = 'horizontal', width = 144, onLight = false,
  decorative = false }: BrandLogoProps) {
  const source = variant === 'symbol'
    ? (onLight ? brandAssets.logoSymbolDark : brandAssets.logoSymbol)
    : variant === 'wordmark' ? (onLight ? brandAssets.wordmarkDark : brandAssets.wordmarkLight)
    : variant === 'stacked' ? (onLight ? brandAssets.logoStackedDark : brandAssets.logoStacked)
      : (onLight ? brandAssets.logoDark : brandAssets.logoLight);
  const aspectRatio = variant === 'symbol' ? 1 : variant === 'wordmark' ? 180 / 42
    : variant === 'stacked' ? 720 / 1010 : 720 / 288;

  return (
    <Image source={source} contentFit="contain" transition={0}
      accessible={!decorative} accessibilityLabel={decorative ? '' : 'Bitebook'}
      testID={`brand-logo-${variant}-${onLight ? 'light' : 'dark'}`}
      style={{ width, height: width / aspectRatio, maxWidth: '100%' }} />
  );
}