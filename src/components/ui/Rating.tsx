import { View } from 'react-native';
import { BrandIcon } from './BrandIcon';

import { cn } from '@/lib/cn';
import { BodyText, Caption, MetadataText } from './Typography';

type RatingSize = 'sm' | 'md' | 'lg';

type RatingProps = {
  value: number;
  size?: RatingSize;
  /** Optional pre-formatted count shown after the value, e.g. "12.4k". */
  count?: string;
  className?: string;
};

const iconSizePx: Record<RatingSize, number> = { sm: 12, md: 14, lg: 18 };

/** Read-only star rating display (spec: 0.5–5.0 scale, amber "rating" colour). */
export function Rating({ value, size = 'md', count, className }: RatingProps) {
  return (
    <View className={cn('flex-row items-center gap-xxs', className)}>
      <BrandIcon name="rating" size={iconSizePx[size]} variant="gold" />
      {size === 'lg' && <BodyText medium>{value.toFixed(1)}</BodyText>}
      {size === 'md' && <Caption color="textPrimary">{value.toFixed(1)}</Caption>}
      {size === 'sm' && <MetadataText color="textPrimary">{value.toFixed(1)}</MetadataText>}
      {count ? <MetadataText>({count})</MetadataText> : null}
    </View>
  );
}
