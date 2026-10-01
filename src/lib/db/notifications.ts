import { supabase } from '@/lib/supabase';
import type { Database, Enums } from '@/types/database';

export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferenceKey =
  | 'friend_reviews'
  | 'friend_follows'
  | 'restaurant_updates'
  | 'app_announcements';
export type NotificationPreferenceUpdate = Partial<
  Pick<NotificationPreferences, NotificationPreferenceKey | 'push_token'>
>;

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type NotificationProfile = Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'username'>;
type NotificationWithActor = NotificationRow & { actor: NotificationProfile | null };

export type Notification = {
  id: string;
  user_id: string;
  type: Enums<'notification_type'>;
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

function toNotification(row: NotificationWithActor): Notification {
  const actor = row.actor?.display_name ?? row.actor?.username ?? 'Someone';
  const copy: Record<Enums<'notification_type'>, { title: string; body: string }> = {
    follow: { title: 'New follower', body: `${actor} followed you.` },
    like: { title: 'New like', body: `${actor} liked one of your reviews.` },
    comment: { title: 'New comment', body: `${actor} commented on one of your reviews.` },
    mention: { title: 'You were mentioned', body: `${actor} mentioned you.` },
  };
  const text = copy[row.type];

  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: text.title,
    body: text.body,
    is_read: row.read_at !== null,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

async function readNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Get or create notification preferences for the signed-in user. */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const userId = await getCurrentUserId();
  const existing = await readNotificationPreferences(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('notification_preferences')
    .insert({ user_id: userId })
    .select()
    .single();

  if (!error) return data;
  if (error.code === '23505') {
    const concurrentInsert = await readNotificationPreferences(userId);
    if (concurrentInsert) return concurrentInsert;
  }
  throw error;
}

/** Update delivery preferences for the signed-in user. */
export async function updateNotificationPreferences(
  preferences: NotificationPreferenceUpdate,
): Promise<NotificationPreferences> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('notification_preferences')
    .update(preferences)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Store the push token for the signed-in user. */
export async function storePushToken(token: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('notification_preferences')
    .update({ push_token: token })
    .eq('user_id', userId);

  if (error) throw error;
}

const NOTIFICATION_SELECT = `
  id,
  user_id,
  type,
  actor_id,
  target_id,
  read_at,
  created_at,
  actor:profiles!notifications_actor_id_fkey(display_name, username)
`;

/** Get unread notifications for the signed-in user. */
export async function getUnreadNotifications(): Promise<Notification[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as NotificationWithActor[]).map(toNotification);
}

/** Get a page of notifications for the signed-in user. */
export async function getAllNotifications(limit = 50, offset = 0): Promise<Notification[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return ((data ?? []) as unknown as NotificationWithActor[]).map(toNotification);
}

/** Mark one notification as read. */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
}

/** Mark all notifications as read for the signed-in user. */
export async function markAllNotificationsAsRead(): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw error;
}

/** Get unread notification count for the signed-in user. */
export async function getUnreadCount(): Promise<number> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authData.user.id)
    .is('read_at', null);

  if (error) throw error;
  return count ?? 0;
}
