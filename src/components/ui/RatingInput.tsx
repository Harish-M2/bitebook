import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';

import { colors } from '@/constants/colors';
import { cn } from '@/lib/cn';

type RatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

const STARS = [1, 2, 3, 4, 5];
const GAP_PX = 10;
const MAX_STAR_SIZE = 120;

/**
 * Large interactive 0.5-step rating, 0.5 to 5.0 (spec §11).
 *
 * Each star is two half-width touch targets rather than one, which is what makes half steps
 * reachable without a slider. The database enforces the same 0.5 step, so a value this
 * control cannot produce is also a value that cannot be stored.
 */
export function RatingInput({ value, onChange, className }: RatingInputProps) {
  const [starSize, setStarSize] = useState(0);

  // Sized from the available width so the row fills the screen on any device rather than
  // being pinned to a hardcoded icon size.
  function handleLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    const computed = Math.floor((width - GAP_PX * (STARS.length - 1)) / STARS.length);
    setStarSize(Math.min(computed, MAX_STAR_SIZE));
  }

  function select(next: number) {
    // Selecting the same value again is a no-op, so don't buzz for it.
    if (next !== value) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(next);
    }
  }

  return (
    <View className={cn(className)}>
      <View
        onLayout={handleLayout}
        className="flex-row items-center justify-between"
        accessibilityRole="adjustable"
        accessibilityLabel="Rating"
        accessibilityValue={{ min: 0.5, max: 5, now: value }}>
        {STARS.map((star) => {
          const filled = value >= star;
          const half = !filled && value >= star - 0.5;

          return (
            <View key={star} style={{ width: starSize, height: starSize }}>
              <Star
                size={starSize}
                color={filled || half ? colors.rating : colors.border}
                fill={filled ? colors.rating : 'transparent'}
              />

              {/* The left half of a star is drawn by clipping a second, filled copy to half
                  its width — lucide has no half-star glyph. */}
              {half ? (
                <View
                  style={{
                    position: 'absolute',
                    width: starSize / 2,
                    height: starSize,
                    overflow: 'hidden',
                  }}>
                  <Star size={starSize} color={colors.rating} fill={colors.rating} />
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
