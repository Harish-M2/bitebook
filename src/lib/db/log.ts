import { supabase } from '@/lib/supabase';
import { uploadReviewPhoto } from '@/lib/db/photos';
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
  /** Defaults to today in the database. `YYYY-MM-DD`. */
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

export async function logDish(
  userId: string,
  input: LogDishInput,
): Promise<LogDishResult> {
  const { data, error } = await supabase
    .rpc('log_dish', {
      p_restaurant_id: input.restaurantId,
      p_rating: input.rating,
      p_dish_id: input.dishId ?? undefined,
      p_dish_name: input.dishId ? undefined : (input.dishName ?? undefined),
      p_review_text: input.reviewText ?? undefined,
      p_visibility: input.visibility ?? 'public',
      p_eaten_at: input.eatenAt ?? undefined,
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
      await uploadReviewPhoto(userId, result.reviewId, input.photoUri);
    } catch (photoError) {
      console.warn('[Bitebook] Review photo upload failed:', photoError);
      result.photoFailed = true;
    }
  }

  return result;
}
