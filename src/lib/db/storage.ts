import { supabase } from '@/lib/supabase';

/**
 * Buckets created by 0020_storage.sql. `review-photos` is the only private one, so it is
 * the only bucket whose paths cannot be turned into a URL synchronously.
 */
export type PublicBucket = 'avatars' | 'dish-photos' | 'restaurant-photos';
export type PrivateBucket = 'review-photos';

/**
 * Resolves a stored path to a URL for a public bucket. Photo tables store a
 * `storage_path`, never a URL, so every image in the UI has to go through here.
 */
export function publicImageUrl(bucket: PublicBucket, storagePath: string | null): string | null {
  const value = storagePath?.trim();
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.username || url.password ? null : url.href;
    } catch {
      return null;
    }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) return null;
  const path = value.replace(/^\/+/, '').replace(new RegExp(`^${bucket}/`), '');
  return path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
}

/** Signed URLs expire; an hour comfortably outlives a single session on a screen. */
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Resolves paths in the private `review-photos` bucket. Signed in one batch because a feed
 * page would otherwise issue a request per photo.
 *
 * A failure here is deliberately not fatal: the caller gets nulls and renders the item
 * without its photo rather than failing the whole feed.
 */
export async function signedImageUrls(
  bucket: PrivateBucket,
  storagePaths: string[]
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const paths = storagePaths.filter(Boolean);

  if (paths.length === 0) {
    return resolved;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.warn('[Bitebook] Failed to sign image URLs:', error);
    return resolved;
  }

  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      resolved.set(item.path, item.signedUrl);
    }
  }
  return resolved;
}
