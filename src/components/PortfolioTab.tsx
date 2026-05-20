// Conflux Home — PortfolioTab
// Custom asset portfolio tracker with dark emerald Pulse aesthetic

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './PortfolioTab.css';

// ── Types ────────────────────────────────────────────────────────────────

export type AssetType = 'stock' | 'crypto' | 'real_estate' | 'cash' | 'bond' | 'other';
export type HoldingTag = 'retirement' | 'speculative' | 'emergency' | 'growth' | 'custom';

export interface Holding {
  id: string;
  name: string;
  asset_type: AssetType;
  ticker?: string;
  shares: number;
  cost_basis: number;
  current_value: number;
  tag: HoldingTag;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost_basis: number;
  total_gain_loss: number;
  total_gain_loss_pct: number;
  by_type: Record<AssetType, number>;
  by_tag: Record<HoldingTag, number>;
}

export interface StockSearchResult {
  symbol: string;
  company_name: string;
  sector: string;
  current_price: number | null;
}

// ── DB Field mapping ─────────────────────────────────────────────────────

function dbToHolding(raw: any): Holding {
  return {
    id: raw.id,
    name: raw.asset_name ?? raw.name ?? '',
    asset_type: (raw.asset_type ?? 'other') as AssetType,
    ticker: raw.symbol ?? raw.ticker,
    shares: typeof raw.shares === 'number' ? raw.shares : parseFloat(raw.shares ?? '0'),
    cost_basis: typeof raw.cost_basis === 'number' ? raw.cost_basis : parseFloat(raw.cost_basis ?? '0'),
    current_value: typeof raw.current_value === 'number' ? raw.current_value : parseFloat(raw.current_value ?? '0'),
    tag: (raw.tag ?? 'custom') as HoldingTag,
  };
}

// ── Color/label maps ─────────────────────────────────────────────────────────

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Stock', crypto: 'Crypto', real_estate: 'Real Estate',
  cash: 'Cash', bond: 'Bond', other: 'Other',
};

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  stock: '#3b82f6', crypto: '#f97316', real_estate: '#10b981',
  cash: '#6b7280', bond: '#8b5cf6', other: '#94a3b8',
};

const TAG_LABELS: Record<HoldingTag, string> = {
  retirement: 'Retirement', speculative: 'Speculative', emergency: 'Emergency',
  growth: 'Growth', custom: 'Custom',
};

const TAG_COLORS: Record<HoldingTag, string> = {
  retirement: '#6366f1', speculative: '#f59e0b', emergency: '#ef4444',
  growth: '#10b981', custom: '#6b7280',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatCurrencyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n);
}

function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function calcGainLoss(cost: number, current: number) {
  const diff = current - cost;
  const pct = cost > 0 ? (diff / cost) * 100 : 0;
  return { diff, pct };
}

function calcFinancialHealthScore(holdings: Holding[]): number {
  if (holdings.length === 0) return 0;
  const total = holdings.reduce((s, h) => s + h.current_value, 0);
  if (total === 0) return 0;
  const types = new Set(holdings.map(h => h.asset_type)).size;
  const gains = holdings.filter(h => h.current_value > h.cost_basis).length;
  return Math.min(100, 20 + Math.min(types * 12, 40) + Math.round((gains / holdings.length) * 40));
}

function buildDonutSegments(data: { label: string; value: number; color: string }[], size = 120) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const circumference = 2 * Math.PI * 42;
  const GAP = 3;
  if (total === 0) return { segments: [{ color: '#1f2937', dashArray: `${circumference}`, dashOffset: '0', label: '', pct: '0%' }], circumference };
  let accum = 0;
  const segments = data.map(d => {
    const share = (d.value / total) * 360;
    const arcLen = Math.max(0, share - GAP);
    const dashArray = `${(arcLen / 360) * circumference} ${circumference}`;
    const dashOffset = `${(accum / 360) * circumference}`;
    const pct = `${((d.value / total) * 100).toFixed(1)}%`;
    const seg = { color: d.color, dashArray, dashOffset, label: d.label, pct };
    accum += share;
    return seg;
  });
  return { segments, circumference };
}

// ── Donut Chart ───────────────────────────────────────────────────────────

