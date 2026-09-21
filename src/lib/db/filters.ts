import type { Restaurant } from '@/types/models';

export interface RestaurantFilters {
  minRating?: number;
  maxDistance?: number;
  priceLevel?: string; // £, ££, £££, ££££
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

    // Filter by price level
    if (filters.priceLevel) {
      if (restaurant.priceLevel !== filters.priceLevel) {
        return false;
      }
    }

    // Filter by distance (if distanceLabel contains a number)
    if (filters.maxDistance !== undefined && filters.maxDistance > 0) {
      if (restaurant.distanceLabel) {
        const distanceMatch = restaurant.distanceLabel.match(/(\d+(?:\.\d+)?)\s*(km|mi)/i);
        if (distanceMatch) {
          const distance = parseFloat(distanceMatch[1]);
          if (distance > filters.maxDistance) {
            return false;
          }
        }
      }
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
