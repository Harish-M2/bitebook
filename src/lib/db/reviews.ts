import { signedImageUrls } from '@/lib/db/storage';
import { supabase } from '@/lib/supabase';

export interface Review {
  id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  text: string | null;
  created_at: string;
  updated_at: string;
  photos?: ReviewPhoto[];
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ReviewPhoto {
  id: string;
  review_id: string;
  photo_url: string;
  created_at: string;
}

type RestaurantReviewRow = {
  id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; display_name: string | null; avatar_url: string | null } | null;
  photos?: { id: string; storage_path: string; position: number | null }[];
};

/**
 * Get all reviews for a restaurant with optional user data
 */
export async function getRestaurantReviews(
  restaurantId: string,
  options?: {
    includeUser?: boolean;
    includePhotos?: boolean;
  }
) {
  const fields = [
    'id',
    'user_id',
    'restaurant_id',
    'rating',
    'review_text',
    'created_at',
    'updated_at',
  ];
  if (options?.includeUser) fields.push('user:profiles(id, display_name, avatar_url)');
  if (options?.includePhotos) fields.push('photos:review_photos(id, storage_path, position)');

  const { data, error } = await supabase
    .from('reviews')
    .select(fields.join(', '))
    .eq('restaurant_id', restaurantId)
    .is('restaurant_review_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Bitebook] Failed to fetch reviews:', error);
    throw error;
  }

  const rows = (data ?? []) as unknown as RestaurantReviewRow[];
  const photoPaths = options?.includePhotos
    ? rows.flatMap((review) => (review.photos ?? []).map((photo) => photo.storage_path))
    : [];
  const signedPhotos = await signedImageUrls('review-photos', photoPaths);

  return rows.map((review): Review => ({
    id: review.id,
    user_id: review.user_id,
    restaurant_id: review.restaurant_id,
    rating: review.rating,
    text: review.review_text,
    created_at: review.created_at,
    updated_at: review.updated_at,
    photos: (review.photos ?? []).map((photo) => ({
      id: photo.id,
      review_id: review.id,
      photo_url: signedPhotos.get(photo.storage_path) ?? '',
      created_at: review.created_at,
    })),
    user: review.user
      ? {
          id: review.user.id,
          full_name: review.user.display_name ?? 'Anonymous',
          avatar_url: review.user.avatar_url,
        }
      : undefined,
  }));
}

/**
 * Get user's own review for a restaurant (if exists)
 */
