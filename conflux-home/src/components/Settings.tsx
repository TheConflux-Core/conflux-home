import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AGENT_PROFILES, AGENT_PROFILE_MAP } from '../data/agent-descriptions';
import Avatar from './Avatar';
import ProviderSettings from './settings/ProviderSettings';
import AgentEditor from './settings/AgentEditor';
import GoogleSettings from './settings/GoogleSettings';
import NotificationSettings from './settings/NotificationSettings';
import EmailSettings from './settings/EmailSettings';
import CronManager from './settings/CronManager';
import TaskView from './settings/TaskView';
import WebhookManager from './settings/WebhookManager';
import SkillsBrowser from './settings/SkillsBrowser';

// ── Constants ──

const ACCENT_COLORS = [
  { name: 'Blue', value: 'blue', hex: '#0071e3' },
  { name: 'Purple', value: 'purple', hex: '#7b2fff' },
  { name: 'Green', value: 'green', hex: '#00cc44' },
  { name: 'Orange', value: 'orange', hex: '#ff8800' },
  { name: 'Pink', value: 'pink', hex: '#ff2d78' },
  { name: 'Cyan', value: 'cyan', hex: '#00b4d8' },
];

const WALLPAPER_LIGHT = '/wallpapers/desktop-wallpaper.png';
const WALLPAPER_DARK = '/wallpapers/wallpaper-dark.png';

// ── Toggle Switch Component ──

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

// ── Section 1: Engine Status ──

function EngineSection() {
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const checkEngine = useCallback(async () => {
    setLoading(true);
    try {
      const [h, agents] = await Promise.all([
        invoke<any>('engine_health').catch(() => null),
        invoke<any[]>('engine_get_agents').catch(() => []),
      ]);
      setHealth(h);
      setAgentCount((agents ?? []).length);
    } catch {
      setHealth(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkEngine();
  }, [checkEngine]);

  const isHealthy = health?.status === 'healthy' || health !== null;

  return (
    <div className="settings-section">
      <div className="settings-section-title">⚡ Engine Status</div>

      <div className="settings-row">
        <span className="settings-label">Status</span>
        <div className="settings-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`status-dot ${isHealthy ? 'connected' : 'disconnected'}`} />
          <span>{loading ? 'Checking…' : isHealthy ? 'Running' : 'Unavailable'}</span>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">Agents</span>
        <span className="settings-value">{agentCount} installed</span>
      </div>

      <div className="settings-row">
        <span className="settings-label">Mode</span>
        <span className="settings-value">Embedded (standalone)</span>
      </div>

      <div className="settings-actions">
        <button className="settings-button" onClick={checkEngine}>
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}

// ── Section 2: Appearance ──

function AppearanceSection() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('conflux-theme') || 'light'
  );
  const [accent, setAccent] = useState(
    () => localStorage.getItem('conflux-accent') || 'blue'
  );
  const [wallpaper, setWallpaper] = useState(
    () => localStorage.getItem('conflux-wallpaper') || WALLPAPER_LIGHT
  );

  const handleThemeChange = (t: string) => {
    setTheme(t);
    localStorage.setItem('conflux-theme', t);
    window.dispatchEvent(new CustomEvent('conflux:theme-change', { detail: t }));

    // Apply immediately
    if (t === 'dark') {
      document.body.classList.add('dark');
    } else if (t === 'light') {
      document.body.classList.remove('dark');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark', prefersDark);
    }
  };

  const handleAccentChange = (value: string) => {
    setAccent(value);
    localStorage.setItem('conflux-accent', value);
    document.body.setAttribute('data-accent', value);
    window.dispatchEvent(new CustomEvent('conflux:accent-change', { detail: value }));
  };

  const handleWallpaperChange = (url: string) => {
    setWallpaper(url);
    localStorage.setItem('conflux-wallpaper', url);
    window.dispatchEvent(new CustomEvent('conflux:wallpaper-change', { detail: url }));
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">🎨 Appearance</div>

      {/* Theme */}
      <div className="settings-row">
        <span className="settings-label">Theme</span>
        <div className="segmented-control">
          {[
            { key: 'light', label: 'Light ☀️' },
            { key: 'dark', label: 'Dark 🌙' },
            { key: 'system', label: 'System 💻' },
          ].map((opt) => (
            <button
              key={opt.key}
              className={`segment-btn ${theme === opt.key ? 'active' : ''}`}
              onClick={() => handleThemeChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="settings-row">
        <span className="settings-label">Accent Color</span>
        <div className="accent-row">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              className={`accent-circle ${accent === c.value ? 'selected' : ''}`}
              style={{ background: c.hex }}
              onClick={() => handleAccentChange(c.value)}
              title={c.name}
              aria-label={c.name}
            />
          ))}
        </div>
      </div>

      {/* Wallpaper */}
      <div className="settings-row" style={{ alignItems: 'flex-start' }}>
        <span className="settings-label">Wallpaper</span>
        <div className="wallpaper-row">
          <button
            className={`wallpaper-thumb ${wallpaper === WALLPAPER_LIGHT ? 'selected' : ''}`}
            onClick={() => handleWallpaperChange(WALLPAPER_LIGHT)}
          >
            <img src={WALLPAPER_LIGHT} alt="Light wallpaper" />
            <span>Light</span>
          </button>
          <button
            className={`wallpaper-thumb ${wallpaper === WALLPAPER_DARK ? 'selected' : ''}`}
            onClick={() => handleWallpaperChange(WALLPAPER_DARK)}
          >
            <img src={WALLPAPER_DARK} alt="Dark wallpaper" />
            <span>Dark</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section 3: Agents ──

function AgentsSection() {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('conflux-selected-agents');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleAgent = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('conflux-selected-agents', JSON.stringify(next));
      return next;
    });
  };

  const navigateToMarketplace = () => {
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: 'marketplace' }));
  };

  const resetAll = () => {
    if (!window.confirm('Reset all agents? This will clear your selections and reload.')) return;
    localStorage.removeItem('conflux-selected-agents');
    window.location.reload();
  };

  // Only show work agents (not coming-soon)
  const workAgents = AGENT_PROFILES.filter((a) => !a.comingSoon);

  return (
    <div className="settings-section">
      <div className="settings-section-title">🤖 Agents</div>

      <div className="settings-agent-list">
        {workAgents.map((profile) => {
          const enabled = selectedIds.includes(profile.id);
          return (
            <div key={profile.id} className="settings-agent-row">
              <Avatar
                agentId={profile.id}
                name={profile.name}
                emoji={profile.emoji}
                status={enabled ? 'idle' : 'offline'}
                size="sm"
                showStatus={false}
              />
              <div className="settings-agent-info">
                <span className="settings-agent-name">{profile.name}</span>
                <span className="settings-agent-role">{profile.role}</span>
              </div>
              <ToggleSwitch checked={enabled} onChange={() => toggleAgent(profile.id)} />
            </div>
          );
        })}
      </div>

      <div className="settings-actions" style={{ marginTop: 12 }}>
        <button className="settings-button" onClick={navigateToMarketplace}>
          🛒 Manage in Marketplace
        </button>
        <button className="settings-button danger" onClick={resetAll}>
          ↺ Reset All Agents
        </button>
      </div>
    </div>
  );
}

