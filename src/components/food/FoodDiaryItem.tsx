import { Pressable, View } from 'react-native';

import { FoodPhoto } from '@/components/food/FoodPhoto';
import { Rating } from '@/components/ui/Rating';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { cn } from '@/lib/cn';
import { publicImageUrl } from '@/lib/db/storage';
import type { VisitedRestaurant } from '@/lib/db/visited';
import { formatDiaryDate } from '@/lib/format';
import type { DiaryEntry } from '@/types/models';

type FoodDiaryItemProps = {
  entry: DiaryEntry;
  onPress?: () => void;
  className?: string;
};

/** Chronological diary row — date, dish + restaurant, the user's own rating, thumbnail. */
export function FoodDiaryItem({ entry, onPress, className }: FoodDiaryItemProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View diary entry for ${entry.dish.name}`} className={cn('flex-row items-center gap-sm', className)}>
      {/* Wide enough for "Yesterday" on one line: at w-14 it wrapped to "Yesterd / ay". */}
      <View className="w-[68px]">
        <MetadataText numberOfLines={1}>{entry.dateLabel}</MetadataText>
      </View>
      <View className="flex-1 gap-xxs">
        <BodyText medium numberOfLines={1}>
          {entry.dish.name}
        </BodyText>
        <Caption numberOfLines={1}>{entry.dish.restaurant.name}</Caption>
        {/* The rating is the point of the entry, and it was being dropped here even though
            the query has always selected it. */}
        {entry.rating > 0 ? <Rating value={entry.rating} size="sm" /> : null}
      </View>
      <FoodPhoto
        uri={entry.dish.imageUrl}
        label={entry.dish.name}
        style={{ width: 48, height: 48, borderRadius: 12 }}
      />
    </Pressable>
  );
}

export function VisitedDiaryItem({ visit, onPress }: { visit: VisitedRestaurant; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button"
    accessibilityLabel={`View private visit to ${visit.restaurant?.name ?? 'restaurant'}`}
    className="flex-row items-center gap-sm px-lg pb-lg">
    <View className="w-[68px]"><MetadataText numberOfLines={1}>{formatDiaryDate(visit.visited_at)}</MetadataText></View>
    <View className="flex-1 gap-xxs">
      <BodyText medium numberOfLines={2}>{visit.restaurant?.name ?? 'Restaurant visit'}</BodyText>
      <Caption>Private visit</Caption>
      {visit.dishes?.length ? <Caption numberOfLines={2}>{visit.dishes.map((dish) => dish.name).join(', ')}</Caption> : null}
      {visit.notes ? <Caption numberOfLines={2}>{visit.notes}</Caption> : null}
    </View>
    <FoodPhoto uri={publicImageUrl('restaurant-photos', visit.restaurant?.image_url ?? null)}
      label={visit.restaurant?.name ?? 'Restaurant'} style={{ width: 48, height: 48, borderRadius: 12 }} />
  </Pressable>;
}
