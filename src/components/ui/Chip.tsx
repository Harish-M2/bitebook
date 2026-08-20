import { Pressable, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'flex-row items-center gap-xxs rounded-pill border px-md py-xs',
        selected ? 'bg-accent border-accent' : 'bg-surface-elevated border-border',
        className
      )}
      {...rest}>
      {icon}
      <MetadataText color={selected ? 'background' : 'textSecondary'}>{label}</MetadataText>
    </Pressable>
  );
}
