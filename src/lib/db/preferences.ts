import { supabase } from '@/lib/supabase';

/**
 * Replaces the user's favourite-cuisine selection. Onboarding lets the user move back and
 * forth between steps, so this clears the existing rows first rather than upserting, keeping
 * the stored set an exact mirror of what is on screen.
 *
 * RLS ("users can manage their own cuisine preferences") restricts both statements to the
 * caller's own rows, so the userId argument cannot be used to write someone else's.
 */
export async function setCuisinePreferences(userId: string, cuisineIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('user_cuisine_preferences')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    throw deleteError;
  }

  if (cuisineIds.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from('user_cuisine_preferences')
    .insert(cuisineIds.map((cuisineId) => ({ user_id: userId, cuisine_id: cuisineId })));

  if (insertError) {
    throw insertError;
  }
}

/** The cuisine ids the user has already picked. */
export async function getCuisinePreferences(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_cuisine_preferences')
    .select('cuisine_id')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => row.cuisine_id);
}
