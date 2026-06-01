import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ConnectivityStatus {
  googleConnected: boolean;
  googleEmail: string | null;
  loading: boolean;
  error: string | null;
}

// Check if Tauri runtime is available
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const ConnectivityWidget: React.FC = () => {
  const [status, setStatus] = useState<ConnectivityStatus>({
    googleConnected: false,
    googleEmail: null,
    loading: true,
    error: null,
  });

  const fetchConnectivityStatus = useCallback(async () => {
    if (!isTauri()) {
      setStatus(prev => ({ ...prev, loading: false, error: null }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));

      const googleConnected = await invoke<boolean>('engine_google_is_connected');
      let googleEmail: string | null = null;
      if (googleConnected) {
        try {
          googleEmail = await invoke<string>('engine_google_get_email');
        } catch {
          // email fetch failed, but we're still connected
        }
      }

      setStatus({
        googleConnected,
        googleEmail,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      console.error('[ConnectivityWidget] Failed to fetch status:', e);
      // Keep previous connected state on transient errors, but show the error
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: e?.message || String(e) || 'Failed to check connection',
      }));
    }
  }, []);

  useEffect(() => {
    fetchConnectivityStatus();
    const interval = setInterval(fetchConnectivityStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchConnectivityStatus]);

  const handleManageConnections = () => {
    window.dispatchEvent(new CustomEvent('conflux:navigate', { detail: 'settings' }));
  };

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

      {status.error && (
        <div style={{
          fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
          padding: '8px 10px', borderRadius: 8, marginBottom: 10,
          border: '1px solid rgba(245,158,11,0.2)',
          lineHeight: 1.4,
        }}>
          ⚠️ {status.error}
          <button
            onClick={fetchConnectivityStatus}
            style={{
              display: 'block', marginTop: 6, background: 'none', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#f59e0b', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!status.loading && (
        <>
          <ConnectionLine label="📧 Gmail" connected={status.googleConnected} detail={status.googleConnected ? status.googleEmail || 'connected' : 'not connected'} />
          <ConnectionLine label="📅 Calendar" connected={status.googleConnected} detail={status.googleConnected ? 'connected' : 'not connected'} />
          <ConnectionLine label="✅ Tasks" connected={status.googleConnected} detail={status.googleConnected ? 'connected' : 'not connected'} />
          <ConnectionLine label="📄 Docs" connected={status.googleConnected} detail={status.googleConnected ? 'connected' : 'not connected'} />
          <ConnectionLine label="📊 Sheets" connected={status.googleConnected} detail={status.googleConnected ? 'connected' : 'not connected'} />
          <ConnectionLine label="📁 Drive" connected={status.googleConnected} detail={status.googleConnected ? 'connected' : 'not connected'} />
        </>
      )}


    </div>
  );
};

function ConnectionLine({ label, connected, detail }: { label: string; connected: boolean; detail: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
      <span style={{ marginRight: '8px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: connected ? '#10b981' : '#f59e0b' }}>
        {connected ? '✅' : '⚠️'}
      </span>
      <span style={{
        marginLeft: '8px',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {detail}
      </span>
    </div>
  );
}

export default ConnectivityWidget;
