import { Stack } from 'expo-router';

import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

/**
 * Unauthenticated route group. welcome/sign-in/sign-up are reachable only while signed out;
 * onboarding only once signed in.
 *
 * Onboarding is deliberately guarded on the session alone, *not* on `needsOnboarding`:
 * completing the first step writes the username, which flips `needsOnboarding` to false and
 * would tear the screen down mid-flow, stranding the user before the later steps. Entry is
 * instead controlled by `index.tsx`, and the screen resumes at the right step itself.
 */
export default function AuthLayout() {
  const { session } = useAuth();
  const isSignedIn = Boolean(session);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
