/**
 * places-search — free-text restaurant search against the configured place provider.
 *
 * Read-only: nothing is written to the catalogue here. Searching is what the user does while
 * typing, so it must stay cheap; a row is only persisted once they pick one, by
 * `places-import`. This split is also what keeps a fat-fingered search from filling
 * `restaurants` with places nobody logged.
 *
 * The provider key lives in this function's environment and never leaves it (spec §20).
 */

import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  requireUser,
} from '../_shared/http.ts';
import { getPlacesProvider, PlacesRequestError } from '../_shared/places/index.ts';

interface SearchRequestBody {
  query?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  radius?: unknown;
  limit?: unknown;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  let body: SearchRequestBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body must be JSON', 400);
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';

  // A single character matches most of the catalogue and still costs a full provider call.
  if (query.length < 2) {
    return errorResponse('query must be at least 2 characters', 400);
  }

  const latitude = asFiniteNumber(body.latitude);
  const longitude = asFiniteNumber(body.longitude);

  try {
    const provider = getPlacesProvider();
    const places = await provider.search({
      query,
      // Location is a bias, not a filter, and one coordinate alone is meaningless — pass
      // both or neither.
      latitude: longitude === undefined ? undefined : latitude,
      longitude: latitude === undefined ? undefined : longitude,
      radius: asFiniteNumber(body.radius),
      limit: Math.min(asFiniteNumber(body.limit) ?? 10, 20),
    });

    return jsonResponse({
      source: provider.source,
      results: places.map((place) => ({
        externalPlaceId: place.externalPlaceId,
        name: place.name,
        address: place.address,
        city: place.city,
        latitude: place.latitude,
        longitude: place.longitude,
        priceLevel: place.priceLevel,
      })),
    });
  } catch (error) {
    if (error instanceof PlacesRequestError) {
      return errorResponse(error.message, error.status);
    }

    console.error('[places-search] unexpected failure', error);
    return errorResponse('Place search failed', 500);
  }
});
