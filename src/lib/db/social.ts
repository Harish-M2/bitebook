import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type PersonSearchResult = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_url'
>;

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

/** Search public, onboarded profiles by username or display name. */
export async function searchPeople(query: string, currentUserId: string): Promise<PersonSearchResult[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const escapedQuery = normalizedQuery.replace(/[\\%_]/g, '\\$&');
  const pattern = `%${escapedQuery}%`;
  const fields = 'id, username, display_name, avatar_url';

  const [usernameMatches, displayNameMatches] = await Promise.all([
    supabase
      .from('profiles')
      .select(fields)
      .not('username', 'is', null)
      .neq('id', currentUserId)
      .ilike('username', pattern)
      .limit(20),
    supabase
      .from('profiles')
      .select(fields)
      .not('username', 'is', null)
      .neq('id', currentUserId)
      .ilike('display_name', pattern)
      .limit(20),
  ]);

  if (usernameMatches.error) throw usernameMatches.error;
  if (displayNameMatches.error) throw displayNameMatches.error;

  const uniqueProfiles = new Map<string, PersonSearchResult>();
  for (const profile of [...(usernameMatches.data ?? []), ...(displayNameMatches.data ?? [])]) {
    uniqueProfiles.set(profile.id, profile);
  }
  return [...uniqueProfiles.values()].slice(0, 20);
}

/** Follow another user. */
export async function followUser(followingId: string): Promise<void> {
  const followerId = await getCurrentUserId();
  if (followerId === followingId) throw new Error('Cannot follow yourself');

  const { error } = await supabase.from('follows').insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error && error.code !== '23505') throw error;
}

/** Unfollow a user. */
export async function unfollowUser(followingId: string): Promise<void> {
  const followerId = await getCurrentUserId();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}

/** Check whether the signed-in user follows another profile. */
export async function isFollowing(followingId: string): Promise<boolean> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', authData.user.id)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

/** Get IDs of profiles a user follows. */
export async function getFollowing(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) throw error;
  return (data ?? []).map((follow) => follow.following_id);
}

/** Get IDs of profiles following a user. */
export async function getFollowers(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);

  if (error) throw error;
  return (data ?? []).map((follow) => follow.follower_id);
}

/** Get follower and following counts for a profile. */
export async function getUserFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ]);

  if (followers.error) throw followers.error;
  if (following.error) throw following.error;

  return {
    followerCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
  };
}

/** Get profiles followed by a user. */
export async function getFollowingProfiles(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url)')
    .eq('follower_id', userId);

  if (error) throw error;
  return (data ?? []).flatMap((follow) => (follow.following ? [follow.following] : []));
}

/** Get profiles following a user. */
export async function getFollowerProfiles(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
    .eq('following_id', userId);

  if (error) throw error;
  return (data ?? []).flatMap((follow) => (follow.follower ? [follow.follower] : []));
}
