/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Star, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getRestaurantReviews, getRestaurantRatingStats, Review } from '@/lib/db/reviews';
import { colors } from '@/constants/colors';

interface ReviewListProps {
  restaurantId: string;
  onRefresh?: () => void;
}

export const ReviewList = ({ restaurantId, onRefresh }: ReviewListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    avg_rating: number;
    review_count: number;
  } | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const [reviewsData, statsData] = await Promise.all([
        getRestaurantReviews(restaurantId, {
          includeUser: true,
          includePhotos: true,
        }),
        getRestaurantRatingStats(restaurantId),
      ]);

      setReviews(reviewsData);
      setStats(statsData);
    } catch (err) {
      console.error('[Bitebook] Failed to load reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [restaurantId]);

  const handleRefresh = async () => {
    await loadReviews();
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stats && stats.review_count > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.ratingBox}>
            <Text style={styles.ratingNumber}>
              {typeof stats.avg_rating === 'number' ? stats.avg_rating.toFixed(1) : 'N/A'}
            </Text>
            <View style={styles.starsSmall}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={14}
                  color={
                    typeof stats.avg_rating === 'number' && i <= Math.round(stats.avg_rating)
                      ? colors.accent
                      : colors.border
                  }
                  fill={
                    typeof stats.avg_rating === 'number' && i <= Math.round(stats.avg_rating)
                      ? colors.accent
                      : 'transparent'
                  }
                  strokeWidth={2}
                />
              ))}
            </View>
          </View>
          <Text style={styles.reviewCount}>
            {stats.review_count} Review{stats.review_count !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No reviews yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Be the first to review this restaurant
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              isExpanded={expandedReviewId === item.id}
              onToggleExpand={() =>
                setExpandedReviewId(
                  expandedReviewId === item.id ? null : item.id
                )
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

interface ReviewCardProps {
  review: Review;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ReviewCard = ({
  review,
  isExpanded,
  onToggleExpand,
}: ReviewCardProps) => {
  const hasPhotos = review.photos && review.photos.length > 0;
  const user = (review as any).user;

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {user?.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.full_name || 'Anonymous'}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={12}
                  color={
                    i <= review.rating ? colors.accent : colors.border
                  }
                  fill={i <= review.rating ? colors.accent : 'transparent'}
                  strokeWidth={2}
                />
              ))}
            </View>
            <Text style={styles.timestamp}>
              {formatDate(review.created_at)}
            </Text>
          </View>
        </View>
      </View>

      {review.text && (
        <Text
          style={styles.reviewText}
          numberOfLines={isExpanded ? undefined : 3}
        >
          {review.text}
        </Text>
      )}

      {hasPhotos && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
        >
          {review.photos!.map((photo) => (
            <Image
              key={photo.id}
              source={{ uri: photo.photo_url }}
              style={styles.reviewPhoto}
            />
          ))}
        </ScrollView>
      )}

      {review.text && (
        <TouchableOpacity
          onPress={onToggleExpand}
          style={styles.expandButton}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? 'Show less' : 'Show more'}
          </Text>
          {isExpanded ? (
            <ChevronUp size={14} color={colors.accent} />
          ) : (
            <ChevronDown size={14} color={colors.accent} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    marginBottom: 16,
    gap: 16,
  },
  ratingBox: {
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  starsSmall: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reviewCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: colors.border,
  },
  avatarText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 8,
  },
  photoScroll: {
    marginBottom: 8,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  reviewPhoto: {
    width: 100,
    height: 100,
    borderRadius: 6,
    marginRight: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  expandButtonText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
});
