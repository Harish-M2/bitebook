import { DISH_PHOTO_SELECT, dishCoverUrl } from '@/lib/db/dishes';
import { readInvokeError } from '@/lib/db/places';
import { withRequestTimeout } from '@/lib/db/requests';
import { publicImageUrl } from '@/lib/db/storage';
import { formatPriceLevel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Dish, Restaurant } from '@/types/models';

const RESTAURANT_SELECT = `
  id,
  name,
  city,
  price_level,
  image_url,
  restaurant_photos(storage_path, position),
  restaurant_cuisines(cuisine:cuisines(name, slug)),
  dishes(dietary_tags)
`;

/**
 * `!inner` turns the cuisine join into a filter. Without it PostgREST left-joins and every
 * restaurant comes back regardless of the selected cuisine.
 */
const RESTAURANT_SELECT_BY_CUISINE = `
  id,
  name,
  city,
  price_level,
  image_url,
  restaurant_photos(storage_path, position),
  restaurant_cuisines!inner(cuisine:cuisines!inner(name, slug)),
  dishes(dietary_tags)
`;

const PAGE_SIZE = 30;
/**
 * Discover ranks and pages the catalogue on the client, so the fetch is capped. Newest first
 * keeps the cap from hiding recent additions. Raise this, or move ranking server-side, once
 * the catalogue outgrows it.
 */
const CATALOGUE_CAP = 200;

type RestaurantRowShape = {
  id: string;
  name: string;
  city: string | null;
  price_level: number | null;
  image_url: string | null;
  restaurant_photos?: { storage_path: string; position: number | null }[];
  restaurant_cuisines: { cuisine: { name: string; slug: string } | null }[];
  dishes?: { dietary_tags: string[] | null }[] | null;
};

function toRestaurant(row: RestaurantRowShape): Restaurant {
  return {
    id: row.id,
    name: row.name,
    cuisine: row.restaurant_cuisines?.[0]?.cuisine?.name ?? '',
    cuisineSlugs: (row.restaurant_cuisines ?? []).flatMap((link) => link.cuisine ? [link.cuisine.slug] : []),
    priceLevel: formatPriceLevel(row.price_level),
    city: row.city ?? '',
    // Aggregates are not stored on restaurants; the row renders without them until the
    // ratings pipeline exists.
    rating: 0,
    reviewCount: 0,
    imageUrl: publicImageUrl('restaurant-photos', row.image_url)
      ?? publicImageUrl('restaurant-photos', [...(row.restaurant_photos ?? [])]
        .sort((first, second) => (first.position ?? Infinity) - (second.position ?? Infinity))[0]?.storage_path ?? null),
    dietaryTags: [...new Set((row.dishes ?? []).flatMap((dish) => dish.dietary_tags ?? []))],
  };
}

/**
 * Restaurants for the Discover list, optionally filtered to a cuisine.
 *
 * This will legitimately return nothing until restaurant data is imported from an external
 * places provider (spec §20 forbids hand-building a restaurant database), so callers must
 * treat empty as "no data yet", not as a failure.
 */
export async function listRestaurants(cuisineSlug?: string | null): Promise<Restaurant[]> {
  const request = cuisineSlug
    ? supabase
        .from('restaurants')
        .select(RESTAURANT_SELECT_BY_CUISINE)
        .eq('restaurant_cuisines.cuisine.slug', cuisineSlug)
        .order('created_at', { ascending: false })
        .limit(CATALOGUE_CAP)
    : supabase
        .from('restaurants')
        .select(RESTAURANT_SELECT)
        .order('created_at', { ascending: false })
        .limit(CATALOGUE_CAP);
  const { data, error } = await withRequestTimeout((signal) => request.abortSignal(signal));

  if (error) {
    throw error;
  }

  return (data ?? []).map(toRestaurant);
}

/**
 * Restaurants already in the catalogue whose name matches `query`.
 *
 * The log flow checks here before offering to import from the place provider: a restaurant
 * someone has already added should not be searched for again, both to save a paid provider
 * call and because the local row carries the dishes other people have logged.
 */
export async function searchRestaurants(query: string, signal?: AbortSignal): Promise<Restaurant[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const request = supabase
    .from('restaurants')
    .select(RESTAURANT_SELECT)
    // Escaping matters: `%` and `_` in user input would otherwise widen the pattern, and a
    // lone `%` would match the entire catalogue.
    .ilike('name', `%${trimmed.replace(/[\\%_]/g, '\\$&')}%`)
    .limit(PAGE_SIZE);
  const { data, error } = await withRequestTimeout((readSignal) => request.abortSignal(readSignal), signal);

  if (error) {
    throw error;
  }

  const normalizedQuery = trimmed.toLowerCase();
  return (data ?? []).map(toRestaurant).sort((first, second) => {
    const relevance = (restaurant: Restaurant) => {
      const name = restaurant.name.trim().toLowerCase();
      return name === normalizedQuery ? 0 : name.startsWith(normalizedQuery) ? 1 : 2;
    };
    return relevance(first) - relevance(second) || first.name.localeCompare(second.name);
  });
}

