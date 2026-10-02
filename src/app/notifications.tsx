import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { BodyText, Caption, Heading, MetadataText } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/hooks/useTheme';
import {
  getAllNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
} from '@/lib/db/notifications';

function formatWhen(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Notifications screen — reached from the bell on the home feed. */
export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const notifications = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getAllNotifications(),
    enabled: userId !== null,
  });

  const refreshUnread = () =>
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', userId] });

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    await Promise.all([notifications.refetch(), refreshUnread()]);
  };

  const handlePress = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      await Promise.all([notifications.refetch(), refreshUnread()]);
    }
  };

  const hasUnread = (notifications.data ?? []).some((n) => !n.is_read);

  return (
    <Screen>
      <View className="w-full flex-1 gap-lg self-center px-lg pt-sm" style={{ maxWidth: 760 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-md">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="h-10 w-10 items-center justify-center rounded-pill border border-border">
              <ArrowLeft size={20} color={colors.textPrimary} />
            </Pressable>
            <Heading level={2}>Notifications</Heading>
          </View>
          {hasUnread ? (
            <Pressable
              onPress={() => void handleMarkAllRead()}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
              hitSlop={8}>
              <Caption color="accent">Mark all read</Caption>
            </Pressable>
          ) : null}
        </View>

        {notifications.isPending ? (
          <View className="items-center py-xl">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : notifications.isError ? (
          <ErrorState
            title="Could not load notifications"
            description={notifications.error.message}
            onRetry={() => void notifications.refetch()}
          />
        ) : notifications.data.length === 0 ? (
          <EmptyState
            icon={<Bell size={32} color={colors.textMuted} />}
            title="No notifications yet"
            description="When people follow you or interact with your reviews, you'll see it here."
          />
        ) : (
          <FlatList
            data={notifications.data}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => void handlePress(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                className="flex-row items-start gap-md py-sm"
                style={{ opacity: item.is_read ? 0.6 : 1 }}>
                {!item.is_read ? (
                  <View
                    className="mt-xs h-2 w-2 rounded-pill"
                    style={{ backgroundColor: colors.accent }}
                  />
                ) : (
                  <View className="mt-xs h-2 w-2" />
                )}
                <View className="flex-1 gap-xxs">
                  <BodyText medium>{item.title}</BodyText>
                  <Caption color="textSecondary">{item.body}</Caption>
                  <MetadataText color="textSecondary">{formatWhen(item.created_at)}</MetadataText>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </Screen>
  );
}
