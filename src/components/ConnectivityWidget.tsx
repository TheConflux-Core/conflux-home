import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface EmailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  tls: boolean;
}

interface ConnectivityStatus {
  googleConnected: boolean;
  googleEmail: string | null;
  smtpConfigured: boolean;
  loading: boolean;
  error: string | null;
}

const ConnectivityWidget: React.FC = () => {
  const [status, setStatus] = useState<ConnectivityStatus>({
    googleConnected: false,
    googleEmail: null,
    smtpConfigured: false,
    loading: true,
    error: null,
  });

  const fetchConnectivityStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));
      const googleConnected = await invoke<boolean>('engine_google_is_connected');
      let googleEmail: string | null = null;
      if (googleConnected) {
        googleEmail = await invoke<string>('engine_google_get_email');
      }

      const emailConfig = await invoke<EmailConfig | null>('engine_get_email_config');
      const smtpConfigured = !!emailConfig?.host;

      setStatus({
        googleConnected,
        googleEmail,
        smtpConfigured,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      console.error('Failed to fetch connectivity status:', e);
      setStatus({
        googleConnected: false,
        googleEmail: null,
        smtpConfigured: false,
        loading: false,
        error: e.message || 'Error checking status',
      });
    }
  };

  useEffect(() => {
    fetchConnectivityStatus();
    const interval = setInterval(fetchConnectivityStatus, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleManageConnections = () => {
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: 'settings' }));
  };

  const getConnectionStatusIcon = (isConnected: boolean | null) => {
    if (isConnected === null) return 'checking.gif'; // Placeholder for checking state or not available
    return isConnected
      ? <span style={{ color: '#10b981' }}>✅</span>
      : <span style={{ color: '#f59e0b' }}>⚠️</span>;
  };

  const renderConnectionLine = (label: string, isConnected: boolean | null, detail: string | null = null) => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
      <span style={{ marginRight: '8px', color: 'var(--text-secondary)' }}>{label}</span>
      {getConnectionStatusIcon(isConnected)}
      {detail && <span style={{ marginLeft: '8px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</span>}
    </div>
  );

  return (
    <div
      style={{
        maxWidth: 320,
        margin: '0 auto 20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        color: 'var(--text-primary)',
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
        🔗 Connections
      </h3>
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '10px' }} />

      {status.loading && <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Checking...</p>}
      {status.error && <p style={{ color: '#f00', fontSize: '13px' }}>Error: {status.error}</p>}
      {!status.loading && !status.error && (
        <>
          {renderConnectionLine('✉️ Google', status.googleConnected, status.googleConnected ? status.googleEmail || 'connected' : 'not connected')}
          {renderConnectionLine('📄 Docs', status.googleConnected, status.googleConnected ? 'connected' : 'not connected')}
          {renderConnectionLine('📊 Sheets', status.googleConnected, status.googleConnected ? 'connected' : 'not connected')}
          {renderConnectionLine('📁 Drive', status.googleConnected, status.googleConnected ? 'connected' : 'not connected')}
          {renderConnectionLine('📧 SMTP', status.smtpConfigured, status.smtpConfigured ? 'configured' : 'not set')}
        </>
      )}

      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <button
          onClick={handleManageConnections}
          style={{
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 15px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          Manage Connections
        </button>
      </div>
    </div>
  );
};

export default ConnectivityWidget;
