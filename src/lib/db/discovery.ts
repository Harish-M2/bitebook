import { DISH_PHOTO_SELECT, dishCoverUrl } from '@/lib/db/dishes';
import { filterRestaurants, rankRestaurants, type RankContext, type RestaurantFilters } from '@/lib/db/filters';
import { restaurantCoverUrl, searchRestaurants, searchRestaurantsByCuisine } from '@/lib/db/restaurants';
import { supabase } from '@/lib/supabase';
import type { Dish, Restaurant } from '@/types/models';

export type DiscoverFilter = 'For You' | 'Trending' | 'Restaurants' | 'Dishes';
export type DiscoverItem = { kind: 'restaurant'; value: Restaurant } | { kind: 'dish'; value: Dish };
export type DiscoverSection = { title: string; items: DiscoverItem[] };

export function selectDiscoverRestaurants(
  restaurants: Restaurant[],
  context: RankContext,
  recentIds: Set<string>,
  filters: RestaurantFilters = {},
  trendingOnly = false,
): Restaurant[] {
  const eligible = restaurants.filter((restaurant) => trendingOnly
    ? recentIds.has(restaurant.id) && restaurant.reviewCount > 0
    : recentIds.has(restaurant.id)
      || (restaurant.reviewCount > 0 && restaurant.rating >= 4)
      || context.friendRestaurantIds.has(restaurant.id)
      || context.favouriteCuisines.has(restaurant.cuisine));
  return rankRestaurants(filterRestaurants(eligible, filters),
    trendingOnly ? 'most_reviewed' : filters.sort ?? 'recommended', context).slice(0, 20);
}

export async function searchDiscover(query: string, signal: AbortSignal): Promise<{ restaurants: Restaurant[]; dishes: Dish[] }> {
  const [byName, byCuisine] = await Promise.all([
    searchRestaurants(query, signal), searchRestaurantsByCuisine(query, signal),
  ]);
  const restaurants = [...new Map([...byName, ...byCuisine].map((restaurant) => [restaurant.id, restaurant])).values()];
  const select = `id, name, image_url, aggregate_rating, rating_count, ${DISH_PHOTO_SELECT}, restaurant:restaurants(id, name, image_url, restaurant_photos(storage_path, position))`;
  const byDishName = supabase.from('dishes').select(select)
    .ilike('name', `%${query.trim().replace(/[\\%_]/g, '\\$&')}%`).limit(30).abortSignal(signal);
  const [names, associated] = await Promise.all([
    byDishName,
    restaurants.length ? supabase.from('dishes').select(select)
      .in('restaurant_id', restaurants.map((restaurant) => restaurant.id)).limit(30).abortSignal(signal)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (names.error) throw names.error;
  if (associated.error) throw associated.error;
  const rows = [...new Map([...(names.data ?? []), ...(associated.data ?? [])].map((dish) => [dish.id, dish])).values()];
  const dishes = rows.flatMap((dish) => dish.restaurant ? [{
    id: dish.id, name: dish.name,
    restaurant: {
      id: dish.restaurant.id, name: dish.restaurant.name,
      imageUrl: restaurantCoverUrl(dish.restaurant.image_url, dish.restaurant.restaurant_photos),
    },
    rating: dish.aggregate_rating ?? 0, ratingCount: dish.rating_count ?? 0,
    imageUrl: dishCoverUrl(dish.dish_photos, dish.image_url),
  }] : []);
  return { restaurants, dishes };
}