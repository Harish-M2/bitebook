import { colors } from '@/constants/colors';
import type { RestaurantFilters } from '@/lib/db/filters';
import { getPriceLevels, SORT_OPTIONS } from '@/lib/db/filters';
import type { Restaurant } from '@/types/models';
import { ChevronDown, X } from 'lucide-react-native';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface FilterBarProps {
  restaurants: Restaurant[];
  activeFilters: RestaurantFilters;
  onFiltersChange: (filters: RestaurantFilters) => void;
  /** Cuisine chips are offered inside the sheet so the page itself stays clean. */
  cuisines?: { id: string; name: string; slug: string }[];
  activeCuisine?: string | null;
  onCuisineChange?: (slug: string | null) => void;
  /** Drops the outer padding so the button can sit beside the search bar. */
  compact?: boolean;
}

const RATING_OPTIONS = [0, 3.0, 3.5, 4.0, 4.5];
const DISTANCE_OPTIONS = [1, 2, 5, 10, 20];
const DIETARY_OPTIONS: { value: string; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'gluten_free', label: 'Gluten-free' },
];

/**
 * Filter bar component with expandable filter options
 * Shows price, rating, and distance filters
 */
export function FilterBar({
  restaurants,
  activeFilters,
  onFiltersChange,
  cuisines = [],
  activeCuisine = null,
  onCuisineChange,
  compact = false,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const priceOptions = getPriceLevels(restaurants);

  const handlePriceChange = (price: string) => {
    const newPrice = activeFilters.priceLevel === price ? undefined : price;
    onFiltersChange({ ...activeFilters, priceLevel: newPrice });
  };

  const handleRatingChange = (rating: number) => {
    const newRating = activeFilters.minRating === rating ? undefined : rating;
    onFiltersChange({ ...activeFilters, minRating: newRating });
  };

  const handleDistanceChange = (distance: number) => {
    const newDistance = activeFilters.maxDistance === distance ? undefined : distance;
    onFiltersChange({ ...activeFilters, maxDistance: newDistance });
  };

  const handleDietaryChange = (tag: string) => {
    onFiltersChange({ ...activeFilters, dietaryTag: activeFilters.dietaryTag === tag ? undefined : tag });
  };

  const handleSortChange = (sort: NonNullable<RestaurantFilters['sort']>) => {
    // 'recommended' is the default, so selecting it clears the field instead of counting as a filter.
    onFiltersChange({ ...activeFilters, sort: sort === 'recommended' ? undefined : sort });
  };

  const handleReset = () => {
    onFiltersChange({});
    onCuisineChange?.(null);
  };

  const activeFilterCount =
    Object.values(activeFilters).filter((v) => v !== undefined).length + (activeCuisine ? 1 : 0);
  const hasDistance = restaurants.some((restaurant) => Boolean(restaurant.distanceLabel));

  return (
    <View style={compact ? undefined : styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        style={[
          styles.filterButton,
          activeFilterCount > 0 && styles.filterButtonActive,
        ]}
        onPress={() => setShowFilters(true)}
      >
        <Text style={styles.filterButtonText}>
          Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Text>
        <ChevronDown size={16} color={colors.textPrimary} />
      </Pressable>

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <Pressable
                onPress={() => setShowFilters(false)}
                accessibilityRole="button"
                accessibilityLabel="Close filters"
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                hitSlop={8}
              >
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.filterOptions}
              contentContainerStyle={styles.filterContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Sort */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Sort by</Text>
                <View style={styles.filterChips}>
                  {SORT_OPTIONS.map((option) => {
                    const selected = (activeFilters.sort ?? 'recommended') === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.chip, selected && styles.chipActive]}
                        onPress={() => handleSortChange(option.value)}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Hide visited */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Visited</Text>
                <View style={styles.filterChips}>
                  <Pressable
                    style={[styles.chip, activeFilters.hideVisited && styles.chipActive]}
                    onPress={() =>
                      onFiltersChange({
                        ...activeFilters,
                        hideVisited: activeFilters.hideVisited ? undefined : true,
                      })
                    }
                  >
                    <Text style={[styles.chipText, activeFilters.hideVisited && styles.chipTextActive]}>
                      Hide places I have visited
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Cuisine Filter */}
              {cuisines.length > 0 && onCuisineChange ? (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Cuisine</Text>
                  <View style={styles.filterChips}>
                    {cuisines.map((cuisine) => (
                      <Pressable
                        key={cuisine.id}
                        style={[styles.chip, activeCuisine === cuisine.slug && styles.chipActive]}
                        onPress={() =>
                          onCuisineChange(activeCuisine === cuisine.slug ? null : cuisine.slug)
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            activeCuisine === cuisine.slug && styles.chipTextActive,
                          ]}
                        >
                          {cuisine.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Price Level Filter */}
              {priceOptions.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Price Level</Text>
                  <View style={styles.filterChips}>
                    {priceOptions.map((price) => (
                      <Pressable
                        key={price}
                        style={[
                          styles.chip,
                          activeFilters.priceLevel === price && styles.chipActive,
                        ]}
                        onPress={() => handlePriceChange(price)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            activeFilters.priceLevel === price && styles.chipTextActive,
                          ]}
                        >
                          {price}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Dietary Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Dietary (serves a matching dish)</Text>
                <View style={styles.filterChips}>
                  {DIETARY_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.chip,
                        activeFilters.dietaryTag === option.value && styles.chipActive,
                      ]}
                      onPress={() => handleDietaryChange(option.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          activeFilters.dietaryTag === option.value && styles.chipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Rating Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Minimum Rating</Text>
                <View style={styles.filterChips}>
                  {RATING_OPTIONS.map((rating) => (
                    <Pressable
                      key={rating}
                      style={[
                        styles.chip,
                        activeFilters.minRating === rating && styles.chipActive,
                      ]}
                      onPress={() => handleRatingChange(rating)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          activeFilters.minRating === rating && styles.chipTextActive,
                        ]}
                      >
                        {rating === 0 ? 'Any' : `${rating}★`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Distance Filter */}
              {hasDistance ? <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Maximum Distance</Text>
                <View style={styles.filterChips}>
                  {DISTANCE_OPTIONS.map((distance) => (
                    <Pressable
                      key={distance}
                      style={[
                        styles.chip,
                        activeFilters.maxDistance === distance && styles.chipActive,
                      ]}
                      onPress={() => handleDistanceChange(distance)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          activeFilters.maxDistance === distance && styles.chipTextActive,
                        ]}
                      >
                        {distance} km
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View> : null}

              {/* Filter Summary */}
              {activeFilterCount > 0 && (
                <View style={styles.filterSummary}>
                  <Text style={styles.summaryText}>
                    {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                >
                  <Text style={styles.resetButtonText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accent,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterOptions: {
    flex: 1,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 24,
  },
  filterSection: {
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.background,
  },
  filterSummary: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
    textAlign: 'center',
  },
});
