/**
 * places-import — persists one provider place into the restaurant catalogue.
 *
 * Called when the user picks a search result. `public.restaurants` has no client INSERT
 * policy, so this function plus `upsert_restaurant_from_place` is the only write path in
 * (see 0025_places_import.sql). The upsert is idempotent on the provider's place ID, so two
 * users choosing the same restaurant at the same moment converge on one row rather than
 * racing to create duplicates.
 *
 * Returns the full restaurant row, because the caller's next action is always to attach a
 * dish or a review to it.
 */

import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  requireUser,
  serviceClient,
} from '../_shared/http.ts';
import { getPlacesProvider, PlacesRequestError } from '../_shared/places/index.ts';

interface ImportRequestBody {
  externalPlaceId?: unknown;
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

  let body: ImportRequestBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body must be JSON', 400);
  }

  const externalPlaceId =
    typeof body.externalPlaceId === 'string' ? body.externalPlaceId.trim() : '';

  if (!externalPlaceId) {
    return errorResponse('externalPlaceId is required', 400);
  }

  try {
    const provider = getPlacesProvider();

    // Detail is fetched server-side rather than accepted from the client: trusting a
    // client-supplied name and location would let anyone write arbitrary rows into a table
    // that deliberately has no INSERT policy.
    const place = await provider.details(externalPlaceId);

    if (!place) {
      return errorResponse('Place not found', 404);
    }

    const { data, error } = await serviceClient().rpc(
      'upsert_restaurant_from_place',
      {
        p_source: provider.source,
        p_external_place_id: place.externalPlaceId,
        p_name: place.name,
        p_address: place.address,
        p_city: place.city,
        p_latitude: place.latitude,
        p_longitude: place.longitude,
        p_price_level: place.priceLevel,
        p_phone: place.phone,
        p_website_url: place.websiteUrl,
        p_image_url: place.imageUrl,
        p_raw: place.raw,
        p_cuisine_slugs: place.cuisineSlugs,
      },
    );

    if (error) {
      console.error('[places-import] upsert failed', error);
      return errorResponse('Could not save restaurant', 500);
    }

    const restaurantId = data as string;

    const { data: restaurant, error: readError } = await serviceClient()
      .from('restaurants')
      .select('id, name, slug, address, city, latitude, longitude, price_level, image_url')
      .eq('id', restaurantId)
      .single();

    if (readError) {
      console.error('[places-import] read-back failed', readError);
      // The write succeeded, so return what we know rather than implying it did not.
      return jsonResponse({ restaurant: { id: restaurantId } }, 200);
    }

    return jsonResponse({ restaurant });
  } catch (error) {
    if (error instanceof PlacesRequestError) {
      return errorResponse(error.message, error.status);
    }

    console.error('[places-import] unexpected failure', error);
    return errorResponse('Place import failed', 500);
  }
});
