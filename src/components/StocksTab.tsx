// StocksTab — Manual stock watchlist for Pulse
// Phase 2 refinements: SVG sparklines, hero price layout, ticker zone, info hierarchy

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  sector: Sector;
  price: string;
  change: ChangeDirection;
  changeAmount: string;
  addedAt: number;
}

export type Sector = 'Tech' | 'Healthcare' | 'Finance' | 'Energy' | 'Consumer' | 'Other';
export type ChangeDirection = 'up' | 'down' | 'neutral';

const SECTORS: Sector[] = ['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Other'];

// ── Ticker tape simulated market data ───────────────────────
interface TickerItem {
  symbol: string;
  price: string;
  change: ChangeDirection;
  changeAmount: string;
}

const TICKER_STOCKS: TickerItem[] = [
  { symbol: 'AAPL', price: '187.50', change: 'up', changeAmount: '1.2' },
  { symbol: 'TSLA', price: '248.75', change: 'down', changeAmount: '0.8' },
  { symbol: 'MSFT', price: '415.20', change: 'up', changeAmount: '0.3' },
  { symbol: 'GOOGL', price: '175.80', change: 'down', changeAmount: '0.5' },
  { symbol: 'NVDA', price: '920.10', change: 'up', changeAmount: '2.1' },
  { symbol: 'META', price: '512.40', change: 'up', changeAmount: '1.5' },
  { symbol: 'AMZN', price: '198.30', change: 'down', changeAmount: '0.4' },
  { symbol: 'AMD', price: '162.80', change: 'up', changeAmount: '1.8' },
  { symbol: 'NFLX', price: '691.20', change: 'up', changeAmount: '0.9' },
  { symbol: 'JPM', price: '198.60', change: 'neutral', changeAmount: '0.0' },
];

function generateTickerContent(): string {
  const items = TICKER_STOCKS.map(s => {
    const arrow = s.change === 'up' ? '▲' : s.change === 'down' ? '▼' : '◆';
    const color = s.change === 'up' ? 'up' : s.change === 'down' ? 'down' : 'neutral';
    return `<span class="ticker-item ticker-${color}">${s.symbol} $${s.price} ${arrow} ${s.changeAmount}%</span>`;
  });
  return items.join('<span class="ticker-sep">•</span>');
}

function getMarketStatus(): { label: string; time: string } {
  const now = new Date();
  const hours = now.getHours();
  const etTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).format(now);
  const isOpen = hours >= 9 && hours < 16;
  const isPreMarket = (hours >= 4 && hours < 9) || (hours === 9 && now.getMinutes() < 30);
  const isAfterHours = hours >= 16 && hours < 20;
  if (isOpen) return { label: 'NYSE · Open', time: etTime };
  if (isPreMarket) return { label: 'NYSE · Pre-Market', time: etTime };
  if (isAfterHours) return { label: 'NYSE · After Hours', time: etTime };
  return { label: 'NYSE · Closed', time: etTime };
}

// ── Helpers ──────────────────────────────────────────────────
function generateId() {
  return `stock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortStocks(a: Stock, b: Stock): number {
  return b.addedAt - a.addedAt;
}

// Generate a pseudo-random 7-day sparkline for display
function generateSparkline(basePrice: number): number[] {
  const trend = (Math.random() - 0.5) * 0.06;
  const data: number[] = [];
  let p = basePrice;
  for (let i = 0; i < 7; i++) {
    p = p * (1 + trend + (Math.random() - 0.4) * 0.04);
    data.push(p);
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data.map(d => (d - min) / range);
}

function getSparklineDir(normalized: number[]): 'up' | 'down' | 'neutral' {
  const first = normalized[0] ?? 0.5;
  const last = normalized[normalized.length - 1] ?? 0.5;
  if (last > first + 0.02) return 'up';
  if (last < first - 0.02) return 'down';
  return 'neutral';
}

// ── SVG Sparkline Component ──────────────────────────────────
interface SVGSparklineProps {
  data: number[];        // normalized 0–1 values, length 7
  direction: 'up' | 'down' | 'neutral';
  width?: number;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

function SVGSparkline({ data, direction, width = 72, height = 32, showLabel = true, label = '7D' }: SVGSparklineProps) {
  if (data.length < 2) return null;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + (1 - v) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPoints = [
    `${pad},${pad + h}`,
    ...data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * w;
      const y = pad + (1 - v) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }),
    `${pad + w},${pad + h}`,
  ].join(' ');

  const color = direction === 'up' ? '#10b981' : direction === 'down' ? '#ef4444' : '#9ca3af';
  const color16 = direction === 'up' ? 'rgba(16,185,129,' : direction === 'down' ? 'rgba(239,68,68,' : 'rgba(156,163,175,';

  return (
    <div className="stock-sparkline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
      {showLabel && <span className="sparkline-label">{label}</span>}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`spark-grad-${direction}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={`url(#spark-grad-${direction})`}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        <circle
          cx={pad + w}
          cy={pad + (1 - data[data.length - 1]) * h}
          r="2.5"
          fill={color}
          opacity="0.85"
        />
      </svg>
    </div>
  );
}

