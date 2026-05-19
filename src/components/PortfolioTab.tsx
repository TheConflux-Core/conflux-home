// Conflux Home — PortfolioTab
// Custom asset portfolio tracker with dark emerald Pulse aesthetic
// Priority 2: SVG donut charts, Financial Health Score, hero summary redesign

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './PortfolioTab.css';

// ── Types (frontend camelCase) ───────────────────────────────────────────

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
  created_at?: string;
  updated_at?: string;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost_basis: number;
  total_gain_loss: number;
  total_gain_loss_pct: number;
  by_type: Record<AssetType, number>;
  by_tag: Record<HoldingTag, number>;
}

// ── Rust → Frontend type bridge ──────────────────────────────────────────

interface RustHolding {
  id: string;
  user_id: string;
  asset_name: string;
  asset_type: string;
  symbol: string | null;
  shares: number;
  cost_basis: number;
  current_value: number;
  tag: string | null;
  notes: string | null;
  updated_at: string | null;
  created_at: string;
}

function fromRust(h: RustHolding): Holding {
  return {
    id: h.id,
    name: h.asset_name,
    asset_type: h.asset_type as AssetType,
    ticker: h.symbol ?? undefined,
    shares: h.shares,
    cost_basis: h.cost_basis,
    current_value: h.current_value,
    tag: (h.tag ?? 'custom') as HoldingTag,
    created_at: h.created_at,
    updated_at: h.updated_at ?? undefined,
  };
}

// ── Color/label maps ─────────────────────────────────────────────────────────

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Stock',
  crypto: 'Crypto',
  real_estate: 'Real Estate',
  cash: 'Cash',
  bond: 'Bond',
  other: 'Other',
};

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  stock: '#3b82f6',
  crypto: '#f97316',
  real_estate: '#10b981',
  cash: '#6b7280',
  bond: '#8b5cf6',
  other: '#94a3b8',
};

const TAG_LABELS: Record<HoldingTag, string> = {
  retirement: 'Retirement',
  speculative: 'Speculative',
  emergency: 'Emergency',
  growth: 'Growth',
  custom: 'Custom',
};

const TAG_COLORS: Record<HoldingTag, string> = {
  retirement: '#6366f1',
  speculative: '#f59e0b',
  emergency: '#ef4444',
  growth: '#10b981',
  custom: '#6b7280',
};

// ── Donut Chart Segment type ──────────────────────────────────────────────

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
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
  // Heuristic: diversification bonus + gain/loss bonus
  const types = new Set(holdings.map(h => h.asset_type)).size;
  const gains = holdings.filter(h => h.current_value > h.cost_basis).length;
  const diversificationScore = Math.min(types * 12, 40);
  const gainScore = Math.round((gains / holdings.length) * 40);
  const baseScore = 20;
  return Math.min(100, baseScore + diversificationScore + gainScore);
}

/**
 * Build SVG donut path segments for a set of data.
 * Returns an array of { color, dashArray, dashOffset, label } for SVG strokes.
 */
function buildDonutSegments(data: DonutSegment[], size = 120): {
  segments: Array<{ color: string; dashArray: string; dashOffset: string; label: string; pct: string }>;
  circumference: number;
} {
  const total = data.reduce((s, d) => s + d.value, 0);
  const circumference = 2 * Math.PI * 42; // radius 42
  const GAP = 3; // gap in degrees for visual separation

  if (total === 0) {
    return {
      segments: [{ color: '#1f2937', dashArray: `${circumference}`, dashOffset: '0', label: data[0]?.label ?? '', pct: '0%' }],
      circumference,
    };
  }

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

// ── Animated Number ───────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ── Donut Chart Component ────────────────────────────────────────────────

function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 140,
}: {
  data: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const { segments } = buildDonutSegments(data, size);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="donut-chart-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={14}
        />

        {/* Segments */}
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={14}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              filter: `drop-shadow(0 0 6px ${seg.color}60)`,
              transition: 'stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        ))}

        {/* Center label */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="rgba(236,253,245,0.45)"
          fontSize={9}
          fontWeight={700}
          letterSpacing="0.1em"
        >
          {centerLabel.toUpperCase()}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="#ecfdf5"
          fontSize={15}
          fontWeight={900}
          fontFamily="'JetBrains Mono', monospace"
        >
          {centerValue}
        </text>
      </svg>
    </div>
  );
}

