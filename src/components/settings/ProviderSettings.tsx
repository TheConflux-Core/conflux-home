// Conflux Home — Provider Settings v5 (Cloud-Only)
// All inference runs through the Conflux cloud router.
// No local API key management needed.

import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { useCredits } from '../../hooks/useCredits';
import { useAuth } from '../../hooks/useAuth';

// ── Types ──

type RouterStatus = 'checking' | 'connected' | 'disconnected';

// ── Constants ──

const CLOUD_ROUTER_URL = import.meta.env.VITE_CLOUD_ROUTER_URL ?? 'https://www.theconflux.com';
const MODELS_ENDPOINT = `${CLOUD_ROUTER_URL}/v1/models`;
const PRICING_URL = 'https://theconflux.ai/pricing';

// ── Component ──

export default function ProviderSettings() {
  const { user } = useAuth();
  const { balance: creditBalance, loading: creditsLoading } = useCredits();

  const [routerStatus, setRouterStatus] = useState<RouterStatus>('checking');
  const [routerLatency, setRouterLatency] = useState<number | null>(null);

  // ── Check cloud router status ──
  const checkRouterStatus = useCallback(async () => {
    setRouterStatus('checking');
    const start = Date.now();
    try {
      const res = await fetch(MODELS_ENDPOINT, {
        method: 'GET',
        signal: AbortSignal.timeout(8000),
      });
      const latency = Date.now() - start;
      setRouterLatency(latency);
      setRouterStatus(res.ok ? 'connected' : 'disconnected');
    } catch {
      setRouterLatency(null);
      setRouterStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkRouterStatus();
  }, [checkRouterStatus]);

  // ── Credit display ──
  const getCreditDisplay = () => {
    if (!user) return { label: 'Sign in for credits', sublabel: null };
    if (creditsLoading) return { label: 'Loading…', sublabel: null };
    if (!creditBalance) return { label: 'Unable to load', sublabel: null };

    if (creditBalance.source === 'free') {
      return {
        label: `${creditBalance.daily_remaining ?? 0} free credits today`,
        sublabel: `Limit: ${creditBalance.daily_limit ?? 0}/day`,
      };
    }

    const total = creditBalance.total_available;
    return {
      label: `${total.toLocaleString()} credits available`,
      sublabel: creditBalance.has_active_subscription
        ? `${creditBalance.monthly_credits - creditBalance.monthly_used} of ${creditBalance.monthly_credits} monthly remaining`
        : creditBalance.deposit_balance > 0
          ? `Deposit: ${creditBalance.deposit_balance.toLocaleString()} credits`
          : null,
    };
  };

  const credit = getCreditDisplay();

  // ── Render ──

  return (
    <div className="settings-section">
      <div className="settings-section-title">☁️ Cloud Router</div>

      <div style={{
        fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5,
      }}>
        All inference runs through the Conflux cloud router — fast, secure, no keys to manage.
      </div>

      {/* ── Router Status ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 12,
      }}>
        <span className={`status-dot ${routerStatus === 'connected' ? 'connected' : routerStatus === 'disconnected' ? 'disconnected' : ''}`}
          style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: routerStatus === 'connected' ? '#34c759' : routerStatus === 'disconnected' ? '#ff3b30' : '#ff9f0a',
            boxShadow: routerStatus === 'connected' ? '0 0 8px rgba(52,199,89,0.5)' : 'none',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {routerStatus === 'connected' ? 'Connected' : routerStatus === 'disconnected' ? 'Disconnected' : 'Checking…'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {CLOUD_ROUTER_URL}
            {routerLatency !== null && routerStatus === 'connected' && ` · ${routerLatency}ms`}
          </div>
        </div>
        <button
          onClick={checkRouterStatus}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px', fontSize: 11,
            color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600,
          }}
        >
          ↻ Check
        </button>
      </div>

      {/* ── Credit Balance ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 22 }}>💳</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {credit.label}
          </div>
          {credit.sublabel && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {credit.sublabel}
            </div>
          )}
        </div>
        <button
          onClick={() => open(PRICING_URL)}
          style={{
            background: '#0071e3', border: 'none', borderRadius: 8,
            padding: '6px 14px', fontSize: 11, fontWeight: 700,
            color: '#fff', cursor: 'pointer',
          }}
        >
          Buy Credits
        </button>
      </div>

      {/* ── Pricing Link ── */}
      <div style={{
        marginTop: 16, padding: 14, background: 'rgba(0,113,227,0.06)',
        border: '1px solid rgba(0,113,227,0.15)', borderRadius: 12,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>🚀</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Need more power?
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Upgrade your plan for higher limits, more models, and priority access.
          </div>
        </div>
        <button
          onClick={() => open(PRICING_URL)}
          style={{
            background: 'transparent', border: '1px solid #0071e3',
            borderRadius: 8, padding: '6px 14px', fontSize: 11,
            fontWeight: 700, color: '#0071e3', cursor: 'pointer',
          }}
        >
          View Plans →
        </button>
      </div>

      {/* ── Info ── */}
      <div style={{
        marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.02)',
        borderRadius: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong><br />
        Your messages are sent to the Conflux cloud router with your account token.
        The router picks the best provider, handles failover, and streams the response back.
        No API keys needed on your device.
      </div>
    </div>
  );
}
