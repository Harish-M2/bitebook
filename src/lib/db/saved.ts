import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/types/models';

const db = supabase as any;

/**
 * Save a restaurant for the current user
 */
export async function saveRestaurant(restaurantId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) throw new Error('Not authenticated');

  const { error } = await db
    .from('saved_restaurants')
    .insert({
      user_id: userData.user.id,
      restaurant_id: restaurantId,
    });

  if (error) {
    console.error('Error saving restaurant:', error);
    throw error;
  }

  return true;
}

/**
 * Remove a restaurant from the current user's saved list
 */
export async function unsaveRestaurant(restaurantId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) throw new Error('Not authenticated');

  const { error } = await db
    .from('saved_restaurants')
    .delete()
    .match({ user_id: userData.user.id, restaurant_id: restaurantId });

  if (error) {
    console.error('Error unsaving restaurant:', error);
    throw error;
  }

  return true;
}

/**
 * Check if a restaurant is saved by the current user
 */
export async function isSaved(restaurantId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return false;

  try {
    const { data } = await db
      .from('saved_restaurants')
      .select('id', { count: 'exact', head: true })
      .match({ user_id: userData.user.id, restaurant_id: restaurantId });

    return !!(data as any)?.[0];
  } catch (err) {
    console.error('Error checking saved status:', err);
    return false;
  }
}

/**
 * Get all restaurants saved by the current user
 */
export async function getSavedRestaurants(
  limit: number = 20,
  offset: number = 0
): Promise<Restaurant[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return [];

  const { data, error } = await db
    .from('saved_restaurants')
    .select('restaurant_id')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching saved restaurants:', error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  // Get full restaurant details for each saved id
  const restaurantIds = (data as any).map((item: any) => item.restaurant_id);
  const { data: restaurants, error: restaurantError } = await db
    .from('restaurants')
    .select('*')
    .in('id', restaurantIds);

  if (restaurantError) {
    console.error('Error fetching restaurant details:', restaurantError);
    throw restaurantError;
  }

  return (restaurants || []) as Restaurant[];
}

/**
 * Get the count of users who have saved a restaurant
 */
export async function getSavedCount(restaurantId: string): Promise<number> {
  const { count, error } = await db
    .from('saved_restaurants')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  if (error) {
    console.error('Error getting saved count:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Get saved count for multiple restaurants (for efficient batch queries)
 */
export async function getSavedCounts(restaurantIds: string[]): Promise<Map<string, number>> {
  if (restaurantIds.length === 0) return new Map();

  const { data, error } = await db
    .from('saved_restaurants')
    .select('restaurant_id')
    .in('restaurant_id', restaurantIds);

  if (error) {
    console.error('Error getting saved counts:', error);
    throw error;
  }

  const counts = new Map<string, number>();
  restaurantIds.forEach((id) => counts.set(id, 0));

  (data || []).forEach((item: any) => {
    const id = item.restaurant_id;
    counts.set(id, (counts.get(id) || 0) + 1);
  });

  return counts;
}
