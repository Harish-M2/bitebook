/**
 * Shared types for the place-data provider abstraction.
 *
 * Spec §20 requires that the external place provider can be replaced later, so nothing
 * outside `_shared/places/` may reference a provider-specific shape. Everything crossing
 * that boundary is normalised to `NormalisedPlace`, which is deliberately close to the
 * columns of `public.restaurants` — the provider layer's job is to absorb the difference
 * between an API response and our schema, not to pass it through.
 */

/** A place as Bitebook understands it, independent of where it came from. */
export interface NormalisedPlace {
  /** The provider's own identifier. Stored so a re-import updates rather than duplicates. */
  externalPlaceId: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  /** 1–4, matching the CHECK constraint on restaurants.price_level. Never 0. */
  priceLevel: number | null;
  phone: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  /**
   * Slugs from `public.cuisines`, most specific first. Empty when the provider says nothing
   * useful — an unknown cuisine is left unknown rather than guessed, because a wrong chip is
   * both misleading and undiscoverable, while a missing one is only the latter.
   */
  cuisineSlugs: string[];
  /**
   * The provider's untouched response for this place. Kept in
   * restaurant_sources.normalized_source_fields so a later mapping change can be replayed
   * without spending another API call.
   */
  raw: Record<string, unknown>;
}

export interface PlaceSearchParams {
  query: string;
  /** Biases results towards the user. Both must be present to have any effect. */
  latitude?: number;
  longitude?: number;
  /** Metres. Providers cap this; the provider implementation clamps rather than errors. */
  radius?: number;
  limit?: number;
}

export interface PlacesProvider {
  /**
   * Value written to the restaurant source column. Must be a member of the
   * `public.restaurant_source_provider` enum.
   */
  readonly source: string;
  /** Free-text search. Returns enough detail to render a picker row. */
  search(params: PlaceSearchParams): Promise<NormalisedPlace[]>;
  /** Full detail for one place, fetched only once the user commits to importing it. */
  details(externalPlaceId: string): Promise<NormalisedPlace | null>;
}

/** Thrown for conditions the caller should see as a 4xx rather than a 500. */
export class PlacesRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PlacesRequestError';
    this.status = status;
  }
}
