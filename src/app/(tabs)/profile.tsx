import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Switch, View } from 'react-native';

import { FeedItem } from '@/components/feed/FeedItem';
import { CuisineBreakdown } from '@/components/profile/CuisineBreakdown';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Divider, Screen, Spacer } from '@/components/ui/Screen';
import { BodyText, Caption, Heading, MetadataText } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { toRestaurantVisitFeedActivity } from '@/lib/db/feed';
import { prepareAvatarPhoto, readPhotoBytes, uploadAvatarPhoto } from '@/lib/db/photos';
import { listRestaurantVisitSummaries } from '@/lib/db/restaurant-reviews';
import { deleteReview, getUserReviews } from '@/lib/db/reviews';
import { getUserFollowCounts } from '@/lib/db/social';
import { getCuisineBreakdown, getDiaryStats } from '@/lib/db/stats';
import { queryKeys } from '@/lib/queryClient';
import type { DiaryStats } from '@/types/models';

const EMPTY_STATS: DiaryStats = {
  dishesLogged: 0,
  restaurantsVisited: 0,
  cuisinesExplored: 0,
  averageRating: 0,
};

/** Profile tab — identity, lifetime stats, and cuisine breakdown. */
export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { colors: palette, themeName, toggleTheme } = useAppTheme();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const userId = user?.id ?? null;

  const stats = useQuery({
    queryKey: queryKeys.diaryStats(userId ?? ''),
    queryFn: () => getDiaryStats(userId as string),
    enabled: userId !== null,
  });

  const breakdown = useQuery({
    queryKey: queryKeys.cuisineBreakdown(userId ?? ''),
    queryFn: () => getCuisineBreakdown(userId as string),
    enabled: userId !== null,
  });

  const reviews = useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: () => getUserReviews(userId as string),
    enabled: userId !== null,
  });

  const restaurantVisits = useQuery({
    queryKey: ['restaurant-visits', userId],
    queryFn: () => listRestaurantVisitSummaries([userId as string], 20),
    enabled: userId !== null,
  });

  const followCounts = useQuery({
    queryKey: ['profile-follow-counts', userId],
    queryFn: () => getUserFollowCounts(userId as string),
    enabled: userId !== null,
  });

  const performSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) throw new Error(error);
    } catch (error) {
      setSigningOut(false);
      const message = error instanceof Error ? error.message : 'Could not sign out';
      if (Platform.OS === 'web') {
        window.alert(`Could not sign out\n\n${message}`);
      } else {
        Alert.alert('Could not sign out', message);
      }
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out? You will need to sign in again to log meals.')) {
        void performSignOut();
      }
      return;
    }

    Alert.alert('Sign out', 'You will need to sign in again to log meals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void performSignOut(),
      },
    ]);
  };

  const performDeleteReview = async (reviewId: string) => {
    setDeletingReviewId(reviewId);
    try {
      await deleteReview(reviewId);
      await Promise.all([
        reviews.refetch(),
        stats.refetch(),
        breakdown.refetch(),
        user ? queryClient.invalidateQueries({ queryKey: queryKeys.feed(user.id) }) : Promise.resolve(),
      ]);
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
      if (Platform.OS === 'web') {
        window.alert(`Could not delete review\n\n${message}`);
      } else {
        Alert.alert('Could not delete review', message);
      }
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleDeleteReview = (reviewId: string, dishName?: string) => {
    const message = `Delete your review of "${dishName ?? 'this dish'}"? This cannot be undone.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) void performDeleteReview(reviewId);
      return;
    }

    Alert.alert('Delete review', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void performDeleteReview(reviewId),
      },
    ]);
  };

  const handleAvatarUpload = async () => {
    if (!userId) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      setUploadingAvatar(true);

      const asset = result.assets[0];
      const prepared = await prepareAvatarPhoto(asset.uri);
      const bytes = await readPhotoBytes(prepared.uri);
      await uploadAvatarPhoto(userId, bytes);
      await refreshProfile();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload avatar';
      if (Platform.OS === 'web') {
        window.alert(`Upload failed\n\n${message}`);
      } else {
        Alert.alert('Upload failed', message);
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayName = profile?.display_name ?? profile?.username ?? 'You';
  const cuisines = breakdown.data ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="items-center gap-sm px-lg pt-md">
          <View
            style={{
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 26,
              padding: 18,
              shadowColor: '#000000',
              shadowOpacity: 0.1,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
            }}>
            <Avatar uri={profile?.avatar_url ?? null} name={displayName} size="xl" />
          </View>
          <View className="items-center gap-xxs">
            <Heading level={2}>{displayName}</Heading>
            {profile?.username ? <Caption>@{profile.username}</Caption> : null}
          </View>
          {profile?.bio ? (
            <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
              {profile.bio}
            </BodyText>
          ) : null}
          <Button
            label="Change avatar"
            variant="secondary"
            loading={uploadingAvatar}
            onPress={handleAvatarUpload}
          />
        </View>

        <Spacer size="md" />
        <View className="flex-row items-center justify-center gap-xxl border-y border-border py-md">
          <Pressable
            onPress={() => router.push('/followers')}
            accessibilityRole="button"
            accessibilityLabel="View your followers"
            className="items-center gap-xxs">
            <BodyText medium>{followCounts.data?.followerCount ?? 0}</BodyText>
            <MetadataText>Followers</MetadataText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/following')}
            accessibilityRole="button"
            accessibilityLabel="View profiles you follow"
            className="items-center gap-xxs">
            <BodyText medium>{followCounts.data?.followingCount ?? 0}</BodyText>
            <MetadataText>Following</MetadataText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/visited')}
            accessibilityRole="button"
            accessibilityLabel="View restaurants you have visited"
            className="items-center gap-xxs">
            <BodyText medium>Visited</BodyText>
            <MetadataText>Restaurants</MetadataText>
          </Pressable>
        </View>

        <View className="px-lg pt-lg">
          <View
            style={{
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View>
              <BodyText medium>Appearance</BodyText>
              <Caption>{themeName === 'dark' ? 'Dark mode' : 'Light mode'}</Caption>
            </View>
            <Switch
              value={themeName === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: palette.surfaceMuted, true: palette.accent }}
              thumbColor={palette.white}
            />
          </View>
        </View>

        <Spacer size="xl" />
        <View className="px-lg">
          <ProfileStats stats={stats.data ?? EMPTY_STATS} />
        </View>

        <Spacer size="lg" />
        <View className="px-lg">
          <Divider />
        </View>
        <Spacer size="lg" />

        <View className="gap-md px-lg">
          <Heading level={3}>Cuisine breakdown</Heading>
          {cuisines.length > 0 ? (
            <>
              <BodyText color="textSecondary">Your most-logged cuisines.</BodyText>
              <CuisineBreakdown data={cuisines} />
            </>
          ) : (
            <BodyText color="textSecondary">
              Log a few dishes and your most-eaten cuisines will appear here.
            </BodyText>
          )}
        </View>

        <Spacer size="xl" />
        <View className="px-lg gap-md">
          <Heading level={3}>Restaurant visits</Heading>
          {restaurantVisits.isPending ? (
            <ActivityIndicator color={palette.accent} />
          ) : restaurantVisits.isError ? (
            <BodyText color="textSecondary">Could not load restaurant visits.</BodyText>
          ) : restaurantVisits.data.length > 0 ? (
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
          ) : (
            <BodyText color="textSecondary">Your grouped restaurant reviews will appear here.</BodyText>
          )}
        </View>

        <Spacer size="xl" />
        <View className="px-lg">
          <Divider />
        </View>
        <Spacer size="lg" />

        <View className="px-lg gap-md">
          <Heading level={3}>Your reviews</Heading>
          {reviews.isLoading ? (
            <BodyText color="textSecondary">Loading reviews...</BodyText>
          ) : reviews.error ? (
            <BodyText color="textSecondary">Error loading reviews</BodyText>
          ) : reviews.data && reviews.data.length > 0 ? (
            <View className="gap-md">
              {reviews.data.map((review: any) => (
                <View
                  key={review.id}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    borderRadius: 12,
                    padding: 12,
                    gap: 8,
                  }}>
                  <View className="flex-row items-start justify-between gap-md">
                    <View className="flex-1">
                      <BodyText medium>{review.dish?.name}</BodyText>
                      <Caption color="textSecondary">{review.restaurant?.name}</Caption>
                      <MetadataText color="textSecondary" style={{ marginTop: 4 }}>
                        ★ {review.rating}/5
                      </MetadataText>
                      {review.review_text ? (
                        <Caption style={{ marginTop: 8 }}>&quot;{review.review_text}&quot;</Caption>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => handleDeleteReview(review.id, review.dish?.name)}
                      disabled={deletingReviewId !== null}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete review of ${review.dish?.name ?? 'dish'}`}
                      style={{ padding: 8, opacity: deletingReviewId === review.id ? 0.5 : 1 }}>
                      {deletingReviewId === review.id ? (
                        <ActivityIndicator size="small" color={palette.textSecondary} />
                      ) : (
                        <Trash2 size={18} color={palette.textSecondary} />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <BodyText color="textSecondary">No reviews yet. Log your first dish!</BodyText>
          )}
        </View>

        <Spacer size="xl" />
        <View className="px-lg">
          <Divider />
        </View>
        <Spacer size="lg" />

        <View className="px-lg">
          <Button
            label="Sign out"
            variant="outline"
            fullWidth
            loading={signingOut}
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
