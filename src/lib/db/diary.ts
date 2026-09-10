import { supabase } from '@/lib/supabase';
import { formatDiaryDate } from '@/lib/format';
import type { DiaryEntry } from '@/types/models';

/**
 * A diary entry is the user's own record of eating a dish. The rating shown against it is
 * *their* review's rating, which is distinct from the dish's aggregate rating — the same
 * dish can be a 5 for one person and a 2 for another.
 */
const DIARY_SELECT = `
  id,
  eaten_at,
  dish:dishes(id, name, image_url, aggregate_rating, rating_count),
  restaurant:restaurants(id, name),
  review:reviews(rating)
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

  return (data ?? []).flatMap((row) => {
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
        dish: {
          id: row.dish.id,
          name: row.dish.name,
          restaurant: { id: row.restaurant.id, name: row.restaurant.name },
          rating: row.dish.aggregate_rating ?? 0,
          ratingCount: row.dish.rating_count ?? 0,
          imageUrl: row.dish.image_url,
        },
      },
    ];
  });
}
