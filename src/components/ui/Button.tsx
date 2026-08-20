import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { colors, type ColorToken } from '@/constants/colors';
import { BodyText } from './Typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
};

const containerVariantClass: Record<ButtonVariant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-surface-elevated border border-border',
  outline: 'bg-transparent border border-border',
  ghost: 'bg-transparent',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-md py-xxs',
  md: 'px-lg py-xs',
  lg: 'px-xl py-sm',
};

const textColor: Record<ButtonVariant, ColorToken> = {
  primary: 'background',
  secondary: 'textPrimary',
  outline: 'textPrimary',
  ghost: 'accent',
};

/** Primary interactive control. Pill-shaped to match the concept's action buttons. */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-xxs rounded-pill',
        containerVariantClass[variant],
        sizeClass[size],
        fullWidth && 'self-stretch',
        isDisabled && 'opacity-50',
        className
      )}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={colors[textColor[variant]]} />
      ) : (
        <>
          {icon}
          <BodyText medium color={textColor[variant]}>
            {label}
          </BodyText>
        </>
      )}
    </Pressable>
  );
}
