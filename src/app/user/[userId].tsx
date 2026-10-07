import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, Users } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { FeedItem } from '@/components/feed/FeedItem';
import { FollowButton } from '@/components/social/FollowButton';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { BodyText, Caption, Heading, MetadataText } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { toRestaurantVisitFeedActivity } from '@/lib/db/feed';
import { getProfile } from '@/lib/db/profiles';
import { listRestaurantVisitSummaries } from '@/lib/db/restaurant-reviews';
import { getVisibleProfileReviews } from '@/lib/db/reviews';
import { getUserFollowCounts } from '@/lib/db/social';
import { formatRelativeTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryClient';

const REVIEW_PAGE_SIZE = 20;

export default function UserProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { colors } = useAppTheme();

  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId),
    enabled: Boolean(userId),
  });

  const followCounts = useQuery({
    queryKey: ['profile-follow-counts', userId],
    queryFn: () => getUserFollowCounts(userId),
    enabled: Boolean(userId),
  });

  const reviews = useQuery({
    queryKey: ['profile-reviews', userId, 0],
    queryFn: () => getVisibleProfileReviews(userId, REVIEW_PAGE_SIZE, 0),
    enabled: Boolean(userId),
  });

  const restaurantVisits = useQuery({
    queryKey: ['profile-restaurant-visits', userId],
    queryFn: () => listRestaurantVisitSummaries([userId], 20),
    enabled: Boolean(userId),
  });

  if (profile.isPending) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (profile.isError) {
    return (
      <Screen>
        <ErrorState
          title="Could not load profile"
          description={profile.error.message}
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  if (!profile.data) {
    return (
      <Screen>
        <EmptyState title="Profile not found" description="This account may no longer be available." />
      </Screen>
    );
  }

  const profileData = profile.data;
  const displayName = profileData.display_name || profileData.username || 'Bitebook user';
  const isOwnProfile = currentUser?.id === profileData.id;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}>
        <View className="w-full gap-lg self-center px-lg pt-sm" style={{ maxWidth: 760 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-pill border border-border">
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>

          <View className="items-center gap-sm py-lg">
            <Avatar uri={profileData.avatar_url} name={displayName} size="xl" />
            <View className="items-center gap-xxs">
              <Heading level={2} style={{ textAlign: 'center' }}>{displayName}</Heading>
              {profileData.username ? <Caption>@{profileData.username}</Caption> : null}
            </View>
            {profileData.bio ? (
              <BodyText color="textSecondary" style={{ maxWidth: 520, textAlign: 'center' }}>
                {profileData.bio}
              </BodyText>
            ) : null}
          </View>

          <View className="flex-row items-center justify-center gap-xxl border-y border-border py-md">
            <View className="items-center gap-xxs">
              <BodyText medium>{followCounts.data?.followerCount ?? 0}</BodyText>
              <MetadataText>Followers</MetadataText>
            </View>
            <View className="items-center gap-xxs">
              <BodyText medium>{followCounts.data?.followingCount ?? 0}</BodyText>
              <MetadataText>Following</MetadataText>
            </View>
          </View>

          {!isOwnProfile && currentUser ? (
            <FollowButton
              userId={profileData.id}
              onFollowChange={() => {
                void queryClient.invalidateQueries({
                  queryKey: ['profile-follow-counts', profileData.id],
                });
                void queryClient.invalidateQueries({ queryKey: queryKeys.feed(currentUser.id) });
              }}
            />
          ) : null}

          <View className="gap-md pt-sm">
            <Heading level={3}>Restaurant visits</Heading>
            {restaurantVisits.isPending ? (
              <View className="items-center py-md">
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : restaurantVisits.isError ? (
              <ErrorState
                title="Could not load restaurant visits"
                description={restaurantVisits.error.message}
                onRetry={() => void restaurantVisits.refetch()}
              />
            ) : restaurantVisits.data.length === 0 ? (
              <Caption>No visible restaurant visits yet.</Caption>
            ) : (
              <View className="gap-md">
                {restaurantVisits.data.map((visit) => (
                  <FeedItem
                    key={visit.id}
                    activity={toRestaurantVisitFeedActivity(visit)}
                    onSubjectPress={() => router.push({
                      pathname: '/restaurant-review-detail',
                      params: { restaurantReviewId: visit.id },
                    })}
                  />
                ))}
              </View>
            )}
          </View>

          <View className="gap-md pt-sm">
            <Heading level={3}>Recent reviews</Heading>
            {reviews.isPending ? (
              <View className="items-center py-xl">
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : reviews.isError ? (
              <ErrorState
                title="Could not load reviews"
                description={reviews.error.message}
                onRetry={() => void reviews.refetch()}
              />
            ) : reviews.data.length === 0 ? (
              <EmptyState
                icon={<Users size={32} color={colors.textMuted} />}
                title="No visible reviews yet"
                description="Reviews shared with you will appear here."
              />
            ) : (
              <View className="gap-sm">
                {reviews.data.map((review) => (
                  <Pressable
                    key={review.id}
                    onPress={() =>
                      router.push({
                        pathname: '/dish-detail',
                        params: { dishId: review.dish?.id ?? '' },
                      })
                    }
                    disabled={!review.dish?.id}
                    accessibilityRole="button"
                    className="gap-xs rounded-lg border border-border bg-surface px-md py-sm">
                    <View className="flex-row items-start justify-between gap-sm">
                      <View className="flex-1 gap-xxs">
                        <BodyText medium>{review.dish?.name ?? 'Dish review'}</BodyText>
                        <Caption>{review.restaurant?.name ?? 'Restaurant'}</Caption>
                      </View>
                      <View className="flex-row items-center gap-xxs">
                        <Star size={15} color={colors.rating} fill={colors.rating} />
                        <BodyText medium>{review.rating.toFixed(1)}</BodyText>
                      </View>
                    </View>
                    {review.review_text ? (
                      <Caption color="textSecondary">{review.review_text}</Caption>
                    ) : null}
                    <MetadataText>{formatRelativeTime(review.created_at)}</MetadataText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}