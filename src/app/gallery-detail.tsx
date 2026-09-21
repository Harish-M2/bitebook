import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { MapPin, Calendar } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { formatRelativeTime } from '@/lib/format';
import { Screen } from '@/components/ui/Screen';
import { Heading, BodyText, Caption } from '@/components/ui/Typography';
import { ErrorState } from '@/components/ui/ErrorState';
import { PhotoGalleryModal } from '@/components/ui/PhotoGalleryModal';
import { getUserGalleryItem } from '@/lib/db/gallery';
import { Rating } from '@/components/ui/Rating';

export default function GalleryDetailScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const [galleryVisible, setGalleryVisible] = useState(false);

  const item = useQuery({
    queryKey: ['gallery-item', reviewId],
    queryFn: () => getUserGalleryItem(reviewId as string),
    enabled: !!reviewId,
  });

  if (!reviewId || item.isLoading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BodyText color="textSecondary">Loading...</BodyText>
        </View>
      </Screen>
    );
  }

  if (item.isError || !item.data) {
    return (
      <Screen>
        <ErrorState
          title="Could not load review"
          description={item.error?.message ?? 'Review not found'}
          onRetry={() => {
            void item.refetch();
          }}
        />
      </Screen>
    );
  }

  const review = item.data;
  const allPhotos = review.allPhotos;

  return (
    <>
      <Screen>
        <FlatList
          data={[1]}
          keyExtractor={() => 'detail'}
          ListHeaderComponent={
            <View className="gap-lg pb-lg">
              <View className="gap-sm">
                <View className="gap-xxs">
                  <BodyText medium>{review.dishName}</BodyText>
                  <View className="flex-row items-center gap-xs">
                    <MapPin size={14} color={colors.textSecondary} />
                    <Caption>{review.restaurantName}</Caption>
                  </View>
                </View>

                {review.rating !== null && review.rating !== undefined && (
                  <View className="flex-row items-center gap-sm">
                    <Rating value={review.rating} size="sm" />
                    <Caption color="textSecondary">{review.rating.toFixed(1)}</Caption>
                  </View>
                )}

                <View className="flex-row items-center gap-xs">
                  <Calendar size={14} color={colors.textSecondary} />
                  <Caption color="textSecondary">
                    {formatRelativeTime(review.createdAt)}
                  </Caption>
                </View>
              </View>

              {allPhotos.length > 0 && (
                <View className="gap-sm">
                  <Heading level={3}>Photos ({allPhotos.length})</Heading>
                  <Pressable
                    onPress={() => setGalleryVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="View photos">
                    <Image
                      source={review.photoUrl}
                      style={{
                        width: '100%',
                        height: 300,
                        borderRadius: 12,
                        backgroundColor: colors.surfaceElevated,
                      }}
                      contentFit="cover"
                    />
                  </Pressable>
                  {allPhotos.length > 1 && (
                    <Caption color="textSecondary">
                      Tap to view all {allPhotos.length} photos
                    </Caption>
                  )}
                </View>
              )}
            </View>
          }
          renderItem={() => null}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        />
      </Screen>

      <PhotoGalleryModal
        visible={galleryVisible}
        photos={allPhotos.map((url) => ({ url }))}
        onClose={() => setGalleryVisible(false)}
        title={review.dishName}
      />
    </>
  );
}
