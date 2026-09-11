import { supabase } from '@/lib/supabase';
import { formatPriceLevel, formatRelativeTime } from '@/lib/format';
import { signedImageUrls } from '@/lib/db/storage';
import { DISH_PHOTO_SELECT, dishCoverUrl } from '@/lib/db/dishes';
import type { FeedActivity } from '@/types/models';

/**
 * Row visibility is enforced by RLS (`can_view_review()` in 0019_rls.sql), so this query
 * deliberately does not filter on `visibility` itself — duplicating that rule in the client
 * would create two places for it to drift.
 */
const FEED_SELECT = `
  id,
  rating,
  review_text,
  created_at,
  like_count,
  comment_count,
  author:profiles(id, username, display_name, avatar_url),
  dish:dishes(id, name, image_url, aggregate_rating, rating_count, ${DISH_PHOTO_SELECT}),
  restaurant:restaurants(id, name, city, price_level, image_url),
  photos:review_photos(storage_path, position)
`;

const FEED_PAGE_SIZE = 30;

/**
 * The home feed: reviews written by the people this user follows.
 *
 * Returns an empty array when the user follows nobody — that is the normal state for a new
 * account, not an error, and the screen renders its empty state for it.
 */
export async function listFeed(userId: string): Promise<FeedActivity[]> {
  const { data: following, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (followsError) {
    throw followsError;
  }

  const followeeIds = (following ?? []).map((row) => row.following_id);
  if (followeeIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(FEED_SELECT)
    .in('user_id', followeeIds)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  // `review-photos` is a private bucket, so paths must be signed. Done in one batch for the
  // whole page rather than per row.
  const firstPhotoPath = new Map<string, string>();
  for (const row of rows) {
    const photos = [...(row.photos ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    if (photos[0]?.storage_path) {
      firstPhotoPath.set(row.id, photos[0].storage_path);
    }
  }
  const signed = await signedImageUrls('review-photos', [...firstPhotoPath.values()]);

  return rows.flatMap((row) => {
    // Every review belongs to an author; a null here means the profile was not visible, in
    // which case there is nothing meaningful to render.
    if (!row.author) {
      return [];
    }

    const path = firstPhotoPath.get(row.id);
    const reviewPhoto = path ? (signed.get(path) ?? null) : null;
    const isDish = row.dish !== null;

    return [
      {
        id: row.id,
        actor: {
          id: row.author.id,
          username: row.author.username ?? '',
          displayName: row.author.display_name ?? row.author.username ?? 'Someone',
          avatarUrl: row.author.avatar_url,
        },
        kind: isDish ? ('logged_dish' as const) : ('reviewed_restaurant' as const),
        dish:
          row.dish && row.restaurant
            ? {
                id: row.dish.id,
                name: row.dish.name,
                restaurant: { id: row.restaurant.id, name: row.restaurant.name },
                rating: row.dish.aggregate_rating ?? 0,
                ratingCount: row.dish.rating_count ?? 0,
                imageUrl: dishCoverUrl(row.dish.dish_photos, row.dish.image_url),
              }
            : undefined,
        restaurant: row.restaurant
          ? {
              id: row.restaurant.id,
              name: row.restaurant.name,
              cuisine: '',
              priceLevel: formatPriceLevel(row.restaurant.price_level),
              city: row.restaurant.city ?? '',
              rating: row.rating ?? 0,
              reviewCount: 0,
              imageUrl: row.restaurant.image_url,
            }
          : undefined,
        reviewText: row.review_text ?? undefined,
        // Falls back to the subject's own image so a text-only review still renders.
        photoUrl:
          reviewPhoto ??
          dishCoverUrl(row.dish?.dish_photos, row.dish?.image_url ?? null) ??
          row.restaurant?.image_url ??
          null,
        postedAgo: formatRelativeTime(row.created_at),
        likeCount: row.like_count ?? 0,
        commentCount: row.comment_count ?? 0,
      },
    ];
  });
}
