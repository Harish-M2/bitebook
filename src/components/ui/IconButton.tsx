import { Pressable, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type IconButtonSize = 'sm' | 'md' | 'lg';

type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  size?: IconButtonSize;
  variant?: 'surface' | 'transparent';
  /** Required for accessibility since this button has no visible label. */
  accessibilityLabel: string;
  className?: string;
};

const sizeClass: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

/** Circular icon-only tap target — notification/message/back/share affordances. */
export function IconButton({
  children,
  size = 'md',
  variant = 'surface',
  className,
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      className={cn(
        'items-center justify-center rounded-pill',
        sizeClass[size],
        variant === 'surface' && 'bg-surface-elevated border border-border',
        disabled && 'opacity-50',
        className
      )}
      {...rest}>
      {children}
    </Pressable>
  );
}
