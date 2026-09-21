/**
 * Photo rehosting utilities.
 *
 * Google Places API photo URLs require an API key and cannot be used directly from clients.
 * This module handles downloading provider photos and rehosting them in Supabase Storage.
 */

import { serviceClient } from './http.ts';

/**
 * Downloads a photo from Google Places and uploads it to the restaurant-photos bucket.
 *
 * Returns the storage path (suitable for use in the public URL builder).
 */
export async function rehostGoogleProviderPhoto(
  restaurantId: string,
  photoResourceName: string,
  apiKey: string,
): Promise<string | null> {
  if (!photoResourceName) return null;

  try {
    // Fetch the photo from Google
    const photoUrl = `https://places.googleapis.com/v1/${photoResourceName}/media?key=${apiKey}&max_height_px=600`;
    const photoResponse = await fetch(photoUrl);

    if (!photoResponse.ok) {
      console.error(`[photos] Failed to fetch photo: ${photoResponse.status}`);
      return null;
    }

    const bytes = await photoResponse.arrayBuffer();

    if (bytes.byteLength === 0) {
      console.error('[photos] Photo is empty');
      return null;
    }

    // Upload to Supabase Storage
    const storagePath = `${restaurantId}/${Date.now()}.jpg`;
    const { error: uploadError } = await serviceClient()
      .storage.from('restaurant-photos')
      .upload(storagePath, bytes, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[photos] Upload failed:', uploadError);
      return null;
    }

    return storagePath;
  } catch (error) {
    console.error('[photos] Unexpected error:', error);
    return null;
  }
}