// ── Tauri command wrappers ───────────────────────────────────

interface RustStock {
  id: string;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  price: string | null;
  change: string | null;
  change_amount: string | null;
  added_at: string;
}

/** Convert Rust snake_case response → frontend camelCase Stock type. */
function fromRust(s: RustStock): Stock {
  return {
    id: s.id,
    symbol: s.symbol,
    companyName: s.company_name ?? '',
    sector: (s.sector as Sector) ?? 'Other',
    price: s.price ?? '',
    change: (s.change as ChangeDirection) ?? 'neutral',
    changeAmount: s.change_amount ?? '',
    addedAt: new Date(s.added_at).getTime(),
  };
}

async function pulseGetStocks(): Promise<Stock[]> {
  try {
    const data: RustStock[] = await invoke('pulse_get_stocks', {});
    return data.map(fromRust).sort(sortStocks);
  } catch {
    return [];
  }
}

async function pulseAddStock(stock: Omit<Stock, 'id' | 'addedAt'>): Promise<void> {
  console.log('[pulseAddStock] called with symbol=', stock.symbol);
  try {
    const result = await invoke('pulse_add_stock', {
      req: {
        symbol: stock.symbol,
        company_name: stock.companyName,
        sector: stock.sector,
        price: stock.price || null,
        change: stock.change,
        change_amount: stock.changeAmount || null,
      },
    });
    console.log('[pulseAddStock] invoke succeeded, result:', result);
  } catch (e) {
    console.error('[StocksTab] pulse_add_stock failed:', e);
  }
}

async function pulseUpdateStock(
  id: string,
  price: string,
  change: ChangeDirection,
  changeAmount: string,
): Promise<void> {
  console.log('[pulseUpdateStock] called with id=', id, 'price=', price, 'change=', change, 'changeAmount=', changeAmount);
  try {
    const result = await Promise.race([
      invoke('pulse_update_stock', {
        id,
        req: { price, change, change_amount: changeAmount },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('pulseUpdateStock timeout (10s)')), 10000)),
    ]);
    console.log('[pulseUpdateStock] invoke succeeded, result:', result);
  } catch (e) {
    console.error('[pulseUpdateStock] invoke failed:', e);
  }
}

async function pulseDeleteStock(id: string): Promise<void> {
  try {
    await invoke('pulse_delete_stock', { id });
  } catch (e) {
    console.error('[StocksTab] pulse_delete_stock failed:', e);
  }
}

// ── Live Price Fetch — calls Rust backend (Yahoo Finance) ───
async function fetchLivePrice(symbol: string): Promise<{
  price: string;
  change: ChangeDirection;
  changeAmount: string;
} | null> {
  try {
    const result = await invoke<{ price: number; change: number; change_amount: number }>('pulse_fetch_price', { symbol });
    if (!result) return null;
    const dir: ChangeDirection =
      result.change > 0 ? 'up' : result.change < 0 ? 'down' : 'neutral';
    return {
      price: result.price.toFixed(2),
      change: dir,
      changeAmount: Math.abs(result.change_amount).toFixed(2),  // Finnhub dp = percentage
    };
  } catch (e) {
    console.warn(`[StocksTab] pulse_fetch_price(${symbol}) failed:`, e);
    return null;
  }
}

// ── Symbol Search — calls Rust backend (Yahoo Finance) ───
async function searchSymbols(query: string): Promise<Array<{
  symbol: string;
  companyName: string;
  sector: string;
}>> {
  if (query.trim().length < 2) return [];
  try {
    interface RustSearchResult {
      symbol: string;
      company_name: string;
      sector: string;
      current_price: number | null;
      logo_url: string | null;
    }
    const results: RustSearchResult[] = await invoke('pulse_search_stocks', { query });
    return results.map(r => ({
      symbol: r.symbol,
      companyName: r.company_name,
      sector: r.sector,
    }));
  } catch (e) {
    console.warn('[StocksTab] pulse_search_stocks failed:', e);
    return [];
  }
}

