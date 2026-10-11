import { signedImageUrls } from '@/lib/db/storage';
import { supabase } from '@/lib/supabase';
import type { RestaurantVisit } from '@/types/models';

const VISIT_COLUMNS =
  'id, user_id, restaurant_id, overall_rating, recommendation_tier, restaurant_comment, visited_at, created_at, food_rating, service_rating, atmosphere_rating, value_rating, spend_amount, party_size, seating_type' as const;

type VisitParent = {
  id: string;
  user_id: string;
  restaurant_id: string;
  overall_rating: number;
  recommendation_tier: number;
  restaurant_comment: string | null;
  visited_at: string;
  created_at: string;
  food_rating: number | null;
  service_rating: number | null;
  atmosphere_rating: number | null;
  value_rating: number | null;
  spend_amount: number | null;
  party_size: number | null;
  seating_type: string | null;
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
      foodRating: parent.food_rating,
      serviceRating: parent.service_rating,
      atmosphereRating: parent.atmosphere_rating,
      valueRating: parent.value_rating,
      spendAmount: parent.spend_amount,
      partySize: parent.party_size,
      seatingType: parent.seating_type,
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
    .select(VISIT_COLUMNS)
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
    .select(VISIT_COLUMNS)
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
    .select(VISIT_COLUMNS)
    .eq('id', restaurantReviewId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [visit] = await enrichVisitParents([data]);
  return visit ?? null;
}

export type RecentlyReviewedRestaurant = {
  id: string;
  name: string;
  city: string | null;
  imageUrl: string | null;
  lastReviewedAt: string;
};

/**
 * Restaurants ordered by their most recent visible review. Reads through
 * `restaurant_reviews`, so RLS (`can_view_review`) decides what counts: a private visit
 * never surfaces its restaurant here for anyone but its author.
 */
export async function listRecentlyReviewedRestaurants(
  limit = 10,
): Promise<RecentlyReviewedRestaurant[]> {
  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('created_at, restaurant:restaurants(id, name, city, image_url)')
    .order('created_at', { ascending: false })
    .limit(limit * 4);

  if (error) throw error;

  const seen = new Set<string>();
  const result: RecentlyReviewedRestaurant[] = [];
  for (const row of data ?? []) {
    const restaurant = row.restaurant;
    if (!restaurant || seen.has(restaurant.id)) continue;
    seen.add(restaurant.id);
    result.push({
      id: restaurant.id,
      name: restaurant.name,
      city: restaurant.city,
      imageUrl: restaurant.image_url,
      lastReviewedAt: row.created_at,
    });
    if (result.length === limit) break;
  }
  return result;
}

export type FriendRecommendation = {
  restaurantId: string;
  name: string;
  city: string | null;
  /** Highest recommendation tier any followed person gave (1-5). */
  topTier: number;
  friendNames: string[];
};

/**
 * Restaurants that people the user follows rated 4 ("Worth a visit") or 5 ("Must try").
 * "Friends" is the follow graph for now: there is no mutual-friend concept in the schema.
 * Visibility is enforced by RLS on `restaurant_reviews`, not here.
 */
export async function listFriendRecommendations(
  followingIds: string[],
  limit = 10,
): Promise<FriendRecommendation[]> {
  if (followingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select(
      'recommendation_tier, created_at, restaurant:restaurants(id, name, city), author:profiles!restaurant_reviews_user_id_fkey(display_name, username)',
    )
    .in('user_id', followingIds)
    .gte('recommendation_tier', 4)
    .order('created_at', { ascending: false })
    .limit(limit * 5);

  if (error) throw error;

  const byRestaurant = new Map<string, FriendRecommendation>();
  for (const row of data ?? []) {
    const restaurant = row.restaurant;
    if (!restaurant) continue;
    const who = row.author?.display_name ?? row.author?.username ?? 'Someone you follow';
    const existing = byRestaurant.get(restaurant.id);
    if (existing) {
      existing.topTier = Math.max(existing.topTier, row.recommendation_tier);
      if (!existing.friendNames.includes(who)) existing.friendNames.push(who);
    } else {
      byRestaurant.set(restaurant.id, {
        restaurantId: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        topTier: row.recommendation_tier,
        friendNames: [who],
      });
    }
  }
  return [...byRestaurant.values()].slice(0, limit);
}

export type RestaurantRatingStat = { average: number; count: number };

/**
 * Average overall rating and review count per restaurant, from the reviews the viewer can
 * see (RLS). Restaurants carry no stored aggregate, so Discover ranks from this.
 */
export async function listRestaurantRatingStats(): Promise<Map<string, RestaurantRatingStat>> {
  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('restaurant_id, overall_rating')
    .limit(2000);
  if (error) throw error;

  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const entry = totals.get(row.restaurant_id) ?? { sum: 0, count: 0 };
    entry.sum += Number(row.overall_rating);
    entry.count += 1;
    totals.set(row.restaurant_id, entry);
  }
  const stats = new Map<string, RestaurantRatingStat>();
  for (const [id, { sum, count }] of totals) stats.set(id, { average: sum / count, count });
  return stats;
}
