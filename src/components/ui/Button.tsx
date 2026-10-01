import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { type ColorToken } from '@/constants/colors';
import { useAppTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import { BodyText } from './Typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-md py-xxs',
  md: 'px-lg py-xs',
  lg: 'px-xl py-sm',
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
  style,
  ...rest
}: ButtonProps) {
  const { colors: palette } = useAppTheme();
  const isDisabled = disabled || loading;

  const backgroundColorMap: Record<ButtonVariant, string> = {
    primary: palette.accent,
    secondary: palette.surfaceElevated,
    outline: 'transparent',
    ghost: 'transparent',
  };

  const borderColorMap: Record<ButtonVariant, string> = {
    primary: palette.accent,
    secondary: palette.border,
    outline: palette.border,
    ghost: 'transparent',
  };

  const textColorMap: Record<ButtonVariant, ColorToken> = {
    primary: 'background',
    secondary: 'textPrimary',
    outline: 'textPrimary',
    ghost: 'accent',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      className={cn('flex-row items-center justify-center gap-xxs rounded-pill', sizeClass[size], fullWidth && 'self-stretch', isDisabled && 'opacity-50', className)}
      style={[
        {
          backgroundColor: backgroundColorMap[variant],
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
          borderColor: borderColorMap[variant],
          shadowColor: variant === 'primary' ? palette.accent : 'transparent',
          shadowOpacity: variant === 'primary' ? 0.24 : 0,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 12 },
          elevation: variant === 'primary' ? 3 : 0,
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={palette[textColorMap[variant]]} />
      ) : (
        <>
          {icon}
          <BodyText medium color={textColorMap[variant]}>
            {label}
          </BodyText>
        </>
      )}
    </Pressable>
  );
}
