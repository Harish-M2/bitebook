import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Rating } from '@/components/ui/Rating';
import { BodyText, Caption } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import type { Dish } from '@/types/models';

type DishCardProps = {
  dish: Dish;
  onPress?: () => void;
  showRestaurant?: boolean;
  className?: string;
};

/** Vertical dish card for horizontal trending/popular rails. */
export function DishCard({ dish, onPress, showRestaurant = true, className }: DishCardProps) {
  return (
    <Pressable onPress={onPress} className={cn('w-[140px]', className)}>
      <Image
        source={dish.imageUrl ?? undefined}
        transition={150}
        accessibilityLabel={dish.name}
        style={{ width: 140, height: 140, borderRadius: 18, backgroundColor: colors.surfaceElevated }}
      />
      <View className="mt-sm gap-xxs">
        <Rating value={dish.rating} size="sm" />
        <BodyText medium numberOfLines={1}>
          {dish.name}
        </BodyText>
        {showRestaurant ? (
          <Caption numberOfLines={1}>{dish.restaurant.name}</Caption>
        ) : null}
      </View>
    </Pressable>
  );
}
