import type { Restaurant } from '@/types/models';

export interface RestaurantFilters {
  minRating?: number;
  maxDistance?: number;
  priceLevel?: string; // £, ££, £££, ££££
  /** Keep restaurants with at least one dish carrying this dietary tag. */
  dietaryTag?: string;
  /** Defaults to 'recommended' when unset. Applied by rankRestaurants, not filterRestaurants. */
  sort?: RestaurantSort;
  /** Hide restaurants the user has marked as visited. */
  hideVisited?: boolean;
}

export type RestaurantSort = 'recommended' | 'top_rated' | 'most_reviewed' | 'newest' | 'name';

export const SORT_OPTIONS: { value: RestaurantSort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'top_rated', label: 'Top rated' },
  { value: 'most_reviewed', label: 'Most reviewed' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'A–Z' },
];

export type RankContext = {
  /** Restaurants people the user follows recommend. */
  friendRestaurantIds: Set<string>;
  /** Cuisine names the user picked as favourites. */
  favouriteCuisines: Set<string>;
};

export function distanceKilometres(label?: string): number | null {
  const match = label?.match(/(\d+(?:\.\d+)?)\s*(km|mi)/i);
  return match ? Number(match[1]) * (match[2].toLowerCase() === 'mi' ? 1.609344 : 1) : null;
}

/**
 * Orders restaurants. Input order is newest-first, and Array#sort is stable, so ties keep
 * that order. "Recommended" favours friends' picks, then the user's cuisines, then quality.
 */
export function rankRestaurants(
  restaurants: Restaurant[],
  sort: RestaurantSort,
  context: RankContext,
): Restaurant[] {
  const copy = [...restaurants];
  switch (sort) {
    case 'newest':
      return copy;
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'top_rated':
      return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case 'most_reviewed':
      return copy.sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);
    default: {
      const score = (r: Restaurant) =>
        (context.friendRestaurantIds.has(r.id) ? 1000 : 0) +
        (context.favouriteCuisines.has(r.cuisine) ? 100 : 0) +
        r.rating * 10 +
        Math.min(r.reviewCount, 20);
      return copy.sort((a, b) => score(b) - score(a));
    }
  }
}

/**
 * Apply filters to a list of restaurants
 * All filters are optional (AND logic: all must match)
 */
export function filterRestaurants(
  restaurants: Restaurant[],
  filters: RestaurantFilters
): Restaurant[] {
  return restaurants.filter((restaurant) => {
    // Filter by minimum rating
    if (filters.minRating !== undefined && filters.minRating > 0) {
      if (restaurant.rating < filters.minRating) {
        return false;
      }
    }

    if (filters.dietaryTag && !(restaurant.dietaryTags ?? []).includes(filters.dietaryTag)) {
      return false;
    }

    // Filter by price level
    if (filters.priceLevel) {
      if (restaurant.priceLevel !== filters.priceLevel) {
        return false;
      }
    }

    // Filter by distance (if distanceLabel contains a number)
    if (filters.maxDistance !== undefined && filters.maxDistance > 0) {
      const distance = distanceKilometres(restaurant.distanceLabel);
      if (distance === null || distance > filters.maxDistance) return false;
    }

    return true;
  });
}

/**
 * Get unique price levels from restaurants
 */
export function getPriceLevels(restaurants: Restaurant[]): string[] {
  const levels = new Set<string>();
  restaurants.forEach((r) => {
    if (r.priceLevel) {
      levels.add(r.priceLevel);
    }
  });
  return Array.from(levels).sort();
}

/**
 * Get min and max distances from restaurants
 */
export function getDistanceRange(restaurants: Restaurant[]): { min: number; max: number } {
  let min = Infinity;
  let max = 0;

  restaurants.forEach((r) => {
    if (r.distanceLabel) {
      const match = r.distanceLabel.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        const distance = parseFloat(match[1]);
        min = Math.min(min, distance);
        max = Math.max(max, distance);
      }
    }
  });

  return {
    min: min === Infinity ? 0 : min,
    max: max === 0 ? 10 : max,
  };
}

/**
 * Get rating range from restaurants
 */
export function getRatingRange(restaurants: Restaurant[]): { min: number; max: number } {
  if (restaurants.length === 0) {
    return { min: 0, max: 5 };
  }

  const ratings = restaurants.map((r) => r.rating).filter((r) => r > 0);
  if (ratings.length === 0) {
    return { min: 0, max: 5 };
  }

  return {
    min: Math.floor(Math.min(...ratings)),
    max: Math.ceil(Math.max(...ratings)),
  };
}
