/**
 * Google Places API (New) — https://developers.google.com/maps/documentation/places/web-service
 *
 * The legacy Places API is not used: it is deprecated for new projects and its price levels
 * and photo endpoints differ. Everything here targets the v1 `places.googleapis.com` host.
 *
 * The key is server-only (spec §20: "Do not put a server-only Google API key directly into
 * the mobile application"), which is the reason this runs in an Edge Function at all.
 */

import type {
  NormalisedPlace,
  PlaceSearchParams,
  PlacesProvider,
} from './types.ts';
import { PlacesRequestError } from './types.ts';

const HOST = 'https://places.googleapis.com/v1';

/**
 * Google bills per requested field group, so the mask is the cost control. Search asks for
 * the minimum needed to render a picker row; the expensive fields are deferred to details(),
 * which only runs for the one place the user actually chooses.
 */
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.priceLevel',
  'places.addressComponents',
].join(',');

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'priceLevel',
  'addressComponents',
  'nationalPhoneNumber',
  'websiteUri',
  'photos',
].join(',');

/** Google's enum, mapped onto the smallint 1–4 that restaurants.price_level accepts. */
const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  priceLevel?: string;
  addressComponents?: { longText?: string; types?: string[] }[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  photos?: { name?: string }[];
}

/**
 * Google does not return a plain city field. `locality` is the usual answer, but it is
 * absent for places in unincorporated areas, so fall back through the administrative
 * hierarchy rather than leaving the city null — city is what disambiguates a chain's slug.
 */
function extractCity(place: GooglePlace): string | null {
  const components = place.addressComponents ?? [];
  const preference = ['locality', 'postal_town', 'administrative_area_level_2'];

  for (const type of preference) {
    const match = components.find((c) => c.types?.includes(type));
    if (match?.longText) return match.longText;
  }
  return null;
}

/**
 * Photo bytes live behind a separate authenticated endpoint, so the URL embeds the key and
 * must never reach the client. Returning the opaque resource name instead lets the import
 * step fetch and re-host the image in Supabase Storage (spec §21) when that is built.
 */
function extractPhotoName(place: GooglePlace): string | null {
  return place.photos?.[0]?.name ?? null;
}

function normalise(place: GooglePlace): NormalisedPlace | null {
  // Without an ID there is nothing to deduplicate on, so the row could never be re-synced.
  if (!place.id || !place.displayName?.text) return null;

  return {
    externalPlaceId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress ?? null,
    city: extractCity(place),
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    priceLevel: place.priceLevel ? (PRICE_LEVELS[place.priceLevel] ?? null) : null,
    phone: place.nationalPhoneNumber ?? null,
    websiteUrl: place.websiteUri ?? null,
    // Deliberately not the Google photo URL: it would carry the key. Resolved at import.
    imageUrl: null,
    raw: { ...place, bitebookPhotoName: extractPhotoName(place) },
  };
}

export class GooglePlacesProvider implements PlacesProvider {
  readonly source = 'google_places';
  readonly #apiKey: string;

  constructor(apiKey: string) {
    this.#apiKey = apiKey;
  }

  async #request(path: string, init: RequestInit, fieldMask: string): Promise<unknown> {
    const response = await fetch(`${HOST}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.#apiKey,
        'X-Goog-FieldMask': fieldMask,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      // 4xx from Google is our mistake (bad key, bad request), not the client's, with the
      // exception of 404 which details() handles. Surface as 502: the caller cannot fix it.
      throw new PlacesRequestError(
        `Google Places responded ${response.status}: ${body.slice(0, 500)}`,
        response.status === 404 ? 404 : 502,
      );
    }

    return await response.json();
  }

  async search(params: PlaceSearchParams): Promise<NormalisedPlace[]> {
    const body: Record<string, unknown> = {
      textQuery: params.query,
      // Restaurants only. Without this, searching "pizza" returns supermarket aisles.
      includedType: 'restaurant',
      maxResultCount: Math.min(params.limit ?? 10, 20),
    };

    if (params.latitude != null && params.longitude != null) {
      body.locationBias = {
        circle: {
          center: { latitude: params.latitude, longitude: params.longitude },
          // Google rejects a radius over 50km outright, so clamp rather than pass through.
          radius: Math.min(params.radius ?? 5000, 50000),
        },
      };
    }

    const json = (await this.#request(
      '/places:searchText',
      { method: 'POST', body: JSON.stringify(body) },
      SEARCH_FIELD_MASK,
    )) as { places?: GooglePlace[] };

    return (json.places ?? [])
      .map(normalise)
      .filter((place): place is NormalisedPlace => place !== null);
  }

  async details(externalPlaceId: string): Promise<NormalisedPlace | null> {
    try {
      const json = (await this.#request(
        `/places/${encodeURIComponent(externalPlaceId)}`,
        { method: 'GET' },
        DETAILS_FIELD_MASK,
      )) as GooglePlace;

      return normalise(json);
    } catch (error) {
      // A place ID can be retired by Google between search and import; that is a normal
      // "not found", not a failure of this function.
      if (error instanceof PlacesRequestError && error.status === 404) return null;
      throw error;
    }
  }
}
