import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';

type RatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

const STARS = [1, 2, 3, 4, 5];
const TOUCH_SIZE = 44;
const STAR_SIZE = 28;
const STAR_INSET = (TOUCH_SIZE - STAR_SIZE) / 2;
const RATING_ROW_WIDTH = 252;

/**
 * Compact interactive 0.5-step rating, 0.5 to 5.0 (spec §11).
 *
 * Each star is two half-width touch targets rather than one, which is what makes half steps
 * reachable without a slider. The database enforces the same 0.5 step, so a value this
 * control cannot produce is also a value that cannot be stored.
 */
export function RatingInput({ value, onChange, className }: RatingInputProps) {
  function select(next: number) {
    // Selecting the same value again is a no-op, so don't buzz for it.
    if (next !== value) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(next);
    }
  }

  return (
    <View className={cn('items-center', className)}>
      <View
        style={{
          width: RATING_ROW_WIDTH,
          maxWidth: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Rating"
        accessibilityValue={{ min: 0.5, max: 5, now: value }}>
        {STARS.map((star) => {
          const filled = value >= star;
          const half = !filled && value >= star - 0.5;

          return (
            <View key={star} style={{ width: TOUCH_SIZE, height: TOUCH_SIZE }}>
              <Star
                size={STAR_SIZE}
                color={filled || half ? colors.rating : colors.border}
                fill={filled ? colors.rating : 'transparent'}
                style={{ position: 'absolute', left: STAR_INSET, top: STAR_INSET }}
              />

              {/* The left half of a star is drawn by clipping a second, filled copy to half
                  its width — lucide has no half-star glyph. */}
              {half ? (
                <View
                  style={{
                    position: 'absolute',
                    left: STAR_INSET,
                    top: STAR_INSET,
                    width: STAR_SIZE / 2,
                    height: STAR_SIZE,
                    overflow: 'hidden',
                  }}>
                  <Star size={STAR_SIZE} color={colors.rating} fill={colors.rating} />
                </View>
              ) : null}

              <View style={{ position: 'absolute', flexDirection: 'row', inset: 0 }}>
                <Pressable
                  onPress={() => select(star - 0.5)}
                  accessibilityRole="button"
                  accessibilityLabel={`${star - 0.5} stars`}
                  style={{ flex: 1 }}
                />
                <Pressable
                  onPress={() => select(star)}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} stars`}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
