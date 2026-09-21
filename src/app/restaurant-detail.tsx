import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MapPin, Utensils, Star, MessageSquare, X } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { Screen } from '@/components/ui/Screen';
import { Rating } from '@/components/ui/Rating';
import { ReviewList, ReviewForm } from '@/components/reviews';
import { getRestaurant } from '@/lib/db/restaurants';
import { getRestaurantRatingStats } from '@/lib/db/reviews';
import { colors } from '@/constants/colors';

export default function RestaurantDetailScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const restaurant = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => getRestaurant(restaurantId!),
    enabled: !!restaurantId,
  });

  const ratingStats = useQuery({
    queryKey: ['restaurant-rating-stats', restaurantId, refreshKey],
    queryFn: () => getRestaurantRatingStats(restaurantId!),
    enabled: !!restaurantId,
  });

  if (restaurant.isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </Screen>
    );
  }

  if (restaurant.isError || !restaurant.data) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Restaurant not found</Text>
        </View>
      </Screen>
    );
  }

  const data = restaurant.data;

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        {data.image_url && (
          <Image
            source={{ uri: data.image_url }}
            style={styles.headerImage}
          />
        )}

        {/* Restaurant Info */}
        <View style={styles.infoSection}>
          <View>
            <Text style={styles.name}>{data.name}</Text>
            <View style={styles.metaRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{data.address}</Text>
            </View>
          </View>

          {ratingStats.data && (
            <View style={styles.ratingBox}>
              <Text style={styles.ratingNumber}>
                {typeof ratingStats.data.avg_rating === 'number' ? ratingStats.data.avg_rating.toFixed(1) : 'N/A'}
              </Text>
              <Star
                size={16}
                color={colors.accent}
                fill={colors.accent}
              />
              <Text style={styles.reviewCountSmall}>
                {ratingStats.data.review_count}
              </Text>
            </View>
          )}
        </View>

        {/* Cuisines */}
        {data.restaurant_cuisines && data.restaurant_cuisines.length > 0 && (
          <View style={styles.cuisinesSection}>
            <View style={styles.cuisineChips}>
              {data.restaurant_cuisines.map((rc: any) => (
                <View key={rc.id} style={styles.chip}>
                  <Utensils size={12} color={colors.accent} />
                  <Text style={styles.chipText}>
                    {rc.cuisine?.name || 'Unknown'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Review Button */}
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={() => setShowReviewForm(true)}
        >
          <MessageSquare size={18} color="white" />
          <Text style={styles.reviewButtonText}>Write a Review</Text>
        </TouchableOpacity>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <ReviewList
            restaurantId={restaurantId!}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </View>
      </ScrollView>

      {/* Review Form Modal */}
      <Modal
        visible={showReviewForm}
        animationType="slide"
        onRequestClose={() => setShowReviewForm(false)}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowReviewForm(false)}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Review {data.name}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ReviewForm
          restaurantId={restaurantId!}
          onSubmitSuccess={() => {
            setShowReviewForm(false);
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setShowReviewForm(false)}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
  headerImage: {
    width: '100%',
    height: 240,
    backgroundColor: colors.border,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ratingBox: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
  },
  ratingNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },
  reviewCountSmall: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cuisinesSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cuisineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
