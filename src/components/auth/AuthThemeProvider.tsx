import { useAuthAppearance } from '@/components/auth/AuthAppearanceProvider';
import { ThemeProvider } from '@/hooks/useTheme';

export function AuthThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeName } = useAuthAppearance();

  return (
    <ThemeProvider themeName={themeName}>
      {children}
    </ThemeProvider>
  );
}