// ── Empty State ──────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="stocks-empty">
      <div className="stocks-empty-icon">📊</div>
      <h3>Your watchlist is empty</h3>
      <p>Add your first ticker to start tracking.</p>
      <button className="btn-add-first" onClick={onAdd}>
        <span className="btn-icon">➕</span>
        Add Your First Stock
      </button>
    </div>
  );
}

// ── Stock Card ───────────────────────────────────────────────
function StockCard({
  stock,
  onUpdate,
  onDelete,
  animationDelay,
}: {
  stock: Stock;
  onUpdate: (updated: Stock) => void;
  onDelete: (id: string) => void;
  animationDelay: number;
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(stock.price);
  const [flashing, setFlashing] = useState<'up' | 'down' | null>(null);
  const [sparkline, setSparkline] = useState<number[]>([]);
  const priceRef = useRef<HTMLInputElement>(null);

  // Generate sparkline on mount or price change
  useEffect(() => {
    const base = parseFloat(stock.price) || 100;
    setSparkline(generateSparkline(base));
  }, [stock.price]);

  useEffect(() => {
    setPriceValue(stock.price);
  }, [stock.price]);

  function cycleChange() {
    const next: ChangeDirection =
      stock.change === 'up' ? 'down' : stock.change === 'down' ? 'neutral' : 'up';
    onUpdate({ ...stock, change: next });
  }

  function handlePriceBlur() {
    setEditingPrice(false);
    const cleaned = priceValue?.replace(/[^0-9.]/g, '') ?? '';
    setPriceValue(cleaned);
    if (cleaned !== stock.price) {
      setFlashing(stock.change === 'up' ? 'up' : stock.change === 'down' ? 'down' : null);
      setTimeout(() => setFlashing(null), 600);
      onUpdate({ ...stock, price: cleaned });
    }
  }

  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') priceRef.current?.blur();
    if (e.key === 'Escape') {
      setPriceValue(stock.price);
      setEditingPrice(false);
    }
  }

  const glowClass =
    stock.change === 'up'
      ? 'card-glow-positive'
      : stock.change === 'down'
      ? 'card-glow-negative'
      : 'card-glow-neutral';

  const changeIcon =
    stock.change === 'up' ? '▲' : stock.change === 'down' ? '▼' : '◆';

  const sparkDir = sparkline.length > 0 ? getSparklineDir(sparkline) : 'neutral';

  let priceWrapperClass = 'stock-price-display';
  if (flashing === 'up') priceWrapperClass += ' price-flash-up';
  if (flashing === 'down') priceWrapperClass += ' price-flash-down';

  return (
    <div
      className={`stock-card ${glowClass}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header row — symbol + company + delete */}
      <div className="stock-card-header">
        <div className="stock-symbol-block">
          <span className="stock-symbol">{stock.symbol.toUpperCase()}</span>
          <span className="stock-company">{stock.companyName}</span>
        </div>
        <button
          className="stock-delete-btn"
          onClick={() => onDelete(stock.id)}
          title={`Remove ${stock.symbol} from watchlist`}
          aria-label={`Delete ${stock.symbol}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Sector tag */}
      {stock.sector && (
        <div className="stock-sector-tag">{stock.sector}</div>
      )}

      {/* Price — hero element, centered */}
      <div className="stock-price-row">
        {editingPrice ? (
          <input
            ref={priceRef}
            className="stock-price-input"
            type="text"
            value={priceValue ?? ''}
            onChange={e => setPriceValue(e.target.value)}
            onBlur={handlePriceBlur}
            onKeyDown={handlePriceKeyDown}
            autoFocus
            placeholder="0.00"
          />
        ) : (
          <button
            className={priceWrapperClass}
            onClick={async () => {
              const live = await fetchLivePrice(stock.symbol);
              if (live) {
                const isUp = parseFloat(live.price) > parseFloat(stock.price || '0');
                setFlashing(isUp ? 'up' : 'down');
                setTimeout(() => setFlashing(null), 600);
                onUpdate({ ...stock, price: live.price, change: live.change, changeAmount: live.changeAmount });
              } else {
                setEditingPrice(true);
                setTimeout(() => priceRef.current?.select(), 10);
              }
            }}
            title="Click to refresh price — or click again to enter manually"
          >
            {stock.price ? `$${stock.price}` : '—'}
          </button>
        )}
        {/* Inline change badge — right of price */}
        {stock.changeAmount && (
          <span className={`stock-change-badge change-badge-${stock.change}`}>
            <span className="badge-arrow">{changeIcon}</span>
            <span className="badge-pct">
              {stock.change === 'up' ? '+' : stock.change === 'down' ? '-' : ''}
              {stock.changeAmount}%
            </span>
          </span>
        )}
      </div>

      {/* Change row — cycle direction + sparkline */}
      <div className="stock-change-row">
        <button
          className={`stock-change-btn change-${stock.change}`}
          onClick={cycleChange}
          title="Click to cycle direction: Up → Down → Neutral"
        >
          <span className={`change-icon change-icon-${stock.change}`}>{changeIcon}</span>
          <span className="change-amount">{stock.changeAmount || '—'}</span>
          <span className="change-label">{stock.changeAmount ? '%' : 'Set'}</span>
        </button>

        {/* SVG Sparkline */}
        {sparkline.length > 0 && (
          <SVGSparkline
            data={sparkline}
            direction={sparkDir}
            width={80}
            height={36}
            showLabel={true}
            label="7D"
          />
        )}
      </div>
    </div>
  );
}

