import { supabase } from '@/lib/supabase';

/**
 * Follow another user
 */
export async function followUser(followingId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) {
    throw new Error('Not authenticated');
  }

  if (user.user.id === followingId) {
    throw new Error('Cannot follow yourself');
  }

  const { error } = await (supabase
    .from("following" as any)
    .insert({
      follower_id: user.user.id,
      following_id: followingId,
    }) as any);

  if (error) {
    console.error('[Bitebook] Failed to follow user:', error);
    throw error;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followingId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) {
    throw new Error('Not authenticated');
  }

  const { error } = await (supabase
    .from("following" as any)
    .delete()
    .eq('follower_id', user.user.id)
    .eq('following_id', followingId) as any);

  if (error) {
    console.error('[Bitebook] Failed to unfollow user:', error);
    throw error;
  }
}

/**
 * Check if current user follows another user
 */
export async function isFollowing(followingId: string): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) {
    return false;
  }

  const { data, error } = await (supabase
    .from("following" as any)
    .select('id')
    .eq('follower_id', user.user.id)
    .eq('following_id', followingId)
    .single() as any);

  if (error && error.code === 'PGRST116') {
    // Not following
    return false;
  }

  if (error) {
    console.error('[Bitebook] Failed to check following status:', error);
    return false;
  }

  return !!data;
}

/**
 * Get list of users that a user is following
 */
export async function getFollowing(userId: string) {
  const { data, error } = await (supabase
    .from("following" as any)
    .select('following_id')
    .eq('follower_id', userId) as any);

  if (error) {
    console.error('[Bitebook] Failed to fetch following list:', error);
    throw error;
  }

  return (data || []).map((f: any) => f.following_id);
}

/**
 * Get list of users following a user
 */
export async function getFollowers(userId: string) {
  const { data, error } = await (supabase
    .from("following" as any)
    .select('follower_id')
    .eq('following_id', userId) as any);

  if (error) {
    console.error('[Bitebook] Failed to fetch followers:', error);
    throw error;
  }

  return (data || []).map((f: any) => f.follower_id);
}

/**
 * Get follower and following counts for a user
 */
export async function getUserFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    getFollowers(userId),
    getFollowing(userId),
  ]);

  return {
    followerCount: followers.length,
    followingCount: following.length,
  };
}

/**
 * Get profiles of users that a user is following (with full profile data)
 */
export async function getFollowingProfiles(userId: string) {
  const { data, error } = await (supabase
    .from("following" as any)
    .select('following:profiles(id, full_name, avatar_url)')
    .eq('follower_id', userId) as any);

  if (error) {
    console.error('[Bitebook] Failed to fetch following profiles:', error);
    throw error;
  }

  return (data || []).map((f: any) => f.following);
}

/**
 * Get profiles of users following a user (with full profile data)
 */
export async function getFollowerProfiles(userId: string) {
  const { data, error } = await (supabase
    .from("following" as any)
    .select('follower:profiles(id, full_name, avatar_url)')
    .eq('following_id', userId) as any);

  if (error) {
    console.error('[Bitebook] Failed to fetch follower profiles:', error);
    throw error;
  }

  return (data || []).map((f: any) => f.follower);
}
