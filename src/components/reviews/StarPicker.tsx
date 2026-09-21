import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface StarPickerProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}

export const StarPicker = ({
  rating,
  onRatingChange,
  disabled = false,
}: StarPickerProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <View style={styles.container}>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={disabled}
            onPress={() => onRatingChange(star)}
            onPressIn={() => !disabled && setHoverRating(star)}
            onPressOut={() => setHoverRating(null)}
            style={styles.starButton}
          >
            <Star
              size={40}
              color={star <= displayRating ? colors.accent : colors.border}
              fill={star <= displayRating ? colors.accent : 'transparent'}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>
        {displayRating > 0
          ? `${displayRating} Star${displayRating !== 1 ? 's' : ''}`
          : 'Tap to rate'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  starRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
