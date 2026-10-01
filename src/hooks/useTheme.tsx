import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { theme, type ThemeName } from '@/constants/colors';

const THEME_STORAGE_KEY = 'bitebook.theme';

type ThemeContextValue = {
  themeName: ThemeName;
  isDark: boolean;
  colors: typeof theme.dark | typeof theme.light;
  setThemeName: (themeName: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedTheme) => {
        if (!isMounted) return;
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeNameState(storedTheme);
        }
        setIsReady(true);
      })
      .catch(() => {
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeName = (nextThemeName: ThemeName) => {
    setThemeNameState(nextThemeName);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextThemeName);
  };

  const value = useMemo<ThemeContextValue>(() => ({
    themeName,
    isDark: themeName === 'dark',
    colors: theme[themeName],
    setThemeName,
    toggleTheme: () => setThemeName(themeName === 'dark' ? 'light' : 'dark'),
  }), [themeName]);

  if (!isReady) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }

  return context;
}
