import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';

import { PlaceResultRow } from '@/components/food/PlaceResultRow';
import { RestaurantRow } from '@/components/food/RestaurantRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchBar } from '@/components/ui/SearchBar';
import { Caption, MetadataText } from '@/components/ui/Typography';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAppTheme } from '@/hooks/useTheme';
import { importPlace, searchPlaces, type PlaceSearchResult } from '@/lib/db/places';
import { searchRestaurants } from '@/lib/db/restaurants';
import { queryKeys } from '@/lib/queryClient';

export type ChosenRestaurant = { id: string; name: string; city: string | null };

type RestaurantStepProps = {
  onSelect: (restaurant: ChosenRestaurant) => void;
  initialQuery?: string;
};

const MIN_QUERY_LENGTH = 2;

/**
 * Step 1 — "Where did you eat?"
 *
 * Searches the local catalogue first and only offers the external provider for what it does
 * not already hold. That ordering is deliberate: a restaurant someone has already added
 * carries the dishes other people logged there, and re-importing it would spend a paid
 * provider call to arrive at the same row.
 */
export function RestaurantStep({ onSelect, initialQuery = '' }: RestaurantStepProps) {
  const { colors } = useAppTheme();
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const debouncedQuery = useDebouncedValue(query.trim());
  const waiting = query.trim() !== debouncedQuery;
  const isSearching = query.trim().length >= MIN_QUERY_LENGTH && !waiting;
  const queryClient = useQueryClient();

  const known = useQuery({
    queryKey: [...queryKeys.restaurants(), 'search', debouncedQuery],
    queryFn: ({ signal }) => searchRestaurants(debouncedQuery, signal),
    enabled: isSearching,
  });

  useEffect(() => {
    let isCancelled = false;
    void Location.getForegroundPermissionsAsync()
      .then(async ({ granted }) => {
        if (!granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isCancelled) {
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      })
      .catch(() => {
        // Location is only a search bias; lookup remains useful without it.
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  const shouldSearchProvider = isSearching && (known.isError || (known.isSuccess && (known.data?.length ?? 0) < 2));

  const places = useQuery({
    queryKey: [...queryKeys.placeSearch(debouncedQuery), location?.latitude ?? null, location?.longitude ?? null],
    queryFn: ({ signal }) => searchPlaces(debouncedQuery, { ...location, limit: 20 }, signal),
    enabled: shouldSearchProvider,
    staleTime: 5 * 60_000,
  });

  const addPlace = useMutation({
    mutationFn: (place: PlaceSearchResult) => importPlace(place.externalPlaceId),
    onSuccess: (restaurant) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants() });
      onSelect({
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city ?? null,
      });
    },
    onError: (error: Error) => Alert.alert('Could not add restaurant', error.message),
  });

  const knownResults = known.data ?? [];
  const knownIds = new Set(knownResults.map((r) => r.name.trim().toLowerCase()));

  // A place already imported under the same name would otherwise appear twice — once as a
  // catalogue row and once as something to add again.
  const newPlaces = shouldSearchProvider
    ? (places.data ?? []).filter((place) => !knownIds.has(place.name.trim().toLowerCase()))
    : [];
  const retrySearch = () => {
    void known.refetch();
    if (shouldSearchProvider) void places.refetch();
  };

  return (
    <View className="flex-1 gap-md pt-md">
      <SearchBar
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        placeholder="Search restaurants..."
        className="mx-lg"
      />

      {isSearching ? (
        <FlatList
          data={knownResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            knownResults.length > 0 ? (
              <View className="px-lg pb-sm">
                <Caption color="textSecondary">Already on Bitebook</Caption>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <RestaurantRow
              restaurant={item}
              className="px-lg pb-lg"
              onPress={() => onSelect({ id: item.id, name: item.name, city: item.city })}
            />
          )}
          ListFooterComponent={
            known.isFetching || (shouldSearchProvider && places.isFetching) ? <ActivityIndicator color={colors.accent} /> : (
              <View className="gap-sm">
                {known.isError ? <Caption className="px-lg">Bitebook results are unavailable; showing external matches.</Caption> : null}
                {shouldSearchProvider && places.isError ? (
                  <ErrorState title="Place search failed" description={places.error.message} onRetry={retrySearch} />
                ) : newPlaces.length > 0 ? (
                  <>
                    <View className="px-lg">
                      <Caption color="textSecondary">Add from search</Caption>
                    </View>
                    {newPlaces.map((place) => (
                      <PlaceResultRow
                        key={place.externalPlaceId}
                        place={place}
                        className="px-lg pb-md"
                        isImporting={
                          addPlace.isPending &&
                          addPlace.variables?.externalPlaceId === place.externalPlaceId
                        }
                        onPress={() => addPlace.mutate(place)}
                      />
                    ))}
                  </>
                ) : null}
              </View>
            )
          }
          ListEmptyComponent={
            known.isPending || (shouldSearchProvider && places.isFetching)
              || (shouldSearchProvider && places.isError) || newPlaces.length > 0 ? null
              : known.isError ? (
                <ErrorState title="Bitebook search failed" description={known.error.message} onRetry={retrySearch} />
              ) : (
                <EmptyState
                icon={<MapPin size={40} color={colors.textMuted} />}
                title="No restaurants found"
                description="Try a different spelling, or include the town or city."
              />
            )
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        />
      ) : waiting ? <ActivityIndicator color={colors.accent} /> : (
        <View className="px-lg">
          <MetadataText>Type at least {MIN_QUERY_LENGTH} characters to search.</MetadataText>
        </View>
      )}
    </View>
  );
}
