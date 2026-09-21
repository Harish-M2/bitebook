import { useState } from 'react';
import { Compass, Search, Heart } from 'lucide-react-native';
import { Alert, FlatList, View, Pressable } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { queryKeys } from '@/lib/queryClient';
import { listCuisines } from '@/lib/db/cuisines';
import { listRestaurants, listTrendingDishes, getRestaurantPhotos } from '@/lib/db/restaurants';
import { importPlace, searchPlaces, type PlaceSearchResult } from '@/lib/db/places';
import { getRestaurantMenu } from '@/lib/db/menus';
import { filterRestaurants, type RestaurantFilters } from '@/lib/db/filters';
import { saveRestaurant } from '@/lib/db/saved';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Screen } from '@/components/ui/Screen';
import { Heading } from '@/components/ui/Typography';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DishCard } from '@/components/food/DishCard';
import { RestaurantRow } from '@/components/food/RestaurantRow';
import { PlaceResultRow } from '@/components/food/PlaceResultRow';
import { FilterBar } from '@/components/food/FilterBar';
import { PhotoGalleryModal } from '@/components/ui/PhotoGalleryModal';
import { MenuModal } from '@/components/ui/MenuModal';
import type { Restaurant } from '@/types/models';
import type { MenuItem } from '@/lib/db/menus';

/** Below this the provider rejects the query anyway; matches the Edge Function's guard. */
const MIN_QUERY_LENGTH = 2;

