import type { Database } from '@/types/database';
import { supabase } from '@/lib/supabase';

export type Cuisine = Database['public']['Tables']['cuisines']['Row'];

/**
 * Lists the cuisine taxonomy (seeded by 0023_seed_cuisines.sql, publicly readable).
 * Returns an empty array if the taxonomy has not been seeded on this environment —
 * callers must treat that as "skip the step", not as an error.
 */
export async function listCuisines(): Promise<Cuisine[]> {
  const { data, error } = await supabase.from('cuisines').select('*').order('name');

  if (error) {
    throw error;
  }
  return data ?? [];
}
