import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Plus, UtensilsCrossed } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { listDishesForRestaurant, type RestaurantDish } from '@/lib/db/dishes';
import { SearchBar } from '@/components/ui/SearchBar';
import { Rating } from '@/components/ui/Rating';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';

export type ChosenDish = { id: string | null; name: string };

type DishStepProps = {
  restaurantId: string;
  onSelect: (dish: ChosenDish) => void;
};

/**
 * Step 2 — "What did you eat?"
 *
 * Existing dishes are listed and filtered as the user types, with "add as a new dish" only
 * as the last option. Dishes deduplicate on `(restaurant_id, normalized_name)`, so a
 * near-miss spelling creates a genuinely separate dish and silently splits its ratings —
 * showing the existing names is what prevents that, not the constraint.
 */
export function DishStep({ restaurantId, onSelect }: DishStepProps) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  const dishes = useQuery({
    queryKey: ['restaurant-dishes', restaurantId],
    queryFn: () => listDishesForRestaurant(restaurantId),
  });

  const all = dishes.data ?? [];
  const needle = trimmed.toLowerCase();
  const matches = needle
    ? all.filter((dish) => dish.name.toLowerCase().includes(needle))
    : all;

  // Only offer to create when the name is not already an exact match — the same comparison
  // the database's normalized_name uses, so the two cannot disagree.
  const exactExists = all.some((dish) => dish.name.trim().toLowerCase() === needle);
  const canCreate = trimmed.length > 0 && !exactExists;

  return (
    <View className="flex-1 gap-md pt-md">
      <SearchBar
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
        returnKeyType="done"
        clearButtonMode="while-editing"
        placeholder="Search or name the dish..."
        className="mx-lg"
      />

      <FlatList<RestaurantDish>
        data={matches}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          canCreate ? (
            <Pressable
              onPress={() => onSelect({ id: null, name: trimmed })}
              accessibilityRole="button"
              className="mb-lg flex-row items-center gap-sm px-lg">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
                <Plus size={20} color={colors.accent} />
              </View>
              <View className="flex-1">
                <BodyText medium numberOfLines={1}>
                  Add “{trimmed}”
                </BodyText>
                <Caption>New dish at this restaurant</Caption>
              </View>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect({ id: item.id, name: item.name })}
            accessibilityRole="button"
            className="flex-row items-center gap-sm px-lg pb-lg">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
              <UtensilsCrossed size={20} color={colors.textMuted} />
            </View>
            <View className="flex-1 gap-xxs">
              <BodyText medium numberOfLines={1}>
                {item.name}
              </BodyText>
              {item.ratingCount > 0 && item.rating !== null ? (
                <Rating value={item.rating} size="sm" count={`${item.ratingCount}`} />
              ) : (
                <Caption>Not rated yet</Caption>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          dishes.isPending || canCreate ? null : (
            <View className="px-lg">
              <MetadataText>No dishes here yet. Type a name to add the first one.</MetadataText>
            </View>
          )
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      />
    </View>
  );
}
