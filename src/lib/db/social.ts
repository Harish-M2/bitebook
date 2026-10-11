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
    .select('following:profiles!follows_following_id_fkey(id, username, display_name, avatar_url, bio, dishes_logged_count, restaurants_visited_count, average_rating)')
    .eq('follower_id', userId);

  if (error) throw error;
  return (data ?? []).flatMap((follow) => (follow.following ? [follow.following] : []));
}

/** Get profiles following a user. */
export async function getFollowerProfiles(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio, dishes_logged_count, restaurants_visited_count, average_rating)')
    .eq('following_id', userId);

  if (error) throw error;
  return (data ?? []).flatMap((follow) => (follow.follower ? [follow.follower] : []));
}

export type SocialContext = {
  /** Profile ids (from the given list) that follow the current user. */
  followsMe: Set<string>;
  /** For each profile id, names of people the current user follows who also follow them. */
  mutualNames: Map<string, string[]>;
  /** Up to three most-reviewed cuisines per profile, from reviews visible to the viewer. */
  topCuisines: Map<string, string[]>;
};

/** Batched "follows you" and mutual-follower lookup for a list of profiles. */
export async function getSocialContext(
  currentUserId: string,
  profileIds: string[],
): Promise<SocialContext> {
  const context: SocialContext = {
    followsMe: new Set(),
    mutualNames: new Map(),
    topCuisines: new Map(),
  };
  if (profileIds.length === 0) return context;

  const [followsMeResult, myFollowing] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', currentUserId)
      .in('follower_id', profileIds),
    getFollowing(currentUserId),
  ]);
  if (followsMeResult.error) throw followsMeResult.error;
  for (const row of followsMeResult.data ?? []) context.followsMe.add(row.follower_id);

  // Derived from reviews so it respects review visibility (RLS); no extra table is exposed.
  const cuisineResult = await supabase
    .from('reviews')
    .select('user_id, dish:dishes!reviews_dish_id_fkey(dish_cuisines(cuisine:cuisines(name)))')
    .in('user_id', profileIds)
    .is('restaurant_review_id', null)
    .limit(500);
  if (cuisineResult.error) throw cuisineResult.error;
  const tallies = new Map<string, Map<string, number>>();
  for (const row of cuisineResult.data ?? []) {
    for (const link of row.dish?.dish_cuisines ?? []) {
      const cuisine = link.cuisine?.name;
      if (!cuisine) continue;
      const tally = tallies.get(row.user_id) ?? new Map<string, number>();
      tally.set(cuisine, (tally.get(cuisine) ?? 0) + 1);
      tallies.set(row.user_id, tally);
    }
  }
  for (const [id, tally] of tallies) {
    context.topCuisines.set(
      id,
      [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name),
    );
  }

  if (myFollowing.length === 0) return context;
  const { data, error } = await supabase
    .from('follows')
    .select('following_id, follower:profiles!follows_follower_id_fkey(display_name, username)')
    .in('following_id', profileIds)
    .in('follower_id', myFollowing);
  if (error) throw error;
  for (const row of data ?? []) {
    const name = row.follower?.display_name || row.follower?.username;
    if (!name || row.following_id === currentUserId) continue;
    const names = context.mutualNames.get(row.following_id) ?? [];
    names.push(name);
    context.mutualNames.set(row.following_id, names);
  }
  return context;
}
