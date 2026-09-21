import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { ChevronRight, Star } from 'lucide-react-native';
import {
  getActivityFeed,
  Activity,
  formatActivityDescription,
} from '@/lib/db/activity';
import { colors } from '@/constants/colors';
import { useRouter } from 'expo-router';

interface ActivityFeedProps {
  limit?: number;
  onActivityPress?: (activity: Activity) => void;
}

export const ActivityFeed = ({ limit = 50, onActivityPress }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getActivityFeed(limit);
      setActivities(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load activity';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const data = await getActivityFeed(limit);
      setActivities(data);
    } catch (err) {
      console.error('[Bitebook] Failed to refresh activity:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleActivityPress = (activity: Activity) => {
    if (onActivityPress) {
      onActivityPress(activity);
      return;
    }

    // Default navigation
    if (activity.review_id) {
      router.push({
        pathname: '/restaurant-detail',
        params: { restaurantId: activity.restaurant_id },
      });
    } else if (activity.restaurant_id) {
      router.push({
        pathname: '/restaurant-detail',
        params: { restaurantId: activity.restaurant_id },
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadActivities}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No activity yet</Text>
        <Text style={styles.emptySubtext}>
          Follow friends to see what they're reviewing
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
        />
      }
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          onPress={() => handleActivityPress(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
}

const ActivityCard = ({ activity, onPress }: ActivityCardProps) => {
  const description = formatActivityDescription(activity);
  const avatar = activity.user?.avatar_url;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {activity.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
          <Text style={styles.timestamp}>
            {formatDate(activity.created_at)}
          </Text>
        </View>

        <ChevronRight size={20} color={colors.textSecondary} />
      </View>

      {activity.review?.rating && (
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={14}
              color={
                i <= activity.review!.rating
                  ? colors.rating
                  : colors.border
              }
              fill={
                i <= activity.review!.rating
                  ? colors.rating
                  : 'transparent'
              }
              strokeWidth={2}
            />
          ))}
          <Text style={styles.ratingCount}>
            {activity.review.rating} star{activity.review.rating !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    gap: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.accent,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  content: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingLeft: 52,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
});
