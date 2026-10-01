import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Compass, Heart, Search, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, View } from 'react-native';

import { DishCard } from '@/components/food/DishCard';
import { FilterBar } from '@/components/food/FilterBar';
import { PlaceResultRow } from '@/components/food/PlaceResultRow';
import { RestaurantRow } from '@/components/food/RestaurantRow';
import { FollowButton } from '@/components/social/FollowButton';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MenuModal } from '@/components/ui/MenuModal';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAppTheme } from '@/hooks/useTheme';
import { listCuisines } from '@/lib/db/cuisines';
import { filterRestaurants, type RestaurantFilters } from '@/lib/db/filters';
import type { MenuItem } from '@/lib/db/menus';
import { getRestaurantMenu } from '@/lib/db/menus';
import { importPlace, searchPlaces, type PlaceSearchResult } from '@/lib/db/places';
import { listRestaurants, listTrendingDishes } from '@/lib/db/restaurants';
import { saveRestaurant } from '@/lib/db/saved';
import { searchPeople } from '@/lib/db/social';
import { queryKeys } from '@/lib/queryClient';
import type { Restaurant } from '@/types/models';

/** Below this the provider rejects the query anyway; matches the Edge Function's guard. */
const MIN_QUERY_LENGTH = 2;

/** Discover tab — search, cuisine filters, trending dishes rail, nearby restaurants list. */
export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors: palette } = useAppTheme();
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'places' | 'people'>('places');
  const [activeFilters, setActiveFilters] = useState<RestaurantFilters>({});
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
      const message = error instanceof Error ? error.message : 'Could not save restaurant';
      if (Platform.OS === 'web') {
        window.alert(`Could not save restaurant\n\n${message}`);
      } else {
        Alert.alert('Could not save restaurant', message);
      }
      throw error;
    }
  };

  // The provider bills per call, so the request follows the pause, not the keystroke.
  const debouncedQuery = useDebouncedValue(query.trim());
  const isSearching = searchMode === 'places' && debouncedQuery.length >= MIN_QUERY_LENGTH;
  const isPeopleSearching = debouncedQuery.length >= MIN_QUERY_LENGTH;

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

  const people = useQuery({
    queryKey: ['people-search', user?.id, debouncedQuery],
    queryFn: () => {
      if (!user) throw new Error('You need to be signed in to search for people.');
      return searchPeople(debouncedQuery, user.id);
    },
    enabled: searchMode === 'people' && isPeopleSearching && user !== null,
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
    router.push({ pathname: '/restaurant-detail', params: { restaurantId: restaurant.id } });
  };

  const handleLoadMenu = async (restaurant: Restaurant) => {
    setMenuLoading(true);
    setMenuTitle(restaurant.name);
    setMenuItems([]);
    setMenuVisible(true);

    try {
      const items = await getRestaurantMenu(restaurant.id, restaurant.name);
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load restaurant menu:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch menu for this restaurant.';
      if (Platform.OS === 'web') {
        window.alert(`Could not load menu\n\n${message}`);
      } else {
        Alert.alert('Could not load menu', message);
      }
    } finally {
      setMenuLoading(false);
    }
  };

  if (searchMode === 'places' && restaurants.isError && !isSearching) {
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
            onPress={() => router.push('/saved')}
            hitSlop={8}
          >
            <Heart size={24} color={colors.accent} />
          </Pressable>
        </View>
        <View style={{ width: '100%', maxWidth: 920, alignSelf: 'center' }}>
          <View
            className="mb-sm flex-row rounded-pill p-xxs"
            style={{ backgroundColor: palette.surfaceMuted }}>
            <Pressable
              className="flex-1 items-center rounded-pill px-sm py-xs"
              style={{ backgroundColor: searchMode === 'places' ? palette.surfaceElevated : 'transparent' }}
              onPress={() => setSearchMode('places')}
              accessibilityRole="button"
              accessibilityState={{ selected: searchMode === 'places' }}>
              <BodyText medium color={searchMode === 'places' ? 'textPrimary' : 'textSecondary'}>
                Places
              </BodyText>
            </Pressable>
            <Pressable
              className="flex-1 items-center rounded-pill px-sm py-xs"
              style={{ backgroundColor: searchMode === 'people' ? palette.surfaceElevated : 'transparent' }}
              onPress={() => setSearchMode('people')}
              accessibilityRole="button"
              accessibilityState={{ selected: searchMode === 'people' }}>
              <BodyText medium color={searchMode === 'people' ? 'textPrimary' : 'textSecondary'}>
                People
              </BodyText>
            </Pressable>
          </View>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            placeholder={
              searchMode === 'people'
                ? 'Search by name or username...'
                : 'Search for dishes, restaurants, cuisines...'
            }
          />
        </View>
      </View>

      {searchMode !== 'places' || isSearching ? null : (
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
                renderItem={({ item }) => (
                  <DishCard
                    dish={item}
                    onPress={() => router.push({ pathname: '/dish-detail', params: { dishId: item.id } })}
                  />
                )}
              />
            </View>
          ) : null}
        </>
      )}

      <Heading level={3} className="px-lg">
        {searchMode === 'people' ? 'People' : isSearching ? 'Add a restaurant' : 'Restaurants'}
      </Heading>
    </View>
  );

  if (searchMode === 'people') {
    return (
      <Screen>
        <FlatList
          data={people.data ?? []}
          keyExtractor={(person) => person.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-sm px-lg pb-md">
              <Pressable
                className="min-w-0 flex-1 flex-row items-center gap-sm"
                onPress={() =>
                  router.push({ pathname: '/user/[userId]', params: { userId: item.id } })
                }
                accessibilityRole="button"
                accessibilityLabel={`View ${item.display_name ?? item.username}'s profile`}>
                <Avatar
                  uri={item.avatar_url}
                  name={item.display_name ?? item.username ?? 'User'}
                  size="md"
                />
                <View className="flex-1 gap-xxs">
                  <BodyText medium numberOfLines={1}>
                    {item.display_name ?? item.username}
                  </BodyText>
                  <Caption numberOfLines={1}>@{item.username}</Caption>
                </View>
              </Pressable>
              <FollowButton
                userId={item.id}
                onFollowChange={() => {
                  if (user) {
                    void queryClient.invalidateQueries({ queryKey: queryKeys.feed(user.id) });
                  }
                }}
              />
            </View>
          )}
          ListEmptyComponent={
            people.isError ? (
              <ErrorState
                title="People search failed"
                description={people.error.message}
                onRetry={() => void people.refetch()}
              />
            ) : people.isFetching ? (
              <View className="items-center py-xxl">
                <ActivityIndicator color={palette.accent} />
              </View>
            ) : isPeopleSearching ? (
              <EmptyState
                icon={<Users size={36} color={palette.textMuted} />}
                title="No people found"
                description={`No accounts matched “${debouncedQuery}”. Try a username or display name.`}
              />
            ) : (
              <EmptyState
                icon={<Users size={36} color={palette.textMuted} />}
                title="Find people to follow"
                description="Search by display name or username. Enter at least two characters."
              />
            )
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        />
      </Screen>
    );
  }

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
