// Conflux Home — Email Settings
// SMTP configuration form, connection status, and email log stub.

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useEmail, type EmailConfig } from '../../hooks/useEmail';

// ── Local ToggleSwitch ──

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

// ── Main Component ──

export default function EmailSettings() {
  const { config, loading, saving, testing, error, save, test } = useEmail();

  // Form state
  const [host, setHost] = useState(config?.host || '');
  const [port, setPort] = useState(config?.port || 587);
  const [username, setUsername] = useState(config?.username || '');
  const [password, setPassword] = useState(config?.password || '');
  const [fromAddress, setFromAddress] = useState(config?.fromAddress || '');
  const [tls, setTls] = useState(config?.tls ?? true);

  const [showPassword, setShowPassword] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showTestSend, setShowTestSend] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testMsg, setTestMsg] = useState('');

  // Sync form with loaded config
  const isConnected = !!config;

  // When config loads, populate form fields if they haven't been edited
  const populateFromConfig = useCallback((cfg: EmailConfig) => {
    setHost(cfg.host);
    setPort(cfg.port);
    setUsername(cfg.username);
    setPassword(cfg.password);
    setFromAddress(cfg.fromAddress);
    setTls(cfg.tls);
  }, []);

  // If config loads after mount, populate (only once)
  useState(() => {
    if (config) {
      setHost(config.host);
      setPort(config.port);
      setUsername(config.username);
      setPassword(config.password);
      setFromAddress(config.fromAddress);
      setTls(config.tls);
    }
  });

  const handleSave = async () => {
    if (!host.trim() || !username.trim()) {
      setSaveMsg('❌ Host and Username are required');
      setTimeout(() => setSaveMsg(''), 4000);
      return;
    }

    try {
      await save({
        host: host.trim(),
        port,
        username: username.trim(),
        password,
        fromAddress: fromAddress.trim(),
        tls,
      });
      setSaveMsg('✅ Email configuration saved');
    } catch (err) {
      setSaveMsg(`❌ Save failed: ${err}`);
    } finally {
      setTimeout(() => setSaveMsg(''), 4000);
    }
  };

  const handleTestConnection = async () => {
    try {
      // Reload config to verify it's saved
      const freshConfig = await invoke<EmailConfig | null>('engine_get_email_config');

      if (freshConfig) {
        setShowTestSend(true);
      } else {
        setSaveMsg('❌ No email config saved — save first');
        setTimeout(() => setSaveMsg(''), 4000);
      }
    } catch {
      setSaveMsg('❌ Could not verify connection');
      setTimeout(() => setSaveMsg(''), 4000);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setTestMsg('');
    try {
      await test(testEmail.trim());
      setTestMsg(`✅ Test email sent to ${testEmail}`);
      setTestEmail('');
      setShowTestSend(false);
    } catch (err) {
      setTestMsg(`❌ Failed: ${err}`);
    } finally {
      setTimeout(() => setTestMsg(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">📧 Email</div>
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
          Loading email configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">📧 Email</div>

      {/* Status Badge */}
      <div className="settings-row" style={{ marginBottom: 16 }}>
        <span className="settings-label">Status</span>
        <div className="settings-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isConnected ? (
            <>
              <span className="status-dot connected" />
              <span style={{ color: 'var(--accent-success)' }}>Email configured</span>
            </>
          ) : (
            <>
              <span className="status-dot disconnected" />
              <span>Not configured</span>
            </>
          )}
        </div>
      </div>

      {/* Connection Form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* SMTP Host */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            SMTP Host
          </label>
          <input
            className="settings-input"
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="smtp.gmail.com"
          />
        </div>

        {/* Port */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Port
          </label>
          <input
            className="settings-input"
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value) || 587)}
            min={1}
            max={65535}
          />
        </div>

        {/* TLS */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 2 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            TLS
          </label>
          <ToggleSwitch checked={tls} onChange={setTls} />
        </div>

        {/* Username */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Username
          </label>
          <input
            className="settings-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your@email.com"
          />
        </div>

        {/* Password */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="settings-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
                lineHeight: 1,
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* From Address */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            From Address
          </label>
          <input
            className="settings-input"
            type="text"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="settings-actions" style={{ marginBottom: 16 }}>
        <button className="settings-button primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Saving...' : '💾 Save Configuration'}
        </button>
        <button className="settings-button" onClick={handleTestConnection}>
          🧪 Test Connection
        </button>
      </div>

      {/* Save/Test messages */}
      {saveMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            background: saveMsg.startsWith('✅')
              ? 'rgba(52,199,89,0.08)'
              : 'rgba(255,68,68,0.08)',
            color: saveMsg.startsWith('✅') ? '#34c759' : '#ff6666',
          }}
        >
          {saveMsg}
        </div>
      )}

      {/* Test Send Input */}
      {showTestSend && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Send test email to:
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="settings-input"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="recipient@example.com"
              style={{ flex: 1 }}
              onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
              autoFocus
            />
            <button
              className="settings-button primary"
              onClick={handleSendTest}
              disabled={testing || !testEmail.trim()}
            >
              {testing ? '⏳' : '📤 Send'}
            </button>
          </div>
        </div>
      )}

      {/* Test result */}
      {testMsg && (
        <div
          style={{
            marginBottom: 12,
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

      {/* Recent Emails — Stub */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
          Recent Emails
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>To</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Subject</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Date</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Empty state — no emails yet */}
            <tr>
              <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📧</div>
                <div>No emails sent yet</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            background: 'rgba(255,68,68,0.08)',
            color: '#ff6666',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
