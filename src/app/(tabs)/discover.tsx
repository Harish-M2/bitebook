import { useState } from 'react';
import { Compass } from 'lucide-react-native';
import { FlatList, View } from 'react-native';

import { colors } from '@/constants/colors';
import { Screen } from '@/components/ui/Screen';
import { Heading } from '@/components/ui/Typography';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { DishCard } from '@/components/food/DishCard';
import { RestaurantRow } from '@/components/food/RestaurantRow';
import { mockNearbyRestaurants, mockQuickFilters, mockTrendingDishes } from '@/mock-data/discover';
import type { Restaurant } from '@/types/models';

/** Discover tab — search, quick filters, trending dishes rail, nearby restaurants list. */
export default function DiscoverScreen() {
  const [activeFilter, setActiveFilter] = useState<string>(mockQuickFilters[0].id);

  return (
    <Screen>
      <FlatList<Restaurant>
        data={mockNearbyRestaurants}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="gap-lg pb-md">
            <View className="gap-md px-lg pt-xs">
              <Heading level={2}>Discover</Heading>
              <SearchBar placeholder="Search for dishes, restaurants, cuisines..." />
            </View>

            <FlatList
              horizontal
              data={mockQuickFilters}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
              renderItem={({ item }) => (
                <Chip
                  label={item.label}
                  selected={activeFilter === item.id}
                  onPress={() => setActiveFilter(item.id)}
                />
              )}
            />

            <View className="gap-sm">
              <Heading level={3} className="px-lg">
                Trending dishes
              </Heading>
              <FlatList
                horizontal
                data={mockTrendingDishes}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
                renderItem={({ item }) => <DishCard dish={item} />}
              />
            </View>

            <Heading level={3} className="px-lg">
              Nearby restaurants
            </Heading>
          </View>
        }
        renderItem={({ item }) => <RestaurantRow restaurant={item} className="px-lg pb-lg" />}
        ListEmptyComponent={
          <EmptyState
            icon={<Compass size={40} color={colors.textMuted} />}
            title="Nothing nearby yet"
            description="Try another search or check back soon."
          />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      />
    </Screen>
  );
}
