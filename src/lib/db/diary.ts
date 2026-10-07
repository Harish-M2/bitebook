import { DISH_PHOTO_SELECT, dishCoverUrl } from '@/lib/db/dishes';
import { signedImageUrls } from '@/lib/db/storage';
import { formatDiaryDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { DiaryEntry } from '@/types/models';

/**
 * A diary entry is the user's own record of eating a dish. The rating shown against it is
 * *their* review's rating, which is distinct from the dish's aggregate rating — the same
 * dish can be a 5 for one person and a 2 for another.
 */
const DIARY_SELECT = `
  id,
  eaten_at,
  dish:dishes(id, name, image_url, aggregate_rating, rating_count, ${DISH_PHOTO_SELECT}),
  restaurant:restaurants(id, name),
  review:reviews(rating, restaurant_review_id, photos:review_photos(storage_path, position))
`;

export async function listDiaryEntries(userId: string): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from('diary_entries')
    .select(DIARY_SELECT)
    .eq('user_id', userId)
    .order('eaten_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  // The user's own photo of the dish is the point of the diary, so it takes precedence over
  // the generic dish image. `review-photos` is private, so paths must be signed — batched
  // for the whole page rather than one request per entry.
  const photoPathByEntry = new Map<string, string>();
  for (const row of rows) {
    const photos = [...(row.review?.photos ?? [])].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );
    if (photos[0]?.storage_path) {
      photoPathByEntry.set(row.id, photos[0].storage_path);
    }
  }
  const signed = await signedImageUrls('review-photos', [...photoPathByEntry.values()]);

  return rows.flatMap((row) => {
    // A diary entry without its dish or restaurant cannot be rendered. This should be
    // impossible (both are non-null FKs) but dropping the row beats crashing the screen.
    if (!row.dish || !row.restaurant) {
      return [];
    }

    return [
      {
        id: row.id,
        dateLabel: formatDiaryDate(row.eaten_at),
        rating: row.review?.rating ?? 0,
        restaurantReviewId: row.review?.restaurant_review_id ?? null,
        dish: {
          id: row.dish.id,
          name: row.dish.name,
          restaurant: { id: row.restaurant.id, name: row.restaurant.name },
          rating: row.dish.aggregate_rating ?? 0,
          ratingCount: row.dish.rating_count ?? 0,
          imageUrl:
            signed.get(photoPathByEntry.get(row.id) ?? '') ??
            dishCoverUrl(row.dish.dish_photos, row.dish.image_url),
        },
      },
    ];
  });
}
