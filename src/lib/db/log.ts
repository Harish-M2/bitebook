import { readPhotoBytes, uploadDishPhoto, uploadReviewPhoto } from '@/lib/db/photos';
import { localDateString } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { ReviewVisibility } from '@/types/database';

/**
 * The core log action (spec §11).
 *
 * The three row writes — dish, review, diary entry — happen in a single `log_dish` RPC so
 * they share a transaction. Doing them as separate client calls would let a failure part way
 * through leave a review with no diary entry (invisible to its own author) or a diary entry
 * with no rating, neither of which a retry can repair.
 *
 * The photo is deliberately *outside* that transaction. Storage cannot join a database
 * transaction, and the Storage policy requires the review to exist before its photo can be
 * uploaded, so the ordering is forced. A photo failure therefore does not discard the log:
 * losing the record of a meal because the image upload timed out would be the worse outcome.
 */

export interface LogDishInput {
  restaurantId: string;
  /** Set when picking a dish already known at this restaurant. */
  dishId?: string | null;
  /** Set when adding a dish the restaurant does not have yet. Ignored if `dishId` is set. */
  dishName?: string | null;
  /** 0.5–5.0 in half steps. The database rejects anything else rather than rounding it. */
  rating: number;
  reviewText?: string | null;
  visibility?: ReviewVisibility;
  /** Defaults to today in the device's own timezone, not the server's. `YYYY-MM-DD`. */
  eatenAt?: string;
  /** Local file URI from the picker, already resized by `preparePhoto`. */
  photoUri?: string | null;
}

export interface LogDishResult {
  dishId: string;
  reviewId: string;
  diaryEntryId: string;
  /**
   * True when the log itself succeeded but the photo did not, so the UI can say so rather
   * than reporting a clean success or a total failure — neither of which would be true.
   */
  photoFailed: boolean;
}

export interface RestaurantReviewDishInput {
  dishId: string | null;
  dishName: string;
  rating: number;
  comment: string;
  category?: string | null;
  dietaryTags?: string[];
}

export interface RestaurantReviewMediaInput {
  uri: string;
  type: 'image' | 'video';
  contentType: string;
  fileName: string;
}

export interface LogRestaurantReviewInput {
  restaurantId: string;
  overallRating: number;
  restaurantComment: string;
  recommendationTier: number;
  visibility: ReviewVisibility;
  visitedAt?: string;
  dishes: RestaurantReviewDishInput[];
  media: RestaurantReviewMediaInput[];
}

export interface LogRestaurantReviewResult {
  restaurantReviewId: string;
  dishReviewIds: string[];
  diaryEntryIds: string[];
  mediaFailedCount: number;
}

export async function logRestaurantReview(
  userId: string,
  input: LogRestaurantReviewInput,
): Promise<LogRestaurantReviewResult> {
  const { data, error } = await supabase
    .rpc('log_restaurant_review', {
      p_restaurant_id: input.restaurantId,
      p_overall_rating: input.overallRating,
      p_restaurant_comment: input.restaurantComment.trim() || null,
      p_recommendation_tier: input.recommendationTier,
      p_visibility: input.visibility,
      p_visited_at: input.visitedAt ?? localDateString(),
      p_dishes: input.dishes.map((dish) => ({
        dish_id: dish.dishId,
        dish_name: dish.dishId ? null : dish.dishName,
        category: dish.category ?? null,
        dietary_tags: dish.dietaryTags ?? [],
        rating: dish.rating,
        comment: dish.comment.trim() || null,
      })),
    });

  if (error) throw error;
  if (!data?.length) throw new Error('The restaurant review could not be logged.');

  const restaurantReviewId = data[0].restaurant_review_id;
  const uploadedPaths: string[] = [];
  const mediaRows: {
    restaurant_review_id: string;
    storage_path: string;
    media_type: 'image' | 'video';
    content_type: string;
    position: number;
  }[] = [];
  let mediaFailedCount = 0;

  for (const [position, media] of input.media.entries()) {
    const extension = media.fileName.split('.').pop()?.toLowerCase() ||
      (media.type === 'image' ? 'jpg' : 'mp4');
    const storagePath = `${userId}/${restaurantReviewId}/${position}-${Date.now()}.${extension}`;

    try {
      const bytes = await readPhotoBytes(media.uri);
      const { error: uploadError } = await supabase.storage
        .from('review-photos')
        .upload(storagePath, bytes, { contentType: media.contentType, upsert: false });
      if (uploadError) throw uploadError;

      uploadedPaths.push(storagePath);
      mediaRows.push({
        restaurant_review_id: restaurantReviewId,
        storage_path: storagePath,
        media_type: media.type,
        content_type: media.contentType,
        position,
      });
    } catch (uploadError) {
      console.warn('[Bitebook] Review media upload failed:', uploadError);
      mediaFailedCount += 1;
    }
  }

  if (mediaRows.length > 0) {
    const { error: insertError } = await supabase
      .from('restaurant_review_media')
      .insert(mediaRows);

    if (insertError) {
      await supabase.storage.from('review-photos').remove(uploadedPaths);
      mediaFailedCount += mediaRows.length;
    }
  }

  return {
    restaurantReviewId,
    dishReviewIds: data.map((row) => row.review_id),
    diaryEntryIds: data.map((row) => row.diary_entry_id),
    mediaFailedCount,
  };
}

export async function logDish(
  userId: string,
  input: LogDishInput,
): Promise<LogDishResult> {
  const { data, error } = await supabase
    .rpc('log_dish', {
      p_restaurant_id: input.restaurantId,
      p_rating: input.rating,
      p_dish_id: input.dishId ?? null,
      p_dish_name: input.dishId ? null : (input.dishName ?? null),
      p_review_text: input.reviewText ?? null,
      p_visibility: input.visibility ?? 'public',
      // "The day I ate it" is a local calendar date. The database default is `current_date`,
      // which is UTC, so a late-evening log east of UTC would land on tomorrow and an early
      // one west of it on yesterday. The client is the only party that knows the timezone.
      p_eaten_at: input.eatenAt ?? localDateString(),
    })
    .single();

  if (error) throw error;
  if (!data) throw new Error('The dish could not be logged.');

  const result: LogDishResult = {
    dishId: data.dish_id,
    reviewId: data.review_id,
    diaryEntryId: data.diary_entry_id,
    photoFailed: false,
  };

  if (input.photoUri) {
    try {
      const bytes = await readPhotoBytes(input.photoUri);
      await uploadReviewPhoto(userId, result.reviewId, bytes);

      // A public review's photo also becomes part of the dish's shared gallery, which is
      // what gives the catalogue any pictures at all. Deliberately gated on visibility: a
      // private or followers-only photo must never reach the public bucket.
      if ((input.visibility ?? 'public') === 'public') {
        try {
          await uploadDishPhoto(userId, result.dishId, bytes);
        } catch (dishPhotoError) {
          // Not reported as a failure. The user's own record — the thing they asked for — is
          // complete; only the contribution to the shared catalogue was lost, and telling
          // them their log failed would be untrue.
          console.warn('[Bitebook] Dish photo contribution failed:', dishPhotoError);
        }
      }
    } catch (photoError) {
      console.warn('[Bitebook] Review photo upload failed:', photoError);
      result.photoFailed = true;
    }
  }

  return result;
}
