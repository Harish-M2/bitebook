/**
 * search-restaurant-menus — Search Spoonacular API for restaurant menus and cache results.
 *
 * This function:
 * 1. Searches Spoonacular for a restaurant by name
 * 2. Fetches their menu (if found)
 * 3. Caches results in Supabase with 30-day TTL
 * 4. Logs API calls for cost tracking
 * 5. Returns menu items with prices and images
 *
 * The Spoonacular API key lives in this function's environment and never leaves it.
 */

import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  requireUser,
} from '../_shared/http.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

interface SearchRequestBody {
  restaurantId?: unknown;
  restaurantName?: unknown;
}

interface SpoonacularRestaurant {
  id: number;
  name: string;
  image?: string;
}

interface SpoonacularMenuItem {
  id: number;
  title: string;
  description?: string;
  image?: string;
  price?: number;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

interface MenuItemRow {
  id: string;
  restaurant_id: string;
  external_id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  currency: string;
  image_url?: string | null;
  nutrition?: Record<string, unknown> | null;
  source: string;
  expires_at: string;
}

function makeId(): string {
  return crypto.randomUUID();
}

async function searchSpoonacular(restaurantName: string, apiKey: string): Promise<SpoonacularRestaurant | null> {
  try {
    const query = encodeURIComponent(restaurantName);
    const url = `https://api.spoonacular.com/restaurants/search?query=${query}&limitLicense=false&apiKey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[search-restaurant-menus] Spoonacular search failed: ${response.status}`);
      return null;
    }

    const data = await response.json() as { number?: number; restaurants?: SpoonacularRestaurant[] };

    if (!data.restaurants || data.restaurants.length === 0) {
      return null;
    }

    // Return the first match
    return data.restaurants[0];
  } catch (error) {
    console.error('[search-restaurant-menus] Error searching Spoonacular:', error);
    return null;
  }
}

async function getSpoonacularMenu(
  restaurantId: number,
  apiKey: string,
): Promise<SpoonacularMenuItem[]> {
  try {
    // First, get the restaurant's hash (needed for menu endpoint)
    const hashUrl = `https://api.spoonacular.com/restaurants/${restaurantId}/overview?apiKey=${apiKey}`;
    const hashResponse = await fetch(hashUrl);

    if (!hashResponse.ok) {
      console.error(`[search-restaurant-menus] Failed to get restaurant overview: ${hashResponse.status}`);
      return [];
    }

    const hashData = await hashResponse.json() as { hash?: string };
    const hash = hashData.hash;

    if (!hash) {
      console.warn(`[search-restaurant-menus] No hash returned for restaurant ${restaurantId}`);
      return [];
    }

    // Now get the menu
    const menuUrl = `https://api.spoonacular.com/restaurants/${restaurantId}/menu?hash=${hash}&apiKey=${apiKey}`;
    const menuResponse = await fetch(menuUrl);

    if (!menuResponse.ok) {
      console.error(`[search-restaurant-menus] Failed to get menu: ${menuResponse.status}`);
      return [];
    }

    const menuData = await menuResponse.json() as { menuItems?: SpoonacularMenuItem[] };
    return menuData.menuItems || [];
  } catch (error) {
    console.error('[search-restaurant-menus] Error fetching menu from Spoonacular:', error);
    return [];
  }
}

async function cacheMenuItems(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  externalRestaurantId: number,
  items: SpoonacularMenuItem[],
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Cache for 30 days

  const rows: MenuItemRow[] = items.map((item) => ({
    id: makeId(),
    restaurant_id: restaurantId,
    external_id: item.id,
    name: item.title,
    description: item.description || null,
    price: item.price || null,
    currency: 'USD',
    image_url: item.image || null,
    nutrition: item.nutrition || null,
    source: 'spoonacular',
    expires_at: expiresAt.toISOString(),
  }));

  const { error } = await supabase
    .from('menu_items')
    .insert(rows);

  if (error) {
    console.error('[search-restaurant-menus] Error caching menu items:', error);
    throw new Error(`Failed to cache menu items: ${error.message}`);
  }
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

  const restaurantId = typeof body.restaurantId === 'string' ? body.restaurantId.trim() : '';
  const restaurantName = typeof body.restaurantName === 'string' ? body.restaurantName.trim() : '';

  if (!restaurantId || !restaurantName) {
    return errorResponse('restaurantId and restaurantName are required', 400);
  }

  // Get API key from environment
  const spoonacularApiKey = Deno.env.get('SPOONACULAR_API_KEY');
  if (!spoonacularApiKey) {
    console.error('[search-restaurant-menus] SPOONACULAR_API_KEY not configured');
    return errorResponse('Menu service not configured', 500);
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return errorResponse('Database not configured', 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // Search for restaurant on Spoonacular
    console.log(`[search-restaurant-menus] Searching for restaurant: ${restaurantName}`);
    const spoonacularRestaurant = await searchSpoonacular(restaurantName, spoonacularApiKey);

    if (!spoonacularRestaurant) {
      console.warn(`[search-restaurant-menus] Restaurant not found on Spoonacular: ${restaurantName}`);
      return jsonResponse({ items: [] }); // Graceful fallback
    }

    // Fetch menu from Spoonacular
    console.log(
      `[search-restaurant-menus] Fetching menu for ${spoonacularRestaurant.name} (ID: ${spoonacularRestaurant.id})`,
    );
    const menuItems = await getSpoonacularMenu(spoonacularRestaurant.id, spoonacularApiKey);

    if (menuItems.length === 0) {
      console.warn(`[search-restaurant-menus] No menu items found for ${spoonacularRestaurant.name}`);
      return jsonResponse({ items: [] });
    }

    // Cache menu items
    await cacheMenuItems(supabase, restaurantId, spoonacularRestaurant.id, menuItems);

    // Log successful fetch
    await supabase.from('menu_fetch_log').insert({
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      external_restaurant_id: spoonacularRestaurant.id.toString(),
      success: true,
      cost: 0.01, // Spoonacular charges per request
      response_size: JSON.stringify(menuItems).length,
      cached: false,
    });

    // Return items
    return jsonResponse({
      items: menuItems.map((item) => ({
        id: item.id.toString(),
        name: item.title,
        description: item.description || undefined,
        price: item.price || undefined,
        currency: 'USD',
        imageUrl: item.image || undefined,
        nutrition: item.nutrition,
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[search-restaurant-menus] Function failed:', error);

    // Log failed fetch
    await supabase.from('menu_fetch_log').insert({
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      success: false,
      cost: 0,
      error_message: errorMessage,
    });

    return errorResponse(errorMessage, 500);
  }
});
