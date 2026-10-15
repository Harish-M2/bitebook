import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { PersonRow } from '@/components/social/PersonRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Caption, Heading } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { getFollowingProfiles, getSocialContext } from '@/lib/db/social';

/** List of profiles the signed-in user follows, reached from the profile tab. */
export default function FollowingScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const userId = user?.id ?? null;

  const following = useQuery({
    queryKey: ['following-profiles', userId],
    queryFn: () => getFollowingProfiles(userId as string),
    enabled: userId !== null,
  });

  const ids = (following.data ?? []).map((person) => person.id);
  const context = useQuery({
    queryKey: ['social-context', userId, ids],
    queryFn: () => getSocialContext(userId as string, ids),
    enabled: userId !== null && ids.length > 0,
  });

  return (
    <Screen navigation>
      <View className="w-full flex-1 gap-lg self-center px-lg pt-sm" style={{ maxWidth: 760 }}>
        <View className="flex-row items-center gap-md">
          <View className="gap-xxs">
            <Heading level={2}>Following</Heading>
            {following.data ? <Caption>{following.data.length} {following.data.length === 1 ? 'person' : 'people'}</Caption> : null}
          </View>
        </View>

        {following.isPending ? (
          <View className="items-center py-xl">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : following.isError ? (
          <ErrorState
            title="Could not load following"
            description={following.error.message}
            onRetry={() => void following.refetch()}
          />
        ) : following.data.length === 0 ? (
          <EmptyState
            title="Not following anyone yet"
            description="Find food lovers in search and follow them to fill your feed."
          />
        ) : (
          <FlatList
            data={following.data}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            ItemSeparatorComponent={() => <View className="h-sm" />}
            renderItem={({ item }) => (
              <PersonRow
                profile={item}
                isSelf={item.id === userId}
                followsYou={context.data?.followsMe.has(item.id) ?? false}
                mutualNames={context.data?.mutualNames.get(item.id) ?? []}
                cuisines={context.data?.topCuisines.get(item.id) ?? []}
              />
            )}
          />
        )}
      </View>
    </Screen>
  );
}
