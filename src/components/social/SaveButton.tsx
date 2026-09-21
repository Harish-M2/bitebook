import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { saveRestaurant, unsaveRestaurant, isSaved } from '@/lib/db/saved';

interface SaveButtonProps {
  restaurantId: string;
  showLabel?: boolean;
  size?: number;
  onStatusChange?: (isSaved: boolean) => void;
}

/**
 * Heart icon button to save/unsave a restaurant
 * Shows filled heart when saved, empty heart when not
 * Displays save count on button
 */
export function SaveButton({
  restaurantId,
  showLabel = false,
  size = 24,
  onStatusChange,
}: SaveButtonProps) {
  const [isSavedState, setIsSavedState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if restaurant is saved on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const saved = await isSaved(restaurantId);
        setIsSavedState(saved);
      } catch (err) {
        console.error('Error checking saved status:', err);
        setError('Error loading saved status');
      } finally {
        setIsLoading(false);
      }
    };

    checkSavedStatus();
  }, [restaurantId]);

  const handleToggleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (isSavedState) {
        await unsaveRestaurant(restaurantId);
        setIsSavedState(false);
        onStatusChange?.(false);
      } else {
        await saveRestaurant(restaurantId);
        setIsSavedState(true);
        onStatusChange?.(true);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      setError(err instanceof Error ? err.message : 'Error saving restaurant');
    } finally {
      setIsLoading(false);
    }
  };

  const heartColor = isSavedState ? colors.danger : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.button, { opacity: isLoading ? 0.6 : 1 }]}
      onPress={handleToggleSave}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size={size} color={colors.textSecondary} />
      ) : (
        <View style={styles.content}>
          <Heart
            size={size}
            color={heartColor}
            fill={isSavedState ? heartColor : 'none'}
            style={styles.icon}
          />
          {showLabel && (
            <Text style={[styles.label, { color: heartColor }]}>
              {isSavedState ? 'Saved' : 'Save'}
            </Text>
          )}
        </View>
      )}

      {error && (
        <Text style={styles.errorText} numberOfLines={1}>
          {error}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    width: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 100,
  },
});
