import { useEffect, useRef, useState } from 'react';
// @ts-ignore
// eslint-disable-next-line import/no-unresolved
import * as Notifications from 'expo-notifications';
import { storePushToken } from '@/lib/db/notifications';

/**
 * Initialize push notifications and request permissions
 * Called once on app startup
 */
export function usePushNotifications() {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(null);

  useEffect(() => {
    // Request notification permissions on first load
    const requestPermissions = async () => {
      try {
        // Request permissions
        const { status } = await (Notifications as any).requestPermissionsAsync?.();
        setPermissionStatus(status);

        if (status === 'granted') {
          // Get push token
          try {
            const pushToken = await (Notifications as any).getExpoPushTokenAsync?.({
              projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '',
            } as any);

            if ((pushToken as any)?.data) {
              setToken((pushToken as any).data);
              // Store token in database
              await storePushToken((pushToken as any).data);
            }
          } catch (error) {
            console.error('Error getting push token:', error);
          }
        }
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
      }
    };

    requestPermissions();

    // Listen for incoming notifications
    notificationListener.current = (Notifications as any).addNotificationReceivedListener?.((notification: any) => {
      // Handle incoming notification
      console.log('Notification received:', notification);
    });

    return () => {
      if (notificationListener.current) {
        (Notifications as any).removeNotificationSubscription?.(notificationListener.current);
      }
    };
  }, []);

  return { permissionStatus, token };
}

/**
 * Hook to listen for notification responses (when user taps notification)
 */
export function useNotificationResponse(onNotificationResponse?: (notification: any) => void) {
  const responseListener = useRef<any>(null);

  useEffect(() => {
    responseListener.current = (Notifications as any).addNotificationResponseReceivedListener?.((response: any) => {
      const { notification } = response;
      console.log('Notification response:', notification);

      if (onNotificationResponse) {
        onNotificationResponse(notification);
      }
    });

    return () => {
      if (responseListener.current) {
        (Notifications as any).removeNotificationSubscription?.(responseListener.current);
      }
    };
  }, [onNotificationResponse]);
}

/**
 * Set notification handler defaults
 */
export function setupNotificationHandlers() {
  // Set notification handler - determines what happens when notification arrives
  (Notifications as any).setNotificationHandler?.({
    handleNotification: async (notification: any) => {
      // Show notification even when app is in foreground
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  } as any);
}