// ── Financial Health Score Card ─────────────────────────────────────────

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
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth="6"
            strokeDasharray={`${dashLen} ${circ}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{
              filter: `drop-shadow(0 0 8px ${scoreColor}80)`,
              transition: 'stroke-dasharray 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
          <text x="50" y="46" textAnchor="middle" fill={scoreColor} fontSize="22" fontWeight={900}
            fontFamily="'JetBrains Mono', monospace">
            {score}
          </text>
          <text x="50" y="60" textAnchor="middle" fill="rgba(236,253,245,0.5)" fontSize="8" fontWeight={700}
            letterSpacing="0.08em">
            / 100
          </text>
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  interface StockSearchResult {
    symbol: string;
    companyName: string;
    sector: string;
    current_price?: number;
    logo_url?: string;
  }

  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchLoading) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const results: StockSearchResult[] = await invoke('pulse_search_stocks', { query: searchQuery.trim() });
      // Fetch live prices for each result in parallel
      const withPrices = await Promise.all(
        results.map(async (r) => {
          try {
            const price: number = await invoke('pulse_fetch_price', { symbol: r.symbol });
            return { ...r, current_price: price };
          } catch {
            return { ...r };
          }
        })
      );
      setSearchResults(withPrices);
    } catch (e) {
      console.error('[PortfolioTab] search failed:', e);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, searchLoading]);


  const handleSelectResult = useCallback(async (result: StockSearchResult) => {
    // Infer asset type from sector keyword
    const sector = result.sector.toLowerCase();
    let inferredType: AssetType = 'stock';
    if (sector.includes('techn') || sector.includes('software') || sector.includes('computer')) inferredType = 'stock';
    else if (sector.includes('crypto') || sector.includes('digital') || result.symbol.includes('BTC') || result.symbol.includes('ETH')) inferredType = 'crypto';
    else if (sector.includes('real estate') || sector.includes('property')) inferredType = 'real_estate';
    else if (sector.includes('cash') || sector.includes('bank')) inferredType = 'cash';
    else if (sector.includes('bond') || sector.includes('fixed income')) inferredType = 'bond';

    setForm({
      name: result.companyName,
      asset_type: inferredType,
      ticker: result.symbol,
      shares: '',
      cost_basis: result.current_price ? String(result.current_price) : '',
      current_value: result.current_price ? String(result.current_price) : '',
      tag: 'growth',
    });
    setSearchResults([]);
    setSearchQuery('');
  }, []);

  const [form, setForm] = useState<HoldingForm>({
    name: '', asset_type: 'stock', ticker: '',
    shares: '', cost_basis: '', current_value: '', tag: 'growth',
  });

  const loadHoldings = useCallback(async () => {
    try {
      const data: RustHolding[] = await invoke('pulse_get_holdings', {});
      setHoldings(data.map(fromRust));
    } catch {
      // empty on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHoldings(); }, [loadHoldings]);

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

  // ── Donut data ─────────────────────────────────────────────────────────────────

  const typeDonutData: DonutSegment[] = (Object.entries(summary.by_type) as [AssetType, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: ASSET_TYPE_LABELS[k], value: v, color: ASSET_TYPE_COLORS[k] }));

  const tagDonutData: DonutSegment[] = (Object.entries(summary.by_tag) as [HoldingTag, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: TAG_LABELS[k], value: v, color: TAG_COLORS[k] }));

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
    };
    try {
      if (editingId) {
        await invoke('pulse_update_holding', { id: editingId, req: payload });
      } else {
        await invoke('pulse_add_holding', { req: payload });
      }
    } catch (e) {
      console.error('[PortfolioTab] save failed:', e);
    }
    setForm({ name: '', asset_type: 'stock', ticker: '', shares: '', cost_basis: '', current_value: '', tag: 'growth' });
    setShowForm(false);
    setEditingId(null);
    await loadHoldings();
  }

  async function handleDelete(id: string) {
    try { await invoke('pulse_delete_holding', { id }); } catch (e) { console.error('[PortfolioTab] delete failed:', e); }
    setConfirmDelete(null);
    await loadHoldings();
  }

  function startEdit(h: Holding) {
    setForm({
      name: h.name,
      asset_type: h.asset_type,
      ticker: h.ticker ?? '',
      shares: String(h.shares),
      cost_basis: String(h.cost_basis),
      current_value: String(h.current_value),
      tag: h.tag,
    });
    setEditingId(h.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm({ name: '', asset_type: 'stock', ticker: '', shares: '', cost_basis: '', current_value: '', tag: 'growth' });
    setEditingId(null);
    setShowForm(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="portfolio-tab">
        <div className="portfolio-loading">
          <span className="portfolio-spinner" />
          <p>Loading portfolio…</p>
        </div>
      </div>
    );
  }

  if (!showForm && holdings.length === 0) {
    return (
      <div className="portfolio-tab">
        <div className="portfolio-empty">
          <div className="portfolio-empty-visual">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="36" stroke="rgba(16,185,129,0.15)" strokeWidth="3" />
              <circle cx="40" cy="40" r="24" stroke="rgba(16,185,129,0.1)" strokeWidth="3" />
              <circle cx="40" cy="40" r="8" fill="rgba(16,185,129,0.2)" />
              <line x1="40" y1="4" x2="40" y2="16" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeLinecap="round" />
              <line x1="40" y1="64" x2="40" y2="76" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="40" x2="16" y2="40" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeLinecap="round" />
              <line x1="64" y1="40" x2="76" y2="40" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2>Build your portfolio</h2>
          <p>Add your first asset to start tracking your wealth.</p>
          <button className="portfolio-btn-primary" onClick={() => setShowForm(true)}>
            + Add First Asset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-tab">
      {/* ── Header ── */}
      <div className="portfolio-header">
        <div className="portfolio-title-block">
          <h1 className="portfolio-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10, verticalAlign: 'middle' }}>
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            Portfolio
          </h1>
          <p className="portfolio-subtitle">Track your assets across all types</p>
        </div>
        {!showForm && (
          <button className="portfolio-btn-primary" onClick={() => setShowForm(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: 6 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Holding
          </button>
        )}
      </div>

      {/* ── Hero Summary Row ── */}
      <div className="portfolio-hero-row">
        {/* Total Value — hero card */}
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

        {/* Gain / Loss — hero card */}
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

        {/* Health Score */}
        <HealthScoreCard score={healthScore} />
      </div>

      {/* ── Donut Charts Row ── */}
      {holdings.length > 0 && (
        <div className="portfolio-charts-row">
          <div className="portfolio-glass-card portfolio-pie-card">
            <h3 className="pie-card-title">Allocation by Type</h3>
            <div className="pie-chart-layout">
              <DonutChart
                data={typeDonutData}
                centerLabel="total"
                centerValue={holdings.length > 0 ? formatCurrencyCompact(summary.total_value) : '$0'}
                size={140}
              />
              <div className="pie-legend">
                {typeDonutData.map(d => (
                  <div key={d.label} className="pie-legend-item">
                    <span className="pie-legend-dot" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}60` }} />
                    <span className="pie-legend-label">{d.label}</span>
                    <span className="pie-legend-pct">
                      {summary.total_value > 0 ? ((d.value / summary.total_value) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="portfolio-glass-card portfolio-pie-card">
            <h3 className="pie-card-title">Allocation by Tag</h3>
            <div className="pie-chart-layout">
              <DonutChart
                data={tagDonutData}
                centerLabel="tagged"
                centerValue={holdings.length > 0 ? `${holdings.length}` : '0'}
                size={140}
              />
              <div className="pie-legend">
                {tagDonutData.map(d => (
                  <div key={d.label} className="pie-legend-item">
                    <span className="pie-legend-dot" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}60` }} />
                    <span className="pie-legend-label">{d.label}</span>
                    <span className="pie-legend-pct">
                      {summary.total_value > 0 ? ((d.value / summary.total_value) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Smart Add Form ── */}
      {showForm && (
        <div className="portfolio-glass-card portfolio-form-card">
          <div className="form-header-row">
            <h3 className="form-title">{editingId ? '✏️ Edit Holding' : '🔍 Add New Holding'}</h3>
            <button className="form-close-btn" onClick={cancelForm}>✕</button>
          </div>

          {/* AI Search Bar */}
          {!editingId && (
            <div className="smart-search-bar">
              <div className="smart-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <input
                className="smart-search-input"
                placeholder="Search ticker or company name — e.g. Walmart, AAPL, Bitcoin..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchQuery.trim() && handleSmartSearch()}
                autoFocus
              />
              {searchQuery && (
                <button className="smart-search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchLoading(false); }}>✕</button>
              )}
              <button
                className="smart-search-btn"
                onClick={handleSmartSearch}
                disabled={!searchQuery.trim() || searchLoading}
              >
                {searchLoading ? (
                  <span className="smart-search-spinner" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                )}
              </button>
            </div>
          )}


          {/* Search Results */}
          {!editingId && searchResults.length > 0 && (
            <div className="smart-search-results">
              <div className="smart-results-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
                Live market data — click to select
              </div>
              <div className="smart-results-grid">
                {searchResults.map(r => (
                  <button key={r.symbol} className="smart-result-card" onClick={() => handleSelectResult(r)}>
                    <div className="smart-result-left">
                      <span className="smart-result-symbol">{r.symbol}</span>
                      <span className="smart-result-name">{r.companyName}</span>
                      <span className="smart-result-sector">{r.sector}</span>
                    </div>
                    {r.current_price && (
                      <div className="smart-result-price">
                        <span className="smart-result-price-val">${r.current_price.toFixed(2)}</span>
                        <span className="smart-result-price-label">live</span>
                      </div>
                    )}
                    {!r.current_price && (
                      <div className="smart-result-price smart-result-price-fetch">
                        <span className="smart-result-price-label">fetching…</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && !searchLoading && (
            <div className="smart-no-results">No results for "{searchQuery}" — fill in manually below</div>
          )}

          {/* Manual Form Fields */}
          <div className={`portfolio-form-grid ${searchResults.length > 0 || editingId ? 'form-compact' : ''}`}>
            <div className="form-group">
              <label className="form-label">Asset Name *</label>
              <input className="form-input" placeholder="e.g. Apple Inc, Bitcoin, Vacation Home"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <select className="form-select" value={form.asset_type}
                onChange={e => setForm(f => ({ ...f, asset_type: e.target.value as AssetType }))}>
                {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map(k => (
                  <option key={k} value={k}>{ASSET_TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ticker Symbol</label>
              <input className="form-input ticker-input" placeholder="e.g. AAPL, BTC"
                value={form.ticker}
                onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Shares / Units</label>
              <input className="form-input" type="number" min="0" step="any" placeholder="0.0000"
                value={form.shares}
                onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Basis (total paid) *</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.cost_basis}
                onChange={e => setForm(f => ({ ...f, cost_basis: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Current Value *</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.current_value}
                onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} />
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
      {holdings.length > 0 && (
        <div className="portfolio-holdings-list">
          <h3 className="holdings-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Holdings ({holdings.length})
          </h3>
          <div className="holdings-table">
            <div className="holdings-thead">
              <span>Asset</span>
              <span>Type</span>
              <span>Shares</span>
              <span>Current Value</span>
              <span>Gain / Loss</span>
              <span>Tag</span>
              <span></span>
            </div>
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
                    <span className="type-badge"
                      style={{
                        background: ASSET_TYPE_COLORS[h.asset_type] + '20',
                        border: `1px solid ${ASSET_TYPE_COLORS[h.asset_type]}50`,
                        color: ASSET_TYPE_COLORS[h.asset_type],
                      }}>
                      {ASSET_TYPE_LABELS[h.asset_type]}
                    </span>
                  </div>
                  <span className="holding-shares">
                    {h.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </span>
                  <span className="holding-value">{formatCurrency(h.current_value)}</span>
                  <div className={`holding-gain ${diff >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                    <span className="gain-dollar">
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                    </span>
                    <span className="gain-pct">{formatPct(pct)}</span>
                  </div>
                  <div>
                    <span className="tag-badge"
                      style={{
                        background: TAG_COLORS[h.tag] + '18',
                        border: `1px solid ${TAG_COLORS[h.tag]}45`,
                        color: TAG_COLORS[h.tag],
                      }}>
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
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" /><path d="M14 11v6" />
                        <path d="M9 6V4h6v2" />
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