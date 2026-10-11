import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type VisitRow = Database['public']['Tables']['restaurant_visits']['Row'];

export type VisitedRestaurant = VisitRow & {
  restaurant: { id: string; name: string; city: string | null; image_url: string | null } | null;
};

/** The signed-in user's visit record for a restaurant, or null if not marked visited. */
export async function getVisit(restaurantId: string): Promise<VisitRow | null> {
  const { data, error } = await supabase
    .from('restaurant_visits')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Idempotent: marking an already-visited restaurant keeps the existing row. */
export async function markVisited(userId: string, restaurantId: string): Promise<VisitRow> {
  const { data, error } = await supabase
    .from('restaurant_visits')
    .upsert(
      { user_id: userId, restaurant_id: restaurantId },
      { onConflict: 'user_id,restaurant_id', ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const existing = await getVisit(restaurantId);
  if (!existing) throw new Error('Could not mark this restaurant as visited.');
  return existing;
}

export async function unmarkVisited(restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('restaurant_visits')
    .delete()
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}

export async function updateVisit(
  visitId: string,
  changes: { notes?: string | null; visited_at?: string },
): Promise<void> {
  const { error } = await supabase.from('restaurant_visits').update(changes).eq('id', visitId);
  if (error) throw error;
}

export async function listVisited(): Promise<VisitedRestaurant[]> {
  const { data, error } = await supabase
    .from('restaurant_visits')
    .select('*, restaurant:restaurants(id, name, city, image_url)')
    .order('visited_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Dish ids the user remembers having on a visit (no rating or review involved). */
export async function listVisitDishIds(visitId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('restaurant_visit_dishes')
    .select('dish_id')
    .eq('visit_id', visitId);
  if (error) throw error;
  return (data ?? []).map((row) => row.dish_id);
}

export async function addVisitDish(visitId: string, dishId: string): Promise<void> {
  const { error } = await supabase
    .from('restaurant_visit_dishes')
    .upsert({ visit_id: visitId, dish_id: dishId }, { onConflict: 'visit_id,dish_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeVisitDish(visitId: string, dishId: string): Promise<void> {
  const { error } = await supabase
    .from('restaurant_visit_dishes')
    .delete()
    .eq('visit_id', visitId)
    .eq('dish_id', dishId);
  if (error) throw error;
}

export async function getVisitById(visitId: string): Promise<VisitedRestaurant | null> {
  const { data, error } = await supabase
    .from('restaurant_visits')
    .select('*, restaurant:restaurants(id, name, city, image_url)')
    .eq('id', visitId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Restaurant ids the user has publicly or privately reviewed, to show review state. */
export async function listReviewedRestaurantIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('restaurant_id')
    .eq('user_id', userId);
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.restaurant_id))];
}