export async function getUserRestaurantReview(restaurantId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
        *,
        review_photos(*)
      `
    )
    .eq('user_id', user.user.id)
    .eq('restaurant_id', restaurantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (this is expected when no review exists)
    console.error('[Bitebook] Failed to fetch user review:', error);
    throw error;
  }

  if (error && error.code === 'PGRST116') {
    return null;
  }

  return (data as any) || null;
}

/**
 * Get average rating and review count for a restaurant
 */
export async function getRestaurantRatingStats(restaurantId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', restaurantId);

  if (error) {
    console.error('[Bitebook] Failed to fetch rating stats:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return { avg_rating: 0, review_count: 0 };
  }

  const ratings = data as unknown as { rating: number }[];
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const avg = sum / ratings.length;

  return { avg_rating: avg, review_count: ratings.length };
}

/**
 * Submit or update a review
 */
export async function submitReview(
  restaurantId: string,
  rating: number,
  text?: string | null,
  photoUrls?: string[]
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) {
    throw new Error('Not authenticated');
  }

  const userId = user.user.id;

  // Upsert review
  const { data: review, error: reviewError } = (await (supabase
    .from('reviews')
    .upsert(
      {
        user_id: userId,
        restaurant_id: restaurantId,
        rating,
        text: text || null,
      } as any,
      {
        onConflict: 'user_id,restaurant_id',
      }
    )
    .select()
    .single() as any)) as any;

  if (reviewError) {
    console.error('[Bitebook] Failed to submit review:', reviewError);
    throw reviewError;
  }

  // Add photos if provided
  if (photoUrls && photoUrls.length > 0 && review) {
    const photosToInsert = photoUrls.map((url) => ({
      review_id: review.id,
      photo_url: url,
    }));

    const { error: photoError } = (await (supabase
      .from('review_photos')
      .insert(photosToInsert as any) as any)) as any;

    if (photoError) {
      console.error('[Bitebook] Failed to add review photos:', photoError);
      throw photoError;
    }
  }

  return review;
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[Bitebook] Failed to delete review:', error);
    throw error;
  }

  if (!data) {
    throw new Error('Review was not found or you do not have permission to delete it.');
  }
}

/**
 * Add photos to existing review
 */
export async function addReviewPhotos(reviewId: string, photoUrls: string[]) {
  if (photoUrls.length === 0) return;

  const photosToInsert = photoUrls.map((url) => ({
    review_id: reviewId,
    photo_url: url,
  }));

  const { error } = (await (supabase
    .from('review_photos')
    .insert(photosToInsert as any) as any)) as any;

  if (error) {
    console.error('[Bitebook] Failed to add photos:', error);
    throw error;
  }
}

/**
 * Delete a review photo
 */
export async function deleteReviewPhoto(photoId: string) {
  const { error } = await supabase
    .from('review_photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    console.error('[Bitebook] Failed to delete photo:', error);
    throw error;
  }
}

/**
 * Toggle like on a review
 */
export async function toggleLikeReview(reviewId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) {
    throw new Error('Not authenticated');
  }

  // Check if already liked
  const { data: existingLike, error: checkError } = await supabase
    .from('likes')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', user.user.id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('[Bitebook] Failed to check like status:', checkError);
    throw checkError;
  }

  if (existingLike) {
    // Unlike
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id);

    if (deleteError) {
      console.error('[Bitebook] Failed to unlike:', deleteError);
      throw deleteError;
    }

    return { liked: false };
  } else {
    // Like
    const { error: insertError } = await supabase
      .from('likes')
      .insert({
        review_id: reviewId,
        user_id: user.user.id,
      });

    if (insertError) {
      console.error('[Bitebook] Failed to like:', insertError);
      throw insertError;
    }

    return { liked: true };
  }
}

/**
 * Get all comments for a review
 */
export async function getReviewComments(reviewId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select(
      `
        id,
        body,
        created_at,
        user:profiles(id, display_name, avatar_url)
      `
    )
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Bitebook] Failed to fetch comments:', error);
    throw error;
  }

  return (data || []) as {
    id: string;
    body: string;
    created_at: string;
    user: { id: string; display_name: string; avatar_url: string | null } | null;
  }[];
}

/**
 * Add a comment to a review
 */
export async function addReviewComment(reviewId: string, text: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) {
    throw new Error('Not authenticated');
  }

  if (!text.trim()) {
    throw new Error('Comment cannot be empty');
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      review_id: reviewId,
      user_id: user.user.id,
      body: text.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('[Bitebook] Failed to add comment:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a comment
 */
export async function deleteReviewComment(commentId: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('[Bitebook] Failed to delete comment:', error);
    throw error;
  }
}

/**
 * Get all reviews by the current user
 */
export async function getUserReviews(userId: string) {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, rating, review_text, created_at, restaurant_id, dish_id')
    .eq('user_id', userId)
    .is('restaurant_review_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Bitebook] Failed to fetch user reviews:', error);
    throw error;
  }

  if (!reviews || reviews.length === 0) {
    console.log('[Bitebook] User reviews: empty');
    return [];
  }

  // Fetch restaurants and dishes
  const restaurantIds = [...new Set(reviews.map((r: any) => r.restaurant_id).filter(Boolean))];
  const dishIds = [...new Set(reviews.map((r: any) => r.dish_id).filter(Boolean))];

  const [restauRes, dishRes] = await Promise.all([
    restaurantIds.length > 0
      ? supabase.from('restaurants').select('id, name').in('id', restaurantIds)
      : Promise.resolve({ data: [] }),
    dishIds.length > 0
      ? supabase.from('dishes').select('id, name').in('id', dishIds)
      : Promise.resolve({ data: [] }),
  ]);

  const restaurantMap = Object.fromEntries((restauRes.data || []).map((r: any) => [r.id, r]));
  const dishMap = Object.fromEntries((dishRes.data || []).map((d: any) => [d.id, d]));

  const result = reviews.map((review: any) => ({
    ...review,
    restaurant: restaurantMap[review.restaurant_id] || null,
    dish: dishMap[review.dish_id] || null,
  }));

  return result;
}

export interface VisibleProfileReview {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  dish: { id: string; name: string } | null;
  restaurant: { name: string } | null;
}

/** Get one bounded page of reviews the current user may see on a profile. */
export async function getVisibleProfileReviews(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<VisibleProfileReview[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      review_text,
      created_at,
      dish:dishes!reviews_dish_id_fkey(id, name),
      restaurant:restaurants!reviews_restaurant_id_fkey(name)
    `)
    .eq('user_id', userId)
    .is('restaurant_review_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as unknown as VisibleProfileReview[];
}
