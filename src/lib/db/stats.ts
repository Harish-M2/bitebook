import { supabase } from '@/lib/supabase';
import type { CuisineStat, DiaryStats } from '@/types/models';

/**
 * Diary summary counters. These are denormalised columns on `profiles`, maintained by the
 * triggers in 0018_counters_triggers.sql, so this is a single-row read rather than four
 * aggregate queries.
 */
export async function getDiaryStats(userId: string): Promise<DiaryStats> {
  const { data, error } = await supabase
    .from('profiles')
    .select('dishes_logged_count, restaurants_visited_count, cuisines_explored_count, average_rating')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    dishesLogged: data?.dishes_logged_count ?? 0,
    restaurantsVisited: data?.restaurants_visited_count ?? 0,
    cuisinesExplored: data?.cuisines_explored_count ?? 0,
    // Null until the user has rated anything — not zero, but zero is what the UI shows.
    averageRating: data?.average_rating ?? 0,
  };
}

/**
 * Cuisine breakdown, derived from what the user has actually logged rather than the
 * cuisines they picked during onboarding — the point of the chart is to show real habits,
 * which routinely differ from stated preferences.
 *
 * Percentages are relative to the most-logged cuisine (the bar widths are proportional to
 * the leader, not to the total), matching how the CuisineBreakdown component renders.
 */
export async function getCuisineBreakdown(userId: string): Promise<CuisineStat[]> {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('dish:dishes(dish_cuisines(cuisine:cuisines(name)))')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const link of row.dish?.dish_cuisines ?? []) {
      const name = link.cuisine?.name;
      if (name) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const leader = sorted[0]?.[1] ?? 0;

  return sorted.map(([cuisine, dishCount]) => ({
    cuisine,
    dishCount,
    percentage: leader === 0 ? 0 : Math.round((dishCount / leader) * 100),
  }));
}
