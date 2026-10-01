import { publicImageUrl } from '@/lib/db/storage';
import { supabase } from '@/lib/supabase';

/** Shape of the embedded `dish_photos` rows every dish query selects. */
export interface DishPhotoRow {
  storage_path: string;
  position: number | null;
  created_at: string;
}

export const DISH_PHOTO_SELECT = 'dish_photos(storage_path, position, created_at)';

/**
 * The dish's cover image.
 *
 * `dishes.image_url` is left null by the log flow and nothing else writes it, so the cover
 * is derived from `dish_photos` instead. Deriving it rather than denormalising avoids giving
 * clients an UPDATE policy on `dishes` — which would let anyone overwrite any dish's name or
 * picture — and means the cover can never disagree with the gallery it came from.
 *
 * Earliest photo wins (`position`, then `created_at`), so a later contributor cannot quietly
 * replace the image everyone already recognises.
 */
export function dishCoverUrl(
  photos: DishPhotoRow[] | null | undefined,
  fallbackImageUrl: string | null,
): string | null {
  const first = [...(photos ?? [])].sort(
    (a, b) =>
      (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at),
  )[0];

  return publicImageUrl('dish-photos', first?.storage_path ?? null) ?? fallbackImageUrl;
}

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

export interface DishDetail {
  id: string;
  name: string;
  description: string | null;
  rating: number | null;
  ratingCount: number;
  imageUrl: string | null;
  restaurant: { id: string; name: string; imageUrl: string | null };
}

export async function getDish(dishId: string): Promise<DishDetail> {
  const { data, error } = await supabase
    .from('dishes')
    .select(`
      id,
      name,
      description,
      aggregate_rating,
      rating_count,
      image_url,
      ${DISH_PHOTO_SELECT},
      restaurant:restaurants(id, name, image_url)
    `)
    .eq('id', dishId)
    .single();

  if (error) throw error;
  if (!data.restaurant) throw new Error('Dish restaurant not found.');

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    rating: data.aggregate_rating,
    ratingCount: data.rating_count ?? 0,
    imageUrl: dishCoverUrl(data.dish_photos, data.image_url),
    restaurant: {
      id: data.restaurant.id,
      name: data.restaurant.name,
      imageUrl: data.restaurant.image_url,
    },
  };
}

export async function listDishesForRestaurant(
  restaurantId: string,
): Promise<RestaurantDish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select(`id, name, aggregate_rating, rating_count, image_url, ${DISH_PHOTO_SELECT}`)
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
    imageUrl: dishCoverUrl(row.dish_photos, row.image_url),
  }));
}
