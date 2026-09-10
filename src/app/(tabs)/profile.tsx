import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { Screen, Divider, Spacer } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Heading, BodyText, Caption } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { CuisineBreakdown } from '@/components/profile/CuisineBreakdown';
import { mockCuisineBreakdown, mockProfile } from '@/mock-data/profile';
import { mockDiaryStats } from '@/mock-data/diary';

/** Profile tab — identity, lifetime stats, and cuisine breakdown. */
export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  // The root layout's guard handles the redirect once the session clears.
  const handleSignOut = () => {
    Alert.alert('Sign out', 'You will need to sign in again to log meals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          const { error } = await signOut();
          if (error) {
            setSigningOut(false);
            Alert.alert('Could not sign out', error);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="items-center gap-sm px-lg pt-md">
          <Avatar uri={mockProfile.avatarUrl} name={mockProfile.displayName} size="xl" />
          <View className="items-center gap-xxs">
            <Heading level={2}>{mockProfile.displayName}</Heading>
            <Caption>@{mockProfile.username}</Caption>
          </View>
          <Button label="Edit profile" variant="secondary" disabled />
        </View>

        <Spacer size="xl" />
        <View className="px-lg">
          <ProfileStats stats={mockDiaryStats} />
        </View>

        <Spacer size="lg" />
        <View className="px-lg">
          <Divider />
        </View>
        <Spacer size="lg" />

        <View className="gap-md px-lg">
          <Heading level={3}>Cuisine breakdown</Heading>
          <BodyText color="textSecondary">Your most-logged cuisines this year.</BodyText>
          <CuisineBreakdown data={mockCuisineBreakdown} />
        </View>

        <Spacer size="xl" />
        <View className="px-lg">
          <Divider />
        </View>
        <Spacer size="lg" />

        <View className="px-lg">
          <Button
            label="Sign out"
            variant="outline"
            fullWidth
            loading={signingOut}
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
