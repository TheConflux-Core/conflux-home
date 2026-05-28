import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import ProviderSettings from './settings/ProviderSettings';
import GoogleSettings from './settings/GoogleSettings';
import NotificationSettings from './settings/NotificationSettings';
import CronManager from './settings/CronManager';
import TaskView from './settings/TaskView';
import WebhookManager from './settings/WebhookManager';
import BillingSection from './settings/BillingSection';
import UsageSection from './settings/UsageSection';
import SoundSection from './settings/SoundSection';
import SecuritySettings from './settings/SecuritySettings';
import HeartbeatChainSettings from './settings/HeartbeatChainSettings';
import { useAuth } from '../hooks/useAuth';
import { playToggleOn, playToggleOff } from '../lib/sound';
import { useTourState } from '../hooks/useTourState';
import '../styles/settings.css';

// ── Constants ──

const ACCENT_COLORS = [
  { name: 'Blue',   value: 'blue',   hex: '#3b82f6' },
  { name: 'Purple', value: 'purple', hex: '#a855f7' },
  { name: 'Green',  value: 'green',  hex: '#22c55e' },
  { name: 'Orange', value: 'orange', hex: '#f97316' },
  { name: 'Pink',   value: 'pink',   hex: '#ec4899' },
  { name: 'Cyan',   value: 'cyan',   hex: '#06b6d4' },
];

// ── Navigation Categories — Universal First, Advanced Last ──

interface NavCategory {
  id: string;
  label: string;
  icon: string;
  group: string;
}

const NAV_CATEGORIES: NavCategory[] = [
  // ══ Universal (what everyone needs first) ══
  { id: 'account',     label: 'Account',      icon: '👤', group: 'Universal' },
  { id: 'experience', label: 'Experience',    icon: '✨', group: 'Universal' },
  { id: 'alerts',      label: 'Alerts',        icon: '🔔', group: 'Universal' },
  // ══ Everything Else ══
  { id: 'overview',    label: 'Overview',      icon: '📡', group: 'System' },
  { id: 'billing',     label: 'Billing',       icon: '💳', group: 'System' },
  { id: 'security',    label: 'Security',      icon: '🛡️', group: 'System' },
  // ══ Advanced ══
  { id: 'automation',  label: 'Autopilot',    icon: '⚙️', group: 'Advanced' },
  // ══ Footer ══
  { id: 'about',       label: 'About',        icon: 'ℹ️', group: 'About' },
];

// ── Alien Wallpaper (deep space nebula) ──
const WALLPAPER_URL = '/nebula-wallpaper.png';

// ── Particle Generator ──
function Particles() {
  const count = 20;
  return (
    <div className="settings-particles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="settings-particle"
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            animationDuration: `${14 + (i * 5) % 18}s`,
            animationDelay: `${(i * 3) % 12}s`,
            width: i % 3 === 0 ? '2px' : '1px',
            height: i % 3 === 0 ? '2px' : '1px',
            opacity: 0.06 + (i % 7) * 0.02,
          }}
        />
      ))}
    </div>
  );
}

// ── Status Bar Components ──
function StatusBar() {
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      invoke<any>('engine_health').catch(() => null),
      invoke<any[]>('engine_get_agents').catch(() => []),
    ]).then(([h, agents]) => {
      setHealth(h);
      setAgentCount((agents ?? []).length);
    });
  }, []);

  const isHealthy = health?.status === 'healthy' || health !== null;

  return (
    <div className="mc-status-bar">
      <div className="mc-status-card engine">
        <div className="mc-status-icon engine">⚡</div>
        <div>
          <div className="mc-status-label">Engine</div>
          <div className="mc-status-value" style={{ color: isHealthy ? '#4ade80' : '#ff5070' }}>
            {isHealthy ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>
      <div className="mc-status-card agents">
        <div className="mc-status-icon agents">🤖</div>
        <div>
          <div className="mc-status-label">Agents</div>
          <div className="mc-status-value">{agentCount}</div>
          <div className="mc-status-sub">installed</div>
        </div>
      </div>
      <div className="mc-status-card credits">
        <div className="mc-status-icon credits">💳</div>
        <div>
          <div className="mc-status-label">Account</div>
          <div className="mc-status-value" style={{ fontSize: 14 }}>
            {user ? 'Active' : 'Signed Out'}
          </div>
        </div>
      </div>
      <div className="mc-status-card security">
        <div className="mc-status-icon security">🔒</div>
        <div>
          <div className="mc-status-label">Security</div>
          <div className="mc-status-value" style={{ fontSize: 14 }}>Sandboxed</div>
        </div>
      </div>
    </div>
  );
}

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
      onClick={() => { checked ? playToggleOff() : playToggleOn(); onChange(!checked); }}
      aria-label={checked ? 'Disable' : 'Enable'}
      type="button"
    >
      <span className="toggle-knob" />
    </button>
  );
}

