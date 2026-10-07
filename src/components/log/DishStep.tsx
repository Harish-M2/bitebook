import { useQuery } from '@tanstack/react-query';
import { Check, Plus, UtensilsCrossed } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Rating } from '@/components/ui/Rating';
import { SearchBar } from '@/components/ui/SearchBar';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { listDishesForRestaurant, type RestaurantDish } from '@/lib/db/dishes';

export type DishCategory = 'starter' | 'main' | 'dessert' | 'side' | 'drink';
export type DishDietaryTag = 'vegetarian' | 'non_vegetarian' | 'vegan' | 'halal' | 'gluten_free';

export type ChosenDish = {
  id: string | null;
  name: string;
  category?: DishCategory | null;
  dietaryTags?: DishDietaryTag[];
};

type DishStepProps = {
  restaurantId: string;
  selected: ChosenDish[];
  onToggle: (dish: ChosenDish) => void;
};

export const MAX_DISHES_PER_VISIT = 20;
const CATEGORIES: { value: DishCategory; label: string }[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'main', label: 'Main' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'side', label: 'Side' },
  { value: 'drink', label: 'Drink' },
];
const DIETARY_TAGS: { value: DishDietaryTag; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'non_vegetarian', label: 'Non-vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'gluten_free', label: 'Gluten-free' },
];

/**
 * Step 2 — "What did you eat?"
 *
 * Existing dishes are listed and filtered as the user types, with "add as a new dish" only
 * as the last option. Dishes deduplicate on `(restaurant_id, normalized_name)`, so a
 * near-miss spelling creates a genuinely separate dish and silently splits its ratings —
 * showing the existing names is what prevents that, not the constraint.
 */
export function DishStep({ restaurantId, selected, onToggle }: DishStepProps) {
  const [query, setQuery] = useState('');
  const [newDishCategory, setNewDishCategory] = useState<DishCategory | null>(null);
  const [newDishDietaryTags, setNewDishDietaryTags] = useState<DishDietaryTag[]>([]);
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
  const newDish: ChosenDish = {
    id: null,
    name: trimmed,
    category: newDishCategory,
    dietaryTags: newDishDietaryTags,
  };
  const isSelected = (dish: ChosenDish) =>
    selected.some((item) => item.id === dish.id && item.name === dish.name);
  const canSelectMore = selected.length < MAX_DISHES_PER_VISIT;

  return (
    <View className="flex-1 gap-md pt-md">
      <SearchBar
        value={query}
        onChangeText={(value) => {
          if (value.trim().toLowerCase() !== query.trim().toLowerCase()) {
            setNewDishCategory(null);
            setNewDishDietaryTags([]);
          }
          setQuery(value);
        }}
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
            <View className="mx-lg mb-md gap-xs rounded-lg border border-border bg-surface p-sm">
              <View className="flex-row items-center gap-xs">
                <View className="h-9 w-9 items-center justify-center rounded-md bg-surface-elevated">
                  <Plus size={17} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <BodyText medium numberOfLines={1}>New dish: {trimmed}</BodyText>
                  <Caption>Category and dietary tags are optional</Caption>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-xxs">
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category.value}
                    label={category.label}
                    selected={newDishCategory === category.value}
                    className="px-sm py-xxs"
                    onPress={() => setNewDishCategory(
                      newDishCategory === category.value ? null : category.value,
                    )}
                  />
                ))}
              </View>

              <View className="flex-row flex-wrap gap-xxs">
                {DIETARY_TAGS.map((tag) => {
                  const selectedTag = newDishDietaryTags.includes(tag.value);
                  return (
                    <Chip
                      key={tag.value}
                      label={tag.label}
                      selected={selectedTag}
                      className="px-sm py-xxs"
                      onPress={() => setNewDishDietaryTags((current) => selectedTag
                        ? current.filter((value) => value !== tag.value)
                        : [...current, tag.value])}
                    />
                  );
                })}
              </View>

              <Pressable
                onPress={() => canSelectMore || isSelected(newDish) ? onToggle(newDish) : undefined}
                disabled={!canSelectMore && !isSelected(newDish)}
                accessibilityRole="button"
                accessibilityLabel={`${isSelected(newDish) ? 'Remove' : 'Add'} ${trimmed}`}
                className="flex-row items-center justify-center gap-xxs rounded-md bg-surface-elevated px-sm py-xs">
                {isSelected(newDish) ? (
                  <Check size={16} color={colors.accent} />
                ) : (
                  <Plus size={16} color={colors.accent} />
                )}
                <BodyText medium>{isSelected(newDish) ? 'Added' : 'Add dish'}</BodyText>
              </Pressable>
              </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => canSelectMore || isSelected({ id: item.id, name: item.name })
              ? onToggle({ id: item.id, name: item.name })
              : undefined}
            accessibilityRole="button"
            className="flex-row items-center gap-sm px-lg pb-lg">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
              {isSelected({ id: item.id, name: item.name }) ? (
                <Check size={20} color={colors.accent} />
              ) : (
                <UtensilsCrossed size={20} color={colors.textMuted} />
              )}
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
      <View className="px-lg pb-sm">
        <MetadataText>
          {selected.length} selected · choose up to {MAX_DISHES_PER_VISIT}
        </MetadataText>
      </View>
    </View>
  );
}
