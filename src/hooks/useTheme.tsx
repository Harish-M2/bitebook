import AsyncStorage from '@react-native-async-storage/async-storage';
import { vars } from 'nativewind';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';

import { getThemeVariables, theme, type ThemeName } from '@/constants/colors';

export type ThemePreference = ThemeName | 'system';

type ThemeContextValue = {
  themeName: ThemeName;
  preference: ThemePreference;
  isReady: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
  isDark: boolean;
  colors: typeof theme.dark | typeof theme.light;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = 'bitebook.appearance';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isMounted && (stored === 'system' || stored === 'dark' || stored === 'light')) {
          setPreferenceState(stored);
        }
      })
      .catch((error: unknown) => {
        console.warn('[Bitebook] Could not load appearance preference:', error);
      })
      .finally(() => {
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const themeName = preference === 'system'
    ? systemColorScheme === 'light' ? 'light' : 'dark'
    : preference;
  const isDark = themeName === 'dark';
  const palette = theme[themeName];

  const setPreference = async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch (error) {
      console.warn('[Bitebook] Could not persist appearance preference:', error);
      throw error;
    }
  };

  const value: ThemeContextValue = {
    themeName,
    preference,
    isReady,
    setPreference,
    isDark,
    colors: palette,
  };

  return (
    <ThemeContext.Provider value={value}>
      <View className={isDark ? 'dark flex-1' : 'light flex-1'} style={vars(getThemeVariables(themeName))}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }

  return context;
}