// ── Appearance Section ──
function AppearanceSection() {
  const [accent, setAccent] = useState(
    () => localStorage.getItem('conflux-accent') || 'blue'
  );

  const handleAccentChange = (value: string) => {
    setAccent(value);
    localStorage.setItem('conflux-accent', value);
    document.body.setAttribute('data-accent', value);
    window.dispatchEvent(new CustomEvent('conflux:accent-change', { detail: value }));
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">✨ Look & Feel</div>
      <div className="settings-row">
        <span className="settings-label">Accent color</span>
        <div style={{ display: 'flex', gap: 10 }}>
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
    </div>
  );
}

// ── Data & Privacy Section ──
function DataSection() {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { resetTour } = useTourState();

  const handleReplayTour = () => {
    resetTour();
    window.location.reload();
  };

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
      <div className="settings-section-title">📦 Data & Privacy</div>
      <div className="settings-actions" style={{ marginBottom: 12 }}>
        <button className="settings-button" onClick={exportData}>
          📦 Export Data
        </button>
        <button className="settings-button" onClick={handleReplayTour}>
          🔄 Replay Tour
        </button>
        <button className="settings-button danger" onClick={() => setShowClearConfirm(true)}>
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
            <button className="settings-button" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <p className="settings-info">All data is stored locally on this device. Nothing is sent to external servers without your consent.</p>
    </div>
  );
}

