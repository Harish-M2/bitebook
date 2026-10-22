import { createContext, useContext, type ReactNode } from 'react';

import { theme, type ThemeName } from '@/constants/colors';

type ThemeContextValue = {
  themeName: ThemeName;
  isDark: boolean;
  colors: typeof theme.dark | typeof theme.light;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children, themeName = 'dark' }: { children: ReactNode; themeName?: ThemeName }) {
  const value = themeName === 'light' ? LIGHT_THEME : DARK_THEME;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const DARK_THEME: ThemeContextValue = { themeName: 'dark', isDark: true, colors: theme.dark };
const LIGHT_THEME: ThemeContextValue = { themeName: 'light', isDark: false, colors: theme.light };

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }

  return context;
}
