import { supabase } from '@/lib/supabase';

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  restaurant_id: string | null;
  review_id: string | null;
  description: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  restaurant?: {
    id: string;
    name: string;
  };
  review?: {
    id: string;
    rating: number;
  };
}

/**
 * Log an activity for a user
 * Note: This should be called from the server-side only (via Edge Function or trigger)
 */
export async function logActivity(
  userId: string,
  activityType: string,
  description?: string,
  restaurantId?: string | null,
  reviewId?: string | null
) {
  const { error } = await (supabase
    .from("activity" as any)
    .insert({
      user_id: userId,
      activity_type: activityType,
      description: description || null,
      restaurant_id: restaurantId || null,
      review_id: reviewId || null,
    }) as any);

  if (error) {
    console.error('[Bitebook] Failed to log activity:', error);
    throw error;
  }
}

/**
 * Get activity for users being followed by the current user
 */
export async function getActivityFeed(
  limit: number = 50,
  offset: number = 0
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) {
    return [];
  }

  // Get list of users being followed
  const { data: following, error: followError } = await (supabase
    .from("following" as any)
    .select('following_id')
    .eq('follower_id', user.user.id) as any);

  if (followError) {
    console.error('[Bitebook] Failed to fetch following list:', followError);
    return [];
  }

  if (!following || following.length === 0) {
    return [];
  }

  const followingIds = following.map((f: any) => f.following_id);

  // Get activity from followed users
  const { data, error } = await (supabase
    .from("activity" as any)
    .select(
      `
        *,
        user:profiles(id, full_name, avatar_url),
        restaurant:restaurants(id, name),
        review:reviews(id, rating)
      `
    )
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1) as any);

  if (error) {
    console.error('[Bitebook] Failed to fetch activity feed:', error);
    throw error;
  }

  return (data || []) as Activity[];
}

/**
 * Get activity for a specific user
 */
export async function getUserActivity(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const { data, error } = await (supabase
    .from("activity" as any)
    .select(
      `
        *,
        user:profiles(id, full_name, avatar_url),
        restaurant:restaurants(id, name),
        review:reviews(id, rating)
      `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1) as any);

  if (error) {
    console.error('[Bitebook] Failed to fetch user activity:', error);
    throw error;
  }

  return (data || []) as Activity[];
}

/**
 * Get activity for a specific restaurant
 */
export async function getRestaurantActivity(
  restaurantId: string,
  limit: number = 50,
  offset: number = 0
) {
  const { data, error } = await (supabase
    .from("activity" as any)
    .select(
      `
        *,
        user:profiles(id, full_name, avatar_url),
        restaurant:restaurants(id, name),
        review:reviews(id, rating)
      `
    )
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1) as any);

  if (error) {
    console.error('[Bitebook] Failed to fetch restaurant activity:', error);
    throw error;
  }

  return (data || []) as Activity[];
}

/**
 * Format activity description for display
 */
export function formatActivityDescription(activity: Activity): string {
  const userName = activity.user?.full_name || 'Someone';

  switch (activity.activity_type) {
    case 'new_review':
      if (activity.review?.rating) {
        const stars = '⭐'.repeat(activity.review.rating);
        return `${userName} reviewed "${activity.restaurant?.name || 'a restaurant'}" ${stars}`;
      }
      return `${userName} reviewed "${activity.restaurant?.name || 'a restaurant'}"`;

    case 'new_restaurant':
      return `${userName} added "${activity.restaurant?.name || 'a new restaurant'}"`;

    case 'follow':
      return `${userName} joined the community`;

    default:
      return activity.description || `${userName} did something`;
  }
}

/**
 * Get activity count for a user
 */
export async function getUserActivityCount(userId: string): Promise<number> {
  const { data, error } = await (supabase
    .from("activity" as any)
    .select('id', { count: 'exact' })
    .eq('user_id', userId) as any);

  if (error) {
    console.error('[Bitebook] Failed to fetch activity count:', error);
    return 0;
  }

  return data?.length || 0;
}
