import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { useAppTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import { MetadataText } from './Typography';

type ChipProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  className?: string;
};

/** Pill-shaped filter/cuisine chip used on Discover and category rows. */
export function Chip({ label, icon, selected = false, className, ...rest }: ChipProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'flex-row items-center gap-xxs rounded-pill border px-md py-xs',
        className
      )}
      style={{
        backgroundColor: selected ? colors.accent : colors.surfaceElevated,
        borderColor: selected ? colors.accent : colors.border,
      }}
      {...rest}>
      {icon}
      <MetadataText color={selected ? 'background' : 'textSecondary'}>{label}</MetadataText>
    </Pressable>
  );
}
