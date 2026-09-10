import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

/**
 * Entry point — resolves where a launching user belongs. The splash screen is still up
 * while `isLoading` is true, so rendering nothing then avoids a flash of the wrong screen.
 */
export default function Index() {
  const { session, isLoading, profile, needsOnboarding } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  // Signed in, but the profile row has not arrived yet. `needsOnboarding` is false while
  // `profile` is null, so redirecting now could send an un-onboarded user into the tabs.
  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return needsOnboarding ? <Redirect href="/onboarding" /> : <Redirect href="/home" />;
}
