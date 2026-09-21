import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { Bookmark, Menu } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { Rating } from '@/components/ui/Rating';
import type { Restaurant } from '@/types/models';

type RestaurantRowProps = {
  restaurant: Restaurant;
  onPress?: () => void;
  onSave?: () => void;
  onViewMenu?: () => void;
  className?: string;
};

/** Horizontal restaurant list row — thumbnail, name/cuisine/price/distance, rating, menu & save buttons. */
export function RestaurantRow({ restaurant, onPress, onSave, onViewMenu, className }: RestaurantRowProps) {
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
        {/* A restaurant nobody has rated is not a nought-star restaurant. Until there is a
            real aggregate, say so in words rather than rendering "0.0 (0)", which reads as
            a damning score. */}
        {restaurant.reviewCount > 0 ? (
          <Rating value={restaurant.rating} size="sm" count={formatCount(restaurant.reviewCount)} />
        ) : (
          <MetadataText>No ratings yet</MetadataText>
        )}
      </View>
      <Pressable
        onPress={onViewMenu}
        hitSlop={8}
        accessibilityLabel={`View menu for ${restaurant.name}`}
        accessibilityRole="button">
        <Menu size={20} color={colors.accent} />
      </Pressable>
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
