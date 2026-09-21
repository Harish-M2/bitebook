import { supabase } from '@/lib/supabase';
import { DISH_PHOTO_SELECT } from '@/lib/db/dishes';
import { signedImageUrls } from '@/lib/db/storage';

/**
 * Gallery item represents a single review with photos from a user's dishes.
 * Includes all info needed to display in grid and detail view.
 */
export interface UserGalleryItem {
  reviewId: string;
  dishId: string;
  dishName: string;
  restaurantName: string;
  restaurantId: string;
  rating: number | null;
  photoUrl: string | null;
  createdAt: string;
  allPhotos: string[];
}

const GALLERY_SELECT = `
  id,
  rating,
  created_at,
  dish:dishes(id, name, image_url, ${DISH_PHOTO_SELECT}),
  restaurant:restaurants(id, name),
  photos:review_photos(storage_path, position, created_at)
`;

/**
 * Fetch all reviews with photos for the current user, suitable for gallery grid display.
 * Returns most recent reviews first. Limited to last 50 reviews.
 */
export async function getUserGallery(userId: string): Promise<UserGalleryItem[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(GALLERY_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  const items = (data ?? [])
    .filter((row) => {
      // Only include reviews that have at least one review photo
      return (row.photos ?? []).length > 0 && row.dish;
    });

  // Batch sign all photo URLs at once
  const allPaths: string[] = [];
  const pathToItem = new Map<string, (typeof items)[0]>();
  for (const item of items) {
    for (const photo of item.photos ?? []) {
      allPaths.push(photo.storage_path);
      pathToItem.set(photo.storage_path, item);
    }
  }

  const signedUrls = await signedImageUrls('review-photos', allPaths);

  return items.map((row) => {
    const reviewPhotos = row.photos ?? [];
    // Sort photos by position then creation time
    const sortedPhotos = [...reviewPhotos].sort(
      (a, b) =>
        (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at),
    );

    const photoUrls = sortedPhotos
      .map((photo) => signedUrls.get(photo.storage_path))
      .filter((url): url is string => url !== undefined);

    return {
      reviewId: row.id,
      dishId: row.dish.id,
      dishName: row.dish.name,
      restaurantId: row.restaurant.id,
      restaurantName: row.restaurant.name,
      rating: row.rating,
      photoUrl: photoUrls[0] ?? null,
      createdAt: row.created_at,
      allPhotos: photoUrls,
    };
  });
}

/**
 * Fetch a single review with all its photos and details for the detail view.
 */
export async function getUserGalleryItem(reviewId: string): Promise<UserGalleryItem | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select(GALLERY_SELECT)
    .eq('id', reviewId)
    .single();

  if (error) {
    console.warn(`[Bitebook] Failed to fetch review ${reviewId}:`, error);
    return null;
  }

  if (!data || !data.dish) {
    return null;
  }

  const reviewPhotos = data.photos ?? [];
  const sortedPhotos = [...reviewPhotos].sort(
    (a, b) =>
      (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at),
  );

  const storagePaths = sortedPhotos.map((photo) => photo.storage_path);
  const signedUrls = await signedImageUrls('review-photos', storagePaths);
  const photoUrls = storagePaths
    .map((path) => signedUrls.get(path))
    .filter((url): url is string => url !== undefined);

  return {
    reviewId: data.id,
    dishId: data.dish.id,
    dishName: data.dish.name,
    restaurantId: data.restaurant.id,
    restaurantName: data.restaurant.name,
    rating: data.rating,
    photoUrl: photoUrls[0] ?? null,
    createdAt: data.created_at,
    allPhotos: photoUrls,
  };
}
