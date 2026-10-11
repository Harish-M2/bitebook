/**
 * submit-menu-url — stores a verified online-menu link for a restaurant (spec section 7).
 *
 * `public.restaurants` has no client write policy (deliberate; 0019), so a signed-in user
 * cannot set `menu_url` directly. This function checks the caller, then accepts the link
 * only if it is on the restaurant's own website domain, and writes with the service role.
 */

import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  requireUser,
  serviceClient,
} from '../_shared/http.ts';
import { checkMenuUrl } from '../_shared/menuUrl.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  let body: { restaurantId?: unknown; menuUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body must be JSON', 400);
  }

  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId : '';
  const menuUrl = typeof body.menuUrl === 'string' ? body.menuUrl : '';
  if (!restaurantId || !menuUrl) return errorResponse('restaurantId and menuUrl are required', 400);

  const client = serviceClient();
  const { data: restaurant, error: readError } = await client
    .from('restaurants')
    .select('id, website_url')
    .eq('id', restaurantId)
    .maybeSingle();
  if (readError) {
    console.error('[submit-menu-url] read failed', readError);
    return errorResponse('Could not look up that restaurant', 500);
  }
  if (!restaurant) return errorResponse('Restaurant not found', 404);

  const check = checkMenuUrl(menuUrl, restaurant.website_url);
  if (!check.ok) return errorResponse(check.reason, 422);

  const { error: updateError } = await client
    .from('restaurants')
    .update({ menu_url: check.url, menu_url_verified_at: new Date().toISOString() })
    .eq('id', restaurantId);
  if (updateError) {
    console.error('[submit-menu-url] update failed', updateError);
    return errorResponse('Could not save the menu link', 500);
  }

  return jsonResponse({ menuUrl: check.url });
});
