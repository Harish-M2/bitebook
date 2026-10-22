import { publicImageUrl, signedImageUrls } from '@/lib/db/storage';
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

  return publicImageUrl('dish-photos', first?.storage_path ?? null)
    ?? publicImageUrl('dish-photos', fallbackImageUrl);
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

export function sameDishSelection(first: { id: string | null; name: string }, second: { id: string | null; name: string }): boolean {
  return first.id && second.id ? first.id === second.id
    : first.name.trim().toLowerCase() === second.name.trim().toLowerCase();
}

export async function findOrCreateVisitDish(
  userId: string,
  restaurantId: string,
  dish: { id?: string | null; name: string; category?: string | null; dietaryTags?: string[] },
): Promise<string> {
  if (dish.id) return dish.id;
  const name = dish.name.trim();
  if (!name) throw new Error('Enter a dish name.');
  const find = () => supabase.from('dishes').select('id')
    .eq('restaurant_id', restaurantId).eq('normalized_name', name.toLowerCase()).maybeSingle();
  const existing = await find();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;
  const created = await supabase.from('dishes').insert({
    restaurant_id: restaurantId, name, created_by_profile_id: userId,
    category: dish.category ?? null, dietary_tags: dish.dietaryTags ?? [],
  }).select('id').single();
  if (!created.error) return created.data.id;
  if (created.error.code === '23505') {
    const raced = await find();
    if (raced.error) throw raced.error;
    if (raced.data) return raced.data.id;
  }
  throw created.error;
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

export async function getDish(dishId: string, userId?: string): Promise<DishDetail> {
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

  let personalImageUrl: string | null = null;
  if (userId) {
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        photos:review_photos(storage_path, position),
        visit_media:restaurant_review_media!restaurant_review_media_dish_review_fk(storage_path, position, media_type)
      `)
      .eq('dish_id', dishId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (reviewsError) {
      console.warn('[Bitebook] Could not load personal dish photos:', reviewsError);
    } else {
      const paths = (reviews ?? []).flatMap((review) => [
        ...[...(review.visit_media ?? [])]
          .filter((media) => media.media_type === 'image')
          .sort((first, second) => (first.position ?? 0) - (second.position ?? 0))
          .map((media) => media.storage_path),
        ...[...(review.photos ?? [])]
          .sort((first, second) => (first.position ?? 0) - (second.position ?? 0))
          .map((photo) => photo.storage_path),
      ]);
      const signed = await signedImageUrls('review-photos', paths);
      personalImageUrl = paths.map((path) => signed.get(path)).find(Boolean) ?? null;
    }
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    rating: data.aggregate_rating,
    ratingCount: data.rating_count ?? 0,
    imageUrl: personalImageUrl ?? dishCoverUrl(data.dish_photos, data.image_url),
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
