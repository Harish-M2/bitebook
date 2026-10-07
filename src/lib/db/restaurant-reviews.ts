import { signedImageUrls } from '@/lib/db/storage';
import { supabase } from '@/lib/supabase';
import type { RestaurantVisit } from '@/types/models';

type VisitParent = {
  id: string;
  user_id: string;
  restaurant_id: string;
  overall_rating: number;
  recommendation_tier: number;
  restaurant_comment: string | null;
  visited_at: string;
  created_at: string;
};

async function enrichVisitParents(parents: VisitParent[]): Promise<RestaurantVisit[]> {
  if (parents.length === 0) return [];

  const restaurantIds = [...new Set(parents.map((parent) => parent.restaurant_id))];
  const userIds = [...new Set(parents.map((parent) => parent.user_id))];
  const visitIds = parents.map((parent) => parent.id);

  const [restaurantsResult, profilesResult, reviewsResult, mediaResult] = await Promise.all([
    supabase
      .from('restaurants')
      .select('id, name, city, price_level, image_url')
      .in('id', restaurantIds),
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds),
    supabase
      .from('reviews')
      .select('id, restaurant_review_id, dish_id, rating, review_text, dish:dishes!reviews_dish_id_fkey(id, name)')
      .in('restaurant_review_id', visitIds)
      .order('created_at', { ascending: true }),
    supabase
      .from('restaurant_review_media')
      .select('id, restaurant_review_id, dish_review_id, media_type, position, storage_path')
      .in('restaurant_review_id', visitIds)
      .order('position', { ascending: true }),
  ]);

  if (restaurantsResult.error) throw restaurantsResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  if (mediaResult.error) throw mediaResult.error;

  const restaurants = new Map((restaurantsResult.data ?? []).map((row) => [row.id, row]));
  const profiles = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  const reviewsByVisit = new Map<string, typeof reviewsResult.data>();
  for (const review of reviewsResult.data ?? []) {
    if (!review.restaurant_review_id) continue;
    const reviews = reviewsByVisit.get(review.restaurant_review_id) ?? [];
    reviews.push(review);
    reviewsByVisit.set(review.restaurant_review_id, reviews);
  }

  const mediaRows = mediaResult.data ?? [];
  const signedUrls = await signedImageUrls(
    'review-photos',
    mediaRows.map((media) => media.storage_path),
  );
  const mediaByVisit = new Map<string, typeof mediaRows>();
  for (const media of mediaRows) {
    const rows = mediaByVisit.get(media.restaurant_review_id) ?? [];
    rows.push(media);
    mediaByVisit.set(media.restaurant_review_id, rows);
  }

  return parents.flatMap((parent) => {
    const restaurant = restaurants.get(parent.restaurant_id);
    const profile = profiles.get(parent.user_id);
    if (!restaurant || !profile) return [];

    const media = (mediaByVisit.get(parent.id) ?? []).map((item) => ({
      id: item.id,
      dishReviewId: item.dish_review_id,
      type: item.media_type === 'video' ? 'video' as const : 'image' as const,
      position: item.position,
      url: signedUrls.get(item.storage_path) ?? null,
    }));
    const firstMedia = media.find((item) => item.type === 'image' && item.url);
    const dishes = (reviewsByVisit.get(parent.id) ?? []).flatMap((review) => {
      if (!review.dish) return [];
      return [{
        id: review.dish_id,
        reviewId: review.id,
        name: review.dish.name,
        rating: review.rating,
        reviewText: review.review_text,
      }];
    });

    return [{
      id: parent.id,
      userId: parent.user_id,
      createdAt: parent.created_at,
      visitedAt: parent.visited_at,
      overallRating: parent.overall_rating,
      recommendationTier: parent.recommendation_tier,
      restaurantComment: parent.restaurant_comment,
      actor: {
        id: profile.id,
        username: profile.username ?? '',
        displayName: profile.display_name ?? profile.username ?? 'Bitebook user',
        avatarUrl: profile.avatar_url,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        priceLevel: restaurant.price_level,
        imageUrl: restaurant.image_url,
      },
      dishes,
      media,
      photoUrl: firstMedia?.url ?? restaurant.image_url,
    }];
  });
}

export async function listRestaurantVisitSummaries(
  userIds: string[],
  limit = 30,
): Promise<RestaurantVisit[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('id, user_id, restaurant_id, overall_rating, recommendation_tier, restaurant_comment, visited_at, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return enrichVisitParents(data ?? []);
}

export async function listRestaurantVisitsForRestaurant(
  restaurantId: string,
  limit = 20,
): Promise<RestaurantVisit[]> {
  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('id, user_id, restaurant_id, overall_rating, recommendation_tier, restaurant_comment, visited_at, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return enrichVisitParents(data ?? []);
}

export async function getRestaurantVisitSummary(
  restaurantReviewId: string,
): Promise<RestaurantVisit | null> {
  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('id, user_id, restaurant_id, overall_rating, recommendation_tier, restaurant_comment, visited_at, created_at')
    .eq('id', restaurantReviewId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [visit] = await enrichVisitParents([data]);
  return visit ?? null;
}
