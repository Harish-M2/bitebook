import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { AuthThemeToggle } from '@/components/auth/AuthThemeToggle';
import { authBackgrounds } from '@/constants/branding';
import type { ThemeName } from '@/constants/colors';
import { useAppTheme } from '@/hooks/useTheme';

export type AuthBackground = 'welcome' | 'forms' | 'confirmation';

type AuthScreenProps = {
  children: React.ReactNode;
  background?: AuthBackground;
  edges?: readonly Edge[];
};

const OVERLAY: Record<AuthBackground, Record<ThemeName, string>> = {
  welcome: { dark: 'rgba(7, 13, 11, 0.55)', light: 'rgba(248, 245, 237, 0.46)' },
  forms: { dark: 'rgba(7, 13, 11, 0.83)', light: 'rgba(248, 245, 237, 0.82)' },
  confirmation: { dark: 'rgba(7, 13, 11, 0.78)', light: 'rgba(248, 245, 237, 0.72)' },
};

export function AuthScreen({ children, background = 'forms', edges = ['top', 'bottom', 'left', 'right'] }: AuthScreenProps) {
  const { themeName, colors: palette } = useAppTheme();

  return (
    <>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: palette.background }} testID={`auth-screen-${background}-${themeName}`}>
        <Image source={authBackgrounds[background][themeName]} contentFit="cover" transition={0}
          accessible={false} accessibilityLabel="" pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY[background][themeName] }} />
        <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: 'transparent' }}>
          <View style={{ position: 'absolute', top: 8, right: 20, zIndex: 1 }}>
            <AuthThemeToggle />
          </View>
          <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            {children}
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}