import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { Bookmark } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';
import { BodyText, Caption } from '@/components/ui/Typography';
import { Rating } from '@/components/ui/Rating';
import type { Restaurant } from '@/types/models';

type RestaurantRowProps = {
  restaurant: Restaurant;
  onPress?: () => void;
  onSave?: () => void;
  className?: string;
};

/** Horizontal restaurant list row — thumbnail, name/cuisine/price/distance, rating, save. */
export function RestaurantRow({ restaurant, onPress, onSave, className }: RestaurantRowProps) {
  return (
    <Pressable onPress={onPress} className={cn('flex-row items-center gap-sm', className)}>
      <Image
        source={restaurant.imageUrl ?? undefined}
        transition={150}
        accessibilityLabel={restaurant.name}
        style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.surfaceElevated }}
      />
      <View className="flex-1 gap-xxs">
        <BodyText medium numberOfLines={1}>
          {restaurant.name}
        </BodyText>
        <Caption numberOfLines={1}>
          {/* Imported restaurants have no cuisine until one is assigned, and not every
              screen supplies a distance — join only the parts that exist so the row never
              renders a stray separator. */}
          {[restaurant.cuisine, restaurant.priceLevel, restaurant.distanceLabel]
            .filter(Boolean)
            .join(' · ')}
        </Caption>
        <Rating value={restaurant.rating} size="sm" count={formatCount(restaurant.reviewCount)} />
      </View>
      <Pressable
        onPress={onSave}
        hitSlop={8}
        accessibilityLabel={`Save ${restaurant.name}`}
        accessibilityRole="button">
        <Bookmark size={20} color={colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
}
