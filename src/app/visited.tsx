import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { listReviewedRestaurantIds, listVisited } from '@/lib/db/visited';

type StateFilter = 'all' | 'visited_only' | 'reviewed';

/** Private list of restaurants the user has marked as visited. */
export default function VisitedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const visited = useQuery({
    queryKey: ['visited-list', user?.id ?? null],
    queryFn: listVisited,
    enabled: Boolean(user),
  });

  const reviewed = useQuery({
    queryKey: ['reviewed-restaurant-ids', user?.id ?? null],
    queryFn: () => listReviewedRestaurantIds(user!.id),
    enabled: Boolean(user),
  });
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const reviewedIds = new Set(reviewed.data ?? []);
  const needle = query.trim().toLowerCase();
  const rows = (visited.data ?? []).filter((item) => {
    const isReviewed = reviewedIds.has(item.restaurant_id);
    if (stateFilter === 'reviewed' && !isReviewed) return false;
    if (stateFilter === 'visited_only' && isReviewed) return false;
    if (!needle) return true;
    return `${item.restaurant?.name ?? ''} ${item.restaurant?.city ?? ''}`.toLowerCase().includes(needle);
  });

  return (
    <Screen>
      <Heading level={2} className="px-lg pb-md pt-xs">
        Visited
      </Heading>
      <View className="gap-xs px-lg pb-sm">
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search your visited restaurants" />
        <View className="flex-row gap-xs">
          {([
            ['all', 'All'],
            ['visited_only', 'Visited only'],
            ['reviewed', 'Reviewed'],
          ] as const).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={stateFilter === value}
              onPress={() => setStateFilter(value)}
            />
          ))}
        </View>
      </View>
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
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.restaurant?.name ?? 'Restaurant'}
              onPress={() =>
                router.push({ pathname: '/visit-edit', params: { visitId: item.id } })
              }
              className="gap-xxs py-sm">
              <BodyText medium>{item.restaurant?.name ?? 'Restaurant'}</BodyText>
              <Caption color="textSecondary">
                {[
                  item.restaurant?.city,
                  new Date(item.visited_at).toLocaleDateString(),
                  reviewedIds.has(item.restaurant_id) ? 'Reviewed' : 'Visited only',
                ]
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
