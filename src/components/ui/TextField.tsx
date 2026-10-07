import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import { Caption, MetadataText } from './Typography';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Validation message. When set, the field is outlined in the danger colour. */
  error?: string | null;
  /** Supporting copy shown below the field while there is no error. */
  hint?: string;
  className?: string;
  leftIcon?: ReactNode;
  /**
   * Minimum height of the input itself, in pixels. Needed for `multiline` fields: a
   * multiline TextInput otherwise opens one line tall and reads as a single-line field.
   */
  minHeight?: number;
};

/**
 * Single-line text input. `SearchBar` covers the pill-shaped search case; this is the
 * squared-off labelled field used by the auth and onboarding forms.
 */
export function TextField({
  label,
  error,
  hint,
  className,
  leftIcon,
  minHeight,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors: palette } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecure = rest.secureTextEntry === true;

  return (
    <View className={cn('gap-xxs', className)}>
      {label ? <Caption color="textSecondary">{label}</Caption> : null}

      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? palette.danger : isFocused ? palette.accent : palette.border,
          backgroundColor: palette.surfaceElevated,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
        <View className="flex-row items-center gap-xs">
          {leftIcon ? <View>{leftIcon}</View> : null}
          <TextInput
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            style={{
              flex: 1,
              fontSize: 15,
              lineHeight: 20,
              color: palette.textPrimary,
              padding: 0,
              minHeight,
            }}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            {...rest}
            secureTextEntry={isSecure && !revealed}
          />
          {isSecure ? (
            <Pressable
              onPress={() => setRevealed((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
              {revealed ? (
                <EyeOff size={18} color={palette.textMuted} />
              ) : (
                <Eye size={18} color={palette.textMuted} />
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? (
        <MetadataText color="danger">{error}</MetadataText>
      ) : hint ? (
        <MetadataText>{hint}</MetadataText>
      ) : null}
    </View>
  );
}