function DonutChart({ data, centerLabel, centerValue, size = 140 }: { data: { label: string; value: number; color: string }[]; centerLabel: string; centerValue: string; size?: number }) {
  const radius = 48;
  const cx = size / 2;
  const cy = size / 2;
  const { segments } = buildDonutSegments(data, size);
  return (
    <div className="donut-chart-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={14} />
        {segments.map((seg, i) => (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={seg.color} strokeWidth={14}
            strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset} strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ filter: `drop-shadow(0 0 6px ${seg.color}60)`, transition: 'stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="rgba(236,253,245,0.45)" fontSize={9} fontWeight={700} letterSpacing="0.1em">{centerLabel.toUpperCase()}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#ecfdf5" fontSize={15} fontWeight={900} fontFamily="'JetBrains Mono', monospace">{centerValue}</text>
      </svg>
    </div>
  );
}

// ── Health Score Card ─────────────────────────────────────────────────────

function HealthScoreCard({ score }: { score: number }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dashLen = (score / 100) * circ;
  const scoreColor = score >= 75 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 75 ? 'Excellent' : score >= 45 ? 'Fair' : 'Needs Attention';
  return (
    <div className="health-score-card">
      <div className="health-score-ring">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke={scoreColor} strokeWidth="6"
            strokeDasharray={`${dashLen} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ filter: `drop-shadow(0 0 8px ${scoreColor}80)`, transition: 'stroke-dasharray 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
          <text x="50" y="46" textAnchor="middle" fill={scoreColor} fontSize="22" fontWeight={900} fontFamily="'JetBrains Mono', monospace">{score}</text>
          <text x="50" y="60" textAnchor="middle" fill="rgba(236,253,245,0.5)" fontSize="8" fontWeight={700} letterSpacing="0.08em">/ 100</text>
        </svg>
      </div>
      <div className="health-score-info">
        <span className="health-score-label">Financial Health Score</span>
        <span className="health-score-status" style={{ color: scoreColor }}>{scoreLabel}</span>
        <span className="health-score-sub">Based on diversification + performance</span>
      </div>
    </div>
  );
}

// ── Form shape ───────────────────────────────────────────────────────────────

interface HoldingForm {
  name: string;
  asset_type: AssetType;
  ticker: string;
  shares: string;
  cost_basis: string;
  current_value: string;
  tag: HoldingTag;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortfolioTab() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Stock search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<HoldingForm>({
    name: '', asset_type: 'stock', ticker: '', shares: '', cost_basis: '', current_value: '', tag: 'growth',
  });

  // ── Fetch holdings from DB ────────────────────────────────────────────────

  async function loadHoldings() {
    try {
      setLoading(true);
      setError(null);
      const raw: any[] = await invoke('pulse_get_holdings', { memberId: null });
      setHoldings(raw.map(dbToHolding));
    } catch (e: any) {
      console.error('[PortfolioTab] loadHoldings error:', e);
      setError('Failed to load holdings: ' + (e?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHoldings(); }, []);

  // ── Stock search ───────────────────────────────────────────────────────────

  useEffect(() => {
    // Only search for stock/crypto type
    if (form.asset_type !== 'stock' && form.asset_type !== 'crypto') {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results: StockSearchResult[] = await invoke('pulse_search_stocks', { query: searchQuery.trim() });
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (e) {
        console.warn('[PortfolioTab] stock search error:', e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, form.asset_type]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function applySearchResult(result: StockSearchResult) {
    // Pre-fill from search result
    setForm(f => ({
      ...f,
      name: result.company_name || result.symbol,
      ticker: result.symbol,
      current_value: result.current_price != null ? String(result.current_price) : f.current_value,
    }));

    // Fetch live price for selected symbol
    if (result.symbol) {
      try {
        const priceData: any = await invoke('pulse_fetch_price', { symbol: result.symbol });
        setForm(f => ({ ...f, current_value: String(priceData.price) }));
      } catch (e) {
        console.warn('[PortfolioTab] pulse_fetch_price failed:', e);
      }
    }

    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  const summary: PortfolioSummary = (() => {
    const total_value = holdings.reduce((s, h) => s + h.current_value, 0);
    const total_cost_basis = holdings.reduce((s, h) => s + h.cost_basis, 0);
    const total_gain_loss = total_value - total_cost_basis;
    const total_gain_loss_pct = total_cost_basis > 0 ? (total_gain_loss / total_cost_basis) * 100 : 0;
    const by_type: Record<AssetType, number> = { stock: 0, crypto: 0, real_estate: 0, cash: 0, bond: 0, other: 0 };
    const by_tag: Record<HoldingTag, number> = { retirement: 0, speculative: 0, emergency: 0, growth: 0, custom: 0 };
    holdings.forEach(h => { by_type[h.asset_type] += h.current_value; by_tag[h.tag] += h.current_value; });
    return { total_value, total_cost_basis, total_gain_loss, total_gain_loss_pct, by_type, by_tag };
  })();

  const healthScore = calcFinancialHealthScore(holdings);

  const typeDonutData = (Object.entries(summary.by_type) as [AssetType, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: ASSET_TYPE_LABELS[k], value: v, color: ASSET_TYPE_COLORS[k] }));

  const tagDonutData = (Object.entries(summary.by_tag) as [HoldingTag, number][])
    .filter(([, v]: [HoldingTag, number]) => v > 0)
    .map(([k, v]: [HoldingTag, number]) => ({ label: TAG_LABELS[k], value: v, color: TAG_COLORS[k] }));

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    const cost = parseFloat(form.cost_basis) || 0;
    const current = parseFloat(form.current_value) || 0;
    const shares = parseFloat(form.shares) || 0;

    const payload = {
      name: form.name.trim(),
      asset_type: form.asset_type,
      ticker: form.ticker.trim() || null,
      shares,
      cost_basis: cost,
      current_value: current,
      tag: form.tag,
      notes: null,
    };

    try {
      if (editingId) {
        const updateReq: any = {};
        if (form.name.trim()) updateReq.name = form.name.trim();
        updateReq.asset_type = form.asset_type;
        if (form.ticker.trim()) updateReq.symbol = form.ticker.trim();
        if (!isNaN(shares)) updateReq.shares = shares;
        if (!isNaN(cost)) updateReq.cost_basis = cost;
        if (!isNaN(current)) updateReq.current_value = current;
        updateReq.tag = form.tag;
        const updated: any = await invoke('pulse_update_holding', { id: editingId, req: updateReq });
        setHoldings(prev => prev.map(h => h.id === editingId ? dbToHolding(updated) : h));
      } else {
        const created: any = await invoke('pulse_add_holding', { req: payload, memberId: null });
        setHoldings(prev => [dbToHolding(created), ...prev]);
      }
      setForm({ name: '', asset_type: 'stock', ticker: '', shares: '', cost_basis: '', current_value: '', tag: 'growth' });
      setShowForm(false);
      setEditingId(null);
    } catch (e: any) {
      console.error('[PortfolioTab] handleSave error:', e);
      setError('Failed to save: ' + (e?.message ?? String(e)));
    }
  }

  async function handleDelete(id: string) {
    try {
      await invoke('pulse_delete_holding', { id });
      setHoldings(prev => prev.filter(h => h.id !== id));
      setConfirmDelete(null);
    } catch (e: any) {
      console.error('[PortfolioTab] handleDelete error:', e);
      setError('Failed to delete: ' + (e?.message ?? String(e)));
    }
  }

  function startEdit(h: Holding) {
    setForm({ name: h.name, asset_type: h.asset_type, ticker: h.ticker ?? '', shares: String(h.shares), cost_basis: String(h.cost_basis), current_value: String(h.current_value), tag: h.tag });
    setEditingId(h.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm({ name: '', asset_type: 'stock', ticker: '', shares: '', cost_basis: '', current_value: '', tag: 'growth' });
    setEditingId(null);
    setShowForm(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────---

  return (
    <div className="portfolio-tab">
      {/* ── Header ── */}
      <div className="portfolio-header">
        <div className="portfolio-title-block">
          <h1 className="portfolio-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10, verticalAlign: 'middle' }}>
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            Portfolio
          </h1>
          <p className="portfolio-subtitle">Track your assets across all types</p>
        </div>
        {!showForm && (
          <button className="portfolio-btn-primary" onClick={() => setShowForm(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: 6 }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Holding
          </button>
        )}
      </div>

      {error && (
        <div className="portfolio-error-banner" onClick={() => setError(null)}>
          <span>⚠️ {error}</span>
          <button className="error-dismiss-btn">✕</button>
        </div>
      )}

      {loading && (
        <div className="portfolio-loading">
          <div className="portfolio-spinner" />
          <span>Loading portfolio...</span>
        </div>
      )}

      {!loading && holdings.length === 0 && !showForm && (
        <div className="portfolio-empty">
          <div className="empty-icon">📊</div>
          <h3>No holdings yet</h3>
          <p>Add your first asset to start tracking your portfolio performance.</p>
          <button className="portfolio-btn-primary" onClick={() => setShowForm(true)}>Add Your First Holding</button>
        </div>
      )}

      {/* ── Hero Summary Row ── */}
      {!loading && (holdings.length > 0 || showForm) && (
        <div className="portfolio-hero-row">
          <div className="portfolio-hero-card">
            <div className="hero-value-display">
              <span className="hero-label">Total Portfolio Value</span>
              <span className="hero-currency">$</span>
              <span className="hero-amount">{formatCurrencyCompact(summary.total_value).replace('$', '')}</span>
            </div>
            <div className="hero-sub-row">
              <span className="hero-cost-basis">Cost basis {formatCurrency(summary.total_cost_basis)}</span>
              <span className="hero-asset-count">{holdings.length} asset{holdings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="hero-glow" />
          </div>
          <div className={`portfolio-hero-card portfolio-hero-gain ${summary.total_gain_loss >= 0 ? 'gain-positive' : 'gain-negative'}`}>
            <div className="hero-value-display">
              <span className="hero-label">Total Gain / Loss</span>
              <span className={`hero-gain-value ${summary.total_gain_loss >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                {summary.total_gain_loss >= 0 ? '+' : ''}{formatCurrency(summary.total_gain_loss)}
              </span>
            </div>
            <div className="hero-sub-row">
              <span className={`hero-pct-badge ${summary.total_gain_loss >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                {summary.total_gain_loss >= 0 ? '▲' : '▼'} {formatPct(summary.total_gain_loss_pct)}
              </span>
              <span className="hero-gain-label">all-time</span>
            </div>
          </div>
          <HealthScoreCard score={healthScore} />
        </div>
      )}

      {/* ── Donut Charts Row ── */}
      {!loading && holdings.length > 0 && (
        <div className="portfolio-charts-row">
          <div className="portfolio-glass-card portfolio-pie-card">
            <h3 className="pie-card-title">Allocation by Type</h3>
            <div className="pie-chart-layout">
              <DonutChart data={typeDonutData} centerLabel="total" centerValue={formatCurrencyCompact(summary.total_value)} size={140} />
              <div className="pie-legend">
                {typeDonutData.map(d => (
                  <div key={d.label} className="pie-legend-item">
                    <span className="pie-legend-dot" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}60` }} />
                    <span className="pie-legend-label">{d.label}</span>
                    <span className="pie-legend-pct">{summary.total_value > 0 ? ((d.value / summary.total_value) * 100).toFixed(1) : '0'}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="portfolio-glass-card portfolio-pie-card">
            <h3 className="pie-card-title">Allocation by Tag</h3>
            <div className="pie-chart-layout">
              <DonutChart data={tagDonutData} centerLabel="tagged" centerValue={`${holdings.length}`} size={140} />
              <div className="pie-legend">
                {tagDonutData.map(d => (
                  <div key={d.label} className="pie-legend-item">
                    <span className="pie-legend-dot" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}60` }} />
                    <span className="pie-legend-label">{d.label}</span>
                    <span className="pie-legend-pct">{summary.total_value > 0 ? ((d.value / summary.total_value) * 100).toFixed(1) : '0'}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className="portfolio-glass-card portfolio-form-card">
          <div className="form-header-row">
            <h3 className="form-title">{editingId ? '✏️ Edit Holding' : '➕ Add New Holding'}</h3>
            <button className="form-close-btn" onClick={cancelForm}>✕</button>
          </div>

          <div className="portfolio-form-grid">
            {/* ── Asset Name with live search ── */}
            <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
              <label className="form-label">Asset Name *</label>
              <input
                className="form-input"
                placeholder="Type to search (e.g. Walmart, Apple, Bitcoin)"
                value={searchQuery || form.name}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setForm(f => ({ ...f, name: e.target.value }));
                }}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                autoComplete="off"
              />
              {/* Search spinner */}
              {searching && (
                <span className="stock-search-spinner" />
              )}
              {/* Results dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="stock-search-dropdown">
                  {searchResults.map(r => (
                    <button key={r.symbol} className="stock-search-item"
                      onClick={() => applySearchResult(r)} type="button">
                      <span className="stock-search-symbol">{r.symbol}</span>
                      <span className="stock-search-name">{r.company_name}</span>
                      {r.current_price != null && (
                        <span className="stock-search-price">${r.current_price.toFixed(2)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Asset Type (triggers search toggle) ── */}
            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <select className="form-select" value={form.asset_type}
                onChange={e => { setForm(f => ({ ...f, asset_type: e.target.value as AssetType })); setSearchQuery(''); setShowDropdown(false); }}>
                {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map(k => (
                  <option key={k} value={k}>{ASSET_TYPE_LABELS[k]}</option>
                ))}
              </select>
              {(form.asset_type === 'real_estate' || form.asset_type === 'cash' || form.asset_type === 'bond') && (
                <span className="form-hint">Search disabled for this type</span>
              )}
            </div>

            {/* ── Ticker (auto-filled from search) ── */}
            <div className="form-group">
              <label className="form-label">Ticker Symbol</label>
              <input className="form-input ticker-input" placeholder="Auto-filled or manual"
                value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Shares / Units</label>
              <input className="form-input" type="number" min="0" step="any" placeholder="0.0000"
                value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Basis (total paid) *</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.cost_basis} onChange={e => setForm(f => ({ ...f, cost_basis: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Current Value *</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.current_value} onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Strategy Tag</label>
              <select className="form-select" value={form.tag}
                onChange={e => setForm(f => ({ ...f, tag: e.target.value as HoldingTag }))}>
                {(Object.keys(TAG_LABELS) as HoldingTag[]).map(k => (
                  <option key={k} value={k}>{TAG_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="portfolio-btn-secondary" onClick={cancelForm}>Cancel</button>
            <button className="portfolio-btn-primary" disabled={!form.name.trim()} onClick={handleSave}>
              {editingId ? 'Update Holding' : 'Add Holding'}
            </button>
          </div>
        </div>
      )}

      {/* ── Holdings List ── */}
      {!loading && holdings.length > 0 && (
        <div className="portfolio-holdings-list">
          <h3 className="holdings-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Holdings ({holdings.length})
          </h3>
          <div className="holdings-table">
            <div className="holdings-thead"><span>Asset</span><span>Type</span><span>Shares</span><span>Current Value</span><span>Gain / Loss</span><span>Tag</span><span></span></div>
            {holdings.map((h, i) => {
              const { diff, pct } = calcGainLoss(h.cost_basis, h.current_value);
              return (
                <div key={h.id} className="holdings-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="holding-asset">
                    <div className="holding-name-row">
                      <span className="holding-dot" style={{ background: ASSET_TYPE_COLORS[h.asset_type] }} />
                      <span className="holding-name">{h.name}</span>
                    </div>
                    {h.ticker && <span className="holding-ticker">{h.ticker}</span>}
                  </div>
                  <div>
                    <span className="type-badge" style={{ background: ASSET_TYPE_COLORS[h.asset_type] + '20', border: `1px solid ${ASSET_TYPE_COLORS[h.asset_type]}50`, color: ASSET_TYPE_COLORS[h.asset_type] }}>
                      {ASSET_TYPE_LABELS[h.asset_type]}
                    </span>
                  </div>
                  <span className="holding-shares">{h.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
                  <span className="holding-value">{formatCurrency(h.current_value)}</span>
                  <div className={`holding-gain ${diff >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                    <span className="gain-dollar">{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
                    <span className="gain-pct">{formatPct(pct)}</span>
                  </div>
                  <div>
                    <span className="tag-badge" style={{ background: TAG_COLORS[h.tag] + '18', border: `1px solid ${TAG_COLORS[h.tag]}45`, color: TAG_COLORS[h.tag] }}>
                      {TAG_LABELS[h.tag]}
                    </span>
                  </div>
                  <div className="holding-actions">
                    <button className="action-btn" onClick={() => startEdit(h)} title="Edit">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="action-btn action-btn-danger" onClick={() => setConfirmDelete(h.id)} title="Delete">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDelete && (
        <div className="portfolio-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="portfolio-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3>Delete Holding?</h3>
            <p>This will permanently remove the asset from your portfolio. This cannot be undone.</p>
            <div className="confirm-actions">
              <button className="portfolio-btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="confirm-delete-btn" onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}