import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemeName } from '@/constants/colors';

const AUTH_APPEARANCE_KEY = 'bitebook.auth.appearance';

type AuthAppearanceContextValue = {
  themeName: ThemeName;
  isReady: boolean;
  setThemeName: (themeName: ThemeName) => void;
};

const AuthAppearanceContext = createContext<AuthAppearanceContextValue | undefined>(undefined);

export function AuthAppearanceProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const systemTheme: ThemeName = colorScheme === 'light' ? 'light' : 'dark';
  const [themeOverride, setThemeOverride] = useState<ThemeName | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadAppearance = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(AUTH_APPEARANCE_KEY);
        if (isActive && (storedTheme === 'light' || storedTheme === 'dark')) {
          setThemeOverride(storedTheme);
        }
      } catch (error) {
        console.warn('[Bitebook] Could not restore auth appearance:', error);
      } finally {
        if (isActive) setIsReady(true);
      }
    };

    void loadAppearance();
    return () => {
      isActive = false;
    };
  }, []);

  const setThemeName = useCallback((nextTheme: ThemeName) => {
    setThemeOverride(nextTheme);
    void AsyncStorage.setItem(AUTH_APPEARANCE_KEY, nextTheme).catch((error: unknown) => {
      console.warn('[Bitebook] Could not save auth appearance:', error);
    });
  }, []);

  return (
    <AuthAppearanceContext.Provider value={{ themeName: themeOverride ?? systemTheme, isReady, setThemeName }}>
      {children}
    </AuthAppearanceContext.Provider>
  );
}

export function useAuthAppearance(): AuthAppearanceContextValue {
  const context = useContext(AuthAppearanceContext);
  if (!context) throw new Error('useAuthAppearance must be used within an AuthAppearanceProvider');
  return context;
}