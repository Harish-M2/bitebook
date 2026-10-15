import { readInvokeError } from '@/lib/db/places';
import { withRequestTimeout } from '@/lib/db/requests';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

type MenuCacheRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  nutrition: Json | null;
};

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    [key: string]: unknown;
  } | null;
}

export interface CachedMenu {
  restaurantId: string;
  items: MenuItem[];
  fetchedAt: string;
  expiresAt: string;
  cached: boolean;
}

/**
 * Get cached menu for a restaurant from the database.
 * Returns null if not cached or cache has expired.
 */
export async function getCachedMenu(restaurantId: string, signal?: AbortSignal): Promise<MenuItem[] | null> {
  // Migration 0035 defines menu_items, but the generated Database snapshot omits it.
  const request = (supabase
    .from('menu_items' as any)
    .select('id, name, description, price, currency, image_url, nutrition')
    .eq('restaurant_id', restaurantId)
    .gt('expires_at', new Date().toISOString())
    .order('name', { ascending: true }) as any);
  const { data, error } = await withRequestTimeout<{ data: MenuCacheRow[] | null; error: { message: string } | null }>(
    (readSignal) => request.abortSignal(readSignal), signal);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    currency: row.currency,
    imageUrl: row.image_url,
    nutrition: row.nutrition && typeof row.nutrition === 'object' && !Array.isArray(row.nutrition)
      ? Object.fromEntries(Object.entries(row.nutrition).filter(([, value]) => typeof value === 'number')) : null,
  }));
}

/**
 * Get restaurant menu, checking cache first.
 * If cache miss or expired, triggers API fetch via Edge Function.
 * This is the main entry point for UI components.
 */
export async function getRestaurantMenu(
  restaurantId: string,
  restaurantName: string,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  // Check cache first
  const cached = await getCachedMenu(restaurantId, signal);
  if (cached) {
    // Cache hit - don't log from client, Edge Function logs during fetch
    return cached;
  }

  // Cache miss - fetch from API
  return searchAndCacheMenu(restaurantId, restaurantName, signal);
}

/**
 * Search Spoonacular API for restaurant menu and cache results.
 * Called via Edge Function to keep API key server-side.
 */
async function searchAndCacheMenu(
  restaurantId: string,
  restaurantName: string,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  try {
    const { data, error } = await withRequestTimeout((readSignal) => supabase.functions.invoke('search-restaurant-menus', {
      signal: readSignal,
      body: {
        restaurantId,
        restaurantName,
      },
    }), signal);

    if (error) {
      throw await readInvokeError(error, 'Could not load the menu');
    }

    const items = data?.items ?? [];
    // Caching and logging are handled by Edge Function
    return items;
  } catch (err) {
    throw err;
  }
}

/**
 * Manually refresh cache for a restaurant.
 * Deletes old cached items and fetches fresh data from API.
 */
export async function refreshMenuCache(
  restaurantId: string,
  restaurantName: string,
): Promise<MenuItem[]> {
  // Delete old cache
  const { error: deleteError } = await (supabase
    .from('menu_items' as any)
    .delete()
    .eq('restaurant_id', restaurantId) as any);

  if (deleteError) {
    console.warn(`[Bitebook] Failed to clear menu cache for ${restaurantId}:`, deleteError);
  }

  // Fetch fresh data
  return searchAndCacheMenu(restaurantId, restaurantName);
}

/**
 * Get monthly budget and spending information.
 */
export async function getMenuBudget(month?: string): Promise<{
  month: string;
  totalRequests: number;
  totalCost: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
} | null> {
  const targetMonth = month || new Date().toISOString().substring(0, 7); // YYYY-MM

  const { data, error } = await (supabase
    .from('menu_budget' as any)
    .select('*')
    .eq('month', targetMonth)
    .single() as any);

  if (error) {
    if (error.code !== 'PGRST116') {
      // 116 = row not found
      console.warn('[Bitebook] Failed to fetch menu budget:', error);
    }
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    month: (data as any).month,
    totalRequests: (data as any).total_requests,
    totalCost: (data as any).total_cost,
    cacheHits: (data as any).cache_hits,
    cacheMisses: (data as any).cache_misses,
    cacheHitRate: (data as any).average_cache_hit_rate,
  };
}

/**
 * Get recent fetch logs for debugging and analytics.
 */
export async function getMenuFetchLogs(limit = 50): Promise<
  {
    restaurantId: string;
    restaurantName: string;
    success: boolean;
    cost: number;
    cached: boolean;
    fetchedAt: string;
    errorMessage: string | null;
  }[]
> {
  const { data, error } = await (supabase
    .from('menu_fetch_log' as any)
    .select('restaurant_id, restaurant_name, success, cost, cached, fetched_at, error_message')
    .order('fetched_at', { ascending: false })
    .limit(limit) as any);

  if (error) {
    console.warn('[Bitebook] Failed to fetch menu logs:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    success: row.success,
    cost: row.cost,
    cached: row.cached,
    fetchedAt: row.fetched_at,
    errorMessage: row.error_message,
  }));
}

/**
 * Calculate cache effectiveness (cache hit rate percentage).
 */
export async function getCacheEffectiveness(): Promise<{
  hitRate: number;
  savings: number; // Estimated dollars saved
} | null> {
  const budget = await getMenuBudget();
  if (!budget) {
    return null;
  }

  const totalRequests = budget.totalRequests;
  if (totalRequests === 0) {
    return { hitRate: 0, savings: 0 };
  }

  const hitRate = budget.cacheHitRate;
  const potentialCost = totalRequests * 0.01; // If no caching
  const actualCost = budget.totalCost;
  const savings = Math.max(0, potentialCost - actualCost);

  return { hitRate, savings };
}