// ── About Section ──
function AboutSection() {
  const [logPath, setLogPath] = useState<string>('');
  const [systemInfo, setSystemInfo] = useState<{ os: string; arch: string; app_version: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<string>('');

  useEffect(() => {
    invoke<string>('get_log_path').then(setLogPath).catch(() => {});
    invoke<any>('get_system_info').then(setSystemInfo).catch(() => {});
  }, []);

  return (
    <div className="settings-section">
      <div className="settings-section-title">ℹ️ About</div>
      <div className="settings-about">
        <img src="/logo_v1.png" alt="Conflux" className="settings-about-logo" />
        <h2 className="settings-about-name">Conflux Home</h2>
        <p className="settings-about-version">v{systemInfo?.app_version ?? '0.1.0'}-alpha</p>
        <p className="settings-about-built">Built with: Tauri + React + Embedded Engine</p>
        {systemInfo && (
          <p className="settings-about-built" style={{ opacity: 0.55 }}>
            {systemInfo.os} · {systemInfo.arch}
          </p>
        )}
        <p className="settings-about-tagline">A home for your AI family</p>
        <div className="settings-about-links">
          <a href="#" className="settings-link" onClick={(e) => { e.preventDefault(); open('https://theconflux.com'); }}>
            🌐 The Conflux
          </a>
          <a href="#" className="settings-link" onClick={(e) => { e.preventDefault(); open('https://github.com/TheConflux-Core/conflux-home'); }}>
            💻 GitHub
          </a>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        <button className="settings-button" onClick={() => open('https://github.com/TheConflux-Core/conflux-home/issues/new?template=bug_report.yml&labels=bug&title=%5BBug%5D%20')}>
          🐛 Report a Bug
        </button>
        <button className="settings-button" onClick={() => open('https://github.com/TheConflux-Core/conflux-home/issues/new?template=feature_request.yml')}>
          💡 Request a Feature
        </button>
      </div>
      {logPath && (
        <div style={{ marginTop: 14, opacity: 0.75, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>📋 Gateway Log:</span>
            <code style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 6, fontSize: 11 }}>
              {logPath}
            </code>
            <button className="settings-button" onClick={() => { navigator.clipboard.writeText(logPath); setCopyStatus('Copied!'); setTimeout(() => setCopyStatus(''), 2000); }} style={{ fontSize: 11, padding: '4px 10px' }}>
              {copyStatus || 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Account Section ──
function AccountSection() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
    <div className="settings-section">
      <div className="settings-section-title">👤 Account</div>
      <div className="settings-row">
        <span className="settings-label">Email</span>
        <span className="settings-value" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{user.email}</span>
      </div>
      <div className="settings-row">
        <span className="settings-label">Account ID</span>
        <span className="settings-value" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, opacity: 0.65, userSelect: 'all', cursor: 'text' }}>
          {user.id}
        </span>
      </div>
      <div className="settings-row" style={{ justifyContent: 'flex-start', paddingTop: 14 }}>
        <button onClick={signOut} className="settings-button danger" style={{ padding: '10px 24px' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Advanced Section Divider ──
function AdvancedDivider() {
  return (
    <div className="advanced-divider">
      <span className="advanced-badge">
        ⚙️ Advanced & Control Room
      </span>
    </div>
  );
}

// ── Sidebar Component ──
function Sidebar({ activeCategory, onNavigate }: { activeCategory: string; onNavigate: (id: string) => void }) {
  const groups = useMemo(() => {
    const g: Record<string, NavCategory[]> = {};
    NAV_CATEGORIES.forEach(cat => {
      if (!g[cat.group]) g[cat.group] = [];
      g[cat.group].push(cat);
    });
    return g;
  }, []);

  // Group order: Universal first, then System, then Advanced
  const orderedGroups = [
    { key: 'Universal', label: 'Universal' },
    { key: 'System', label: 'System' },
    { key: 'Advanced', label: 'Advanced' },
    { key: 'About', label: 'About' },
  ];

  return (
    <nav className="mc-sidebar">
      <div className="mc-sidebar-logo">
        <span className="mc-sidebar-logo-icon">⚙️</span>
        <div>
          <span className="mc-sidebar-logo-text">Settings</span>
          <span className="mc-sidebar-logo-sub">Mission Control</span>
        </div>
      </div>
      {orderedGroups.map(({ key, label }) => {
        const items = groups[key] ?? [];
        if (items.length === 0) return null;
        return (
          <div className="mc-nav-group" key={key}>
            <div className="mc-nav-group-label">{label}</div>
            {items.map(cat => (
              <div
                key={cat.id}
                className={`mc-nav-item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => onNavigate(cat.id)}
              >
                <span className="mc-nav-icon">{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

// ── Category Headers ──
const CATEGORY_META: Record<string, { icon: string; title: string; desc: string }> = {
  // Universal
  account:     { icon: '👤', title: 'Account',       desc: 'Your identity and sign-in' },
  experience: { icon: '✨', title: 'Experience',    desc: 'Look, sound, and how you interact' },
  alerts:     { icon: '🔔', title: 'Alerts',        desc: 'What your agents tell you and when' },
  // System
  overview:   { icon: '📡', title: 'System Overview', desc: 'Engine health, agents, and status' },

  billing:    { icon: '💳', title: 'Billing',         desc: 'Subscription, credits, and usage' },
  security:   { icon: '🛡️', title: 'Security',        desc: 'Permissions, sandboxing, and anomaly detection' },
  data:       { icon: '📦', title: 'Data & Privacy',  desc: 'Export, clear, and control your data' },
  // Advanced
  automation: { icon: '⚙️', title: 'Autopilot',       desc: 'Cron jobs, webhooks, and heartbeat chains' },
  // Footer
  about:      { icon: 'ℹ️', title: 'About',         desc: 'Version, links, and log path' },
};

// ── Main Settings Components ──
export default function Settings() {
  const [activeCategory, setActiveCategory] = useState('account');

  useEffect(() => {
    const savedAccent = localStorage.getItem('conflux-accent');
    if (savedAccent) {
      document.body.setAttribute('data-accent', savedAccent);
    }
  }, []);

  const handleNavigate =  useCallback((id: string) => {
    setActiveCategory(id);
    const content = document.querySelector('.mc-content');
    if (content) content.scrollTop = 0;
  }, []);

  const meta = CATEGORY_META[activeCategory] || CATEGORY_META.account;

  return (
    <div className="settings-page">
      {/* Atmospheric layers */}
      <div className="settings-wallpaper">
        <img src={WALLPAPER_URL} alt="" aria-hidden="true" />
      </div>
      <div className="settings-grid-pattern" aria-hidden="true" />
      <Particles />

      {/* Sidebar Navigation */}
      <Sidebar activeCategory={activeCategory} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="mc-content">
        {/* Report Header — centered in content area, above category header */}
        <div className="mc-report-header">
          <button
            className="mc-report-btn"
            onClick={() => open('https://github.com/TheConflux-Core/conflux-home/issues/new?labels=bug&title=%5BBug%5D%20')}
            title="Report a Bug"
          >
            🐛 Report a Bug
          </button>
          <button
            className="mc-report-btn"
            onClick={() => open('https://github.com/TheConflux-Core/conflux-home/issues/new?labels=enhancement&title=%5BFeature%5D%20')}
            title="Suggest a Feature"
          >
            💡 Suggest a Feature
          </button>
        </div>

        {/* Category Header */}
        <div className="mc-category-header" key={activeCategory}>
          <div className="mc-category-icon">{meta.icon}</div>
          <div>
            <div className="mc-category-title">{meta.title}</div>
            <div className="mc-category-desc">{meta.desc}</div>
          </div>
        </div>

        {/* Render sections by category */}
        <div className="mc-section-group" key={`group-${activeCategory}`}>

          {/* Universal: Account first */}
          {activeCategory === 'account' && (
            <>
              <AccountSection />
              <GoogleSettings />
            </>
          )}

          {activeCategory === 'experience' && (
            <>
              <AppearanceSection />
              <SoundSection />
            </>
          )}

          {activeCategory === 'alerts' && (
            <>
              <NotificationSettings />
            </>
          )}

          {/* System: Everything else */}
          {activeCategory === 'overview' && (
            <>
              <StatusBar />
              <ProviderSettings />
            </>
          )}

          {activeCategory === 'cloud' && (
            <>
              <ProviderSettings />
            </>
          )}

          {activeCategory === 'billing' && (
            <>
              <BillingSection />
              <UsageSection />
            </>
          )}

          {activeCategory === 'security' && (
            <>
              <div className="settings-section">
                <div className="settings-section-title">🛡️ Security</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Security profiles and permissions are managed by the Security Center.
                  Coming soon to Settings.
                </p>
              </div>
              <DataSection />
            </>
          )}

          {activeCategory === 'about' && (
            <AboutSection />
          )}

          {/* Advanced: Clearly labeled */}
          {activeCategory === 'automation' && (
            <>
              <AdvancedDivider />
              <CronManager />
              <TaskView />
              <WebhookManager />
              <HeartbeatChainSettings />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
