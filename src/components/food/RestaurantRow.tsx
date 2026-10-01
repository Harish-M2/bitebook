import { Image } from 'expo-image';
import { Bookmark, Menu } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Rating } from '@/components/ui/Rating';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';
import type { Restaurant } from '@/types/models';

type RestaurantRowProps = {
  restaurant: Restaurant;
  onPress?: () => void;
  onSave?: () => void | Promise<void>;
  onViewMenu?: () => void;
  className?: string;
};

/** Horizontal restaurant list row — thumbnail, name/cuisine/price/distance, rating, menu & save buttons. */
export function RestaurantRow({ restaurant, onPress, onSave, onViewMenu, className }: RestaurantRowProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave || isSaving || isSaved) return;
    setIsSaving(true);
    try {
      await onSave();
      setIsSaved(true);
    } catch {
      // The caller surfaces the save error; keep the action available to retry.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className={cn('flex-row items-center gap-sm', className)}>
      <Pressable
        onPress={onPress}
        className="min-w-0 flex-1 flex-row items-center gap-sm"
        accessibilityRole="button"
        accessibilityLabel={`View ${restaurant.name}`}>
        <Image
          source={restaurant.imageUrl ?? undefined}
          transition={150}
          accessibilityLabel={restaurant.name}
          style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: colors.surfaceElevated }}
        />
        <View className="flex-1 gap-xxs">
          <BodyText medium numberOfLines={1}>
            {restaurant.name}
          </BodyText>
          <Caption numberOfLines={1}>
            {[restaurant.cuisine, restaurant.priceLevel, restaurant.distanceLabel]
              .filter(Boolean)
              .join(' · ')}
          </Caption>
          {restaurant.reviewCount > 0 ? (
            <Rating value={restaurant.rating} size="sm" count={formatCount(restaurant.reviewCount)} />
          ) : (
            <MetadataText>No ratings yet</MetadataText>
          )}
        </View>
      </Pressable>
      <Pressable
        onPress={onViewMenu}
        hitSlop={8}
        accessibilityLabel={`View menu for ${restaurant.name}`}
        accessibilityRole="button">
        <Menu size={20} color={colors.accent} />
      </Pressable>
      <Pressable
        onPress={() => void handleSave()}
        disabled={!onSave || isSaving}
        hitSlop={8}
        accessibilityLabel={`Save ${restaurant.name}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !onSave || isSaving, selected: isSaved }}>
        <Bookmark
          size={20}
          color={isSaved ? colors.accent : colors.textSecondary}
          fill={isSaved ? colors.accent : undefined}
        />
      </Pressable>
    </View>
  );
}
