import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerDevicePushToken } from '../lib/notifications';

// Responsible for requesting notification permissions and
// registering the Expo push token with Supabase on app startup.
export function PushInitializer() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      // For newer expo-notifications typings
      // (ignored on platforms that don't use them)
      //@ts-ignore
      shouldShowBanner: true,
      //@ts-ignore
      shouldShowList: true,
    }),
  });
  useEffect(() => {
    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const projectId =
          (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
          (Constants as any)?.easConfig?.projectId;
        const tokenResult = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const token = tokenResult?.data;
        if (token) {
          await registerDevicePushToken(token);
        }
      } catch (e: any) {
        console.warn('[push] registration failed', e?.message || e);
      }
    })();
  }, []);

  return null;
}
