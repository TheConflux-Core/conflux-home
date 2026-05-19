-- ============================================================
-- PULSE FINANCE — Stock Watchlist & Portfolio Tracking
-- ============================================================

-- Stock Watchlist Items
CREATE TABLE IF NOT EXISTS pulse_stocks (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    symbol          TEXT NOT NULL,
    company_name    TEXT,
    sector          TEXT,
    added_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(user_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_pulse_stocks_user ON pulse_stocks(user_id);

-- Portfolio Holdings (custom asset tracker)
CREATE TABLE IF NOT EXISTS pulse_holdings (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    asset_name      TEXT NOT NULL,
    asset_type      TEXT NOT NULL,             -- 'stock' | 'crypto' | 'real_estate' | 'cash' | 'bond' | 'other'
    symbol          TEXT,                      -- optional ticker
    shares          REAL DEFAULT 0,
    cost_basis      REAL DEFAULT 0,            -- total cost paid
    current_value   REAL DEFAULT 0,
    tag             TEXT,                      -- 'retirement' | 'speculative' | 'emergency' | 'growth' | custom
    notes           TEXT,
    last_updated    TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_pulse_holdings_user ON pulse_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_pulse_holdings_tag ON pulse_holdings(tag);

-- Investment Goals (long-term: 401k, IRA, HSA, custom)
CREATE TABLE IF NOT EXISTS pulse_investment_goals (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    name            TEXT NOT NULL,
    goal_type       TEXT NOT NULL,             -- '401k' | 'ira' | 'hsa' | 'college' | 'emergency' | 'custom'
    target_amount   REAL NOT NULL DEFAULT 0,
    current_amount  REAL NOT NULL DEFAULT 0,
    target_date     TEXT,                       -- ISO date target
    monthly_contribution REAL NOT NULL DEFAULT 0,
    risk_profile    TEXT DEFAULT 'moderate',   -- 'conservative' | 'moderate' | 'aggressive'
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_pulse_investments_user ON pulse_investment_goals(user_id);