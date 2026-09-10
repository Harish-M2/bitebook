import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/constants/colors';
import { Caption, MetadataText } from './Typography';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Validation message. When set, the field is outlined in the danger colour. */
  error?: string | null;
  /** Supporting copy shown below the field while there is no error. */
  hint?: string;
  className?: string;
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
  minHeight,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={cn('gap-xxs', className)}>
      {label ? <Caption color="textSecondary">{label}</Caption> : null}

      <View
        className={cn(
          'rounded-md border bg-surface-elevated px-md py-sm',
          error ? 'border-danger' : isFocused ? 'border-accent' : 'border-border'
        )}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          style={{
            fontSize: 15,
            lineHeight: 20,
            color: colors.textPrimary,
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
        />
      </View>

      {error ? (
        <MetadataText color="danger">{error}</MetadataText>
      ) : hint ? (
        <MetadataText>{hint}</MetadataText>
      ) : null}
    </View>
  );
}
