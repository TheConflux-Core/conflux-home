// Conflux Home — Notification Settings
// Desktop notification preferences with quiet hours and test button.

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// ── Local ToggleSwitch (copied from Settings.tsx pattern) ──

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`toggle-switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-label={checked ? 'Disable' : 'Enable'}
      type="button"
    >
      <span className="toggle-knob" />
    </button>
  );
}

// ── Types ──

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
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

const DEFAULT_PREFS: NotificationPrefs = {
  masterEnabled: true,
  events: {
    taskCompleted: true,
    agentError: true,
    cronFired: false,
    webhookReceived: false,
    agentNeedsAttention: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

const STORAGE_KEY = 'conflux-notifications';

const EVENT_ITEMS = [
  { key: 'taskCompleted' as const, label: 'Task completed', emoji: '✅' },
  { key: 'agentError' as const, label: 'Agent error', emoji: '⚠️' },
  { key: 'cronFired' as const, label: 'Cron fired', emoji: '⏰' },
  { key: 'webhookReceived' as const, label: 'Webhook received', emoji: '🔗' },
  { key: 'agentNeedsAttention' as const, label: 'Agent needs attention', emoji: '🚨' },
];

// ── Quiet Hours Timeline Bar ──

function QuietHoursBar({ start, end }: { start: string; end: string }) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  // Compute left/width percentages on a 1440-minute (24h) scale
  let quietLeft: number;
  let quietWidth: number;

  if (startMinutes <= endMinutes) {
    // Same day range (e.g., 08:00 to 22:00)
    quietLeft = (startMinutes / 1440) * 100;
    quietWidth = ((endMinutes - startMinutes) / 1440) * 100;
  } else {
    // Overnight range (e.g., 22:00 to 08:00) — wraps around
    quietLeft = (startMinutes / 1440) * 100;
    quietWidth = ((1440 - startMinutes + endMinutes) / 1440) * 100;
  }

  // Hour labels at 0, 6, 12, 18
  const hourMarkers = [0, 6, 12, 18];

  return (
    <div style={{ marginTop: 8 }}>
      {/* Timeline bar */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 24,
          background: 'var(--border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {/* Quiet period highlight */}
        <div
          style={{
            position: 'absolute',
            left: `${quietLeft}%`,
            width: `${quietWidth}%`,
            height: '100%',
            background: 'var(--accent-primary)',
            opacity: 0.3,
            borderRadius: 6,
          }}
        />
        {/* Overnight wrap indicator */}
        {startMinutes > endMinutes && (
          <>
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: `${(endMinutes / 1440) * 100}%`,
                height: '100%',
                background: 'var(--accent-primary)',
                opacity: 0.3,
                borderRadius: 6,
              }}
            />
          </>
        )}
      </div>

      {/* Hour labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontSize: 10,
          color: 'var(--text-muted)',
        }}
      >
        {hourMarkers.map((h) => (
          <span key={h}>{String(h).padStart(2, '0')}:00</span>
        ))}
      </div>
    </div>
  );
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ── Main Component ──

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [testMsg, setTestMsg] = useState<string>('');
  const [testing, setTesting] = useState(false);

  // Load prefs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPrefs({ ...DEFAULT_PREFS, ...parsed, events: { ...DEFAULT_PREFS.events, ...parsed.events }, quietHours: { ...DEFAULT_PREFS.quietHours, ...parsed.quietHours } });
      }
    } catch {
      // Corrupted data — use defaults
    }
  }, []);

  // Persist on change
  const updatePrefs = useCallback((updater: (prev: NotificationPrefs) => NotificationPrefs) => {
    setPrefs((prev) => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleMasterToggle = (enabled: boolean) => {
    updatePrefs((prev) => ({ ...prev, masterEnabled: enabled }));
  };

  const handleEventToggle = (key: keyof NotificationPrefs['events'], value: boolean) => {
    updatePrefs((prev) => ({
      ...prev,
      events: { ...prev.events, [key]: value },
    }));
  };

  const handleQuietToggle = (enabled: boolean) => {
    updatePrefs((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, enabled },
    }));
  };

  const handleQuietStart = (value: string) => {
    updatePrefs((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, start: value },
    }));
  };

  const handleQuietEnd = (value: string) => {
    updatePrefs((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, end: value },
    }));
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setTestMsg('');
    try {
      await invoke('engine_send_notification', {
        req: {
          title: 'Conflux Home Test',
          body: 'Notifications are working!',
          channel: 'desktop',
        },
      });
      setTestMsg('✅ Test notification sent successfully');
    } catch (err) {
      setTestMsg(`❌ Failed: ${err}`);
    } finally {
      setTesting(false);
      setTimeout(() => setTestMsg(''), 5000);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">🔔 Notifications</div>

      {/* Master Toggle */}
      <div className="settings-row" style={{ marginBottom: 16 }}>
        <span className="settings-label" style={{ fontSize: 14, fontWeight: 600 }}>
          Desktop Notifications
        </span>
        <ToggleSwitch checked={prefs.masterEnabled} onChange={handleMasterToggle} />
      </div>

      {/* Event Toggles */}
      {prefs.masterEnabled && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
            {EVENT_ITEMS.map((item) => (
              <div
                key={item.key}
                className="settings-row"
                style={{ padding: '10px 0' }}
              >
                <span className="settings-label">
                  {item.emoji} {item.label}
                </span>
                <ToggleSwitch
                  checked={prefs.events[item.key]}
                  onChange={(v) => handleEventToggle(item.key, v)}
                />
              </div>
            ))}
          </div>

          {/* Quiet Hours */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div className="settings-row" style={{ marginBottom: 8 }}>
              <span className="settings-label">Quiet Hours</span>
              <ToggleSwitch checked={prefs.quietHours.enabled} onChange={handleQuietToggle} />
            </div>

            {prefs.quietHours.enabled && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      Start
                    </label>
                    <input
                      className="settings-input"
                      type="time"
                      value={prefs.quietHours.start}
                      onChange={(e) => handleQuietStart(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 16,
                      marginTop: 16,
                    }}
                  >
                    →
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      End
                    </label>
                    <input
                      className="settings-input"
                      type="time"
                      value={prefs.quietHours.end}
                      onChange={(e) => handleQuietEnd(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <QuietHoursBar
                  start={prefs.quietHours.start}
                  end={prefs.quietHours.end}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* Test Button */}
      <div className="settings-actions">
        <button
          className="settings-button"
          onClick={handleTestNotification}
          disabled={testing}
        >
          {testing ? '⏳ Sending...' : '🔔 Send Test Notification'}
        </button>
      </div>

      {/* Test message toast */}
      {testMsg && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            background: testMsg.startsWith('✅')
              ? 'rgba(52,199,89,0.08)'
              : 'rgba(255,68,68,0.08)',
            color: testMsg.startsWith('✅') ? '#34c759' : '#ff6666',
          }}
        >
          {testMsg}
        </div>
      )}
    </div>
  );
}
