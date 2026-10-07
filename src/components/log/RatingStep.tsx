import { ScrollView, View } from 'react-native';

import type { ChosenDish } from '@/components/log/DishStep';
import { RatingInput } from '@/components/ui/RatingInput';
import { TextField } from '@/components/ui/TextField';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';

export type DishReviewDraft = ChosenDish & {
  rating: number;
  comment: string;
};

type RatingStepProps = {
  dishes: DishReviewDraft[];
  onChange: (dishName: string, value: number | string, field: 'rating' | 'comment') => void;
};

/**
 * Spec §37's wording for each half of the scale. Numbers alone invite drift — one person's
 * 3 is another's 4 — and a word anchors what the number is supposed to mean.
 */
const LABELS: [number, string][] = [
  [5, 'Perfect — would queue for this'],
  [4.5, 'Outstanding'],
  [4, 'Really good'],
  [3.5, 'Good'],
  [3, 'Solid'],
  [2.5, 'Fine'],
  [2, 'Disappointing'],
  [1.5, 'Poor'],
  [1, 'Bad'],
  [0.5, 'Inedible'],
];
const CATEGORY_LABELS = {
  starter: 'Starter',
  main: 'Main',
  dessert: 'Dessert',
  side: 'Side',
  drink: 'Drink',
} as const;
const DIETARY_LABELS = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-vegetarian',
  vegan: 'Vegan',
  halal: 'Halal',
  gluten_free: 'Gluten-free',
} as const;

function labelFor(value: number): string {
  return LABELS.find(([threshold]) => value >= threshold)?.[1] ?? '';
}

/** Step 3 — each dish keeps its own rating and note inside the restaurant visit. */
export function RatingStep({ dishes, onChange }: RatingStepProps) {
  return (
    <ScrollView contentContainerClassName="px-lg pt-xs pb-md" keyboardShouldPersistTaps="handled">
      {dishes.map((dish, index) => (
        <View key={`${dish.id ?? dish.name}-${index}`} className="gap-sm border-b border-border py-md">
          <View className="gap-xxs">
            <MetadataText color="accent">Dish {index + 1}</MetadataText>
            <BodyText medium>{dish.name}</BodyText>
            {dish.category || dish.dietaryTags?.length ? (
              <Caption>
                {[
                  dish.category ? CATEGORY_LABELS[dish.category] : null,
                  ...(dish.dietaryTags ?? []).map((tag) => DIETARY_LABELS[tag]),
                ].filter(Boolean).join(' · ')}
              </Caption>
            ) : null}
          </View>

          <View className="gap-xxs">
            <RatingInput
              value={dish.rating}
              onChange={(rating) => onChange(dish.name, rating, 'rating')}
              className="self-start"
            />
            {dish.rating > 0 ? (
              <Caption color="textSecondary">{dish.rating.toFixed(1)} · {labelFor(dish.rating)}</Caption>
            ) : (
              <MetadataText>Tap a star to rate</MetadataText>
            )}
          </View>

          <TextField
            label="Dish notes (optional)"
            placeholder="Texture, flavour, or what stood out"
            value={dish.comment}
            onChangeText={(comment) => onChange(dish.name, comment, 'comment')}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            minHeight={56}
          />
        </View>
      ))}
    </ScrollView>
  );
}
