import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Rating } from '@/components/ui/Rating';
import { Screen } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { BodyText, Caption, Heading, MetadataText } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { RESTAURANT_RECOMMENDATIONS } from '@/constants/recommendations';
import { useAppTheme } from '@/hooks/useTheme';
import { getRestaurantVisitSummary } from '@/lib/db/restaurant-reviews';
import { formatPriceLevel } from '@/lib/format';

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
  const router = useRouter();
  const { restaurantReviewId } = useLocalSearchParams<{ restaurantReviewId: string }>();
  const { colors: palette } = useAppTheme();

  const visit = useQuery({
    queryKey: ['restaurant-review', restaurantReviewId],
    queryFn: () => getRestaurantVisitSummary(restaurantReviewId),
    enabled: Boolean(restaurantReviewId),
  });

  if (visit.isPending) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.accent} />
        </View>
      </Screen>
    );
  }

  if (visit.isError) {
    return (
      <Screen>
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
      <Screen>
        <View className="flex-1 gap-md px-lg pt-md">
          <BackButton onPress={() => router.back()} />
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mx-auto w-full max-w-[760px] gap-md px-lg pt-sm">
          <BackButton onPress={() => router.back()} />

          <View className="gap-sm">
            <Heading level={1}>{data.restaurant.name}</Heading>
            {location ? (
              <View className="flex-row items-center gap-xxs">
                <MapPin size={14} color={colors.textMuted} />
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
              {data.media.map((media) => media.url ? (
                <View key={media.id} className="overflow-hidden rounded-xl">
                  {media.type === 'video' ? (
                    <VisitVideo uri={media.url} />
                  ) : (
                    <Image
                      source={media.url}
                      contentFit="cover"
                      accessibilityLabel={`${data.restaurant.name} visit photo`}
                      style={{ width: 240, height: 240, borderRadius: 12 }}
                    />
                  )}
                </View>
              ) : null)}
            </ScrollView>
          ) : null}

          <Surface className="gap-sm p-md" variant="elevated" bordered>
            <View className="flex-row items-center gap-xs">
              <Avatar uri={data.actor.avatarUrl} name={data.actor.displayName} size="sm" />
              <View className="flex-1">
                <BodyText medium>{data.actor.displayName}</BodyText>
                {data.actor.username ? <Caption>@{data.actor.username}</Caption> : null}
              </View>
              <MetadataText>{data.visitedAt}</MetadataText>
            </View>
            <Rating value={data.overallRating} size="md" />
            <Caption color="textSecondary">
              {recommendation
                ? `${recommendation.emoji} ${recommendation.label}`
                : 'Recommendation unavailable'}
            </Caption>
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

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="h-9 w-9 items-center justify-center rounded-full border border-border">
      <ArrowLeft size={18} color={colors.textPrimary} />
    </Pressable>
  );
}
