// Conflux Home — Provider Settings v4
// Direct API provider management. No middlemen.
// Core tier: free providers (always active).
// Pro/Ultra: paid providers (configure your key to unlock).

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface RouterProvider {
  id: string;
  name: string;
  tier: string;
  base_url: string;
  model_id: string;
  auth_method: string;
  api_format: string;
  priority: number;
  is_free: boolean;
  cost_per_1k_tokens: number;
  max_tokens: number;
  rate_limit_rpm: number;
  is_enabled: boolean;
}

interface TierInfo {
  tier: string;
  label: string;
  emoji: string;
  color: string;
  tagline: string;
  description: string;
}

const TIERS: TierInfo[] = [
  {
    tier: 'core',
    label: 'Core',
    emoji: '🟢',
    color: '#34c759',
    tagline: 'Free. Fast. Always on.',
    description: 'Cerebras, Groq, Mistral, DeepSeek, Cloudflare — blazing fast inference, zero marginal cost.',
  },
  {
    tier: 'pro',
    label: 'Pro',
    emoji: '🔵',
    color: '#0071e3',
    tagline: 'Smart. Best daily driver.',
    description: 'Qwen 235B, Llama 70B, DeepSeek R1 — top open models running on fast GPUs. Plus optional paid models.',
  },
  {
    tier: 'ultra',
    label: 'Ultra',
    emoji: '🟣',
    color: '#7b2fff',
    tagline: 'The best model wins.',
    description: 'Claude Sonnet 4, GPT-4o, MiMo Pro — premium models for when quality matters most.',
  },
];

function getProviderSource(id: string): string {
  if (id.startsWith('cerebras')) return 'Cerebras';
  if (id.startsWith('groq')) return 'Groq';
  if (id.startsWith('mistral')) return 'Mistral';
  if (id.startsWith('deepseek')) return 'DeepSeek';
  if (id.startsWith('cloudflare')) return 'Cloudflare';
  if (id.startsWith('openai')) return 'OpenAI';
  if (id.startsWith('anthropic')) return 'Anthropic';
  if (id.startsWith('xiaomi')) return 'Xiaomi';
  return 'Custom';
}