// ── Section 4: Data & Privacy ──

function DataSection() {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const exportData = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('conflux-')) {
        data[key] = localStorage.getItem(key) || '';
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conflux-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('conflux-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">🔒 Data & Privacy</div>

      <div className="settings-actions" style={{ marginBottom: 12 }}>
        <button className="settings-button" onClick={exportData}>
          📦 Export Data
        </button>
        <button className="settings-button danger" onClick={clearAll}>
          🗑️ Clear All Data
        </button>
      </div>

      {showClearConfirm && (
        <div className="settings-confirm-bar">
          <span>⚠️ Are you sure? This will reset everything.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="settings-button danger" onClick={confirmClear}>
              Yes, Clear Everything
            </button>
            <button
              className="settings-button"
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="settings-info">
        All data is stored locally on this device. Nothing is sent to external servers.
      </p>
      <p className="settings-tagline">Your agents, your data, your machine.</p>
    </div>
  );
}

// ── Section 5: About ──

function AboutSection() {
  return (
    <div className="settings-section">
      <div className="settings-section-title">ℹ️ About</div>

      <div className="settings-about">
        <div className="settings-about-logo">⚡</div>
        <h2 className="settings-about-name">Conflux Home</h2>
        <p className="settings-about-version">v0.1.0-alpha</p>
        <p className="settings-about-built">Built with: Tauri + React + Embedded Engine</p>
        <p className="settings-about-tagline">A home for your AI family</p>

        <div className="settings-about-links">
          <a href="#" className="settings-link" onClick={(e) => e.preventDefault()}>
            🌐 The Conflux
          </a>
          <a href="#" className="settings-link" onClick={(e) => e.preventDefault()}>
            💻 GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Component ──

export default function Settings() {
  // Listen for theme changes from elsewhere
  useEffect(() => {
    // Apply saved accent on mount
    const savedAccent = localStorage.getItem('conflux-accent');
    if (savedAccent) {
      document.body.setAttribute('data-accent', savedAccent);
    }
  }, []);

  return (
    <div className="settings-page">
      <EngineSection />
      <ProviderSettings />
      <GoogleSettings />
      <AppearanceSection />
      <NotificationSettings />
      <EmailSettings />
      <AgentsSection />
      <AgentEditor />
      <div className="settings-section">
        <div className="settings-section-title">🔧 Engine</div>
      </div>
      <CronManager />
      <TaskView />
      <WebhookManager />
      <SkillsBrowser />
      <DataSection />
      <AboutSection />
    </div>
  );
}
