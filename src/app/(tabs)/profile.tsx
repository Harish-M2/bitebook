import { useState } from 'react';
import { Alert, ScrollView, View, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Trash2 } from 'lucide-react-native';

import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { getCuisineBreakdown, getDiaryStats } from '@/lib/db/stats';
import { readPhotoBytes, prepareAvatarPhoto, uploadAvatarPhoto } from '@/lib/db/photos';
import { getUserReviews, deleteReview } from '@/lib/db/reviews';
import { Screen, Divider, Spacer } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Heading, BodyText, Caption, MetadataText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { CuisineBreakdown } from '@/components/profile/CuisineBreakdown';
import { colors } from '@/constants/colors';
import type { DiaryStats } from '@/types/models';

const EMPTY_STATS: DiaryStats = {
  dishesLogged: 0,
  restaurantsVisited: 0,
  cuisinesExplored: 0,
  averageRating: 0,
};

/** Profile tab — identity, lifetime stats, and cuisine breakdown. */
export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const userId = profile?.id ?? null;

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

  const handleSignOut = () => {
    Alert.alert('Sign out', 'You will need to sign in again to log meals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          const { error } = await signOut();
          if (error) {
            setSigningOut(false);
            Alert.alert('Could not sign out', error);
          }
        },
      },
    ]);
  };

  const handleDeleteReview = (reviewId: string, dishName?: string) => {
    Alert.alert(
      'Delete review',
      `Are you sure you want to delete your review of "${dishName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReview(reviewId);
              await reviews.refetch();
            } catch (error) {
              Alert.alert('Failed to delete review', String(error));
            }
          },
        },
      ]
    );
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

      // Refetch profile to update avatar
      stats.refetch();
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not upload avatar');
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
          <Avatar uri={profile?.avatar_url ?? null} name={displayName} size="xl" />
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
        <View className="px-lg">
          <Divider />
        </View>
        <Spacer size="lg" />

        <View className="px-lg gap-md">
          <Heading level={3}>Your reviews</Heading>
          {reviews.data && reviews.data.length > 0 ? (
            <View className="gap-md">
              {reviews.data.map((review: any) => (
                <View
                  key={review.id}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
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
                      style={{ padding: 8 }}>
                      <Trash2 size={18} color={colors.textSecondary} />
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
