import { Bookmark, Menu } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { FoodPhoto } from '@/components/food/FoodPhoto';
import { Rating } from '@/components/ui/Rating';
import { BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { useAppTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import { formatCount } from '@/lib/format';
import type { Restaurant } from '@/types/models';

type RestaurantRowProps = {
  restaurant: Restaurant;
  onPress?: () => void;
  onSave?: () => void | Promise<void>;
  onViewMenu?: () => void;
  className?: string;
  isSaved?: boolean;
  saveDisabled?: boolean;
  variant?: 'row' | 'grid';
};

/** Horizontal restaurant list row — thumbnail, name/cuisine/price/distance, rating, menu & save buttons. */
export function RestaurantRow({ restaurant, onPress, onSave, onViewMenu, className, isSaved = false, saveDisabled = false, variant = 'row' }: RestaurantRowProps) {
  const { colors } = useAppTheme();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave || isSaving || saveDisabled) return;
    setIsSaving(true);
    try {
      await onSave();
    } catch {
      // The caller surfaces the save error; keep the action available to retry.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className={cn(variant === 'grid' ? 'flex-1 rounded-md border border-border bg-surface overflow-hidden' : 'flex-row items-center gap-sm', className)}>
      <Pressable
        onPress={onPress}
        className={variant === 'grid' ? 'min-w-0' : 'min-w-0 flex-1 flex-row items-center gap-sm'}
        accessibilityRole="button"
        accessibilityLabel={`View ${restaurant.name}`}>
        <FoodPhoto
          uri={restaurant.imageUrl}
          label={restaurant.name}
          style={variant === 'grid' ? { width: '100%', aspectRatio: 1 } : { width: 72, height: 72, borderRadius: 14 }}
        />
        <View className={cn('gap-xxs', variant === 'grid' ? 'p-sm' : 'flex-1')}>
          <BodyText medium numberOfLines={2}>
            {restaurant.name}
          </BodyText>
          <Caption numberOfLines={1}>
            {[restaurant.cuisine, restaurant.priceLevel, restaurant.distanceLabel]
              .filter(Boolean)
              .join(' · ')}
          </Caption>
          {variant === 'grid' && restaurant.city ? <Caption numberOfLines={1}>{restaurant.city}</Caption> : null}
          {restaurant.reviewCount > 0 ? (
            <Rating value={restaurant.rating} size="sm" count={formatCount(restaurant.reviewCount)} />
          ) : (
            <MetadataText>No ratings yet</MetadataText>
          )}
        </View>
      </Pressable>
      <View className={variant === 'grid' ? 'flex-row justify-end px-sm pb-xs' : 'flex-row gap-sm'}>
      {onViewMenu ? (
      <Pressable
        onPress={onViewMenu}
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        hitSlop={8}
        accessibilityLabel={`View menu for ${restaurant.name}`}
        accessibilityRole="button">
        <Menu size={20} color={colors.accent} />
      </Pressable>
      ) : null}
      {onSave ? (
      <Pressable
        onPress={() => void handleSave()}
        disabled={saveDisabled || isSaving}
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        hitSlop={8}
        accessibilityLabel={`${isSaved ? 'Unsave' : 'Save'} ${restaurant.name}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: saveDisabled || isSaving, selected: isSaved }}>
        <Bookmark
          size={20}
          color={isSaved ? colors.accent : colors.textSecondary}
          fill={isSaved ? colors.accent : undefined}
        />
      </Pressable>
      ) : null}
      </View>
    </View>
  );
}
