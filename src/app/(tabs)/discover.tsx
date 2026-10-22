import { BrandIcon } from '@/components/ui/BrandIcon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { DishCard } from '@/components/food/DishCard';
import { FilterBar } from '@/components/food/FilterBar';
import { PlaceResultRow } from '@/components/food/PlaceResultRow';
import { RestaurantRow } from '@/components/food/RestaurantRow';
import { FollowButton } from '@/components/social/FollowButton';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MenuModal } from '@/components/ui/MenuModal';
import { Screen } from '@/components/ui/Screen';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import { spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDiscover } from '@/hooks/useDiscover';
import { useAppTheme } from '@/hooks/useTheme';
import { filterDiscoverDishes, mixDiscoverItems, selectDiscoverRestaurants, type DiscoverFilter, type DiscoverItem, type DiscoverSection } from '@/lib/db/discovery';
import { filterRestaurants, type RestaurantFilters } from '@/lib/db/filters';
import { getRestaurantMenu } from '@/lib/db/menus';
import { importPlace, searchPlaces, type PlaceSearchResult } from '@/lib/db/places';
import { searchPeople } from '@/lib/db/social';
import { queryKeys } from '@/lib/queryClient';

const FILTERS: DiscoverFilter[] = ['For You', 'Trending', 'Restaurants', 'Dishes'];
type GridRow = { key: string; title?: string; items?: DiscoverItem[] };

function toGridRows(sections: DiscoverSection[]): GridRow[] {
  return sections.flatMap((section) => {
    if (!section.items.length) return [];
    const rows: GridRow[] = [{ key: section.title, title: section.title }];
    for (let index = 0; index < section.items.length; index += 2) {
      rows.push({ key: `${section.title}-${index}`, items: section.items.slice(index, index + 2) });
    }
    return rows;
  });
}

