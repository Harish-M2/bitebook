import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, ChevronRight } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { getSavedRestaurants, unsaveRestaurant } from '@/lib/db/saved';
import type { Restaurant } from '@/types/models';

interface SavedListProps {
  onRestaurantPress?: (restaurantId: string) => void;
  showCuisineFilter?: boolean;
}

/**
 * Display all saved restaurants for the current user
 * Supports filtering by cuisine
 * Can unsave from this view
 */
export function SavedList({
  onRestaurantPress,
  showCuisineFilter = true,
}: SavedListProps) {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);

  const loadSavedRestaurants = async () => {
    try {
      setError(null);
      const data = await getSavedRestaurants(100, 0); // Load up to 100
      setRestaurants(data);
    } catch (err) {
      console.error('Error loading saved restaurants:', err);
      setError(err instanceof Error ? err.message : 'Error loading restaurants');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSavedRestaurants();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSavedRestaurants();
  };

  const handleUnsave = (restaurantId: string, restaurantName: string) => {
    Alert.alert(
      'Remove Saved Restaurant',
      `Remove "${restaurantName}" from your saved list?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              await unsaveRestaurant(restaurantId);
              setRestaurants(restaurants.filter(r => r.id !== restaurantId));
            } catch (err) {
              Alert.alert('Error', 'Failed to remove restaurant');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleRestaurantPress = (restaurantId: string) => {
    if (onRestaurantPress) {
      onRestaurantPress(restaurantId);
    } else {
      // Navigate to restaurant detail via parent stack
      router.push({
        pathname: '/(tabs)/discover',
        params: { restaurantId },
      });
    }
  };

  // Get unique cuisines for filtering
  const getCuisinesList = (): string[] => {
    const cuisineSet = new Set<string>();
    restaurants.forEach((r: Restaurant) => {
      if (r.cuisine && typeof r.cuisine === 'string') {
        cuisineSet.add(r.cuisine);
      }
    });
    return Array.from(cuisineSet).sort();
  };

  // Filter restaurants by selected cuisine
  const getFilteredRestaurants = (): Restaurant[] => {
    if (!selectedCuisine) return restaurants;
    return restaurants.filter((r: Restaurant) => {
      if (!r.cuisine || typeof r.cuisine !== 'string') return false;
      return r.cuisine === selectedCuisine;
    });
  };

  const filteredRestaurants = getFilteredRestaurants();
  const cuisineList = getCuisinesList();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading saved restaurants...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Heart size={48} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Heart size={48} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Saved Restaurants</Text>
        <Text style={styles.emptyText}>
          Start saving restaurants to see them here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cuisine Filter Chips */}
      {showCuisineFilter && cuisineList.length > 0 && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={cuisineList}
            keyExtractor={(c) => c}
            contentContainerStyle={styles.filterList}
            renderItem={({ item: cuisine }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedCuisine === cuisine && styles.filterChipActive,
                ]}
                onPress={() =>
                  setSelectedCuisine(
                    selectedCuisine === cuisine ? null : cuisine
                  )
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCuisine === cuisine &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Restaurant List */}
      <FlatList
        data={filteredRestaurants}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item: restaurant }) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => handleRestaurantPress(restaurant.id)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <Text style={styles.restaurantName} numberOfLines={2}>
                  {restaurant.name}
                </Text>
                <TouchableOpacity
                  style={styles.unsaveButton}
                  onPress={() =>
                    handleUnsave(restaurant.id, restaurant.name)
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Heart
                    size={20}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </View>

              {restaurant.distanceLabel && (
                <Text style={styles.address} numberOfLines={1}>
                  📍 {restaurant.distanceLabel}
                </Text>
              )}

              {restaurant.cuisine && (
                <View style={styles.cuisineRow}>
                  <View style={styles.cuisineChip}>
                    <Text style={styles.cuisineText}>
                      {restaurant.cuisine.charAt(0).toUpperCase() + restaurant.cuisine.slice(1)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyFilterText}>
              No restaurants match this cuisine
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFilterText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  filterChipTextActive: {
    color: colors.background,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  restaurantCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    padding: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  restaurantName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unsaveButton: {
    padding: 4,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cuisineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  cuisineChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cuisineText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
