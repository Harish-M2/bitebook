import { Image } from 'expo-image';
import { Film, Globe, Lock, MapPin, Users, UtensilsCrossed } from 'lucide-react-native';
import { View } from 'react-native';

import type { ReviewMediaDraft } from '@/components/log/PhotoStep';
import type { DishReviewDraft } from '@/components/log/RatingStep';
import { Rating } from '@/components/ui/Rating';
import { Surface } from '@/components/ui/Surface';
import { BodyText, Caption, Heading, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { RESTAURANT_RECOMMENDATIONS } from '@/constants/recommendations';
import type { ReviewVisibility } from '@/types/database';

type ConfirmStepProps = {
  restaurantName: string;
  city: string | null;
  dishes: DishReviewDraft[];
  media: ReviewMediaDraft[];
  overallRating: number;
  reviewText: string;
  visitedAt: string;
  recommendationTier: number;
  visibility: ReviewVisibility;
};

const VISIBILITY_COPY: Record<ReviewVisibility, string> = {
  public: 'Visible to everyone',
  followers: 'Visible to your followers',
  private: 'Only visible to you',
};

const VISIBILITY_ICON = { public: Globe, followers: Users, private: Lock } as const;
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

/** Step 6 — one last look at the grouped visit before it is written. */
export function ConfirmStep({
  restaurantName,
  city,
  dishes,
  media,
  overallRating,
  reviewText,
  visitedAt,
  recommendationTier,
  visibility,
}: ConfirmStepProps) {
  const VisibilityIcon = VISIBILITY_ICON[visibility];
  const recommendation = RESTAURANT_RECOMMENDATIONS.find((option) => option.tier === recommendationTier);

  return (
    <View className="gap-sm px-lg pt-md">
      <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center' }}>
        <View className="mb-sm flex-row items-center justify-between">
          <MetadataText color="accent">Visit preview</MetadataText>
          <View className="rounded-full border border-border bg-surface-muted px-sm py-xxs">
            <MetadataText>{visitedAt}</MetadataText>
          </View>
        </View>

        {media.length > 0 ? (
          <View className="flex-row flex-wrap gap-xs">
            {media.map((item, index) => item.type === 'image' ? (
              <Image
                key={`${item.uri}-${index}`}
                source={item.uri}
                contentFit="cover"
                transition={150}
                style={{ width: 88, height: 96, borderRadius: 10 }}
              />
            ) : (
              <View
                key={`${item.uri}-${index}`}
                className="h-24 w-[88px] items-center justify-center gap-xxs rounded-lg border border-border bg-surface-elevated">
                <Film size={18} color={colors.accent} />
                <MetadataText>Video {index + 1}</MetadataText>
              </View>
            ))}
          </View>
        ) : null}

        <Surface className="gap-xs p-sm mt-sm" variant="elevated" radius="lg" bordered>
          <View className="gap-xxs">
            <Heading level={3} numberOfLines={2}>
              {restaurantName}
            </Heading>
            <View className="flex-row items-center gap-xxs">
              <UtensilsCrossed size={13} color={colors.textMuted} />
              <Caption numberOfLines={1}>{city ?? 'Restaurant visit'}</Caption>
            </View>
          </View>

          <Rating value={overallRating} size="md" />
          {recommendation ? (
            <BodyText>{recommendation.emoji} {recommendation.label}</BodyText>
          ) : null}

          {reviewText.trim().length > 0 ? (
            <BodyText color="textSecondary">{reviewText.trim()}</BodyText>
          ) : null}

          <View className="gap-xs border-t border-border pt-xs">
            {dishes.map((dish, index) => (
              <View key={`${dish.id ?? dish.name}-${index}`} className="gap-xxs">
                <View className="flex-row items-center justify-between gap-sm">
                  <BodyText medium numberOfLines={1} className="flex-1">{dish.name}</BodyText>
                  <Rating value={dish.rating} size="sm" />
                </View>
                {dish.category || dish.dietaryTags?.length ? (
                  <Caption>
                    {[
                      dish.category ? CATEGORY_LABELS[dish.category] : null,
                      ...(dish.dietaryTags ?? []).map((tag) => DIETARY_LABELS[tag]),
                    ].filter(Boolean).join(' · ')}
                  </Caption>
                ) : null}
                {dish.comment.trim() ? (
                  <Caption>{dish.comment.trim()}</Caption>
                ) : null}
              </View>
            ))}
          </View>

          <View className="flex-row items-center gap-xxs">
            <VisibilityIcon size={12} color={colors.textMuted} />
            <MetadataText>{VISIBILITY_COPY[visibility]} · {media.length} media</MetadataText>
          </View>
        </Surface>

        <View className="mt-sm flex-row items-center gap-xxs px-xs">
          <MapPin size={12} color={colors.textMuted} />
          <MetadataText>{city ? `${restaurantName} · ${city}` : restaurantName}</MetadataText>
        </View>
      </View>
    </View>
  );
}
