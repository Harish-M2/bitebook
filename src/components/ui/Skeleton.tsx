import { useEffect, useState } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';

import { colors } from '@/constants/colors';
import { radius } from '@/constants/spacing';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  className?: string;
};

/** Pulsing placeholder block shown while content is loading. */
export function Skeleton({ width = '100%', height = 16, borderRadius: cornerRadius = radius.sm, className }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={{
        width,
        height,
        borderRadius: cornerRadius,
        backgroundColor: colors.surfaceElevated,
        opacity,
      }}
    />
  );
}

/** Convenience wrapper for stacking several skeleton lines/blocks with spacing. */
export function SkeletonGroup({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  return <View style={{ gap }}>{children}</View>;
}
