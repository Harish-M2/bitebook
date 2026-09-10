import { ActivityIndicator, Pressable, View } from 'react-native';
import { MapPin, Plus } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/constants/colors';
import { formatPriceLevel } from '@/lib/format';
import { BodyText, Caption } from '@/components/ui/Typography';
import type { PlaceSearchResult } from '@/lib/db/places';

type PlaceResultRowProps = {
  place: PlaceSearchResult;
  onPress?: () => void;
  /** True while this specific row is being imported, so the spinner lands on the right one. */
  isImporting?: boolean;
  className?: string;
};

/**
 * A restaurant found on the external place provider but not yet in Bitebook.
 *
 * Deliberately not a `RestaurantRow`: there is no photo, rating or review count to show
 * because the place has never been imported, and rendering those as zeroes would look like
 * a badly reviewed restaurant rather than an unknown one.
 */
export function PlaceResultRow({ place, onPress, isImporting, className }: PlaceResultRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isImporting}
      accessibilityRole="button"
      accessibilityLabel={`Add ${place.name}`}
      className={cn('flex-row items-center gap-sm', className)}>
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
        <MapPin size={20} color={colors.textMuted} />
      </View>

      <View className="flex-1 gap-xxs">
        <BodyText medium numberOfLines={1}>
          {place.name}
        </BodyText>
        <Caption numberOfLines={1}>
          {[place.city, place.priceLevel ? formatPriceLevel(place.priceLevel) : null]
            .filter(Boolean)
            .join(' · ') || (place.address ?? '')}
        </Caption>
      </View>

      {isImporting ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <Plus size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );
}
