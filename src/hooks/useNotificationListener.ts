// Conflux Home — Notification Listener
// Central hub: listens for agent Tauri events, checks user prefs,
// fires native OS notifications, and bridges to TopBar bell via window events.

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

interface NotificationPayload {
  title: string;
  body: string;
}

interface NotificationPrefs {
  masterEnabled: boolean;
  events: {
    taskCompleted: boolean;
    agentError: boolean;
    cronFired: boolean;
    webhookReceived: boolean;
    agentNeedsAttention: boolean;
    heartbeatCheckIn: boolean;
    heartbeatFindingsOnly: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const STORAGE_KEY = 'conflux-notifications';

function getPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* corrupted — use defaults */ }
  return {
    masterEnabled: true,
    events: {
      taskCompleted: true,
      agentError: true,
      cronFired: false,
      webhookReceived: false,
      agentNeedsAttention: true,
      heartbeatCheckIn: true,
      heartbeatFindingsOnly: false,
    },
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  };
}

function isInQuietHours(quietHours: NotificationPrefs['quietHours']): boolean {
  if (!quietHours.enabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = quietHours.start.split(':').map(Number);
  const [endH, endM] = quietHours.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g. 09:00–17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight range (e.g. 22:00–08:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function shouldShowNotification(title: string, body: string): boolean {
  const prefs = getPrefs();
  if (!prefs.masterEnabled) return false;
  if (isInQuietHours(prefs.quietHours)) return false;

  const lower = `${title} ${body}`.toLowerCase();

  // Heartbeat notifications (agent emoji + name, or "Team Check-in" / "Team Alert")
  const isHeartbeat =
    lower.includes('team check-in') ||
    lower.includes('team alert') ||
    lower.includes('🛡️') || lower.includes('aegis') ||
    lower.includes('🔬') || lower.includes('helix') ||
    lower.includes('💚') || lower.includes('pulse') ||
    lower.includes('🐍') || lower.includes('viper') ||
    lower.includes('🎯') || lower.includes('horizon') ||
    lower.includes('🧠') || lower.includes('orbit') ||
    lower.includes('🔥') || lower.includes('hearth') ||
    lower.includes('🫂') || lower.includes('echo') ||
    (lower.includes('🤖') && lower.includes('conflux'));

  if (isHeartbeat) {
    if (!prefs.events.heartbeatCheckIn) return false;
    // If "findings only" is on, suppress routine "all clear" notifications
    if (prefs.events.heartbeatFindingsOnly) {
      const isRoutine = lower.includes('all clear') || lower.includes('all reported in') || lower.includes('no issues');
      if (isRoutine) return false;
    }
    return true;
  }

  // Classify by content keywords → event type toggle
  if (lower.includes('error') || lower.includes('failed') || lower.includes('critical')) {
    return prefs.events.agentError;
  }
  if (lower.includes('cron') || lower.includes('scheduled') || lower.includes('ritual')) {
    return prefs.events.cronFired;
  }
  if (lower.includes('webhook')) {
    return prefs.events.webhookReceived;
  }
  if (lower.includes('task') && (lower.includes('complete') || lower.includes('done') || lower.includes('finished'))) {
    return prefs.events.taskCompleted;
  }
  if (lower.includes('attention') || lower.includes('permission') || lower.includes('review')) {
    return prefs.events.agentNeedsAttention;
  }
  // Default: allow through (general agent notifications like Pulse insights)
  return true;
}

export default function useNotificationListener() {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    async function setup() {
      // Request OS notification permission
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

      // Handler: check prefs → native OS notification + bridge to TopBar bell
      const handleNotification = (title: string, body: string) => {
        // Always bridge to TopBar bell (badge + dropdown), even if OS notif is suppressed
        window.dispatchEvent(
          new CustomEvent('conflux:agent-notification', { detail: { title, body } })
        );

        // Check prefs before firing native OS notification
        if (!shouldShowNotification(title, body)) return;
        if (permissionGranted) {
          sendNotification({ title, body });
        }
      };

      // Listen for direct agent notifications (from execute_notify / engine_send_notification)
      const unlisten1 = await listen<NotificationPayload>('conflux:agent-notification', (event) => {
        const { title, body } = event.payload;
        handleNotification(title, body);
      });

      // Listen for engine events (cron, security, etc.)
      const unlisten2 = await listen<string>('engine:event', (event) => {
        try {
          const data = JSON.parse(event.payload);
          if (data.event_type === 'agent_notification' && data.payload) {
            const notif = JSON.parse(data.payload);
            handleNotification(notif.title, notif.body);
          }
        } catch {
          // Not a notification event, ignore
        }
      });

      // Listen for security permission prompts (from send_security_notification)
      const unlisten3 = await listen<NotificationPayload>('security:permission_prompt', (event) => {
        const { title, body } = event.payload;
        handleNotification(title, body);
      });

      unlisten = () => { unlisten1(); unlisten2(); unlisten3(); };
    }

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}
