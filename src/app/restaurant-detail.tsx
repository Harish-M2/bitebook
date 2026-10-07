import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Share2 } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { FeedItem } from '@/components/feed/FeedItem';
import { ReviewList } from '@/components/reviews';
import { SaveButton } from '@/components/social/SaveButton';
import { VisitedButton } from '@/components/social/VisitedButton';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Rating } from '@/components/ui/Rating';
import { Screen } from '@/components/ui/Screen';
import { BodyText, Caption, Heading } from '@/components/ui/Typography';
import { colors } from '@/constants/colors';
import { listDishesForRestaurant } from '@/lib/db/dishes';
import { toRestaurantVisitFeedActivity } from '@/lib/db/feed';
import { listRestaurantVisitsForRestaurant } from '@/lib/db/restaurant-reviews';
import { getRestaurant, getRestaurantPhotos } from '@/lib/db/restaurants';
import { formatPriceLevel } from '@/lib/format';

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();

  const restaurant = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => getRestaurant(restaurantId!),
    enabled: Boolean(restaurantId),
  });
  const dishes = useQuery({
    queryKey: ['restaurant-dishes', restaurantId],
    queryFn: () => listDishesForRestaurant(restaurantId!),
    enabled: Boolean(restaurantId),
  });
  const photos = useQuery({
    queryKey: ['restaurant-photos', restaurantId],
    queryFn: () => getRestaurantPhotos(restaurantId!),
    enabled: Boolean(restaurantId),
  });
  const visits = useQuery({
    queryKey: ['restaurant-visits-by-restaurant', restaurantId],
    queryFn: () => listRestaurantVisitsForRestaurant(restaurantId!),
    enabled: Boolean(restaurantId),
  });

  if (restaurant.isPending) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (restaurant.isError || !restaurant.data || !restaurantId) {
    return (
      <Screen>
        <ErrorState
          title="Could not load this restaurant"
          description={restaurant.error?.message ?? 'Restaurant not found.'}
          onRetry={() => void restaurant.refetch()}
        />
      </Screen>
    );
  }

  const data = restaurant.data;
  const cuisine = data.restaurant_cuisines[0]?.cuisine?.name;
  const heroImage = photos.data?.[0] ?? data.image_url ?? undefined;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ width: '100%', maxWidth: 980, alignSelf: 'center' }}>
          <Image
            source={heroImage}
            accessibilityLabel={data.name}
            style={{ width: '100%', height: 320, backgroundColor: colors.surfaceElevated, borderRadius: 24 }}
            contentFit="cover"
          />
          <View className="gap-lg px-lg pt-lg">
            <View className="gap-xs">
              <Heading level={1}>{data.name}</Heading>
              <View className="flex-row items-center gap-xs">
                <MapPin size={15} color={colors.textSecondary} />
                <Caption>{[cuisine, formatPriceLevel(data.price_level), data.city].filter(Boolean).join(' · ')}</Caption>
              </View>
              {data.address ? <Caption color="textSecondary">{data.address}</Caption> : null}
            </View>

            <View className="flex-row items-center gap-sm">
              <SaveButton restaurantId={data.id} showLabel />
              <Pressable
                className="h-[40px] w-[40px] items-center justify-center rounded-md border border-border"
                accessibilityRole="button"
                accessibilityLabel="Share restaurant">
                <Share2 size={18} color={colors.textPrimary} />
              </Pressable>
              <Button label="Log a dish" onPress={() => router.push('/(tabs)/log')} />
            </View>
            <View className="flex-row">
              <VisitedButton restaurantId={data.id} />
            </View>

            <View className="gap-md">
              <Heading level={2}>Popular dishes</Heading>
              {dishes.isPending ? (
                <ActivityIndicator color={colors.accent} />
              ) : dishes.data && dishes.data.length > 0 ? (
                dishes.data.slice(0, 6).map((dish) => (
                  <Pressable
                    key={dish.id}
                    className="flex-row items-center justify-between border-b border-border py-sm"
                    onPress={() => router.push({ pathname: '/dish-detail', params: { dishId: dish.id } })}
                    accessibilityRole="button">
                    <View className="flex-1 gap-xxs">
                      <BodyText medium>{dish.name}</BodyText>
                      {dish.rating !== null ? <Rating value={dish.rating} size="sm" count={`${dish.ratingCount}`} /> : <Caption>No ratings yet</Caption>}
                    </View>
                  </Pressable>
                ))
              ) : (
                <Caption>No dishes have been logged here yet.</Caption>
              )}
            </View>

            <View className="gap-md">
              <Heading level={2}>Recent visits</Heading>
              {visits.isPending ? (
                <ActivityIndicator color={colors.accent} />
              ) : visits.isError ? (
                <Caption color="textSecondary">Could not load restaurant visits.</Caption>
              ) : visits.data.length > 0 ? (
                <View className="gap-md">
                  {visits.data.map((visit) => (
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
                <Caption>No restaurant visits have been shared yet.</Caption>
              )}
            </View>

            <View className="gap-md">
              <Heading level={2}>Dish reviews</Heading>
              <ReviewList restaurantId={data.id} />
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
