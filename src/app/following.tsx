import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { getFollowingProfiles } from '@/lib/db/social';

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

  return (
    <Screen>
      <View className="w-full flex-1 gap-lg self-center px-lg pt-sm" style={{ maxWidth: 760 }}>
        <View className="flex-row items-center gap-md">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-pill border border-border">
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <Heading level={2}>Following</Heading>
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
            renderItem={({ item }) => {
              const name = item.display_name || item.username || 'Bitebook user';
              return (
                <Pressable
                  onPress={() => router.push(`/user/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${name}'s profile`}
                  className="flex-row items-center gap-md py-sm">
                  <Avatar uri={item.avatar_url} name={name} size="md" />
                  <View className="flex-1">
                    <BodyText medium>{name}</BodyText>
                    {item.username ? <Caption>@{item.username}</Caption> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
