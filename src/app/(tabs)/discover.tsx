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
import { filterRestaurants, rankRestaurants, type RestaurantFilters } from '@/lib/db/filters';
import type { MenuItem } from '@/lib/db/menus';
import { getRestaurantMenu } from '@/lib/db/menus';
import { importPlace, searchPlaces, type PlaceSearchResult } from '@/lib/db/places';
import {
  listFriendRecommendations,
  listRecentlyReviewedRestaurants,
  listRestaurantRatingStats,
} from '@/lib/db/restaurant-reviews';
import { getCuisinePreferences } from '@/lib/db/preferences';
import { listVisited } from '@/lib/db/visited';
import { listRestaurants, listTrendingDishes } from '@/lib/db/restaurants';
import { saveRestaurant } from '@/lib/db/saved';
import { getFollowing, searchPeople } from '@/lib/db/social';
import { queryKeys } from '@/lib/queryClient';
import type { Restaurant } from '@/types/models';

/** Restaurants rendered per page of the ranked list. */
const LIST_PAGE_SIZE = 20;

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
  const [searchFocused, setSearchFocused] = useState(false);
  const [paging, setPaging] = useState<{ key: string; count: number }>({ key: '', count: 20 });
  const [railTab, setRailTab] = useState<'trending' | 'recent'>('trending');
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
  const friendRecs = useQuery({
    queryKey: ['friend-recommendations', user?.id ?? null],
    queryFn: async () => listFriendRecommendations(await getFollowing(user!.id)),
    enabled: Boolean(user),
  });
  const ratingStats = useQuery({
    queryKey: ['restaurant-rating-stats'],
    queryFn: listRestaurantRatingStats,
  });
  const visited = useQuery({
    queryKey: ['visited-list', user?.id ?? null],
    queryFn: listVisited,
    enabled: Boolean(user),
  });
  const favouriteCuisineIds = useQuery({
    queryKey: ['cuisine-preferences', user?.id ?? null],
    queryFn: () => getCuisinePreferences(user!.id),
    enabled: Boolean(user),
  });
  const recentlyReviewed = useQuery({
    queryKey: ['recently-reviewed-restaurants'],
    queryFn: () => listRecentlyReviewedRestaurants(),
  });

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
  const withRatings = (restaurants.data ?? []).map((restaurant) => {
    const stat = ratingStats.data?.get(restaurant.id);
    return stat ? { ...restaurant, rating: stat.average, reviewCount: stat.count } : restaurant;
  });
  const visitedIds = new Set((visited.data ?? []).map((visit) => visit.restaurant_id));
  const favouriteNames = new Set(
    (cuisines.data ?? [])
      .filter((cuisine) => (favouriteCuisineIds.data ?? []).includes(cuisine.id))
      .map((cuisine) => cuisine.name),
  );
  const ranked = rankRestaurants(
    filterRestaurants(withRatings, activeFilters).filter(
      (restaurant) => !(activeFilters.hideVisited && visitedIds.has(restaurant.id)),
    ),
    activeFilters.sort ?? 'recommended',
    {
      friendRestaurantIds: new Set((friendRecs.data ?? []).map((rec) => rec.restaurantId)),
      favouriteCuisines: favouriteNames,
    },
  );
  // The visible count resets whenever the cuisine or filters change, without an effect.
  const listKey = JSON.stringify([activeCuisine, activeFilters]);
  const visibleCount = paging.key === listKey ? paging.count : LIST_PAGE_SIZE;
  const filteredRestaurants = ranked.slice(0, visibleCount);

  // The mode switch only appears while the user is actually searching, so the resting page
  // is just search + filters + content.
  const showModeToggle = searchFocused || query.length > 0 || searchMode === 'people';
  const hasActiveFilters =
    activeCuisine !== null || Object.values(activeFilters).some((value) => value !== undefined);
  // Rails are for browsing; once the user narrows or searches, show only results.
  const showRails = searchMode === 'places' && !isSearching && !hasActiveFilters;
  const hasTrending = trendingDishes.length > 0;
  const hasRecent = (recentlyReviewed.data ?? []).length > 0;
  const activeRail = hasTrending && (railTab === 'trending' || !hasRecent) ? 'trending' : 'recent';

  const header = (
    <View className="gap-xl pb-md">
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
          {showModeToggle ? (
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
          ) : null}
          <View className="flex-row items-center gap-sm">
            <View style={{ flex: 1 }}>
            <SearchBar
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            onFocus={() => setSearchFocused(true)}
            // Delayed so a tap on the mode switch is not lost to the blur that precedes it.
            onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
            placeholder={
              searchMode === 'people'
                ? 'Search by name or username...'
                : 'Search for dishes, restaurants, cuisines...'
            }
          />
            </View>
            {searchMode === 'places' && !isSearching ? (
              <FilterBar
                compact
                restaurants={restaurants.data ?? []}
                activeFilters={activeFilters}
                onFiltersChange={setActiveFilters}
                cuisines={cuisines.data ?? []}
                activeCuisine={activeCuisine}
                onCuisineChange={setActiveCuisine}
              />
            ) : null}
          </View>
        </View>
      </View>

      {showRails ? (
        <>
          {(friendRecs.data ?? []).length > 0 ? (
            <View className="gap-sm">
              <Caption color="textSecondary" className="px-lg">
                From people you follow
              </Caption>
              <FlatList
                horizontal
                data={(friendRecs.data ?? []).slice(0, 8)}
                keyExtractor={(item) => item.restaurantId}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.name}`}
                    onPress={() =>
                      router.push({ pathname: '/restaurant-detail', params: { restaurantId: item.restaurantId } })
                    }
                    className="gap-xxs rounded-lg border border-border bg-surface px-md py-sm"
                    style={{ minWidth: 170, maxWidth: 240 }}>
                    <BodyText medium numberOfLines={1}>{item.name}</BodyText>
                    <Caption numberOfLines={1}>
                      {item.topTier === 5 ? '🤤 Must try' : '😋 Worth a visit'}
                    </Caption>
                    <Caption color="textSecondary" numberOfLines={1}>
                      {item.friendNames.slice(0, 2).join(', ')}
                      {item.friendNames.length > 2 ? ` +${item.friendNames.length - 2}` : ''}
                    </Caption>
                  </Pressable>
                )}
              />
            </View>
          ) : null}

          {hasTrending || hasRecent ? (
            <View className="gap-sm">
              {hasTrending && hasRecent ? (
                <View className="flex-row gap-xs px-lg">
                  <Chip label="Trending dishes" selected={activeRail === 'trending'} onPress={() => setRailTab('trending')} />
                  <Chip label="Recently reviewed" selected={activeRail === 'recent'} onPress={() => setRailTab('recent')} />
                </View>
              ) : (
                <Caption color="textSecondary" className="px-lg">
                  {hasTrending ? 'Trending dishes' : 'Recently reviewed'}
                </Caption>
              )}
              {activeRail === 'trending' ? (
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
              ) : (
                <FlatList
                  horizontal
                  data={recentlyReviewed.data ?? []}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
                  renderItem={({ item }) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${item.name}`}
                      onPress={() =>
                        router.push({ pathname: '/restaurant-detail', params: { restaurantId: item.id } })
                      }
                      className="gap-xxs rounded-lg border border-border bg-surface px-md py-sm"
                      style={{ minWidth: 150, maxWidth: 220 }}>
                      <BodyText medium numberOfLines={1}>{item.name}</BodyText>
                      {item.city ? <Caption numberOfLines={1}>{item.city}</Caption> : null}
                    </Pressable>
                  )}
                />
              )}
            </View>
          ) : null}
        </>
      ) : null}

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
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (visibleCount < ranked.length) setPaging({ key: listKey, count: visibleCount + LIST_PAGE_SIZE });
        }}
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
