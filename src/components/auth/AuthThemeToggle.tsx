import { Moon, Sun } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useAppTheme } from '@/hooks/useTheme';

export function AuthThemeToggle() {
  const { themeName, colors, setPreference } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', padding: 3, borderRadius: 20, borderWidth: 1,
      borderColor: colors.border, backgroundColor: colors.surface }} accessibilityLabel="Appearance">
      <Pressable accessibilityRole="button" accessibilityLabel="Use light mode"
        accessibilityState={{ selected: themeName === 'light' }} testID="auth-theme-light"
        onPress={() => void setPreference('light')}
        style={{ width: 34, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
          backgroundColor: themeName === 'light' ? colors.accent : 'transparent' }}>
        <Sun size={17} color={themeName === 'light' ? colors.accentDark : colors.textSecondary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Use dark mode"
        accessibilityState={{ selected: themeName === 'dark' }} testID="auth-theme-dark"
        onPress={() => void setPreference('dark')}
        style={{ width: 34, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
          backgroundColor: themeName === 'dark' ? colors.accent : 'transparent' }}>
        <Moon size={16} color={themeName === 'dark' ? colors.accentDark : colors.textSecondary} />
      </Pressable>
    </View>
  );
}