// ── Add Stock Form ───────────────────────────────────────────────────
interface AddFormState {
  symbol: string;
  companyName: string;
  sector: Sector;
}

function AddStockForm({
  onAdd,
  onCancel,
}: {
  onAdd: (stock: Omit<Stock, 'id' | 'addedAt'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AddFormState>({
    symbol: '',
    companyName: '',
    sector: 'Tech',
  });
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; companyName: string; sector: string }>>([]);
  const [searching, setSearching] = useState(false);

  // Debounced symbol search as user types
  useEffect(() => {
    if (!form.symbol || form.symbol.length < 2) {
      setSearchResults([]);
      return;
    }
    const iv = setTimeout(async () => {
      setSearching(true);
      const results = await searchSymbols(form.symbol);
      setSearchResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(iv);
  }, [form.symbol]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sym = form.symbol.trim().toUpperCase();
    if (!sym) {
      setError('Ticker symbol is required.');
      return;
    }
    if (!form.companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    onAdd({
      symbol: sym,
      companyName: form.companyName.trim(),
      sector: form.sector,
      price: '',
      change: 'neutral',
      changeAmount: '',
    });
    setForm({ symbol: '', companyName: '', sector: 'Tech' });
    setError('');
  }

  function handleSymbolInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, '');
    setForm(f => ({ ...f, symbol: val }));
    if (searchResults.length > 0) setSearchResults([]);
  }

  return (
    <form className="add-stock-form" onSubmit={handleSubmit}>
      <div className="add-form-header">
        <h3>Add to Watchlist</h3>
        <button type="button" className="form-cancel-btn" onClick={onCancel}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="add-form-fields">
        <div className="form-field form-field-search">
          <label htmlFor="stock-symbol">Ticker</label>
          <div className="symbol-input-wrapper">
            <input
              id="stock-symbol"
              type="text"
              placeholder="AAPL"
              value={form.symbol}
              onChange={handleSymbolInput}
              maxLength={10}
              autoFocus
              autoComplete="off"
            />
            {searching && <span className="symbol-searching" />}
            {searchResults.length > 0 && (
              <div className="symbol-search-results">
                {searchResults.map(r => (
                  <button
                    key={r.symbol}
                    type="button"
                    className="symbol-result-item"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        symbol: r.symbol,
                        companyName: r.companyName,
                        sector: (r.sector || 'Other') as Sector,
                      }));
                      setSearchResults([]);
                    }}
                  >
                    <span className="result-symbol">{r.symbol}</span>
                    <span className="result-company">{r.companyName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="stock-company">Company</label>
          <input
            id="stock-company"
            type="text"
            placeholder="Apple Inc."
            value={form.companyName}
            onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="stock-sector">Sector</label>
          <select
            id="stock-sector"
            value={form.sector}
            onChange={e => setForm(f => ({ ...f, sector: e.target.value as Sector }))}
          >
            {SECTORS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="add-form-error">{error}</div>}

      <div className="add-form-actions">
        <button type="submit" className="btn-add-stock">
          Add to Watchlist
        </button>
      </div>
    </form>
  );
}

// ── Ticker Tape Component ─────────────────────────────────────────────
function TickerTape() {
  const [marketStatus, setMarketStatus] = useState(getMarketStatus);

  useEffect(() => {
    const iv = setInterval(() => setMarketStatus(getMarketStatus()), 60000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="ticker-tape">
      <div className="ticker-live-badge">
        <span className="live-dot" />
        LIVE
      </div>
      <div className="ticker-marquee">
        <div
          className="ticker-content"
          dangerouslySetInnerHTML={{ __html: generateTickerContent() }}
        />
        <div
          className="ticker-content ticker-content-clone"
          dangerouslySetInnerHTML={{ __html: generateTickerContent() }}
        />
      </div>
      <div className="ticker-status">
        {marketStatus.label}
        <span className="ticker-time">{marketStatus.time} ET</span>
      </div>
    </div>
  );
}

// ── Main StocksTab ────────────────────────────────────────────────────
export default function StocksTab() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveBadge, setLiveBadge] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await pulseGetStocks();
      if (mounted) {
        setStocks(data.sort(sortStocks));
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleRefreshAll() {
    if (refreshing) return;
    setRefreshing(true);
    setStocks(prev => prev.map(s => ({ ...s, price: '...' })));
    await Promise.all(stocks.map(async (s) => {
      const live = await fetchLivePrice(s.symbol);
      if (live) {
        setStocks(prev => prev.map(st => st.id === s.id
          ? { ...st, price: live.price, change: live.change, changeAmount: live.changeAmount }
          : st));
      } else {
        setStocks(prev => prev.map(st => st.id === s.id ? { ...st, price: st.price || '—' } : st));
      }
    }));
    setRefreshing(false);
    setLiveBadge(true);
    setTimeout(() => setLiveBadge(false), 2500);
  }

  async function handleAdd(stock: Omit<Stock, 'id' | 'addedAt'>) {
    const id = generateId();
    const local: Stock = {
      ...stock,
      id,
      addedAt: Date.now(),
    };
    setStocks(prev => [local, ...prev]);
    setShowAddForm(false);
    await pulseAddStock(stock);

    // Fetch live price immediately after adding
      console.log('[handleAdd] Calling fetchLivePrice for', stock.symbol);
      const live = await fetchLivePrice(stock.symbol);
      console.log('[handleAdd] fetchLivePrice returned:', live);
      if (live) {
        const updated: Stock = { ...local, price: live.price, change: live.change, changeAmount: live.changeAmount };
        setStocks(prev => prev.map(s => (s.id === id ? updated : s)));
        console.log('[handleAdd] Calling pulseUpdateStock for id', id);
        await pulseUpdateStock(id, live.price, live.change, live.changeAmount).catch(e => {
          console.error('[handleAdd] pulseUpdateStock threw:', e);
        });
        console.log('[handleAdd] pulseUpdateStock completed');
      } else {
        console.log('[handleAdd] fetchLivePrice returned null, skipping update');
      }
      console.log('[handleAdd] Done');
  }

  async function handleUpdate(updated: Stock) {
    setStocks(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    await pulseUpdateStock(updated.id, updated.price, updated.change, updated.changeAmount);
  }

  async function handleDelete(id: string) {
    setStocks(prev => prev.filter(s => s.id !== id));
    await pulseDeleteStock(id);
  }

  const sortedStocks = [...stocks].sort(sortStocks);

  if (loading) {
    return (
      <div className="stocks-loading">
        <div className="stocks-spinner" />
        <span>Loading watchlist…</span>
      </div>
    );
  }

  return (
    <div className="stocks-tab">
      {/* Ticker tape — sits in its own zone, sticky below tab bar */}
      <div className="ticker-zone">
        <TickerTape />
      </div>

      {/* Page header */}
      <div className="stocks-header">
        <div className="stocks-title-block">
          <h2 className="stocks-title">📈 Watchlist</h2>
          {stocks.length > 0 && (
            <span className="stocks-count">{stocks.length} stock{stocks.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="stocks-header-actions">
          {stocks.length > 0 && !showAddForm && (
            <button
              className={`btn-refresh-all ${refreshing ? 'refreshing' : ''} ${liveBadge ? 'live-badge-shown' : ''}`}
              onClick={handleRefreshAll}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <span className="refresh-spinner" />
                  <span>Refreshing…</span>
                </>
              ) : liveBadge ? (
                <>
                  <span className="live-check">✓</span>
                  <span>Live</span>
                </>
              ) : (
                <span>↻ Refresh All</span>
              )}
            </button>
          )}
          {!showAddForm && (
            <button
              className="btn-open-add-form"
              onClick={() => setShowAddForm(true)}
            >
              <span>➕</span> Add Stock
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddStockForm
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Content */}
      {stocks.length === 0 && !showAddForm ? (
        <EmptyState onAdd={() => setShowAddForm(true)} />
      ) : (
        <div className="stocks-grid">
          {sortedStocks.map((stock, index) => (
            <StockCard
              key={stock.id}
              stock={stock}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              animationDelay={index * 60}
            />
          ))}
        </div>
      )}
    </div>
  );
}