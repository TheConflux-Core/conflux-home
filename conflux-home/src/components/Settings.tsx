import { useState, useEffect, useCallback } from 'react';
import { useGateway, getToken, saveToken } from '../hooks/useGateway';
import { AGENT_PROFILES, AGENT_PROFILE_MAP } from '../data/agent-descriptions';
import Avatar from './Avatar';

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

// ── Section 1: Gateway Connection ──

function GatewaySection() {
  const { connected, refresh, error } = useGateway();
  const [gatewayUrl, setGatewayUrl] = useState(
    () => localStorage.getItem('conflux-gateway-url') || 'http://localhost:18789'
  );
  const [showToken, setShowToken] = useState(false);
  const [tokenValue, setTokenValue] = useState(() => getToken() || '');
  const [editingToken, setEditingToken] = useState(false);
  const [newToken, setNewToken] = useState('');

  const handleSaveToken = () => {
    if (!newToken.trim()) return;
    saveToken(newToken.trim());
    setTokenValue(newToken.trim());
    setNewToken('');
    setEditingToken(false);
    refresh();
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">🔌 Gateway Connection</div>

      <div className="settings-row">
        <span className="settings-label">URL</span>
        <span className="settings-value">{gatewayUrl}</span>
      </div>

      <div className="settings-row">
        <span className="settings-label">Token</span>
        <div className="settings-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', letterSpacing: 2 }}>
            {showToken ? tokenValue : '••••••••••••'}
          </span>
          <button
            className="settings-icon-btn"
            onClick={() => setShowToken(s => !s)}
            title={showToken ? 'Hide' : 'Show'}
          >
            {showToken ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">Status</span>
        <div className="settings-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
          {error && <span className="settings-error">{error}</span>}
        </div>
      </div>

      <div className="settings-actions">
        <button className="settings-button" onClick={refresh}>
          ↻ Reconnect
        </button>
        <button
          className="settings-button"
          onClick={() => setEditingToken(e => !e)}
        >
          🔑 {editingToken ? 'Cancel' : 'Change Token'}
        </button>
      </div>

      {editingToken && (
        <div className="settings-token-edit">
          <input
            className="settings-input"
            type="text"
            placeholder="Paste new gateway token…"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
            autoFocus
          />
          <button className="settings-button primary" onClick={handleSaveToken}>
            Save Token
          </button>
        </div>
      )}
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
        <p className="settings-about-built">Built with: Tauri + React + OpenClaw Gateway</p>
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
      <GatewaySection />
      <AppearanceSection />
      <AgentsSection />
      <DataSection />
      <AboutSection />
    </div>
  );
}
