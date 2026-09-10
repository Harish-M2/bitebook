import type { Profile } from './profiles';
import { supabase } from '@/lib/supabase';

/**
 * Profiles to suggest during onboarding: the most active loggers, excluding the current
 * user and anyone who has not finished onboarding themselves (username still null).
 *
 * A brand-new environment has no other users, so an empty result is expected and must be
 * treated as "skip the step" rather than an error.
 */
export async function listSuggestedProfiles(userId: string, limit = 10): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', userId)
    .not('username', 'is', null)
    .order('dishes_logged_count', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data ?? [];
}

/**
 * Follows each of the given profiles. Self-follows are rejected by the
 * follows_no_self_follow check constraint, and duplicates by the primary key.
 */
export async function followProfiles(userId: string, followingIds: string[]): Promise<void> {
  if (followingIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('follows')
    .insert(followingIds.map((followingId) => ({ follower_id: userId, following_id: followingId })));

  if (error) {
    throw error;
  }
}
