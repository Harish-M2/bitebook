import { createContext, useContext, type ReactNode } from 'react';

import { theme, type ThemeName } from '@/constants/colors';

type ThemeContextValue = {
  themeName: ThemeName;
  isDark: boolean;
  colors: typeof theme.dark | typeof theme.light;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={DARK_THEME}>{children}</ThemeContext.Provider>;
}

const DARK_THEME: ThemeContextValue = { themeName: 'dark', isDark: true, colors: theme.dark };

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }

  return context;
}
