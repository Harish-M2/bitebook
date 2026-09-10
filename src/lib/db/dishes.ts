import { supabase } from '@/lib/supabase';

/**
 * Dishes already known at a restaurant.
 *
 * The log flow offers these before letting the user type a new name, because the schema
 * deduplicates on `(restaurant_id, normalized_name)` and a near-miss spelling
 * ("Black dhal") creates a genuinely separate dish that then splits the ratings.
 */
export interface RestaurantDish {
  id: string;
  name: string;
  /** Null until at least one person has rated it. */
  rating: number | null;
  ratingCount: number;
  imageUrl: string | null;
}

export async function listDishesForRestaurant(
  restaurantId: string,
): Promise<RestaurantDish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('id, name, aggregate_rating, rating_count, image_url')
    .eq('restaurant_id', restaurantId)
    // Best-known first: a dish several people have rated is the more likely match.
    .order('rating_count', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    rating: row.aggregate_rating,
    ratingCount: row.rating_count ?? 0,
    name: row.name,
    imageUrl: row.image_url,
  }));
}
