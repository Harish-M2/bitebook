import { formatPriceLevel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/types/models';

export async function saveRestaurant(restaurantId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: existing, error: existingError } = await supabase
    .from('saved_dishes')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (existingError) throw existingError;

  const result = existing
    ? await supabase.from('saved_dishes').update({ status: 'want_to_eat' }).eq('id', existing.id)
    : await supabase.from('saved_dishes').insert({
        user_id: userData.user.id,
        restaurant_id: restaurantId,
        status: 'want_to_eat',
      });

  if (result.error) throw result.error;
  return true;
}

export async function unsaveRestaurant(restaurantId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('saved_dishes')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('restaurant_id', restaurantId);

  if (error) throw error;
  return true;
}

export async function isSaved(restaurantId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase
    .from('saved_dishes')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function getSavedRestaurants(limit = 20, offset = 0): Promise<Restaurant[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('saved_dishes')
    .select(`
      created_at,
      restaurant:restaurants(
        id,
        name,
        city,
        price_level,
        image_url,
        restaurant_cuisines(cuisine:cuisines(name, slug))
      )
    `)
    .eq('user_id', userData.user.id)
    .eq('status', 'want_to_eat')
    .not('restaurant_id', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (data ?? []).flatMap((item) => {
    const restaurant = item.restaurant;
    if (!restaurant) return [];

    return [{
      id: restaurant.id,
      name: restaurant.name,
      cuisine: restaurant.restaurant_cuisines?.[0]?.cuisine?.name ?? '',
      priceLevel: formatPriceLevel(restaurant.price_level),
      city: restaurant.city ?? '',
      rating: 0,
      reviewCount: 0,
      imageUrl: restaurant.image_url,
    } satisfies Restaurant];
  });
}

export async function getSavedCount(restaurantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('saved_dishes')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'want_to_eat');

  if (error) throw error;
  return count ?? 0;
}

export async function getSavedCounts(restaurantIds: string[]): Promise<Map<string, number>> {
  if (restaurantIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('saved_dishes')
    .select('restaurant_id')
    .in('restaurant_id', restaurantIds)
    .eq('status', 'want_to_eat');

  if (error) throw error;

  const counts = new Map<string, number>();
  restaurantIds.forEach((id) => counts.set(id, 0));
  (data ?? []).forEach((item) => {
    if (item.restaurant_id) counts.set(item.restaurant_id, (counts.get(item.restaurant_id) ?? 0) + 1);
  });

  return counts;
}