function TierCard({ tier, providers }: { tier: TierInfo; providers: RouterProvider[] }) {
  const [expanded, setExpanded] = useState(false);

  const freeProviders = providers.filter(p => p.is_free);
  const paidProviders = providers.filter(p => !p.is_free);

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${tier.color}08, ${tier.color}03)`,
        border: `1px solid ${tier.color}30`,
        borderRadius: 14,
        padding: 16,
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>{tier.emoji}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {tier.label}
            </div>
            <div style={{ fontSize: 12, color: tier.color, fontWeight: 600 }}>
              {tier.tagline}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 12,
            background: `${tier.color}15`,
            color: tier.color,
            fontWeight: 600,
          }}>
            {providers.length} model{providers.length !== 1 ? 's' : ''}
          </span>
          <span style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
        {tier.description}
      </div>

      {/* Expanded: Model list */}
      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Free providers */}
          {freeProviders.length > 0 && (
            <>
              <div style={{
                fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 4,
              }}>
                Free providers (always active)
              </div>
              {freeProviders.map((p, i) => (
                <ProviderRow key={p.id} provider={p} tier={tier} index={i + 1} />
              ))}
            </>
          )}

          {/* Paid providers */}
          {paidProviders.length > 0 && (
            <>
              <div style={{
                fontSize: 10, fontWeight: 600, color: '#ff9f0a',
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 8,
              }}>
                Premium (requires API key)
              </div>
              {paidProviders.map((p, i) => (
                <ProviderRow key={p.id} provider={p} tier={tier} index={freeProviders.length + i + 1} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderRow({ provider, tier, index }: { provider: RouterProvider; tier: TierInfo; index: number }) {
  const source = getProviderSource(provider.id);
  const isActive = provider.is_free || provider.is_enabled;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 10px',
      opacity: isActive ? 1 : 0.5,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: tier.color, minWidth: 18 }}>
        {index}.
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {provider.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {provider.model_id}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {!provider.is_free && (
          <span style={{
            fontSize: 9, color: '#ff9f0a', background: 'rgba(255,159,10,0.1)',
            padding: '2px 6px', borderRadius: 4, fontWeight: 600,
          }}>
            ${provider.cost_per_1k_tokens.toFixed(4)}/1k
          </span>
        )}
        <span style={{
          fontSize: 9, color: isActive ? '#34c759' : 'var(--text-muted)',
          background: isActive ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.06)',
          padding: '2px 6px', borderRadius: 4, fontWeight: 600,
        }}>
          {source}
        </span>
      </div>
    </div>
  );
}

// ── API Key Configuration ──

function ApiKeyField({
  label,
  placeholder,
  invokeGet,
  invokeSet,
  docsUrl,
}: {
  label: string;
  placeholder: string;
  invokeGet: string;
  invokeSet: string;
  docsUrl: string;
}) {
  const [masked, setMasked] = useState('');
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    invoke<string>(invokeGet).then(setMasked).catch(() => {});
  }, [invokeGet]);

  const handleSave = useCallback(async () => {
    if (!input.trim()) return;
    setSaving(true);
    try {
      await invoke(invokeSet, { apiKey: input.trim() });
      const newMasked = await invoke<string>(invokeGet);
      setMasked(newMasked);
      setInput('');
      setEditing(false);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error(`[${label}] Failed to save:`, err);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }, [input, invokeSet, invokeGet, label]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(255,255,255,0.03)', borderRadius: 10,
      padding: '10px 14px', border: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {label}
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: '#0071e3', marginLeft: 8, textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            get key →
          </a>
        </div>
        {editing ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              type="password"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              style={{
                flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'monospace',
              }}
              onFocus={e => e.target.style.borderColor = '#0071e3'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving || !input.trim()}
              style={{
                background: '#0071e3', color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                opacity: saving || !input.trim() ? 0.5 : 1,
              }}
            >
              {saving ? '...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setInput(''); }}
              style={{
                background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '6px 12px', fontSize: 11, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {masked || 'not configured'}
            </span>
            <button
              onClick={e => { e.stopPropagation(); setEditing(true); }}
              style={{
                background: 'transparent', color: '#0071e3', border: 'none',
                fontSize: 11, cursor: 'pointer', fontWeight: 600,
              }}
            >
              {masked ? 'change' : 'add'}
            </button>
            {status === 'saved' && (
              <span style={{ fontSize: 10, color: '#34c759', fontWeight: 600 }}>✓ saved</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Settings Panel ──

export default function ProviderSettings() {
  const [routerProviders, setRouterProviders] = useState<RouterProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const providers = await invoke<RouterProvider[]>('engine_get_router_providers');
      setRouterProviders(providers);
    } catch (err) {
      console.error('[ProviderSettings] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section-title">⚡ Model Tiers</div>
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section-title">⚡ Model Tiers</div>

      <div style={{
        fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5,
      }}>
        All inference runs through Conflux — direct API calls, no middlemen.
        Each tier has automatic failover across multiple providers.
      </div>

      {/* Tier cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TIERS.map((tier) => {
          const providers = routerProviders
            .filter(p => p.tier === tier.tier)
            .sort((a, b) => a.priority - b.priority);
          return <TierCard key={tier.tier} tier={tier} providers={providers} />;
        })}
      </div>

      {/* API Key Configuration */}
      <div style={{ marginTop: 24 }}>
        <div className="settings-section-title" style={{ marginBottom: 8 }}>
          🔑 Provider API Keys
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5,
        }}>
          Free providers (Core tier) are always active. Add keys below to unlock
          Pro/Ultra tier paid models. Keys are stored locally and never shared.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ApiKeyField
            label="OpenAI"
            placeholder="sk-..."
            invokeGet="engine_get_openai_key_masked"
            invokeSet="engine_set_openai_key"
            docsUrl="https://platform.openai.com/api-keys"
          />
          <ApiKeyField
            label="Anthropic (Claude)"
            placeholder="sk-ant-..."
            invokeGet="engine_get_anthropic_key_masked"
            invokeSet="engine_set_anthropic_key"
            docsUrl="https://console.anthropic.com/settings/keys"
          />
          <ApiKeyField
            label="Xiaomi (MiMo)"
            placeholder="xm-..."
            invokeGet="engine_get_xiaomi_key_masked"
            invokeSet="engine_set_xiaomi_key"
            docsUrl="https://api.xiaomi.com" // TODO: confirm actual URL
          />
        </div>
      </div>

      {/* Info box */}
      <div style={{
        marginTop: 16, padding: 12, background: 'rgba(255,255,255,0.03)',
        borderRadius: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>How failover works:</strong><br />
        If the #1 provider is slow or returns an error, the router instantly tries #2, then #3.
        You never see the switch — just fast, reliable responses.
        <br /><br />
        <strong style={{ color: 'var(--text-secondary)' }}>Your agent tiers:</strong><br />
        Agents default to <span style={{ color: '#34c759', fontWeight: 600 }}>Core</span>.
        Upgrade individual agents to <span style={{ color: '#0071e3', fontWeight: 600 }}>Pro</span> or{' '}
        <span style={{ color: '#7b2fff', fontWeight: 600 }}>Ultra</span> in Agent Settings.
      </div>
    </div>
  );
}
