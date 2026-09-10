import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { getCuisineBreakdown, getDiaryStats } from '@/lib/db/stats';
import { Screen, Divider, Spacer } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Heading, BodyText, Caption } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { CuisineBreakdown } from '@/components/profile/CuisineBreakdown';
import type { DiaryStats } from '@/types/models';

const EMPTY_STATS: DiaryStats = {
  dishesLogged: 0,
  restaurantsVisited: 0,
  cuisinesExplored: 0,
  averageRating: 0,
};

/** Profile tab — identity, lifetime stats, and cuisine breakdown. */
export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const userId = profile?.id ?? null;

  const stats = useQuery({
    queryKey: queryKeys.diaryStats(userId ?? ''),
    queryFn: () => getDiaryStats(userId as string),
    enabled: userId !== null,
  });

  const breakdown = useQuery({
    queryKey: queryKeys.cuisineBreakdown(userId ?? ''),
    queryFn: () => getCuisineBreakdown(userId as string),
    enabled: userId !== null,
  });

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

  const displayName = profile?.display_name ?? profile?.username ?? 'You';
  const cuisines = breakdown.data ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="items-center gap-sm px-lg pt-md">
          <Avatar uri={profile?.avatar_url ?? null} name={displayName} size="xl" />
          <View className="items-center gap-xxs">
            <Heading level={2}>{displayName}</Heading>
            {profile?.username ? <Caption>@{profile.username}</Caption> : null}
          </View>
          {profile?.bio ? (
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              {profile.bio}
            </BodyText>
          ) : null}
          <Button label="Edit profile" variant="secondary" disabled />
        </View>

        <Spacer size="xl" />
        <View className="px-lg">
          <ProfileStats stats={stats.data ?? EMPTY_STATS} />
        </View>

        <Spacer size="lg" />
        <View className="px-lg">
          <Divider />
        </View>
        <Spacer size="lg" />

        <View className="gap-md px-lg">
          <Heading level={3}>Cuisine breakdown</Heading>
          {cuisines.length > 0 ? (
            <>
              <BodyText color="textSecondary">Your most-logged cuisines.</BodyText>
              <CuisineBreakdown data={cuisines} />
            </>
          ) : (
            <BodyText color="textSecondary">
              Log a few dishes and your most-eaten cuisines will appear here.
            </BodyText>
          )}
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