export async function searchRestaurantsByCuisine(query: string, signal: AbortSignal): Promise<Restaurant[]> {
  const cuisines = await supabase.from('cuisines').select('slug')
    .ilike('name', `%${query.trim().replace(/[\\%_]/g, '\\$&')}%`).abortSignal(signal);
  if (cuisines.error) throw cuisines.error;
  if (!cuisines.data?.length) return [];
  const { data, error } = await supabase.from('restaurants')
    .select(RESTAURANT_SELECT_BY_CUISINE)
    .in('restaurant_cuisines.cuisine.slug', cuisines.data.map((cuisine) => cuisine.slug))
    .limit(PAGE_SIZE).abortSignal(signal);
  if (error) throw error;
  return (data ?? []).map(toRestaurant);
}

/**
 * "Trending" is currently the best-rated dishes with enough ratings to be meaningful. It is
 * deliberately not time-windowed yet — with no activity in the database, a 7-day window
 * would always be empty and look broken rather than simply new.
 */
export function restaurantCoverUrl(
  imageUrl: string | null,
  photos: { storage_path: string; position: number | null }[] | null | undefined,
): string | null {
  return publicImageUrl('restaurant-photos', imageUrl)
    ?? publicImageUrl('restaurant-photos', [...(photos ?? [])]
      .sort((first, second) => (first.position ?? Infinity) - (second.position ?? Infinity))[0]?.storage_path ?? null);
}

export async function listTrendingDishes(cuisineSlug?: string | null): Promise<Dish[]> {
  let request = supabase
    .from('dishes')
    .select(
      cuisineSlug
        ? `id, name, created_at, image_url, dietary_tags, aggregate_rating, rating_count, ${DISH_PHOTO_SELECT}, restaurant:restaurants!inner(id, name, price_level, image_url, restaurant_photos(storage_path, position), restaurant_cuisines!inner(cuisine:cuisines!inner(slug)))`
        : `id, name, created_at, image_url, dietary_tags, aggregate_rating, rating_count, ${DISH_PHOTO_SELECT}, restaurant:restaurants(id, name, price_level, image_url, restaurant_photos(storage_path, position), restaurant_cuisines(cuisine:cuisines(slug)))`,
    )
    .gt('rating_count', 0)
    .not('aggregate_rating', 'is', null)
    .order('aggregate_rating', { ascending: false, nullsFirst: false })
    .order('rating_count', { ascending: false })
    .limit(10);
  if (cuisineSlug) request = request.eq('restaurant.restaurant_cuisines.cuisine.slug', cuisineSlug);
  const { data, error } = await withRequestTimeout((signal) => request.abortSignal(signal));

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    if (!row.restaurant) {
      return [];
    }
    return [
      {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        restaurant: {
          id: row.restaurant.id,
          name: row.restaurant.name,
          priceLevel: formatPriceLevel(row.restaurant.price_level),
          cuisineSlugs: (row.restaurant.restaurant_cuisines ?? []).flatMap((link) => link.cuisine ? [link.cuisine.slug] : []),
          imageUrl: restaurantCoverUrl(row.restaurant.image_url, row.restaurant.restaurant_photos),
        },
        rating: row.aggregate_rating ?? 0,
        dietaryTags: row.dietary_tags ?? [],
        ratingCount: row.rating_count ?? 0,
        imageUrl: dishCoverUrl(row.dish_photos, row.image_url),
      },
    ];
  });
}

export interface RestaurantDetail {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  price_level: number | null;
  image_url: string | null;
  phone: string | null;
  website_url: string | null;
  postcode: string | null;
  has_outdoor_seating: boolean | null;
  seating_capacity: number | null;
  accessibility_notes: string | null;
  booking_url: string | null;
  menu_url: string | null;
  restaurant_cuisines: {
    cuisine: { id: string; name: string; slug: string } | null;
  }[];
}

export async function getRestaurant(restaurantId: string): Promise<RestaurantDetail> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      id,
      name,
      city,
      address,
      price_level,
      image_url,
      phone,
      website_url,
      postcode,
      has_outdoor_seating,
      seating_capacity,
      accessibility_notes,
      booking_url,
      menu_url,
      restaurant_cuisines(
        cuisine:cuisines(id, name, slug)
      )
    `)
    .eq('id', restaurantId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * All photos for a restaurant from the `restaurant_photos` table.
 * Photos are ordered by position (primary sort indicator) then creation time.
 * Returns URLs that can be used directly in Image components.
 */
export async function getRestaurantPhotos(restaurantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('restaurant_photos')
    .select('storage_path')
    .eq('restaurant_id', restaurantId)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => publicImageUrl('restaurant-photos', row.storage_path))
    .filter((url): url is string => url !== null);
}


/**
 * Asks the server to store a menu link for a restaurant. The server accepts it only if it is
 * on the restaurant's own website domain; `restaurants` has no client write policy.
 */
export async function submitMenuUrl(restaurantId: string, menuUrl: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ menuUrl: string }>('submit-menu-url', {
    body: { restaurantId, menuUrl },
  });
  if (error) throw await readInvokeError(error, 'Could not save the menu link');
  if (!data?.menuUrl) throw new Error('Could not save the menu link');
  return data.menuUrl;
}
