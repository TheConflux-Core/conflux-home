// Conflux Home — Notification Listener
// Listens for agent_notification events from the Rust backend,
// shows native desktop notifications, and bridges to the TopBar bell UI.
// Also enforces quiet hours and per-event-type preferences.

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

interface NotificationPayload {
  title: string;
  body: string;
  eventType?: string; // e.g. 'heartbeatCompleted', 'taskCompleted', 'agentError'
}

interface NotificationPrefs {
  masterEnabled: boolean;
  events: {
    taskCompleted: boolean;
    agentError: boolean;
    cronFired: boolean;
    webhookReceived: boolean;
    agentNeedsAttention: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
  };
}

const PREFS_KEY = 'conflux-notifications';

/** Check if current time falls within quiet hours. */
function isQuietHoursActive(quietHours: NotificationPrefs['quietHours']): boolean {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = quietHours.start.split(':').map(Number);
  const [endH, endM] = quietHours.end.split(':').map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g., 09:00–17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight range (e.g., 22:00–08:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/** Load notification preferences from localStorage. */
function loadPrefs(): NotificationPrefs | null {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Corrupted — ignore
  }
  return null;
}

/** Determine if a notification should be shown based on prefs + quiet hours. */
function shouldShowNotification(eventType?: string): boolean {
  const prefs = loadPrefs();
  if (!prefs) return true; // No prefs saved — default to showing
  if (!prefs.masterEnabled) return false;
  if (isQuietHoursActive(prefs.quietHours)) return false;

  // Check per-event toggle if we know the event type
  if (eventType && prefs.events && eventType in prefs.events) {
    const key = eventType as keyof NotificationPrefs['events'];
    if (!prefs.events[key]) return false;
  }

  return true;
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

      // Listen for Tauri events from the Rust backend (conflux:notification)
      unlisten = await listen<NotificationPayload>('conflux:notification', (event) => {
        const { title, body, eventType } = event.payload;

        // Bridge to TopBar bell — dispatch DOM custom event
        window.dispatchEvent(
          new CustomEvent('conflux:agent-notification', { detail: { title, body } })
        );

        // Check quiet hours + master toggle + per-event toggle before showing OS notification
        if (shouldShowNotification(eventType)) {
          sendNotification({ title, body });
        }
      });

      // Also listen for generic engine events that contain notification data
      const unlisten2 = await listen<string>('engine:event', (event) => {
        try {
          const data = JSON.parse(event.payload);
          if (data.event_type === 'agent_notification' && data.payload) {
            const notif = JSON.parse(data.payload);

            // Bridge to TopBar bell
            window.dispatchEvent(
              new CustomEvent('conflux:agent-notification', { detail: { title: notif.title, body: notif.body } })
            );

            // Check prefs before OS notification
            if (shouldShowNotification()) {
              sendNotification({ title: notif.title, body: notif.body });
            }
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
