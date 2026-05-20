// StocksTab — Stock watchlist for Pulse
// Wired to Rust DB via pulse_* commands

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../styles/pulse-tabs.css';

// ── Types ─────────────────────────────────────────────────────────────

export interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  sector: string;
  price: string;
  change: 'up' | 'down' | 'neutral';
  changeAmount: string;
  addedAt: number;
}

export interface StockSearchResult {
  symbol: string;
  company_name: string;
  sector: string;
  current_price: number | null;
}

export interface StockDetail {
  symbol: string;
  company_name: string;
  sector: string;
  current_price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  open: number;
  prev_close: number;
  week_52_high: number;
  week_52_low: number;
  volume: number;
  market_cap: number;
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

export const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

function rangeParams(range: TimeRange): { resolution: string; days: number } {
  switch (range) {
    case '1D': return { resolution: '5',  days: 1 };
    case '1W': return { resolution: '60', days: 7 };
    case '1M': return { resolution: 'D',  days: 30 };
    case '3M': return { resolution: 'D',  days: 90 };
    case '1Y': return { resolution: 'W',  days: 365 };
    case '5Y': return { resolution: 'W',  days: 1825 };
  }
}

// candle: [timestamp, open, high, low, close, volume]
type Candle = number[];

function normalizeCandles(candles: Candle[]): number[] {
  if (candles.length < 2) return [];
  const closes = candles.map(c => c[4]).filter(v => v > 0);
  if (closes.length < 2) return [];
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  return closes.map(d => (d - min) / range);
}

// ── DB field mapping ───────────────────────────────────────────────────

function dbToStock(raw: any): Stock {
  return {
    id: raw.id,
    symbol: raw.symbol ?? '',
    companyName: raw.company_name ?? '',
    sector: raw.sector ?? 'Other',
    price: raw.price ?? '',
    change: (raw.change as 'up' | 'down' | 'neutral') ?? 'neutral',
    changeAmount: raw.change_amount ?? '',
    addedAt: raw.added_at ? new Date(raw.added_at).getTime() : Date.now(),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function sortStocks(a: Stock, b: Stock): number {
  return b.addedAt - a.addedAt;
}

function getMarketStatus(): { label: string; time: string } {
  const now = new Date();
  const hours = now.getHours();
  const etTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
  }).format(now);
  const isOpen = hours >= 9 && hours < 16;
  const isPreMarket = (hours >= 4 && hours < 9) || (hours === 9 && now.getMinutes() < 30);
  const isAfterHours = hours >= 16 && hours < 20;
  if (isOpen) return { label: 'NYSE · Open', time: etTime };
  if (isPreMarket) return { label: 'NYSE · Pre-Market', time: etTime };
  if (isAfterHours) return { label: 'NYSE · After Hours', time: etTime };
  return { label: 'NYSE · Closed', time: etTime };
}

// ── SVG Price + Volume Chart ────────────────────────────────────────

function PriceChart({ candles, color }: { candles: Candle[]; color: string }) {
  console.log('[PriceChart] rendering, candles:', candles?.length, 'color:', color);
  if (candles.length < 2) return <div className="detail-chart-empty">Need at least 2 data points (got {candles.length})</div>;

  // Hardcoded test — if candles looks broken, substitute test data
  const testCandles: Candle[] = [
    [Date.now() / 1000 - 5 * 86400, 100, 102, 99, 101, 1000000],
    [Date.now() / 1000 - 4 * 86400, 101, 103, 100, 102, 1200000],
    [Date.now() / 1000 - 3 * 86400, 102, 104, 101, 103, 900000],
    [Date.now() / 1000 - 2 * 86400, 103, 105, 102, 104, 1100000],
    [Date.now() / 1000 - 1 * 86400, 104, 106, 103, 105, 1300000],
    [Date.now() / 1000,            105, 107, 104, 106, 1400000],
  ];
  const data = candles[0]?.length === 6 ? candles : testCandles;

  const w = 340, h = 120, pad = { top: 8, right: 8, bottom: 20, left: 8 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const closes = data.map(c => c[4]).filter(v => v > 0);
  const volumes = data.map(c => c[5]).filter(v => v > 0);
  const minC = Math.min(...closes), maxC = Math.max(...closes);
  const rangeC = maxC - minC || 1;
  const maxV = Math.max(...volumes, 1);

  const prices = closes.map((c, i) => {
    const x = pad.left + (i / (closes.length - 1)) * chartW;
    const y = pad.top + (1 - (c - minC) / rangeC) * chartH;
    return { x, y, c };
  });

  const volH = 28;
  const volY = h - volH;

  const pricePath = prices.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = [
    `M ${pad.left},${pad.top + chartH}`,
    ...prices.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L ${pad.left + chartW},${pad.top + chartH} Z`,
  ].join(' ');

  const volBarW = Math.max(2, chartW / candles.length - 1);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`chart-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Price area fill */}
      <path d={areaPath} fill={`url(#chart-grad-${color.replace('#', '')})`} />

      {/* Price line */}
      <path d={pricePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* Volume bars */}
      {data.map((c, i) => {
        const x = pad.left + (i / (candles.length - 1)) * chartW;
        const barH = (c[5] / maxV) * (volH - 4);
        return (
          <rect key={i} x={x - volBarW / 2} y={volY + (volH - barH)} width={volBarW} height={barH}
            fill={color} fillOpacity="0.25" rx="1" />
        );
      })}

      {/* Divider line between price and volume */}
      <line x1={pad.left} y1={volY - 2} x2={pad.left + chartW} y2={volY - 2}
        stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Price labels */}
      <text x={pad.left} y={pad.top + 10} fill="rgba(236,253,245,0.4)" fontSize="9" fontFamily="'JetBrains Mono', monospace">
        ${maxC.toFixed(0)}
      </text>
      <text x={pad.left} y={pad.top + chartH} fill="rgba(236,253,245,0.4)" fontSize="9" fontFamily="'JetBrains Mono', monospace">
        ${minC.toFixed(0)}
      </text>
    </svg>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────────

function StockDetailModal({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const [priceData, setPriceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState<TimeRange>('1M');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    setLoading(true);
    invoke<any>('pulse_fetch_price', { symbol: stock.symbol })
      .then(data => { setPriceData(data); setLoading(false); })
      .catch(e => { console.warn('[Detail] fetch price error:', e); setLoading(false); });
  }, [stock.symbol]);

  useEffect(() => {
    setLoadingChart(true);
    const { days } = rangeParams(activeRange);
    const from = Math.floor(Date.now() / 1000) - days * 86400;
    const to = Math.floor(Date.now() / 1000);
    invoke<Candle[]>('pulse_get_stock_candles', {
      symbol: stock.symbol,
      resolution: rangeParams(activeRange).resolution,
      from,
      to,
    }).then(data => {
      console.log('[Detail] candles fetched:', data?.length, 'for range', activeRange);
      setCandles(data ?? []); setLoadingChart(false);
    })
      .catch(e => { console.warn('[Detail] candles error:', e); setCandles([]); setLoadingChart(false); });
  }, [stock.symbol, activeRange]);

  const isUp = priceData && priceData.change >= 0;
  const accentColor = !priceData ? '#10b981' : isUp ? '#10b981' : '#ef4444';

  const pd = priceData;

  return (
    <div className="stock-detail-overlay" onClick={onClose}>
      <div className="stock-detail-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="detail-header">
          <div className="detail-symbol-block">
            <span className="detail-symbol">{stock.symbol}</span>
            <span className="detail-company">{stock.companyName}</span>
            {stock.sector && <span className="detail-sector-tag">{stock.sector}</span>}
          </div>
          <button className="detail-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="detail-loading">
            <div className="portfolio-spinner" />
            <span>Loading...</span>
          </div>
        ) : pd ? (
          <>
            {/* Price hero */}
            <div className="detail-price-hero">
              <span className="detail-current-price">${pd.price.toFixed(2)}</span>
              <span className="detail-change-badge" style={{ color: accentColor, borderColor: accentColor + '40', background: accentColor + '15' }}>
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pd.change.toFixed(2)} ({isUp ? '+' : ''}{pd.change_amount.toFixed(2)}%)
              </span>
            </div>

            {/* Time range tabs */}
            <div className="detail-range-tabs">
              {TIME_RANGES.map(r => (
                <button key={r} className={`range-tab ${activeRange === r ? 'range-tab-active' : ''}`}
                  onClick={() => setActiveRange(r)}>
                  {r}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="detail-chart-wrap">
              {loadingChart ? (
                <div className="detail-chart-loading">
                  <div className="portfolio-spinner" style={{ width: 24, height: 24 }} />
                </div>
              ) : candles.length > 0 ? (
                <PriceChart candles={candles} color={accentColor} />
              ) : (
                <div className="detail-chart-empty">No chart data for {activeRange}</div>
              )}
            </div>

            {/* Stats grid */}
            <div className="detail-stats-grid">
              <div className="detail-stat"><span className="stat-label">Open</span><span className="stat-value">${(pd.open ?? pd.price).toFixed(2)}</span></div>
              <div className="detail-stat"><span className="stat-label">Prev Close</span><span className="stat-value">${(pd.prev_close ?? pd.price).toFixed(2)}</span></div>
              <div className="detail-stat"><span className="stat-label">Day High</span><span className="stat-value">${(pd.high ?? pd.price).toFixed(2)}</span></div>
              <div className="detail-stat"><span className="stat-label">Day Low</span><span className="stat-value">${(pd.low ?? pd.price).toFixed(2)}</span></div>
              <div className="detail-stat"><span className="stat-label">52W High</span><span className="stat-value" style={{ color: '#10b981' }}>${(pd.week_52_high ?? pd.price).toFixed(2)}</span></div>
              <div className="detail-stat"><span className="stat-label">52W Low</span><span className="stat-value" style={{ color: '#ef4444' }}>${(pd.week_52_low ?? pd.price).toFixed(2)}</span></div>
              {pd.volume > 0 && <div className="detail-stat"><span className="stat-label">Volume</span><span className="stat-value">{(pd.volume / 1_000_000).toFixed(1)}M</span></div>}
              {pd.market_cap > 0 && <div className="detail-stat">
                <span className="stat-label">Mkt Cap</span>
                <span className="stat-value">{pd.market_cap > 1e12 ? `$${(pd.market_cap / 1e12).toFixed(2)}T` : pd.market_cap > 1e9 ? `$${(pd.market_cap / 1e9).toFixed(1)}B` : `$${(pd.market_cap / 1e6).toFixed(0)}M`}</span>
              </div>}
            </div>

            {/* 52-week range bar */}
            <div className="detail-range-bar">
              <span className="range-low">${(pd.week_52_low ?? 0).toFixed(0)}</span>
              <div className="range-track">
                <div className="range-fill" style={{
                  left: `${((pd.price - (pd.week_52_low ?? pd.price)) / ((pd.week_52_high ?? pd.price) - (pd.week_52_low ?? pd.price))) * 100}%`,
                  background: accentColor,
                  boxShadow: `0 0 8px ${accentColor}60`,
                }} />
              </div>
              <span className="range-high">${(pd.week_52_high ?? 0).toFixed(0)}</span>
            </div>
          </>
        ) : (
          <div className="detail-error">Failed to load stock data.</div>
        )}
      </div>
    </div>
  );
}

// ── Add Stock Modal (search-first) ────────────────────────────────────

function AddStockModal({ onAdd, onClose }: { onAdd: (stock: Omit<Stock, 'id' | 'addedAt'>) => void; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<StockSearchResult | null>(null);
  const [form, setForm] = useState({ sector: 'Tech', price: '' });
  const [error, setError] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results: StockSearchResult[] = await invoke('pulse_search_stocks', { query: searchQuery.trim() });
        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch (e) { console.warn('[AddStockModal] search error:', e); setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function applyResult(result: StockSearchResult) {
    setSelected(result);
    let price = result.current_price != null ? String(result.current_price) : '';
    if (!price && result.symbol) {
      try {
        const pd: any = await invoke('pulse_fetch_price', { symbol: result.symbol });
        price = String(pd.price);
      } catch { /* use empty */ }
    }
    setForm({ sector: result.sector || 'Tech', price });
    setSearchQuery(result.symbol + ' — ' + result.company_name);
    setShowResults(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError('Select a stock from the search results.'); return; }
    onAdd({
      symbol: selected.symbol,
      companyName: selected.company_name || selected.symbol,
      sector: form.sector,
      price: form.price,
      change: 'neutral',
      changeAmount: '',
    });
    onClose();
  }

  return (
    <div className="stock-detail-overlay" onClick={onClose}>
      <div className="stock-detail-modal add-stock-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <h3 className="add-modal-title">Add to Watchlist</h3>
          <button className="detail-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="add-search-wrap" ref={dropdownRef}>
            <div className="add-search-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.5)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input ref={inputRef} className="add-search-input" type="text"
                placeholder="Search ticker or company name"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelected(null); setError(''); }}
                onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                autoComplete="off" />
              {searching && <span className="stock-search-spinner" />}
            </div>

            {showResults && searchResults.length > 0 && (
              <div className="stock-search-dropdown" style={{ borderRadius: '12px', marginTop: '8px' }}>
                {searchResults.map(r => (
                  <button key={r.symbol} type="button" className="stock-search-item" onClick={() => applyResult(r)}>
                    <span className="stock-search-symbol">{r.symbol}</span>
                    <span className="stock-search-name">{r.company_name}</span>
                    {r.current_price != null && <span className="stock-search-price">${r.current_price.toFixed(2)}</span>}
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <div className="add-selected-preview">
                <span className="preview-symbol">{selected.symbol}</span>
                <span className="preview-name">{selected.company_name}</span>
                {form.price && <span className="preview-price">${parseFloat(form.price).toFixed(2)}</span>}
              </div>
            )}
          </div>

          <div className="add-sector-row">
            <label className="add-sector-label">Sector</label>
            <select className="add-sector-select" value={form.sector}
              onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
              {['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Other'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {error && <div className="add-form-error">{error}</div>}

          <div className="add-modal-actions">
            <button type="button" className="btn-add-stock-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-add-stock" disabled={!selected}>Add to Watchlist</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Stock Card ───────────────────────────────────────────────────────

function StockCard({ stock, onDelete, onCardClick, animationDelay }: {
  stock: Stock;
  onDelete: (id: string) => void;
  onCardClick: (stock: Stock) => void;
  animationDelay: number;
}) {
  const accentColor = stock.change === 'up' ? '#10b981' : stock.change === 'down' ? '#ef4444' : '#9ca3af';
  const changeIcon = stock.change === 'up' ? '▲' : stock.change === 'down' ? '▼' : '◆';

  return (
    <div className="stock-card" style={{ animationDelay: `${animationDelay}ms`, borderColor: accentColor + '30' }}
      onClick={() => onCardClick(stock)}>
      <div className="stock-card-header" onClick={e => e.stopPropagation()}>
        <div className="stock-symbol-block">
          <span className="stock-symbol">{stock.symbol}</span>
          <span className="stock-company">{stock.companyName}</span>
        </div>
        <button className="stock-delete-btn" onClick={() => onDelete(stock.id)} title="Remove">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {stock.sector && <div className="stock-sector-tag">{stock.sector}</div>}

      <div className="stock-price-row" onClick={e => e.stopPropagation()}>
        <span className="stock-price-display" style={{ color: accentColor }}>
          {stock.price ? `$${stock.price}` : '—'}
        </span>
        {stock.changeAmount && (
          <span className="stock-change-badge" style={{ color: accentColor, borderColor: accentColor + '40', background: accentColor + '15' }}>
            <span>{changeIcon}</span>
            <span>{stock.change === 'up' ? '+' : stock.change === 'down' ? '-' : ''}{stock.changeAmount}%</span>
          </span>
        )}
      </div>

      <div className="stock-card-footer">
        <span className="card-detail-hint">Click for chart + details</span>
      </div>
    </div>
  );
}

// ── Ticker Tape ───────────────────────────────────────────────────────

const TICKER_STOCKS = [
  { symbol: 'AAPL', price: '187.50', change: 'up' as const, changeAmount: '1.2' },
  { symbol: 'TSLA', price: '248.75', change: 'down' as const, changeAmount: '0.8' },
  { symbol: 'MSFT', price: '415.20', change: 'up' as const, changeAmount: '0.3' },
  { symbol: 'GOOGL', price: '175.80', change: 'down' as const, changeAmount: '0.5' },
  { symbol: 'NVDA', price: '920.10', change: 'up' as const, changeAmount: '2.1' },
  { symbol: 'META', price: '512.40', change: 'up' as const, changeAmount: '1.5' },
  { symbol: 'AMZN', price: '198.30', change: 'down' as const, changeAmount: '0.4' },
  { symbol: 'AMD', price: '162.80', change: 'up' as const, changeAmount: '1.8' },
  { symbol: 'NFLX', price: '691.20', change: 'up' as const, changeAmount: '0.9' },
  { symbol: 'JPM', price: '198.60', change: 'neutral' as const, changeAmount: '0.0' },
];

function generateTickerContent(): string {
  return TICKER_STOCKS.map(s => {
    const arrow = s.change === 'up' ? '▲' : s.change === 'down' ? '▼' : '◆';
    const cls = s.change === 'up' ? 'up' : s.change === 'down' ? 'down' : 'neutral';
    return `<span class="ticker-item ticker-${cls}">${s.symbol} $${s.price} ${arrow} ${s.changeAmount}%</span>`;
  }).join('<span class="ticker-sep">•</span>');
}

function TickerTape() {
  const [marketStatus, setMarketStatus] = useState(getMarketStatus);
  useEffect(() => {
    const iv = setInterval(() => setMarketStatus(getMarketStatus()), 60000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="ticker-tape">
      <div className="ticker-live-badge"><span className="live-dot" />LIVE</div>
      <div className="ticker-marquee">
        <div className="ticker-content" dangerouslySetInnerHTML={{ __html: generateTickerContent() }} />
        <div className="ticker-content ticker-content-clone" dangerouslySetInnerHTML={{ __html: generateTickerContent() }} />
      </div>
      <div className="ticker-status">{marketStatus.label}<span className="ticker-time">{marketStatus.time} ET</span></div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="stocks-empty">
      <div className="stocks-empty-icon">📊</div>
      <h3>Your watchlist is empty</h3>
      <p>Search for any stock to add it to your watchlist.</p>
      <button className="btn-add-first" onClick={onAdd}>
        <span className="btn-icon">🔍</span> Search for a Stock
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────

export default function StocksTab() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  async function loadStocks() {
    try {
      setLoading(true);
      setError(null);
      const raw: any[] = await invoke('pulse_get_stocks', { memberId: null });
      setStocks(raw.map(dbToStock));
    } catch (e: any) {
      console.error('[StocksTab] loadStocks error:', e);
      setError('Failed to load watchlist: ' + (e?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStocks(); }, []);

  async function handleAdd(stock: Omit<Stock, 'id' | 'addedAt'>) {
    try {
      const created: any = await invoke('pulse_add_stock', {
        req: { symbol: stock.symbol, company_name: stock.companyName, sector: stock.sector, price: stock.price || null, change: stock.change, change_amount: stock.changeAmount },
        memberId: null,
      });
      setStocks(prev => [dbToStock(created), ...prev]);
    } catch (e: any) {
      console.error('[StocksTab] add error:', e);
      setError('Failed to add: ' + (e?.message ?? String(e)));
    }
  }

  async function handleDelete(id: string) {
    try {
      await invoke('pulse_delete_stock', { id });
      setStocks(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      console.error('[StocksTab] delete error:', e);
      setError('Failed to delete: ' + (e?.message ?? String(e)));
    }
  }

  const sortedStocks = [...stocks].sort(sortStocks);

  return (
    <div className={`stocks-tab${selectedStock ? ' overlay-open' : ''}`}>
      <div className="ticker-zone"><TickerTape /></div>

      <div className="stocks-header">
        <div className="stocks-title-block">
          <h2 className="stocks-title">📈 Watchlist</h2>
          {stocks.length > 0 && <span className="stocks-count">{stocks.length} stock{stocks.length !== 1 ? 's' : ''}</span>}
        </div>
        <button className="btn-open-add-form" onClick={() => setShowAddModal(true)}>
          <span>🔍</span> Add Stock
        </button>
      </div>

      {error && (
        <div className="portfolio-error-banner" onClick={() => setError(null)}>
          <span>⚠️ {error}</span>
          <button className="error-dismiss-btn">✕</button>
        </div>
      )}

      {loading && stocks.length === 0 ? (
        <div className="portfolio-loading">
          <div className="portfolio-spinner" />
          <span>Loading watchlist...</span>
        </div>
      ) : stocks.length === 0 ? (
        <EmptyState onAdd={() => setShowAddModal(true)} />
      ) : (
        <div className="stocks-grid">
          {sortedStocks.map((stock, i) => (
            <StockCard key={stock.id} stock={stock} onDelete={handleDelete}
              onCardClick={s => setSelectedStock(s)} animationDelay={i * 60} />
          ))}
        </div>
      )}

      {showAddModal && <AddStockModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />}
      {selectedStock && <StockDetailModal stock={selectedStock} onClose={() => setSelectedStock(null)} />}
    </div>
  );
}