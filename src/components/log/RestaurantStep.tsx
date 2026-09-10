import { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { queryKeys } from '@/lib/queryClient';
import { searchRestaurants } from '@/lib/db/restaurants';
import { importPlace, searchPlaces, type PlaceSearchResult } from '@/lib/db/places';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Caption, MetadataText } from '@/components/ui/Typography';
import { RestaurantRow } from '@/components/food/RestaurantRow';
import { PlaceResultRow } from '@/components/food/PlaceResultRow';

export type ChosenRestaurant = { id: string; name: string; city: string | null };

type RestaurantStepProps = {
  onSelect: (restaurant: ChosenRestaurant) => void;
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
export function RestaurantStep({ onSelect }: RestaurantStepProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const isSearching = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const queryClient = useQueryClient();

  const known = useQuery({
    queryKey: [...queryKeys.restaurants(), 'search', debouncedQuery],
    queryFn: () => searchRestaurants(debouncedQuery),
    enabled: isSearching,
  });

  const places = useQuery({
    queryKey: queryKeys.placeSearch(debouncedQuery),
    queryFn: () => searchPlaces(debouncedQuery),
    enabled: isSearching,
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
  const newPlaces = (places.data ?? []).filter(
    (place) => !knownIds.has(place.name.trim().toLowerCase()),
  );

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
            newPlaces.length > 0 ? (
              <View className="gap-sm">
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
              </View>
            ) : null
          }
          ListEmptyComponent={
            known.isPending || places.isPending || newPlaces.length > 0 ? null : (
              <EmptyState
                icon={<MapPin size={40} color={colors.textMuted} />}
                title="No restaurants found"
                description="Try a different spelling, or include the town or city."
              />
            )
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        />
      ) : (
        <View className="px-lg">
          <MetadataText>Type at least {MIN_QUERY_LENGTH} characters to search.</MetadataText>
        </View>
      )}
    </View>
  );
}
