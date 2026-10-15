import { DISH_PHOTO_SELECT, dishCoverUrl } from '@/lib/db/dishes';
import { distanceKilometres, filterRestaurants, rankRestaurants, type RankContext, type RestaurantFilters } from '@/lib/db/filters';
import { withRequestTimeout } from '@/lib/db/requests';
import { restaurantCoverUrl, searchRestaurants, searchRestaurantsByCuisine } from '@/lib/db/restaurants';
import { formatPriceLevel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Dish, Restaurant } from '@/types/models';

export type DiscoverFilter = 'For You' | 'Trending' | 'Restaurants' | 'Dishes';
export type DiscoverItem = { kind: 'restaurant'; value: Restaurant } | { kind: 'dish'; value: Dish };
export type DiscoverSection = { title: string; items: DiscoverItem[] };

export function filterDiscoverDishes(dishes: Dish[], filters: RestaurantFilters, cuisineSlug: string | null, visitedIds: Set<string>): Dish[] {
  const matches = dishes.filter((dish) => (!cuisineSlug || dish.restaurant.cuisineSlugs?.includes(cuisineSlug))
    && (!filters.minRating || (dish.ratingCount > 0 && dish.rating >= filters.minRating))
    && (!filters.priceLevel || dish.restaurant.priceLevel === filters.priceLevel)
    && (!filters.maxDistance || (distanceKilometres(dish.restaurant.distanceLabel) !== null
      && distanceKilometres(dish.restaurant.distanceLabel)! <= filters.maxDistance))
    && (!filters.dietaryTag || dish.dietaryTags?.includes(filters.dietaryTag))
    && (!filters.hideVisited || !visitedIds.has(dish.restaurant.id)));
  if (filters.sort === 'name') return matches.sort((first, second) => first.name.localeCompare(second.name));
  if (filters.sort === 'newest') return matches.sort((first, second) => (second.createdAt ?? '').localeCompare(first.createdAt ?? ''));
  if (filters.sort === 'most_reviewed') return matches.sort((first, second) => second.ratingCount - first.ratingCount);
  if (filters.sort === 'top_rated') return matches.sort((first, second) => second.rating - first.rating);
  return matches;
}

export function mixDiscoverItems(restaurants: DiscoverItem[], dishes: DiscoverItem[]): DiscoverItem[] {
  return Array.from({ length: Math.max(restaurants.length, dishes.length) }).flatMap((_, index) =>
    [restaurants[index], dishes[index]].filter((item): item is DiscoverItem => Boolean(item)));
}

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
  return withRequestTimeout((readSignal) => searchDiscoverResults(query, readSignal), signal);
}

async function searchDiscoverResults(query: string, signal: AbortSignal): Promise<{ restaurants: Restaurant[]; dishes: Dish[] }> {
  const [byName, byCuisine] = await Promise.all([
    searchRestaurants(query, signal), searchRestaurantsByCuisine(query, signal),
  ]);
  const restaurants = [...new Map([...byName, ...byCuisine].map((restaurant) => [restaurant.id, restaurant])).values()];
  const select = `id, name, created_at, image_url, dietary_tags, aggregate_rating, rating_count, ${DISH_PHOTO_SELECT}, restaurant:restaurants(id, name, price_level, image_url, restaurant_photos(storage_path, position), restaurant_cuisines(cuisine:cuisines(slug)))`;
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
    id: dish.id, name: dish.name, createdAt: dish.created_at,
    restaurant: {
      id: dish.restaurant.id, name: dish.restaurant.name,
      priceLevel: formatPriceLevel(dish.restaurant.price_level),
      cuisineSlugs: (dish.restaurant.restaurant_cuisines ?? []).flatMap((link) => link.cuisine ? [link.cuisine.slug] : []),
      imageUrl: restaurantCoverUrl(dish.restaurant.image_url, dish.restaurant.restaurant_photos),
    },
    rating: dish.aggregate_rating ?? 0, ratingCount: dish.rating_count ?? 0,
    dietaryTags: dish.dietary_tags ?? [],
    imageUrl: dishCoverUrl(dish.dish_photos, dish.image_url),
  }] : []);
  return { restaurants, dishes };
}