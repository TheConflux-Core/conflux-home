// Conflux Home — Notification Listener
// Listens for agent_notification events and shows native desktop notifications.

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

interface NotificationPayload {
  title: string;
  body: string;
}

export default function useNotificationListener() {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    async function setup() {
      // Request notification permission
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      if (!permissionGranted) {
        console.warn('[Notifications] Permission not granted');
        return;
      }

      // Listen for agent notification events
      unlisten = await listen<NotificationPayload>('conflux:notification', (event) => {
        const { title, body } = event.payload;
        sendNotification({ title, body });
      });

      // Also listen for events from the engine
      const unlisten2 = await listen<string>('engine:event', (event) => {
        try {
          const data = JSON.parse(event.payload);
          if (data.event_type === 'agent_notification' && data.payload) {
            const notif = JSON.parse(data.payload);
            sendNotification({ title: notif.title, body: notif.body });
          }
        } catch {
          // Not a notification event, ignore
        }
      });

      const cleanup1 = unlisten;
      const cleanup2 = unlisten2;
      unlisten = () => { cleanup1(); cleanup2(); };
    }

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}
