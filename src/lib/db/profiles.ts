import type { Database } from '@/types/database';
import { supabase } from '@/lib/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Fetches the given user's profile row. Returns `null` if not found (e.g. the
 * handle_new_user() trigger hasn't run yet, which should not normally happen).
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Sets a profile's username, completing onboarding. Relies entirely on the database's
 * case-insensitive uniqueness constraint (profiles_username_unique_idx) to reject
 * duplicates — callers should surface the resulting Postgres error to the user rather
 * than pre-checking uniqueness client-side.
 */
export async function setUsername(userId: string, username: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Applies an arbitrary patch to a profile. Onboarding uses this to write username and
 * display_name together, so a rejected username cannot leave a half-applied identity.
 * The same case-insensitive uniqueness caveat as `setUsername` applies.
 */
export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/** True if the error is the case-insensitive username uniqueness violation. */
export function isUsernameTakenError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
