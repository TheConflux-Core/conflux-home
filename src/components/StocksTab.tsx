// StocksTab — Manual stock watchlist for Pulse
// Uses static sample data — no Rust backend required

import { useState, useEffect, useRef } from 'react';

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

// ── Static Sample Data ─────────────────────────────────────────
const SAMPLE_STOCKS: Stock[] = [
  { id: '1', symbol: 'AAPL', companyName: 'Apple Inc.', sector: 'Tech', price: '187.50', change: 'up', changeAmount: '1.24', addedAt: Date.now() - 86400000 * 5 },
  { id: '2', symbol: 'MSFT', companyName: 'Microsoft Corp.', sector: 'Tech', price: '415.20', change: 'up', changeAmount: '0.34', addedAt: Date.now() - 86400000 * 4 },
  { id: '3', symbol: 'NVDA', companyName: 'NVIDIA Corp.', sector: 'Tech', price: '920.10', change: 'up', changeAmount: '2.15', addedAt: Date.now() - 86400000 * 3 },
  { id: '4', symbol: 'TSLA', companyName: 'Tesla Inc.', sector: 'Consumer', price: '248.75', change: 'down', changeAmount: '0.82', addedAt: Date.now() - 86400000 * 2 },
  { id: '5', symbol: 'GOOGL', companyName: 'Alphabet Inc.', sector: 'Tech', price: '175.80', change: 'down', changeAmount: '0.51', addedAt: Date.now() - 86400000 * 1 },
  { id: '6', symbol: 'JPM', companyName: 'JPMorgan Chase', sector: 'Finance', price: '198.60', change: 'neutral', changeAmount: '0.00', addedAt: Date.now() },
];

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
  data: number[];
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
        <polygon points={areaPoints} fill={`url(#spark-grad-${direction})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
      {/* Header row */}
      <div className="stock-card-header">
        <div className="stock-symbol-block">
          <span className="stock-symbol">{stock.symbol.toUpperCase()}</span>
          <span className="stock-company">{stock.companyName}</span>
        </div>
        <button
          className="stock-delete-btn"
          onClick={() => onDelete(stock.id)}
          title={`Remove ${stock.symbol}`}
          aria-label={`Delete ${stock.symbol}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {stock.sector && (
        <div className="stock-sector-tag">{stock.sector}</div>
      )}

      {/* Price */}
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
            onClick={() => setEditingPrice(true)}
            title="Click to edit price"
          >
            {stock.price ? `$${stock.price}` : '—'}
          </button>
        )}
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

      {/* Change row */}
      <div className="stock-change-row">
        <button
          className={`stock-change-btn change-${stock.change}`}
          onClick={cycleChange}
          title="Click to cycle direction"
        >
          <span className={`change-icon change-icon-${stock.change}`}>{changeIcon}</span>
          <span className="change-amount">{stock.changeAmount || '—'}</span>
          <span className="change-label">{stock.changeAmount ? '%' : 'Set'}</span>
        </button>

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
        <div className="form-field">
          <label htmlFor="stock-symbol">Ticker</label>
          <input
            id="stock-symbol"
            type="text"
            placeholder="AAPL"
            value={form.symbol}
            onChange={handleSymbolInput}
            maxLength={10}
            autoFocus
          />
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
  const [stocks, setStocks] = useState<Stock[]>(SAMPLE_STOCKS);
  const [showAddForm, setShowAddForm] = useState(false);

  function handleAdd(stock: Omit<Stock, 'id' | 'addedAt'>) {
    const local: Stock = {
      ...stock,
      id: generateId(),
      addedAt: Date.now(),
    };
    setStocks(prev => [local, ...prev]);
    setShowAddForm(false);
  }

  function handleUpdate(updated: Stock) {
    setStocks(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  }

  function handleDelete(id: string) {
    setStocks(prev => prev.filter(s => s.id !== id));
  }

  const sortedStocks = [...stocks].sort(sortStocks);

  return (
    <div className="stocks-tab">
      {/* Ticker tape */}
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
