import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';

/**
 * Photo capture for the log flow.
 *
 * Review photos go in the private `review-photos` bucket, never `dish-photos`. A review can
 * be private or followers-only, and the Storage policy on `review-photos` gates reads by
 * the parent review's visibility — putting the same image in a public bucket would publish
 * a photo the user chose not to share.
 *
 * The Storage policy requires the path to be `{user id}/{review id}/…` and the review to
 * already exist, so uploads can only happen after the log has been written. That ordering is
 * enforced by the database, not merely by convention here.
 */

/**
 * Longest edge, in pixels. Spec §21: "Do not upload huge original photos unnecessarily."
 * A modern phone camera produces 4000px+ images of several megabytes; nothing in the app
 * renders larger than a full-width card, so the rest is upload time the user waits through.
 */
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.8;

export interface PreparedPhoto {
  uri: string;
  width: number;
  height: number;
}

/**
 * Resizes and re-encodes a picked image to something reasonable to upload.
 *
 * Only ever scales down — enlarging a small photo would add bytes without adding detail.
 */
export async function preparePhoto(uri: string): Promise<PreparedPhoto> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  const image = await context.renderAsync();

  const longestEdge = Math.max(image.width, image.height);

  if (longestEdge > MAX_EDGE_PX) {
    const scale = MAX_EDGE_PX / longestEdge;
    context.resize({
      width: Math.round(image.width * scale),
      height: Math.round(image.height * scale),
    });
  }

  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * Uploads a prepared photo and records it against the review.
 *
 * The Storage object and the `review_photos` row are written separately — Storage has no
 * transaction to join. The row is written second, so a failure leaves an unreferenced object
 * rather than a row pointing at nothing; the former is invisible to the user and cleanable,
 * the latter renders as a permanently broken image.
 */
export async function uploadReviewPhoto(
  userId: string,
  reviewId: string,
  photoUri: string,
): Promise<string> {
  // Reading the file through expo-file-system rather than `fetch(uri)`: it is a native read
  // with no HTTP layer to misinterpret a `file://` URI, which is the usual cause of a
  // zero-byte object being uploaded. `fetch` is kept only as a fallback for URIs the file
  // API cannot open (e.g. a remote one).
  let bytes: ArrayBuffer;
  try {
    bytes = await new File(photoUri).arrayBuffer();
  } catch {
    bytes = await (await fetch(photoUri)).arrayBuffer();
  }

  if (bytes.byteLength === 0) {
    throw new Error('The selected photo could not be read.');
  }

  // Path shape is dictated by the Storage RLS policy: folder 1 is the owner, folder 2 is
  // the review it belongs to.
  const storagePath = `${userId}/${reviewId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('review-photos')
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase
    .from('review_photos')
    .insert({ review_id: reviewId, storage_path: storagePath, position: 0 });

  if (rowError) {
    // Nothing references the object now, so leaving it would waste storage silently.
    await supabase.storage.from('review-photos').remove([storagePath]);
    throw rowError;
  }

  return storagePath;
}
