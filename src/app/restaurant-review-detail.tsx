import { BrandIcon } from '@/components/ui/BrandIcon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ImagePlus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Rating } from '@/components/ui/Rating';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { BodyText, Caption, Heading, MetadataText } from '@/components/ui/Typography';
import { RESTAURANT_RECOMMENDATIONS } from '@/constants/recommendations';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import { preparePhoto, readPhotoBytes } from '@/lib/db/photos';
import { deleteRestaurantReviewMedia, getRestaurantVisitSummary, replaceRestaurantReviewImage } from '@/lib/db/restaurant-reviews';
import { formatDiaryDate, formatPriceLevel } from '@/lib/format';
import { queryKeys } from '@/lib/queryClient';

function VisitVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="cover"
      style={{ width: 240, height: 240, borderRadius: 12 }}
    />
  );
}

export default function RestaurantReviewDetailScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { restaurantReviewId } = useLocalSearchParams<{ restaurantReviewId: string }>();
  const { colors: palette } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [processingMediaId, setProcessingMediaId] = useState<string | null>(null);

  const visit = useQuery({
    queryKey: ['restaurant-review', restaurantReviewId],
    queryFn: () => getRestaurantVisitSummary(restaurantReviewId),
    enabled: Boolean(restaurantReviewId),
  });

  if (visit.isLoading) {
    return (
      <Screen navigation>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.accent} />
        </View>
      </Screen>
    );
  }

  if (visit.isError) {
    return (
      <Screen navigation>
        <ErrorState
          title="Could not load this restaurant review"
          description={visit.error.message}
          onRetry={() => void visit.refetch()}
        />
      </Screen>
    );
  }

  if (!visit.data) {
    return (
      <Screen navigation>
        <View className="flex-1 gap-md px-lg pt-md">
          <Heading level={2}>Review not available</Heading>
          <Caption>This visit may be private or no longer available.</Caption>
        </View>
      </Screen>
    );
  }

  const data = visit.data;
  const location = [data.restaurant.city, formatPriceLevel(data.restaurant.priceLevel)]
    .filter(Boolean)
    .join(' · ');
  const recommendation = RESTAURANT_RECOMMENDATIONS.find(
    (option) => option.tier === data.recommendationTier,
  );
  const isOwner = user?.id === data.userId;

  async function invalidateVisitMedia() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['restaurant-review', restaurantReviewId] }),
      queryClient.invalidateQueries({ queryKey: ['restaurant-visits'] }),
      queryClient.invalidateQueries({ queryKey: ['restaurant-visits-by-restaurant', data.restaurant.id] }),
      queryClient.invalidateQueries({ queryKey: ['dish'] }),
      queryClient.invalidateQueries({ queryKey: ['gallery-item'] }),
      user ? queryClient.invalidateQueries({ queryKey: queryKeys.diary(user.id) }) : Promise.resolve(),
      user ? queryClient.invalidateQueries({ queryKey: queryKeys.feed(user.id) }) : Promise.resolve(),
    ]);
  }

  async function removeMedia(mediaId: string) {
    if (processingMediaId) return;
    setProcessingMediaId(mediaId);
    try {
      await deleteRestaurantReviewMedia(mediaId);
      await invalidateVisitMedia();
      showToast({ title: 'Photo deleted', message: 'The visit photo was removed.', tone: 'success' });
    } catch (error) {
      showToast({ title: 'Could not delete photo', message: error instanceof Error ? error.message : 'Please try again.', tone: 'error' });
    } finally {
      setProcessingMediaId(null);
    }
  }

  async function replaceMedia(mediaId: string) {
    if (!user || processingMediaId) return;
    setProcessingMediaId(mediaId);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Photo access is needed to replace this image. You can also keep the existing photo.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled) return;

      const prepared = await preparePhoto(result.assets[0].uri);
      const bytes = await readPhotoBytes(prepared.uri);
      await replaceRestaurantReviewImage(user.id, mediaId, bytes);
      await invalidateVisitMedia();
      showToast({ title: 'Photo replaced', message: 'The updated photo is saved to this visit.', tone: 'success' });
    } catch (error) {
      showToast({ title: 'Could not replace photo', message: error instanceof Error ? error.message : 'Please try again.', tone: 'error' });
    } finally {
      setProcessingMediaId(null);
    }
  }

  function confirmDeleteMedia(mediaId: string) {
    Alert.alert('Delete visit photo?', 'This removes the photo from this visit.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void removeMedia(mediaId) },
    ]);
  }

  return (
    <Screen navigation>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mx-auto w-full max-w-[760px] gap-md px-lg pt-sm">
          <View className="gap-sm">
            <Heading level={1}>{data.restaurant.name}</Heading>
            {location ? (
              <View className="flex-row items-center gap-xxs">
                <BrandIcon name="location" size={14} muted />
                <Caption>{location}</Caption>
              </View>
            ) : null}
            <Button
              label="View restaurant"
              variant="outline"
              size="sm"
              onPress={() => router.push({
                pathname: '/restaurant-detail',
                params: { restaurantId: data.restaurant.id },
              })}
            />
          </View>

          {data.media.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-sm">
              {data.media.map((media) => (
                <View key={media.id} className="relative overflow-hidden rounded-xl">
                  {media.url ? media.type === 'video' ? (
                    <VisitVideo uri={media.url} />
                  ) : (
                    <Image
                      source={media.url}
                      contentFit="cover"
                      accessibilityLabel={`${data.restaurant.name} visit photo`}
                      style={{ width: 240, height: 240, borderRadius: 12 }}
                    />
                  ) : (
                    <View className="h-60 w-60 items-center justify-center bg-surface-elevated">
                      <Caption>Photo unavailable</Caption>
                    </View>
                  )}
                  {isOwner ? (
                    <View className="absolute right-xs top-xs flex-row gap-xs">
                      {media.type === 'image' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Replace visit photo"
                          disabled={processingMediaId !== null}
                          onPress={() => void replaceMedia(media.id)}
                          className="h-11 w-11 items-center justify-center rounded-pill bg-black/75">
                          <ImagePlus size={18} color="#FFFFFF" />
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete visit media"
                        disabled={processingMediaId !== null}
                        onPress={() => confirmDeleteMedia(media.id)}
                        className="h-11 w-11 items-center justify-center rounded-pill bg-black/75">
                        {processingMediaId === media.id
                          ? <ActivityIndicator color="#FFFFFF" />
                          : <Trash2 size={18} color="#FFFFFF" />}
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}

          <Surface className="gap-sm p-md" variant="elevated" bordered>
            <View className="flex-row items-center gap-xs">
              <Avatar uri={data.actor.avatarUrl} name={data.actor.displayName} size="sm" />
              <View className="flex-1">
                <BodyText medium>{data.actor.displayName}</BodyText>
                {data.actor.username ? <Caption>@{data.actor.username}</Caption> : null}
              </View>
              <MetadataText>{formatDiaryDate(data.visitedAt)}</MetadataText>
            </View>
            <Rating value={data.overallRating} size="md" />
            <Caption color="textSecondary">
              {recommendation
                ? `${recommendation.emoji} ${recommendation.label}`
                : 'Recommendation unavailable'}
            </Caption>
            {[
              ['Food', data.foodRating],
              ['Service', data.serviceRating],
              ['Atmosphere', data.atmosphereRating],
              ['Value', data.valueRating],
            ].map(([label, value]) =>
              typeof value === 'number' ? (
                <View key={label} className="flex-row items-center justify-between">
                  <Caption>{label}</Caption>
                  <Rating value={value} size="sm" />
                </View>
              ) : null,
            )}
            {[
              data.seatingType ? data.seatingType[0].toUpperCase() + data.seatingType.slice(1) : null,
              data.partySize ? `Party of ${data.partySize}` : null,
              data.spendBand !== null ? `Spend ${'£'.repeat(data.spendBand)}`
                : data.spendAmount !== null ? `Spend ${data.spendAmount}` : null,
            ].filter(Boolean).length > 0 ? (
              <Caption color="textSecondary">
                {[
                  data.seatingType ? data.seatingType[0].toUpperCase() + data.seatingType.slice(1) : null,
                  data.partySize ? `Party of ${data.partySize}` : null,
                  data.spendBand !== null ? `Spend ${'£'.repeat(data.spendBand)}`
                    : data.spendAmount !== null ? `Spend ${data.spendAmount}` : null,
                ].filter(Boolean).join(' · ')}
              </Caption>
            ) : null}
            {data.restaurantComment ? <BodyText>{data.restaurantComment}</BodyText> : null}
          </Surface>

          <View className="gap-sm pt-xs">
            <Heading level={2}>Dishes from this visit</Heading>
            {data.dishes.length === 0 ? (
              <Caption>No dish reviews are available for this visit.</Caption>
            ) : (
              data.dishes.map((dish) => (
                <Surface key={dish.reviewId} className="gap-xs p-sm" bordered>
                  <View className="flex-row items-center justify-between gap-sm">
                    <Pressable
                      onPress={() => router.push({ pathname: '/dish-detail', params: { dishId: dish.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${dish.name}`}>
                      <BodyText medium>{dish.name}</BodyText>
                    </Pressable>
                    <Rating value={dish.rating} size="sm" />
                  </View>
                  {dish.reviewText ? <BodyText color="textSecondary">{dish.reviewText}</BodyText> : null}
                </Surface>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
