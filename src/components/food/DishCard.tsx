import { Pressable, View } from 'react-native';

import { FoodPhoto } from '@/components/food/FoodPhoto';
import { Rating } from '@/components/ui/Rating';
import { BodyText, Caption } from '@/components/ui/Typography';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';
import type { Dish } from '@/types/models';

type DishCardProps = {
  dish: Dish;
  onPress?: () => void;
  showRestaurant?: boolean;
  className?: string;
  variant?: 'rail' | 'grid';
};

/** Vertical dish card for horizontal trending/popular rails. */
export function DishCard({ dish, onPress, showRestaurant = true, className, variant = 'rail' }: DishCardProps) {
  const photoUrl = dish.imageUrl ?? dish.restaurant.imageUrl;
  const isRestaurantPhoto = !dish.imageUrl && Boolean(dish.restaurant.imageUrl);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${dish.name} at ${dish.restaurant.name}`} className={cn(variant === 'rail' ? 'w-[140px]' : 'flex-1 rounded-md border border-border bg-surface overflow-hidden', className)}>
      <FoodPhoto
        uri={photoUrl}
        label={isRestaurantPhoto ? `${dish.restaurant.name} restaurant photo` : dish.name}
        emptyLabel="No photo yet"
        style={{ width: '100%', ...(photoUrl ? { aspectRatio: 1 } : { height: 96 }), borderRadius: variant === 'rail' ? 18 : 0 }}
      />
      <View className={cn('gap-xxs', variant === 'grid' ? 'p-sm' : 'mt-sm')}>
        <BodyText medium numberOfLines={2}>
          {dish.name}
        </BodyText>
        {showRestaurant ? (
          <Caption numberOfLines={1}>{dish.restaurant.name}</Caption>
        ) : null}
        {isRestaurantPhoto ? <Caption color="textMuted">Restaurant photo</Caption> : null}
        {dish.ratingCount > 0 ? (
          <Rating value={dish.rating} size="sm" count={formatCount(dish.ratingCount)} />
        ) : <Caption>No ratings yet</Caption>}
      </View>
    </Pressable>
  );
}
