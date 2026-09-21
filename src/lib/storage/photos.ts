import { supabase } from '@/lib/supabase';

/**
 * Upload a review photo to Supabase Storage
 */
export async function uploadReviewPhoto(
  photoUri: string,
  restaurantId: string
): Promise<string> {
  try {
    // Get user ID
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.id) {
      throw new Error('Not authenticated');
    }

    // Read file
    const response = await fetch(photoUri);
    const blob = await response.blob();

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${restaurantId}/${user.user.id}/${timestamp}.jpg`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('review-photos')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[Bitebook] Upload error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Upload failed: no data returned');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('review-photos')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (error) {
    console.error('[Bitebook] Failed to upload review photo:', error);
    throw error;
  }
}