/** Discover tab — search, cuisine filters, trending dishes rail, nearby restaurants list. */
export default function DiscoverScreen() {
  const router = useRouter();
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<RestaurantFilters>({});
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuTitle, setMenuTitle] = useState('');
  const [menuLoading, setMenuLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleRestaurantSave = async (restaurantId: string) => {
    try {
      await saveRestaurant(restaurantId);
      void queryClient.invalidateQueries({ queryKey: ['saved-restaurants'] });
    } catch (error) {
      console.error('Failed to save restaurant:', error);
      Alert.alert('Error', 'Could not save restaurant');
    }
  };

  // The provider bills per call, so the request follows the pause, not the keystroke.
  const debouncedQuery = useDebouncedValue(query.trim());
  const isSearching = debouncedQuery.length >= MIN_QUERY_LENGTH;

  // The cuisine taxonomy is seeded by migration 0023, so these chips have real data even
  // before any restaurant exists.
  const cuisines = useQuery({ queryKey: ['cuisines'], queryFn: listCuisines });

  const restaurants = useQuery({
    queryKey: [...queryKeys.restaurants(), activeCuisine],
    queryFn: () => listRestaurants(activeCuisine),
  });

  const trending = useQuery({ queryKey: ['trending-dishes'], queryFn: listTrendingDishes });

  const places = useQuery({
    queryKey: queryKeys.placeSearch(debouncedQuery),
    queryFn: () => searchPlaces(debouncedQuery),
    enabled: isSearching,
    // Results are a paid-for lookup of data that barely changes; keep them well past the
    // global 30s default so backspacing a character does not buy them again.
    staleTime: 5 * 60_000,
  });

  const addPlace = useMutation({
    mutationFn: (place: PlaceSearchResult) => importPlace(place.externalPlaceId),
    onSuccess: (restaurant) => {
      // The new row belongs in the catalogue list behind the search, whatever cuisine
      // filter happens to be active.
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants() });
      setQuery('');
      Alert.alert('Added', `${restaurant.name} is now in Bitebook.`);
    },
    onError: (error: Error) => {
      Alert.alert('Could not add restaurant', error.message);
    },
  });

  const handleRestaurantPress = async (restaurant: Restaurant) => {
    try {
      const photos = await getRestaurantPhotos(restaurant.id);
      if (photos && photos.length > 0) {
        setGalleryPhotos(photos);
        setGalleryTitle(restaurant.name);
        setGalleryVisible(true);
      }
    } catch (error) {
      console.error('Failed to load restaurant photos:', error);
    }
  };

  const handleLoadMenu = async (restaurant: Restaurant) => {
    setMenuLoading(true);
    setMenuTitle(restaurant.name);
    setMenuItems([]);

    try {
      const items = await getRestaurantMenu(restaurant.id, restaurant.name);
      setMenuItems(items);
      setMenuVisible(true);
    } catch (error) {
      console.error('Failed to load restaurant menu:', error);
      Alert.alert('Could not load menu', 'Failed to fetch menu for this restaurant.');
    } finally {
      setMenuLoading(false);
    }
  };

  if (restaurants.isError && !isSearching) {
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

  // Apply filters to restaurants
  const filteredRestaurants = filterRestaurants(restaurants.data ?? [], activeFilters);

  const header = (
    <View className="gap-lg pb-md">
      <View className="gap-md px-lg pt-xs">
        <View className="flex-row items-center justify-between">
          <Heading level={2}>Discover</Heading>
          <Pressable
            onPress={() => router.push('/(tabs)/discover/(modal)/saved')}
            hitSlop={8}
          >
            <Heart size={24} color={colors.accent} />
          </Pressable>
        </View>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          placeholder="Search for dishes, restaurants, cuisines..."
        />
      </View>

      {isSearching ? null : (
        <>
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

          {/* Filter Bar */}
          {(restaurants.data ?? []).length > 0 && (
            <FilterBar
              restaurants={restaurants.data ?? []}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
            />
          )}

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
        </>
      )}

      <Heading level={3} className="px-lg">
        {isSearching ? 'Add a restaurant' : 'Restaurants'}
      </Heading>
    </View>
  );

  // Searching swaps the catalogue list for provider results. The catalogue starts empty and
  // only fills as people add places, so a search that looked only at what we already hold
  // would find nothing and give the user no way to fix that.
  if (isSearching) {
    return (
      <Screen>
        <FlatList<PlaceSearchResult>
          data={places.data ?? []}
          keyExtractor={(item) => item.externalPlaceId}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <PlaceResultRow
              place={item}
              className="px-lg pb-lg"
              isImporting={
                addPlace.isPending &&
                addPlace.variables?.externalPlaceId === item.externalPlaceId
              }
              onPress={() => addPlace.mutate(item)}
            />
          )}
          ListEmptyComponent={
            places.isPending ? null : places.isError ? (
              <ErrorState
                title="Search failed"
                description={places.error.message}
                onRetry={() => void places.refetch()}
              />
            ) : (
              <EmptyState
                icon={<Search size={40} color={colors.textMuted} />}
                title="No places found"
                description={`Nothing matched “${debouncedQuery}”. Try a different spelling or a nearby area.`}
              />
            )
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList<Restaurant>
        data={filteredRestaurants}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <RestaurantRow
            restaurant={item}
            className="px-lg pb-lg"
            onPress={() => handleRestaurantPress(item)}
            onViewMenu={() => handleLoadMenu(item)}
            onSave={() => handleRestaurantSave(item.id)}
          />
        )}
        ListEmptyComponent={
          restaurants.isPending ? null : (
            <EmptyState
              icon={<Compass size={40} color={colors.textMuted} />}
              title="No restaurants yet"
              description={
                activeCuisine
                  ? 'Nothing matches this cuisine yet. Try another filter.'
                  : 'Search above to add the first restaurant.'
              }
            />
          )
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      />
      <PhotoGalleryModal
        visible={galleryVisible}
        photos={galleryPhotos.map((url) => ({ url }))}
        onClose={() => setGalleryVisible(false)}
        title={galleryTitle}
      />
      <MenuModal
        visible={menuVisible}
        title={menuTitle}
        items={menuItems}
        isLoading={menuLoading}
        onClose={() => setMenuVisible(false)}
      />
    </Screen>
  );
}
