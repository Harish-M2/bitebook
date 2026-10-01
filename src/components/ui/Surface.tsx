import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

type SurfaceProps = ViewProps & {
  /** `elevated` for cards that should stand out slightly more than the base surface. */
  variant?: 'default' | 'elevated' | 'muted';
  /** Corner radius token — defaults to the card radius used across the app. */
  radius?: 'md' | 'lg' | 'xl';
  bordered?: boolean;
};

const variantClass: Record<NonNullable<SurfaceProps['variant']>, string> = {
  default: 'bg-surface',
  elevated: 'bg-surface-elevated',
  muted: 'bg-surface-muted',
};

const radiusClass: Record<NonNullable<SurfaceProps['radius']>, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

/**
 * Generic dark-surface card container — the shared base for dish/restaurant/feed
 * cards (spec section 6, "Cards"): dark surface, subtle border, rounded corners.
 */
export function Surface({
  children,
  className,
  variant = 'default',
  radius = 'lg',
  bordered = true,
  style,
  ...rest
}: SurfaceProps) {
  const elevatedShadow =
    variant === 'elevated'
      ? {
          shadowColor: '#000000',
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        }
      : undefined;

  return (
    <View
      className={cn(
        variantClass[variant],
        radiusClass[radius],
        bordered && 'border border-border',
        className
      )}
      style={[elevatedShadow, style]}
      {...rest}>
      {children}
    </View>
  );
}
