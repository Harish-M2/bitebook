import { TextInput, View, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/hooks/useTheme';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { cn } from '@/lib/cn';

type SearchBarProps = Omit<TextInputProps, 'style'> & {
  className?: string;
};

/** Search input matching the concept's "Search for dishes, restaurants, cuisines..." field. */
export function SearchBar({ className, placeholder = 'Search...', ...rest }: SearchBarProps) {
  const { colors } = useAppTheme();
  return (
    <View
      className={cn(
        'flex-row items-center gap-xs rounded-pill border border-border bg-surface-elevated px-md py-sm',
        className
      )}>
      <BrandIcon name="discover" size={18} muted />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={{ flex: 1, fontSize: 15, lineHeight: 20, color: colors.textPrimary, padding: 0 }}
        {...rest}
      />
    </View>
  );
}
