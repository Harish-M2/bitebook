import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { Rating } from '@/components/ui/Rating';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import type { DiaryEntry } from '@/types/models';

type FoodDiaryItemProps = {
  entry: DiaryEntry;
  onPress?: () => void;
  className?: string;
};

/** Chronological diary row — date, dish + restaurant, the user's own rating, thumbnail. */
export function FoodDiaryItem({ entry, onPress, className }: FoodDiaryItemProps) {
  return (
    <Pressable onPress={onPress} className={cn('flex-row items-center gap-sm', className)}>
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
      <Image
        source={entry.dish.imageUrl ?? undefined}
        transition={150}
        accessibilityLabel={entry.dish.name}
        style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.surfaceElevated }}
      />
    </Pressable>
  );
}
