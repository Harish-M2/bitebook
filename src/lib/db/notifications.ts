import { supabase } from '@/lib/supabase';

const db = supabase as any;

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_token?: string;
  friend_reviews: boolean;
  friend_follows: boolean;
  restaurant_updates: boolean;
  app_announcements: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  actor_id?: string;
  restaurant_id?: string;
  review_id?: string;
  is_read: boolean;
  sent_at: string;
  read_at?: string;
  created_at: string;
}

/**
 * Get or create notification preferences for the current user
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) throw new Error('Not authenticated');

  let { data, error } = await db
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userData.user.id)
    .single();

  // If preferences don't exist, create them with defaults
  if (error && error.code === 'PGRST116') {
    const { data: newPrefs, error: insertError } = await db
      .from('notification_preferences')
      .insert({
        user_id: userData.user.id,
        friend_reviews: true,
        friend_follows: true,
        restaurant_updates: false,
        app_announcements: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    data = newPrefs;
  } else if (error) {
    throw error;
  }

  return data;
}

/**
 * Update notification preferences for the current user
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) throw new Error('Not authenticated');

  const { data, error } = await db
    .from('notification_preferences')
    .update({
      ...preferences,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userData.user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Store push token for the current user
 */
export async function storePushToken(token: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) throw new Error('Not authenticated');

  const { error } = await db
    .from('notification_preferences')
    .update({ push_token: token })
    .eq('user_id', userData.user.id);

  if (error) throw error;
}

/**
 * Get all unread notifications for the current user
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return [];

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all notifications for the current user
 */
export async function getAllNotifications(limit: number = 50, offset: number = 0): Promise<Notification[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return [];

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) throw new Error('Not authenticated');

  const { error } = await db
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userData.user.id)
    .eq('is_read', false);

  if (error) throw error;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return 0;

  const { count, error } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userData.user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Log a notification event (called by Edge Function or server)
 * Note: Only service_role can insert, not authenticated users
 */
export async function logNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  actorId?: string,
  restaurantId?: string,
  reviewId?: string
): Promise<Notification> {
  const { data, error } = await db
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      actor_id: actorId,
      restaurant_id: restaurantId,
      review_id: reviewId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
