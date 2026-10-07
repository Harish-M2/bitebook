import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { listVisited } from '@/lib/db/visited';

/** Private list of restaurants the user has marked as visited. */
export default function VisitedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const visited = useQuery({
    queryKey: ['visited-list', user?.id ?? null],
    queryFn: listVisited,
    enabled: Boolean(user),
  });

  return (
    <Screen>
      <Heading level={2} className="px-lg pb-md pt-xs">
        Visited
      </Heading>
      {visited.isPending ? (
        <View className="items-center py-xl">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : visited.isError ? (
        <ErrorState
          title="Could not load visited restaurants"
          description={visited.error.message}
          onRetry={() => void visited.refetch()}
        />
      ) : visited.data.length === 0 ? (
        <EmptyState
          icon={<Check size={32} color={colors.textMuted} />}
          title="No visited restaurants yet"
          description="Tap “Mark as visited” on a restaurant to keep a personal history."
        />
      ) : (
        <FlatList
          data={visited.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.restaurant?.name ?? 'Restaurant'}
              onPress={() =>
                router.push({
                  pathname: '/restaurant-detail',
                  params: { restaurantId: item.restaurant_id },
                })
              }
              className="gap-xxs py-sm">
              <BodyText medium>{item.restaurant?.name ?? 'Restaurant'}</BodyText>
              <Caption color="textSecondary">
                {[item.restaurant?.city, new Date(item.visited_at).toLocaleDateString()]
                  .filter(Boolean)
                  .join(' · ')}
              </Caption>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
