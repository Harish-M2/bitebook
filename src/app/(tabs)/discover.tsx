import { useState } from 'react';
import { Compass } from 'lucide-react-native';
import { FlatList, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { queryKeys } from '@/lib/queryClient';
import { listCuisines } from '@/lib/db/cuisines';
import { listRestaurants, listTrendingDishes } from '@/lib/db/restaurants';
import { Screen } from '@/components/ui/Screen';
import { Heading } from '@/components/ui/Typography';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DishCard } from '@/components/food/DishCard';
import { RestaurantRow } from '@/components/food/RestaurantRow';
import type { Restaurant } from '@/types/models';

/** Discover tab — search, cuisine filters, trending dishes rail, nearby restaurants list. */
export default function DiscoverScreen() {
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);

  // The cuisine taxonomy is seeded by migration 0023, so these chips have real data even
  // before any restaurant exists.
  const cuisines = useQuery({ queryKey: ['cuisines'], queryFn: listCuisines });

  const restaurants = useQuery({
    queryKey: [...queryKeys.restaurants(), activeCuisine],
    queryFn: () => listRestaurants(activeCuisine),
  });

  const trending = useQuery({ queryKey: ['trending-dishes'], queryFn: listTrendingDishes });

  if (restaurants.isError) {
    return (
      <Screen>
        <ErrorState
          title="Could not load restaurants"
          description={restaurants.error.message}
          onRetry={() => void restaurants.refetch()}
        />
      </Screen>
    );
  }

  const trendingDishes = trending.data ?? [];

  return (
    <Screen>
      <FlatList<Restaurant>
        data={restaurants.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="gap-lg pb-md">
            <View className="gap-md px-lg pt-xs">
              <Heading level={2}>Discover</Heading>
              <SearchBar placeholder="Search for dishes, restaurants, cuisines..." />
            </View>

            <FlatList
              horizontal
              data={cuisines.data ?? []}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
              renderItem={({ item }) => (
                <Chip
                  label={item.name}
                  selected={activeCuisine === item.slug}
                  // Tapping the active chip clears the filter rather than leaving the user
                  // with no way back to "everything".
                  onPress={() => setActiveCuisine(activeCuisine === item.slug ? null : item.slug)}
                />
              )}
            />

            {trendingDishes.length > 0 ? (
              <View className="gap-sm">
                <Heading level={3} className="px-lg">
                  Trending dishes
                </Heading>
                <FlatList
                  horizontal
                  data={trendingDishes}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
                  renderItem={({ item }) => <DishCard dish={item} />}
                />
              </View>
            ) : null}

            <Heading level={3} className="px-lg">
              Restaurants
            </Heading>
          </View>
        }
        renderItem={({ item }) => <RestaurantRow restaurant={item} className="px-lg pb-lg" />}
        ListEmptyComponent={
          restaurants.isPending ? null : (
            <EmptyState
              icon={<Compass size={40} color={colors.textMuted} />}
              title="No restaurants yet"
              description={
                activeCuisine
                  ? 'Nothing matches this cuisine yet. Try another filter.'
                  : 'Restaurant data has not been imported yet.'
              }
            />
          )
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      />
    </Screen>
  );
}
