import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider, useAppTheme } from '@/hooks/useTheme';
import { queryClient } from '@/lib/queryClient';
import '../global.css';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout — loads fonts, wraps the app in safe-area/auth providers, and hosts
 * the navigator. Bitebook is dark-only for the MVP (see spec section 6), so
 * the status bar is always forced to "light" regardless of system theme.
 */
function ThemeStatusBar() {
  const { isDark } = useAppTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            {/* Mounted before the fonts gate so the session lookup starts immediately. */}
            <AuthProvider>
              <ThemeStatusBar />
              <SplashScreenController fontsReady={fontsReady} />
              {fontsReady ? <RootNavigator /> : null}
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Holds the splash screen until fonts *and* the initial session lookup have resolved,
 * so the app never flashes a signed-out screen at a user who is actually signed in.
 */
function SplashScreenController({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (fontsReady && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, isLoading]);

  return null;
}

/**
 * The tabs are gated on a session *and* completed onboarding. `(auth)` is left ungated
 * here because it guards its own screens — see `(auth)/_layout.tsx` for why onboarding
 * cannot be gated on `needsOnboarding`.
 */
function RootNavigator() {
  const { session, needsOnboarding } = useAuth();
  const isSignedIn = Boolean(session);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />

      <Stack.Protected guard={isSignedIn && !needsOnboarding}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