export default function DiscoverScreen() {
  const { width } = useWindowDimensions();
  const gridGap = width >= 768 ? spacing.xl : spacing.md;
  const router = useRouter();
  const client = useQueryClient();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'food' | 'people'>('food');
  const [tab, setTab] = useState<DiscoverFilter>('For You');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [filters, setFilters] = useState<RestaurantFilters>({});
  const [externalQuery, setExternalQuery] = useState<string | null>(null);
  const [menuRestaurant, setMenuRestaurant] = useState<{ id: string; name: string } | null>(null);
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery);
  const waiting = trimmedQuery !== debouncedQuery;
  const searching = trimmedQuery.length >= 2;
  const data = useDiscover(debouncedQuery, cuisine, mode === 'food' && searching && !waiting);
  const menu = useQuery({
    queryKey: ['restaurant-menu', menuRestaurant?.id],
    queryFn: ({ signal }) => getRestaurantMenu(menuRestaurant!.id, menuRestaurant!.name, signal),
    enabled: Boolean(menuRestaurant),
    retry: false,
  });
  const people = useQuery({
    queryKey: ['people-search', user?.id, debouncedQuery],
    queryFn: ({ signal }) => searchPeople(debouncedQuery, user!.id, signal),
    enabled: mode === 'people' && searching && !waiting && Boolean(user),
  });
  const showPlaces = mode === 'food' && searching && !waiting && externalQuery === debouncedQuery;
  const places = useQuery({
    queryKey: queryKeys.placeSearch(debouncedQuery),
    queryFn: ({ signal }) => searchPlaces(debouncedQuery, {}, signal),
    enabled: showPlaces,
    staleTime: 5 * 60_000,
  });
  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };
  const addPlace = useMutation({
    mutationFn: (place: PlaceSearchResult) => importPlace(place.externalPlaceId),
    onSuccess: (restaurant) => {
      void client.invalidateQueries({ queryKey: queryKeys.restaurants() });
      router.push({ pathname: '/restaurant-detail', params: { restaurantId: restaurant.id } });
    },
    onError: (error: Error) => notify('Could not add restaurant', error.message),
  });

  const ratedRestaurants = (searching ? data.search.data?.restaurants ?? [] : data.restaurants.data ?? []).map((restaurant) => {
    const stats = data.ratings.data?.get(restaurant.id);
    return stats ? { ...restaurant, rating: stats.average, reviewCount: stats.count } : restaurant;
  });
  const visitedIds = new Set((data.visited.data ?? []).map((visit) => visit.restaurant_id));
  const context = {
    friendRestaurantIds: new Set((data.friends.data ?? []).map((friend) => friend.restaurantId)),
    favouriteCuisines: new Set((data.cuisines.data ?? [])
      .filter((item) => (data.preferences.data ?? []).includes(item.id)).map((item) => item.name)),
  };
  const recentIds = new Set((data.recent.data ?? []).map((restaurant) => restaurant.id));
  const candidates = ratedRestaurants.filter((restaurant) => (!filters.hideVisited || !visitedIds.has(restaurant.id))
    && (!cuisine || restaurant.cuisineSlugs?.includes(cuisine)));
  const recommended = selectDiscoverRestaurants(candidates, context, recentIds, filters);
  const trending = selectDiscoverRestaurants(candidates, context, recentIds, filters, true);
  const personalised = recommended.filter((restaurant) => context.friendRestaurantIds.has(restaurant.id) || context.favouriteCuisines.has(restaurant.cuisine));
  const chosenIds = new Set(personalised.map((restaurant) => restaurant.id));
  const restaurantItems = (restaurants: typeof candidates): DiscoverItem[] => restaurants.map((value) => ({ kind: 'restaurant', value }));
  const dishItems: DiscoverItem[] = filterDiscoverDishes(searching ? data.search.data?.dishes ?? [] : data.dishes.data ?? [], filters, cuisine, visitedIds)
    .map((value) => ({ kind: 'dish', value }));
  const sections: DiscoverSection[] = searching ? [
    { title: 'Restaurants', items: tab === 'Dishes' ? [] : restaurantItems(filterRestaurants(candidates, filters)) },
    { title: 'Dishes', items: tab === 'Restaurants' ? [] : dishItems },
  ] : tab === 'Dishes' ? [{ title: 'Popular dishes', items: dishItems }]
    : tab === 'Trending' ? [{ title: 'Trending restaurants', items: restaurantItems(trending) }, { title: 'Popular dishes', items: dishItems }]
    : tab === 'Restaurants' ? [{ title: 'Recommended restaurants', items: restaurantItems(recommended) }]
    : [
      { title: 'Picked for you', items: restaurantItems(personalised) },
      { title: 'Discover picks', items: mixDiscoverItems(restaurantItems(trending.filter((restaurant) => !chosenIds.has(restaurant.id))), dishItems) },
      { title: 'Highly rated restaurants', items: restaurantItems(recommended.filter((restaurant) => !chosenIds.has(restaurant.id) && !recentIds.has(restaurant.id))) },
    ];
  const rows = waiting ? [] : toGridRows(sections);
  const savedIds = new Set(data.saved.data ?? []);
  const loading = waiting || (searching ? data.search.isPending : data.restaurants.isPending || data.dishes.isPending || data.ratings.isPending || data.recent.isPending);
  const queries = [data.restaurants, data.dishes, data.ratings, data.recent, data.cuisines,
    ...(user ? [data.preferences, data.friends, data.saved] : []), ...(filters.hideVisited ? [data.visited] : [])];
  const refresh = () => {
    queries.forEach((request) => void request.refetch());
    if (searching) void data.search.refetch();
  };
  const errors = (searching ? [data.search, data.ratings, data.saved] : queries).filter((request) => request.isError);

  const header = (
    <View className="gap-md px-lg pb-md pt-xs">
      <View className="flex-row items-center justify-between gap-sm">
        <View className="flex-1 gap-xxs">
          <Heading level={2}>Discover</Heading>
          <BodyText color="textSecondary">Your next great bite.</BodyText>
        </View>
        <Pressable onPress={() => router.push('/saved')} accessibilityRole="button" accessibilityLabel="Open saved restaurants" style={{ padding: 12 }}>
          <BrandIcon name="bookmark" size={24} variant="gold" />
        </Pressable>
      </View>
      <SearchBar value={query} onChangeText={(value) => { setQuery(value); setExternalQuery(null); }}
        autoCorrect={false} returnKeyType="search"
        placeholder={mode === 'people' ? 'Search names and usernames' : 'Search restaurants, dishes, cuisines'} />
      <View className="flex-row gap-xs">
        <Chip label="Food" selected={mode === 'food'} onPress={() => setMode('food')} />
        <Chip label="People" selected={mode === 'people'} onPress={() => setMode('people')} />
      </View>
      {mode === 'food' ? (
        <View className="gap-sm">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((filter) => <Chip key={filter} label={filter} selected={tab === filter} onPress={() => setTab(filter)} />)}
          </ScrollView>
          <FilterBar compact restaurants={ratedRestaurants} activeFilters={filters}
            onFiltersChange={setFilters} cuisines={data.cuisines.data ?? []} activeCuisine={cuisine} onCuisineChange={setCuisine} />
          {errors.length ? <ErrorState title="Some discoveries could not load" description={errors[0].error?.message} onRetry={refresh} /> : null}
        </View>
      ) : null}
    </View>
  );

  if (mode === 'people') return (
    <Screen>
      <FlatList data={searching && !waiting ? people.data ?? [] : []} keyExtractor={(person) => person.id}
        ListHeaderComponent={header} keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-sm px-lg pb-md">
            <Pressable className="min-w-0 flex-1 flex-row items-center gap-sm" accessibilityRole="button"
              onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.id } })}>
              <Avatar uri={item.avatar_url} name={item.display_name ?? item.username ?? 'User'} size="md" />
              <View className="flex-1"><BodyText medium>{item.display_name ?? item.username}</BodyText><Caption>@{item.username}</Caption></View>
            </Pressable>
            <FollowButton userId={item.id} onFollowChange={() => {
              void client.invalidateQueries({ queryKey: ['friend-recommendations'] });
              if (user) void client.invalidateQueries({ queryKey: queryKeys.feed(user.id) });
            }} />
          </View>
        )}
        ListEmptyComponent={waiting || (searching && people.isPending) ? <ActivityIndicator color={colors.accent} />
          : searching && people.isError ? <ErrorState title="People search failed" description={people.error.message} onRetry={() => void people.refetch()} />
            : <EmptyState icon={<Users color={colors.textMuted} />} title={searching ? 'No people found' : 'Find your people'} description="Search a name or username." />}
        contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }} />
    </Screen>
  );

  return (
    <Screen>
      <FlatList<GridRow> data={rows} keyExtractor={(row) => row.key} ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled" onRefresh={refresh} refreshing={data.restaurants.isRefetching || data.search.isRefetching}
        renderItem={({ item }) => item.title ? <Heading level={3} className="px-lg pb-sm pt-sm">{item.title}</Heading> : (
          <View className="flex-row px-lg" style={{ columnGap: gridGap, paddingBottom: gridGap }}>
            {item.items?.map((entry) => <View key={`${entry.kind}-${entry.value.id}`} style={{ flex: 1, minWidth: 0 }}>
              {entry.kind === 'dish' ? <DishCard variant="grid" dish={entry.value}
                onPress={() => router.push({ pathname: '/dish-detail', params: { dishId: entry.value.id } })} />
                : <RestaurantRow variant="grid" restaurant={entry.value} isSaved={savedIds.has(entry.value.id)}
                  saveDisabled={data.saved.isPending || data.saved.isError || data.toggleSave.isPending}
                  onPress={() => router.push({ pathname: '/restaurant-detail', params: { restaurantId: entry.value.id } })}
                  onViewMenu={() => setMenuRestaurant({ id: entry.value.id, name: entry.value.name })}
                  onSave={async () => {
                    try { await data.toggleSave.mutateAsync({ id: entry.value.id, wasSaved: savedIds.has(entry.value.id) }); }
                    catch (error) { notify('Could not update save', error instanceof Error ? error.message : 'Please try again.'); throw error; }
                  }} />}
            </View>)}
            {item.items?.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        )}
        ListEmptyComponent={loading ? <View className="flex-row gap-sm px-lg"><Skeleton width="48%" height={240} /><Skeleton width="48%" height={240} /></View>
          : errors.length ? null : <EmptyState icon={<BrandIcon name="discover" size={36} variant="gold" />}
            title={searching ? 'No matching bites' : 'No recommendations yet'}
            description={searching ? 'Try a restaurant, dish or cuisine.' : 'Recommendations will appear as places are rated and your tastes take shape.'} />}
        ListFooterComponent={searching && !waiting ? (
          <View className="px-lg py-md gap-sm">
            <Button label="Search more places" variant="secondary" onPress={() => setExternalQuery(debouncedQuery)} />
            {showPlaces ? places.isPending ? <ActivityIndicator color={colors.accent} />
              : places.isError ? <ErrorState title="Place search failed" description={places.error.message} onRetry={() => void places.refetch()} />
                : places.data?.length ? places.data.map((place) => <PlaceResultRow key={place.externalPlaceId} place={place}
                  isImporting={addPlace.isPending && addPlace.variables?.externalPlaceId === place.externalPlaceId}
                  onPress={() => { if (!addPlace.isPending) addPlace.mutate(place); }} />)
                  : <Caption>No additional places found.</Caption> : null}
          </View>
        ) : null}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} />
      {menuRestaurant ? <MenuModal key={menuRestaurant.id} visible title={menuRestaurant.name} items={menu.data ?? []}
        isLoading={menu.isPending} error={menu.error?.message} onRetry={() => void menu.refetch()} onClose={() => setMenuRestaurant(null)} /> : null}
    </Screen>
  );
}