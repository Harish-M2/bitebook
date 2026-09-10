import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import type { DiaryEntry } from '@/types/models';

type FoodDiaryItemProps = {
  entry: DiaryEntry;
  onPress?: () => void;
  className?: string;
};

/** Chronological diary row — date, dish + restaurant, thumbnail. */
export function FoodDiaryItem({ entry, onPress, className }: FoodDiaryItemProps) {
  return (
    <Pressable onPress={onPress} className={cn('flex-row items-center gap-sm', className)}>
      <View className="w-14">
        <MetadataText>{entry.dateLabel}</MetadataText>
      </View>
      <View className="flex-1 gap-xxs">
        <BodyText medium numberOfLines={1}>
          {entry.dish.name}
        </BodyText>
        <Caption numberOfLines={1}>{entry.dish.restaurant.name}</Caption>
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
