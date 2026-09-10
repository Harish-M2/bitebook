import { supabase } from '@/lib/supabase';

/**
 * External place search and import.
 *
 * Both operations go through Edge Functions rather than PostgREST, for two different
 * reasons: search needs the provider API key, which must never be shipped in the app
 * (spec §20), and import needs to write `restaurants`, which has no client INSERT policy —
 * the catalogue is provider-owned, not user-owned.
 *
 * Callers get plain rejections; `functions.invoke` resolves with an `error` rather than
 * throwing, which would otherwise leave TanStack Query believing a failed search succeeded.
 */

/** A search hit. Nothing has been persisted yet — the ID is the provider's, not ours. */
export interface PlaceSearchResult {
  externalPlaceId: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  priceLevel: number | null;
}

/** A restaurant row after import. `id` is a Bitebook UUID and is safe to reference. */
export interface ImportedRestaurant {
  id: string;
  name: string;
  slug?: string;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price_level?: number | null;
  image_url?: string | null;
}

interface SearchResponse {
  /** Which provider answered. `seed` means the offline fixture list, not real data. */
  source: string;
  results: PlaceSearchResult[];
}

/**
 * The Functions client reports a failed invocation through `error`, but the useful message
 * is in the response body, which it does not read. Pull it out so the UI can show why.
 */
async function readInvokeError(error: unknown, fallback: string): Promise<Error> {
  const context = (error as { context?: Response })?.context;

  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: string };
      if (body?.error) return new Error(body.error);
    } catch {
      // Body was not JSON (a gateway error page, say) — fall through to the generic message.
    }
  }

  return new Error((error as Error)?.message ?? fallback);
}

export interface SearchPlacesOptions {
  /** Biases results towards the user. Ignored unless both coordinates are supplied. */
  latitude?: number | null;
  longitude?: number | null;
  limit?: number;
}

/**
 * Searches the place provider. Read-only: nothing is added to the catalogue until the user
 * picks a result and `importPlace` is called.
 *
 * Queries shorter than two characters are rejected server-side, so callers should not fire
 * on the first keystroke.
 */
export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {},
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const hasLocation = options.latitude != null && options.longitude != null;

  const { data, error } = await supabase.functions.invoke<SearchResponse>('places-search', {
    body: {
      query: trimmed,
      ...(hasLocation
        ? { latitude: options.latitude, longitude: options.longitude }
        : {}),
      ...(options.limit ? { limit: options.limit } : {}),
    },
  });

  if (error) throw await readInvokeError(error, 'Place search failed');

  return data?.results ?? [];
}

/**
 * Persists a searched place into the catalogue and returns the resulting restaurant.
 *
 * Idempotent on the provider's place ID: calling it twice — or two users picking the same
 * restaurant at once — yields the same row rather than a duplicate, so callers do not need
 * to check whether it already exists first.
 */
export async function importPlace(externalPlaceId: string): Promise<ImportedRestaurant> {
  const { data, error } = await supabase.functions.invoke<{
    restaurant: ImportedRestaurant;
  }>('places-import', {
    body: { externalPlaceId },
  });

  if (error) throw await readInvokeError(error, 'Could not add this restaurant');

  if (!data?.restaurant?.id) {
    throw new Error('Could not add this restaurant');
  }

  return data.restaurant;
}
