// Pulse Finance — Tauri Commands for Stocks, Portfolio & Investments
// Phase 2: Fixed type bridges + LLM integration + Health Score

use crate::engine::get_engine;
use crate::engine::router::{self, OpenAIMessage};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use reqwest::Client;

/// Get the current user's ID from the engine config.
/// Uses blocking_readonly to avoid holding the DB mutex across await points.
fn get_current_user_id() -> String {
    let engine = get_engine();
    engine.db.blocking_readonly(|conn| {
        let mut stmt = match conn.prepare("SELECT value FROM config WHERE key = 'supabase_user_id'") {
            Ok(s) => s,
            Err(_) => return Ok("default".to_string()),
        };
        let result: rusqlite::Result<String> = stmt
            .query_row([], |row| row.get(0));
        Ok(result.unwrap_or_else(|_| "default".to_string()))
    })
}

/// Shared HTTP client for stock lookups.
fn http_client() -> &'static Client {
    static CLIENT: OnceLock<Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()
            .unwrap_or_else(|_| Client::new())
    })
}

/// Ensure pulse_stocks has all required columns (handles legacy DBs).
fn ensure_pulse_stocks_schema(conn: &rusqlite::Connection) {
    let cols: Vec<String> = match conn.prepare("PRAGMA table_info(pulse_stocks)") {
        Ok(mut stmt) => stmt
            .query_map([], |row| Ok(row.get::<_, String>(1)?))
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default(),
        Err(_) => return,
    };

    for (col, ty) in [
        ("price",         "TEXT"),
        ("change",        "TEXT"),
        ("change_amount", "TEXT"),
    ] {
        if !cols.contains(&col.to_string()) {
            let sql = format!("ALTER TABLE pulse_stocks ADD COLUMN {} {}", col, ty);
            let _ = conn.execute(&sql, []);
        }
    }
}

/// Search result for a stock symbol lookup.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockSearchResult {
    pub symbol: String,
    pub company_name: String,
    pub sector: String,
    pub current_price: Option<f64>,
    pub logo_url: Option<String>,
}

/// Search a stock by company name or ticker.
/// Tries Finnhub first, then Alpha Vantage, then Yahoo.
#[tauri::command(rename_all = "snake_case")]
pub async fn pulse_search_stocks(query: String) -> Result<Vec<StockSearchResult>, String> {
    if query.trim().len() < 2 {
        return Ok(vec![]);
    }

    let finnhub_key = std::env::var("FINNHUB_API_KEY").unwrap_or_default();
    let alpha_key = std::env::var("ALPHA_VANTAGE_KEY").unwrap_or_default();
    let client = http_client();

    // ── 1. Finnhub symbol search ─────────────────────────────────────────────
    if !finnhub_key.is_empty() {
        let url = format!(
            "https://finnhub.io/api/v1/search?q={}&token={}&type=stock",
            urlencoding::encode(&query),
            finnhub_key
        );
        log::info!("[pulse_search_stocks] trying Finnhub for query={}", query);

        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                #[derive(Deserialize)]
                struct FinnhubSearchResult {
                    count: usize,
                    result: Vec<FinnhubSearchItem>,
                }
                #[derive(Deserialize)]
                struct FinnhubSearchItem {
                    description: Option<String>,
                    display_symbol: Option<String>,
                    symbol: Option<String>,
                    #[serde(rename = "type")]
                    type_field: Option<String>,
                }
                match resp.json::<FinnhubSearchResult>().await {
                    Ok(sr) if sr.count > 0 => {
                        let results: Vec<StockSearchResult> = sr
                            .result
                            .into_iter()
                            .filter(|item| {
                                item.type_field.as_deref()
                                    .map(|t| matches!(t, "Common Stock") || matches!(t, "ETF"))
                                    .unwrap_or(false)
                            })
                            .take(8)
                            .map(|item| StockSearchResult {
                                symbol: item.display_symbol
                                    .or(item.symbol)
                                    .unwrap_or_default(),
                                company_name: item.description
                                    .unwrap_or_default(),
                                sector: "Other".to_string(),
                                current_price: None,
                                logo_url: None,
                            })
                            .collect();
                        log::info!("[pulse_search_stocks] Finnhub: {} results", results.len());
                        return Ok(results);
                    }
                    _ => log::warn!("[pulse_search_stocks] Finnhub parse/empty for query={}", query),
                }
            }
            Ok(resp) => log::warn!("[pulse_search_stocks] Finnhub status {} for query={}", resp.status(), query),
            Err(e) => log::warn!("[pulse_search_stocks] Finnhub error {} for query={}", e, query),
        }
    }

    // ── 2. Alpha Vantage symbol search ───────────────────────────────────────
    if !alpha_key.is_empty() {
        let url = format!(
            "https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={}&apikey={}",
            urlencoding::encode(&query),
            alpha_key
        );
        log::info!("[pulse_search_stocks] trying Alpha Vantage for query={}", query);

        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                #[derive(Deserialize)]
                struct AlphaSearchResponse {
                    best_matches: Option<Vec<AlphaSearchMatch>>,
                }
                #[derive(Deserialize)]
                struct AlphaSearchMatch {
                    #[serde(rename = "1. symbol")]
                    symbol: Option<String>,
                    #[serde(rename = "2. name")]
                    name: Option<String>,
                    #[serde(rename = "4. region")]
                    region: Option<String>,
                    #[serde(rename = "8. type")]
                    type_field: Option<String>,
                }
                match resp.json::<AlphaSearchResponse>().await {
                    Ok(sr) => {
                        if let Some(matches) = sr.best_matches {
                            let results: Vec<StockSearchResult> = matches
                                .into_iter()
                                .filter(|m| {
                                    m.type_field.as_deref()
                                        .map(|t| matches!(t, "Equity") || matches!(t, "ETF"))
                                        .unwrap_or(false)
                                })
                                .take(8)
                                .map(|m| StockSearchResult {
                                    symbol: m.symbol.unwrap_or_default(),
                                    company_name: m.name.unwrap_or_default(),
                                    sector: m.region.unwrap_or_else(|| "Other".to_string()),
                                    current_price: None,
                                    logo_url: None,
                                })
                                .collect();
                            log::info!("[pulse_search_stocks] Alpha Vantage: {} results", results.len());
                            return Ok(results);
                        }
                        log::warn!("[pulse_search_stocks] Alpha Vantage no matches for query={}", query);
                    }
                    Err(e) => log::warn!("[pulse_search_stocks] Alpha Vantage parse error: {}", e),
                }
            }
            Ok(resp) => log::warn!("[pulse_search_stocks] Alpha Vantage status {} for query={}", resp.status(), query),
            Err(e) => log::warn!("[pulse_search_stocks] Alpha Vantage error {} for query={}", e, query),
        }
    }

    // ── 3. Yahoo Finance (last resort — rate-limited) ──────────────────────────
    let search_url = format!(
        "https://query1.finance.yahoo.com/v1/finance/search?q={}&quotesCount=8&newsCount=0",
        urlencoding::encode(&query)
    );
    log::info!("[pulse_search_stocks] trying Yahoo for query={}", query);

    #[derive(Deserialize)]
    struct YahooQuotes {
        #[serde(rename = "longName")]
        long_name: Option<String>,
        #[serde(rename = "shortName")]
        short_name: Option<String>,
        symbol: String,
        sector: Option<String>,
        #[serde(rename = "quoteType")]
        quote_type: Option<String>,
    }
    #[derive(Deserialize)]
    struct YahooSearchResponse {
        quotes: Vec<YahooQuotes>,
    }

    for attempt in 0..3 {
        if attempt > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(500 << attempt)).await;
        }

        let resp = match client.get(&search_url).header("Accept", "application/json").send().await {
            Ok(r) => r,
            Err(e) => {
                log::warn!("[pulse_search_stocks] Yahoo attempt {} HTTP error: {}", attempt + 1, e);
                if attempt == 2 { return Err(format!("Search request failed: {e}")); }
                continue;
            }
        };

        let status = resp.status();
        if status.as_u16() == 429 {
            log::warn!("[pulse_search_stocks] Yahoo attempt {} got 429", attempt + 1);
            if attempt == 2 { return Err("Yahoo Finance rate limit reached. Try again in a minute.".to_string()); }
            continue;
        }
        if !status.is_success() {
            if attempt == 2 || !status.is_server_error() {
                return Err(format!("Yahoo Finance search returned {}", status));
            }
            continue;
        }

        let body = match resp.text().await {
            Ok(b) => b,
            Err(e) => {
                if attempt == 2 { return Err(format!("Failed to read response: {e}")); }
                continue;
            }
        };

        let parsed: YahooSearchResponse = match serde_json::from_str(&body) {
            Ok(p) => p,
            Err(e) => {
                if attempt == 2 { return Err(format!("Failed to parse response: {e}")); }
                continue;
            }
        };

        let results: Vec<StockSearchResult> = parsed
            .quotes
            .into_iter()
            .filter(|q| {
                q.quote_type
                    .as_deref()
                    .map(|t| matches!(t, "EQUITY" | "ETF" | "MUTUALFUND" | "CRYPTO"))
                    .unwrap_or(false)
            })
            .map(|q| StockSearchResult {
                symbol: q.symbol.clone(),
                company_name: q.long_name.or(q.short_name).unwrap_or_else(|| q.symbol.clone()),
                sector: q.sector.unwrap_or_else(|| "Other".to_string()),
                current_price: None,
                logo_url: None,
            })
            .take(8)
            .collect();

        log::info!("[pulse_search_stocks] Yahoo: {} results", results.len());
        return Ok(results);
    }

    Err("All search providers failed. Try again later.".to_string())
}


/// Tries Finnhub first, then Alpha Vantage, then Yahoo — returns as soon as one succeeds.
#[tauri::command(rename_all = "snake_case")]
pub async fn pulse_fetch_price(symbol: String) -> Result<PriceResult, String> {
    let finnhub_key = std::env::var("FINNHUB_API_KEY").unwrap_or_default();
    let alpha_key = std::env::var("ALPHA_VANTAGE_KEY").unwrap_or_default();

    // ── 1. Finnhub (best: 60 req/min, real-time, no quota exhaustion) ──────────
    if !finnhub_key.is_empty() {
        let client = http_client();
        let url = format!(
            "https://finnhub.io/api/v1/quote?symbol={}&token={}",
            urlencoding::encode(&symbol),
            finnhub_key
        );
        log::info!("[pulse_fetch_price({})] trying Finnhub", symbol);

        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                #[derive(Deserialize)]
                struct FinnhubQuote {
                    c: Option<f64>,   // current price
                    d: Option<f64>,   // change
                    dp: Option<f64>,  // change percent
                    h: Option<f64>,   // high
                    l: Option<f64>,   // low
                }
                match resp.json::<FinnhubQuote>().await {
                    Ok(q) if q.c.is_some() => {
                        let price = q.c.unwrap_or(0.0);
                        let change = q.d.unwrap_or(0.0);
                        let change_pct = q.dp.unwrap_or(0.0);
                        log::info!("[pulse_fetch_price({})] Finnhub: price={} change={}", symbol, price, change);
                        return Ok(PriceResult {
                            price,
                            change,
                            change_amount: change_pct,
                        });
                    }
                    _ => log::warn!("[pulse_fetch_price({})] Finnhub parse failed or empty", symbol),
                }
            }
            Ok(resp) => log::warn!("[pulse_fetch_price({})] Finnhub status {}", symbol, resp.status()),
            Err(e) => log::warn!("[pulse_fetch_price({})] Finnhub error: {}", symbol, e),
        }
    }

    // ── 2. Alpha Vantage (fallback: 25 req/day, GLOBAL_QUOTE) ────────────────
    if !alpha_key.is_empty() {
        let client = http_client();
        let url = format!(
            "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={}&apikey={}",
            urlencoding::encode(&symbol),
            alpha_key
        );
        log::info!("[pulse_fetch_price({})] trying Alpha Vantage", symbol);

        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                #[derive(Deserialize)]
                struct AlphaGlobalQuote {
                    #[serde(rename = "Global Quote")]
                    global_quote: Option<AlphaQuoteEntry>,
                }
                #[derive(Deserialize)]
                struct AlphaQuoteEntry {
                    #[serde(rename = "05. price")]
                    price: Option<String>,
                    #[serde(rename = "09. change")]
                    change: Option<String>,
                    #[serde(rename = "10. change percent")]
                    change_pct: Option<String>,
                }
                match resp.json::<AlphaGlobalQuote>().await {
                    Ok(q) => {
                        if let Some(gq) = q.global_quote {
                            let price: f64 = gq.price.as_ref().and_then(|v| v.parse().ok()).unwrap_or(0.0);
                            let change: f64 = gq.change.as_ref().and_then(|v| v.parse().ok()).unwrap_or(0.0);
                            let change_pct_str = gq.change_pct.as_ref().and_then(|v| v.strip_suffix('%')).unwrap_or("0");
                            let change_pct: f64 = change_pct_str.parse().unwrap_or(0.0);
                            if price > 0.0 {
                                log::info!("[pulse_fetch_price({})] Alpha Vantage: price={}", symbol, price);
                                return Ok(PriceResult { price, change, change_amount: change_pct });
                            }
                        }
                        log::warn!("[pulse_fetch_price({})] Alpha Vantage empty quote", symbol);
                    }
                    Err(e) => log::warn!("[pulse_fetch_price({})] Alpha Vantage parse error: {}", symbol, e),
                }
            }
            Ok(resp) => log::warn!("[pulse_fetch_price({})] Alpha Vantage status {}", symbol, resp.status()),
            Err(e) => log::warn!("[pulse_fetch_price({})] Alpha Vantage error: {}", symbol, e),
        }
    }

    // ── 3. Yahoo Finance (last resort — rate-limited but sometimes works) ──────
    let client = http_client();
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1d",
        urlencoding::encode(&symbol)
    );
    log::info!("[pulse_fetch_price({})] trying Yahoo (last resort)", symbol);

    #[derive(Deserialize)]
    struct YahooChart {
        result: Vec<YahooChartResult>,
    }
    #[derive(Deserialize)]
    struct YahooChartResult {
        meta: YahooChartMeta,
    }
    #[derive(Deserialize)]
    struct YahooChartMeta {
        #[serde(rename = "regularMarketPrice")]
        market_price: Option<f64>,
        #[serde(rename = "regularMarketChange")]
        market_change: Option<f64>,
        #[serde(rename = "regularMarketChangePercent")]
        market_change_pct: Option<f64>,
    }

    for attempt in 0..3 {
        if attempt > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(500 << attempt)).await;
        }

        let resp = match client.get(&url).header("Accept", "application/json").send().await {
            Ok(r) => r,
            Err(e) => {
                log::warn!("[pulse_fetch_price({})] Yahoo attempt {} HTTP error: {}", symbol, attempt + 1, e);
                if attempt == 2 { return Err(format!("Price request failed: {e}")); }
                continue;
            }
        };

        let status = resp.status();
        if status.as_u16() == 429 {
            log::warn!("[pulse_fetch_price({})] Yahoo attempt {} got 429", symbol, attempt + 1);
            if attempt == 2 { return Err("Yahoo Finance rate limit reached. Try again later.".to_string()); }
            continue;
        }
        if !status.is_success() {
            if attempt == 2 || !status.is_server_error() {
                return Err(format!("Yahoo Finance returned {}", status));
            }
            continue;
        }

        let body = match resp.text().await {
            Ok(b) => b,
            Err(e) => {
                if attempt == 2 { return Err(format!("Failed to read response: {e}")); }
                continue;
            }
        };

        let chart: YahooChart = match serde_json::from_str(&body) {
            Ok(c) => c,
            Err(e) => {
                if attempt == 2 { return Err(format!("Failed to parse price data: {e}")); }
                continue;
            }
        };

        if let Some(r) = chart.result.into_iter().next() {
            let price = r.meta.market_price.unwrap_or(0.0);
            let change = r.meta.market_change.unwrap_or(0.0);
            let change_pct = r.meta.market_change_pct.unwrap_or(0.0);
            log::info!("[pulse_fetch_price({})] Yahoo: price={}", symbol, price);
            return Ok(PriceResult { price, change, change_amount: change_pct });
        } else {
            if attempt == 2 { return Err("No price data found for this symbol".to_string()); }
        }
    }

    Err("All price providers failed. Check your API keys or try again later.".to_string())
}

/// Rich price result returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceResult {
    pub price: f64,
    pub change: f64,
    pub change_amount: f64,
}


// ── Pulse Stocks (Watchlist) ───────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PulseStock {
    pub id: String,
    pub user_id: String,
    pub symbol: String,
    pub company_name: Option<String>,
    pub sector: Option<String>,
    pub price: Option<String>,
    pub change: Option<String>,
    pub change_amount: Option<String>,
    pub added_at: String,
}

/// Request shape — matches frontend Stock fields (camelCase).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddStockRequest {
    pub symbol: String,
    pub company_name: Option<String>,
    pub sector: Option<String>,
    pub price: Option<String>,
    pub change: Option<String>,
    pub change_amount: Option<String>,
}

/// Request shape for updating a stock (price, change, change_amount).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStockRequest {
    pub price: Option<String>,
    pub change: Option<String>,
    pub change_amount: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_add_stock(
    req: AddStockRequest,
    member_id: Option<String>,
) -> Result<PulseStock, String> {
    let user_id = member_id.unwrap_or_else(get_current_user_id);
    if user_id.is_empty() {
        return Err("No user ID".to_string());
    }
    let engine = get_engine();
    let conn = engine.db.conn();

    // Ensure all required columns exist (handles pre-schema DBs)
    ensure_pulse_stocks_schema(&conn);

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    log::info!("[pulse_add_stock] symbol={} price={:?} change={:?}", req.symbol, req.price, req.change);

    conn.execute(
        "INSERT OR REPLACE INTO pulse_stocks (id, user_id, symbol, company_name, sector, price, change, change_amount, added_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, user_id, req.symbol.to_uppercase(), req.company_name, req.sector, req.price, req.change, req.change_amount, now],
    ).map_err(|e| e.to_string())?;

    let stock = conn
        .prepare("SELECT id, user_id, symbol, company_name, sector, price, change, change_amount, added_at FROM pulse_stocks WHERE user_id=?1 AND symbol=?2")
        .map_err(|e| e.to_string())?
        .query_row(params![user_id, req.symbol.to_uppercase()], |row| {
            Ok(PulseStock {
                id: row.get(0)?,
                user_id: row.get(1)?,
                symbol: row.get(2)?,
                company_name: row.get(3)?,
                sector: row.get(4)?,
                price: row.get(5)?,
                change: row.get(6)?,
                change_amount: row.get(7)?,
                added_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(stock)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_update_stock(id: String, req: UpdateStockRequest) -> Result<PulseStock, String> {
    let engine = get_engine();
    let conn = engine.db.conn();

    // Ensure all required columns exist (handles pre-schema DBs)
    ensure_pulse_stocks_schema(&conn);

    // Read current stock first
    let stock = {
        let conn = engine.db.conn();
        let result = conn.prepare("SELECT id, user_id, symbol, company_name, sector, price, change, change_amount, added_at FROM pulse_stocks WHERE id=?1");
        let mut stmt = match result {
            Ok(s) => s,
            Err(e) => return Err(e.to_string()),
        };
        let result = stmt.query_row(params![&id], |row| {
            Ok(PulseStock {
                id: row.get(0)?,
                user_id: row.get(1)?,
                symbol: row.get(2)?,
                company_name: row.get(3)?,
                sector: row.get(4)?,
                price: row.get(5)?,
                change: row.get(6)?,
                change_amount: row.get(7)?,
                added_at: row.get(8)?,
            })
        });
        match result {
            Ok(s) => s,
            Err(e) => return Err(e.to_string()),
        }
    };

    // Apply updates
    let new_price = req.price.or(stock.price.clone());
    let new_change = req.change.or(stock.change.clone());
    let new_change_amount = req.change_amount.or(stock.change_amount.clone());
    log::info!("[pulse_update_stock] id={} price={:?} change={:?}", id, new_price, new_change);
    {
        let conn = engine.db.conn();
        conn.execute(
            "UPDATE pulse_stocks SET price=?1, change=?2, change_amount=?3 WHERE id=?4",
            params![new_price, new_change, new_change_amount, id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Re-read to return fresh data
    let stock = {
        let conn = engine.db.conn();
        let result = conn.prepare("SELECT id, user_id, symbol, company_name, sector, price, change, change_amount, added_at FROM pulse_stocks WHERE id=?1");
        let mut stmt = match result {
            Ok(s) => s,
            Err(e) => return Err(e.to_string()),
        };
        let result = stmt.query_row(params![&id], |row| {
            Ok(PulseStock {
                id: row.get(0)?,
                user_id: row.get(1)?,
                symbol: row.get(2)?,
                company_name: row.get(3)?,
                sector: row.get(4)?,
                price: row.get(5)?,
                change: row.get(6)?,
                change_amount: row.get(7)?,
                added_at: row.get(8)?,
            })
        });
        match result {
            Ok(s) => s,
            Err(e) => return Err(e.to_string()),
        }
    };
    Ok(stock)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_get_stocks(member_id: Option<String>) -> Result<Vec<PulseStock>, String> {
    let user_id = member_id.unwrap_or_else(get_current_user_id);
    if user_id.is_empty() {
        return Ok(vec![]);
    }
    let engine = get_engine();
    let conn = engine.db.conn();

    // Ensure all required columns exist (handles pre-schema DBs)
    ensure_pulse_stocks_schema(&conn);

    let stocks: Vec<PulseStock> = conn
        .prepare("SELECT id, user_id, symbol, company_name, sector, price, change, change_amount, added_at FROM pulse_stocks WHERE user_id=?1 ORDER BY added_at ASC")
        .map_err(|e| e.to_string())?
        .query_map(params![user_id], |row| {
            Ok(PulseStock {
                id: row.get(0)?,
                user_id: row.get(1)?,
                symbol: row.get(2)?,
                company_name: row.get(3)?,
                sector: row.get(4)?,
                price: row.get(5)?,
                change: row.get(6)?,
                change_amount: row.get(7)?,
                added_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(stocks)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_delete_stock(id: String) -> Result<(), String> {
    let engine = get_engine();
    let conn = engine.db.conn();
    conn.execute("DELETE FROM pulse_stocks WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Pulse Holdings (Portfolio Tracker) ─────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PulseHolding {
    pub id: String,
    pub user_id: String,
    /// Maps to frontend `name` field.
    pub asset_name: String,
    /// Maps to frontend `asset_type` field.
    pub asset_type: String,
    /// Maps to frontend `ticker` field.
    pub symbol: Option<String>,
    pub shares: f64,
    pub cost_basis: f64,
    pub current_value: f64,
    pub tag: Option<String>,
    pub notes: Option<String>,
    pub updated_at: Option<String>,
    pub created_at: String,
}

/// Frontend Holding fields (camelCase) — mapped to DB column names (snake_case).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddHoldingRequest {
    pub name: String,
    #[serde(rename = "asset_type")]
    pub asset_type: String,
    pub ticker: Option<String>,
    pub shares: f64,
    pub cost_basis: f64,
    pub current_value: f64,
    pub tag: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateHoldingRequest {
    pub name: Option<String>,
    #[serde(rename = "asset_type")]
    pub asset_type: Option<String>,
    pub symbol: Option<String>,
    pub shares: Option<f64>,
    pub cost_basis: Option<f64>,
    pub current_value: Option<f64>,
    pub tag: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_add_holding(
    req: AddHoldingRequest,
    member_id: Option<String>,
) -> Result<PulseHolding, String> {
    let user_id = member_id.unwrap_or_else(get_current_user_id);
    if user_id.is_empty() {
        return Err("No user ID".to_string());
    }
    let engine = get_engine();
    let conn = engine.db.conn();

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute("ALTER TABLE pulse_holdings ADD COLUMN last_updated TEXT", [])
        .ok(); // migrate if missing
    conn.execute(
        "INSERT INTO pulse_holdings (id, user_id, asset_name, asset_type, symbol, shares, cost_basis, current_value, tag, notes, updated_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![id, user_id, req.name, req.asset_type, req.ticker, req.shares, req.cost_basis, req.current_value, req.tag, req.notes, now, now],
    ).map_err(|e| e.to_string())?;

    let holding = conn
        .prepare("SELECT id, user_id, asset_name, asset_type, symbol, shares, cost_basis, current_value, tag, notes, updated_at, created_at FROM pulse_holdings WHERE id=?1")
        .map_err(|e| e.to_string())?
        .query_row(params![id], |row| {
            Ok(PulseHolding {
                id: row.get(0)?,
                user_id: row.get(1)?,
                asset_name: row.get(2)?,
                asset_type: row.get(3)?,
                symbol: row.get(4)?,
                shares: row.get(5)?,
                cost_basis: row.get(6)?,
                current_value: row.get(7)?,
                tag: row.get(8)?,
                notes: row.get(9)?,
                updated_at: row.get(10)?,
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(holding)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_get_holdings(member_id: Option<String>) -> Result<Vec<PulseHolding>, String> {
    let user_id = member_id.unwrap_or_else(get_current_user_id);
    if user_id.is_empty() {
        return Ok(vec![]);
    }
    let engine = get_engine();
    let conn = engine.db.conn();

    let holdings: Vec<PulseHolding> = conn
        .prepare("SELECT id, user_id, asset_name, asset_type, symbol, shares, cost_basis, current_value, tag, notes, updated_at, created_at FROM pulse_holdings WHERE user_id=?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?
        .query_map(params![user_id], |row| {
            Ok(PulseHolding {
                id: row.get(0)?,
                user_id: row.get(1)?,
                asset_name: row.get(2)?,
                asset_type: row.get(3)?,
                symbol: row.get(4)?,
                shares: row.get(5)?,
                cost_basis: row.get(6)?,
                current_value: row.get(7)?,
                tag: row.get(8)?,
                notes: row.get(9)?,
                updated_at: row.get(10)?,
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(holdings)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_update_holding(
    id: String,
    req: UpdateHoldingRequest,
) -> Result<PulseHolding, String> {
    let engine = get_engine();
    let conn = engine.db.conn();
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(v) = req.name {
        conn.execute("UPDATE pulse_holdings SET asset_name=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.asset_type {
        conn.execute("UPDATE pulse_holdings SET asset_type=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.symbol {
        conn.execute("UPDATE pulse_holdings SET symbol=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.shares {
        conn.execute("UPDATE pulse_holdings SET shares=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.cost_basis {
        conn.execute("UPDATE pulse_holdings SET cost_basis=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.current_value {
        conn.execute("UPDATE pulse_holdings SET current_value=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.tag {
        conn.execute("UPDATE pulse_holdings SET tag=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.notes {
        conn.execute("UPDATE pulse_holdings SET notes=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }

    let holding = conn
        .prepare("SELECT id, user_id, asset_name, asset_type, symbol, shares, cost_basis, current_value, tag, notes, updated_at, created_at FROM pulse_holdings WHERE id=?1")
        .map_err(|e| e.to_string())?
        .query_row(params![id], |row| {
            Ok(PulseHolding {
                id: row.get(0)?,
                user_id: row.get(1)?,
                asset_name: row.get(2)?,
                asset_type: row.get(3)?,
                symbol: row.get(4)?,
                shares: row.get(5)?,
                cost_basis: row.get(6)?,
                current_value: row.get(7)?,
                tag: row.get(8)?,
                notes: row.get(9)?,
                updated_at: row.get(10)?,
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(holding)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_delete_holding(id: String) -> Result<(), String> {
    let engine = get_engine();
    let conn = engine.db.conn();
    conn.execute("DELETE FROM pulse_holdings WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Pulse Investment Goals ────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PulseInvestmentGoal {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub goal_type: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub target_date: Option<String>,
    pub monthly_contribution: f64,
    pub risk_profile: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Frontend InvestmentGoal fields — mapped to DB column names via serde rename.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddInvestmentGoalRequest {
    pub name: String,
    #[serde(rename = "type")]
    pub goal_type: String,
    pub target_amount: f64,
    pub current_amount: f64,
    pub target_date: Option<String>,
    pub monthly_contribution: f64,
    pub risk_profile: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInvestmentGoalRequest {
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub goal_type: Option<String>,
    pub target_amount: Option<f64>,
    pub current_amount: Option<f64>,
    pub target_date: Option<String>,
    pub monthly_contribution: Option<f64>,
    pub risk_profile: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_add_investment_goal(
    req: AddInvestmentGoalRequest,
    member_id: Option<String>,
) -> Result<PulseInvestmentGoal, String> {
    let user_id = member_id.unwrap_or_else(get_current_user_id);
    if user_id.is_empty() {
        return Err("No user ID".to_string());
    }
    let engine = get_engine();
    let conn = engine.db.conn();

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let risk = req.risk_profile.unwrap_or_else(|| "moderate".to_string());

    conn.execute(
        "INSERT INTO pulse_investment_goals (id, user_id, name, goal_type, target_amount, current_amount, target_date, monthly_contribution, risk_profile, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![id, user_id, req.name, req.goal_type, req.target_amount, req.current_amount, req.target_date, req.monthly_contribution, risk, now, now],
    ).map_err(|e| e.to_string())?;

    let goal = conn
        .prepare("SELECT id, user_id, name, goal_type, target_amount, current_amount, target_date, monthly_contribution, risk_profile, created_at, updated_at FROM pulse_investment_goals WHERE id=?1")
        .map_err(|e| e.to_string())?
        .query_row(params![id], |row| {
            Ok(PulseInvestmentGoal {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                goal_type: row.get(3)?,
                target_amount: row.get(4)?,
                current_amount: row.get(5)?,
                target_date: row.get(6)?,
                monthly_contribution: row.get(7)?,
                risk_profile: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(goal)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_get_investment_goals(member_id: Option<String>) -> Result<Vec<PulseInvestmentGoal>, String> {
    let user_id = member_id.unwrap_or_else(get_current_user_id);
    if user_id.is_empty() {
        return Ok(vec![]);
    }
    let engine = get_engine();
    let conn = engine.db.conn();

    let goals: Vec<PulseInvestmentGoal> = conn
        .prepare("SELECT id, user_id, name, goal_type, target_amount, current_amount, target_date, monthly_contribution, risk_profile, created_at, updated_at FROM pulse_investment_goals WHERE user_id=?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?
        .query_map(params![user_id], |row| {
            Ok(PulseInvestmentGoal {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                goal_type: row.get(3)?,
                target_amount: row.get(4)?,
                current_amount: row.get(5)?,
                target_date: row.get(6)?,
                monthly_contribution: row.get(7)?,
                risk_profile: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(goals)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_update_investment_goal(
    id: String,
    req: UpdateInvestmentGoalRequest,
) -> Result<PulseInvestmentGoal, String> {
    let engine = get_engine();
    let conn = engine.db.conn();
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(v) = req.name {
        conn.execute("UPDATE pulse_investment_goals SET name=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.goal_type {
        conn.execute("UPDATE pulse_investment_goals SET goal_type=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.target_amount {
        conn.execute("UPDATE pulse_investment_goals SET target_amount=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.current_amount {
        conn.execute("UPDATE pulse_investment_goals SET current_amount=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.target_date {
        conn.execute("UPDATE pulse_investment_goals SET target_date=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.monthly_contribution {
        conn.execute("UPDATE pulse_investment_goals SET monthly_contribution=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(v) = req.risk_profile {
        conn.execute("UPDATE pulse_investment_goals SET risk_profile=?1, updated_at=?2 WHERE id=?3",
            params![v, now, id]).map_err(|e| e.to_string())?;
    }

    let goal = conn
        .prepare("SELECT id, user_id, name, goal_type, target_amount, current_amount, target_date, monthly_contribution, risk_profile, created_at, updated_at FROM pulse_investment_goals WHERE id=?1")
        .map_err(|e| e.to_string())?
        .query_row(params![id], |row| {
            Ok(PulseInvestmentGoal {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                goal_type: row.get(3)?,
                target_amount: row.get(4)?,
                current_amount: row.get(5)?,
                target_date: row.get(6)?,
                monthly_contribution: row.get(7)?,
                risk_profile: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(goal)
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_delete_investment_goal(id: String) -> Result<(), String> {
    let engine = get_engine();
    let conn = engine.db.conn();
    conn.execute("DELETE FROM pulse_investment_goals WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Pulse Chat (Financial Advisor AI) ─────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PulseChatRequest {
    pub message: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn pulse_chat(req: PulseChatRequest, member_id: Option<String>) -> Result<String, String> {
    // Guard: prevent any panic from propagating to the frontend as a crash
    let req_msg = req.message.clone();
    let user_id = member_id.clone().unwrap_or_else(get_current_user_id);
    let user_id_for_task = user_id.clone();
    let greeting = "Hey, I'm Pulse — your financial advisor. I know your budget, your goals, and how you're tracking. I can answer questions about your finances, help you make decisions, or just give you a check-up on where things stand. What do you need?";
    if req_msg.trim().is_empty() {
        return Ok(greeting.to_string());
    }

    // ── Gather user financial context (blocking DB on thread pool) ──
    let data_result = tokio::task::spawn_blocking(move || {
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let uid = user_id_for_task.clone();
            let engine = get_engine();
            let conn = engine.db.conn();
            let budget_summary: Vec<(String, f64)> = match conn.prepare(
                "SELECT category, SUM(amount) as total FROM budget_entries WHERE member_id=?1 GROUP BY category ORDER BY total DESC",
            ) {
                Ok(mut stmt) => stmt.query_map(params![&uid], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
                }).ok().map(|r| r.filter_map(|x| x.ok()).collect()).unwrap_or_default(),
                Err(_) => Vec::new(),
            };
            let holdings: Vec<(String, String, f64, f64)> = match conn.prepare(
                "SELECT asset_name, asset_type, current_value, cost_basis FROM pulse_holdings WHERE user_id=?1",
            ) {
                Ok(mut stmt) => stmt.query_map(params![&uid], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?, row.get::<_, f64>(3)?))
                }).ok().map(|r| r.filter_map(|x| x.ok()).collect()).unwrap_or_default(),
                Err(_) => Vec::new(),
            };
            let goals: Vec<(String, f64, f64, f64)> = match conn.prepare(
                "SELECT name, target_amount, current_amount, monthly_contribution FROM pulse_investment_goals WHERE user_id=?1",
            ) {
                Ok(mut stmt) => stmt.query_map(params![&uid], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, f64>(2)?, row.get::<_, f64>(3)?))
                }).ok().map(|r| r.filter_map(|x| x.ok()).collect()).unwrap_or_default(),
                Err(_) => Vec::new(),
            };
            (budget_summary, holdings, goals)
        }))
    }).await.map_err(|e| format!("task join error: {:?}", e))?;

    let (budget_summary, holdings, goals) = match data_result {
        Ok(v) => v,
        Err(e) => return Err(format!("panic in pulse_chat: {:?}", e)),
    };

    let context = build_pulse_context(&user_id, &budget_summary, &holdings, &goals);
    let system_prompt = format!(
        "You are Pulse, a warm and insightful financial advisor embedded in the Conflux Home desktop app. You have access to the user's complete financial picture. Be specific, empathetic, and actionable. Never give generic advice — always reference the user's actual numbers.

{}",
        context
    );

    // ── Call LLM ────────────────────────────────────────────────────
    let messages = vec![
        OpenAIMessage { role: "system".to_string(), content: Some(system_prompt), tool_call_id: None, tool_calls: None },
        OpenAIMessage { role: "user".to_string(), content: Some(req_msg.clone()), tool_call_id: None, tool_calls: None },
    ];

    match router::chat("conflux-core", messages, Some(800), None, None).await {
        Ok(response) => Ok(response.content),
        Err(e) => {
            log::warn!("[pulse_chat] LLM call failed, falling back: {}", e);
            Ok(handle_pulse_fallback(&req_msg, &budget_summary, &holdings, &goals))
        }
    }
}


/// Build a structured context string from the user's financial data.
fn build_pulse_context(
    user_id: &str,
    budget: &[(String, f64)],
    holdings: &[(String, String, f64, f64)],
    goals: &[(String, f64, f64, f64)],
) -> String {
    let mut ctx = format!("User ID: {}\n", user_id);

    if !budget.is_empty() {
        let total: f64 = budget.iter().map(|(_, amt)| *amt).sum();
        ctx.push_str(&format!("\n## Budget Spending by Category (total: ${:.2})\n", total));
        for (cat, amt) in budget.iter().take(10) {
            ctx.push_str(&format!("  - {}: ${:.2}\n", cat, amt));
        }
    } else {
        ctx.push_str("\n## Budget: No entries recorded yet.\n");
    }

    if !holdings.is_empty() {
        let total_value: f64 = holdings.iter().map(|h| h.2).sum();
        let total_cost: f64 = holdings.iter().map(|h| h.3).sum();
        let gain_loss = total_value - total_cost;
        ctx.push_str(&format!(
            "\n## Portfolio (total value: ${:.2}, gain/loss: ${:.2})\n",
            total_value, gain_loss
        ));
        for (name, asset_type, value, cost) in holdings.iter() {
            let gl = value - cost;
            ctx.push_str(&format!(
                "  - {} ({}): value ${:.2}, cost ${:.2}, gain/loss ${:.2}\n",
                name, asset_type, value, cost, gl
            ));
        }
    } else {
        ctx.push_str("\n## Portfolio: No holdings tracked yet.\n");
    }

    if !goals.is_empty() {
        ctx.push_str("\n## Investment Goals\n");
        for (name, target, current, monthly) in goals.iter() {
            let pct = if *target > 0.0 { (current / target) * 100.0 } else { 0.0 };
            let remaining = target - current;
            let months = if *monthly > 0.0 { remaining / monthly } else { 0.0 };
            ctx.push_str(&format!(
                "  - {}: ${:.2}/${:.2} ({:.1}%), ${:.2}/month, ~{:.0} months to go\n",
                name, current, target, pct, monthly, months
            ));
        }
    } else {
        ctx.push_str("\n## Investment Goals: No goals set yet.\n");
    }

    ctx
}

/// Deterministic fallback when LLM is unavailable.
fn handle_pulse_fallback(
    message: &str,
    budget: &[(String, f64)],
    holdings: &[(String, String, f64, f64)],
    goals: &[(String, f64, f64, f64)],
) -> String {
    let msg_lower = message.to_lowercase();

    if msg_lower.contains("can i afford") || msg_lower.contains("afford a") {
        let total_budget: f64 = budget.iter().map(|(_, a)| *a).sum();
        if total_budget > 0.0 {
            let discretionary = total_budget * 0.2;
            return format!(
                "Based on your spending data, you have roughly ${:.2} in discretionary budget available. I'd need to know the purchase price to give you a precise answer — but if it's under ${:.2}, it's within your comfortable range.",
                discretionary, discretionary
            );
        }
        return "I don't have enough budget data yet. Head to the Budget tab and log your income and expenses so I can model what's truly affordable for you.".to_string();
    }

    if msg_lower.contains("financial health") || msg_lower.contains("check-up") || msg_lower.contains("how am i doing") {
        let total_value: f64 = holdings.iter().map(|h| h.2).sum();
        let total_cost: f64 = holdings.iter().map(|h| h.3).sum();
        let total_goals: f64 = goals.iter().map(|g| g.1).sum();
        let total_saved: f64 = goals.iter().map(|g| g.2).sum();

        if total_goals > 0.0 {
            let goal_pct = (total_saved / total_goals) * 100.0;
            return format!(
                "Here's your financial check-up:\n\n\
                 📊 Portfolio: ${:.2} ({} holdings)\n\
                 📈 Gain/Loss: ${:.2}\n\
                 🎯 Goals: {}/{} saved ({:.1}%)\n\n\
                 Overall you're doing well. Your biggest lever right now is {}.",
                total_value,
                holdings.len(),
                total_value - total_cost,
                format!("${:.0}", total_saved),
                format!("${:.0}", total_goals),
                goal_pct,
                if !budget.is_empty() { "reducing your top spending category" } else { "building your first budget" }
            ).to_string();
        }
        return "I'd love to run a full check-up, but I need more data. Add your portfolio holdings and set at least one investment goal so I can see your full picture.".to_string();
    }

    if msg_lower.contains("tax refund") || msg_lower.contains("refund") {
        return "Tax refund season is a great planning moment. The best move depends on your goals — emergency fund boost, debt paydown, or investment contribution. What are your priorities this year?".to_string();
    }

    if msg_lower.contains("spending") || msg_lower.contains("breakdown") {
        if let Some((top_cat, top_amt)) = budget.iter().max_by_key(|(_, a)| a.to_bits()) {
            return format!(
                "Your biggest spending category is **{}** at ${:.2}. Want me to suggest a reallocation that keeps your lifestyle but improves your savings rate?",
                top_cat, top_amt
            );
        }
        return "I don't have spending data yet. Head to the Budget tab and log a few transactions so I can show you where your money is going.".to_string();
    }

    if msg_lower.contains("portfolio") || msg_lower.contains("holdings") {
        if holdings.is_empty() {
            return "Your portfolio is empty. Head to the Portfolio tab and add your first asset — stocks, crypto, real estate, or cash. I'll show you your allocation and performance.".to_string();
        }
        let total: f64 = holdings.iter().map(|h| h.2).sum();
        let gl = total - holdings.iter().map(|h| h.3).sum::<f64>();
        return format!(
            "You have {} holdings totaling ${:.2}. Your overall gain/loss is ${:.2}. Head to the Portfolio tab for a full breakdown by type and tag. Want me to analyze your diversification?",
            holdings.len(), total, gl
        );
    }

    if msg_lower.contains("401k") || msg_lower.contains("ira") || msg_lower.contains("retirement") || msg_lower.contains("hsa") {
        let retirement: Vec<_> = goals.iter().filter(|g| g.0.to_lowercase().contains("retirement") || g.0.to_lowercase().contains("401k") || g.0.to_lowercase().contains("ira")).collect();
        if retirement.is_empty() {
            return "I don't see a retirement goal yet. Head to the Investments tab and set up your 401k or IRA tracker — I'll show you if you're on pace for where you want to be.".to_string();
        }
        let (name, target, current, monthly) = retirement[0];
        let pct = (current / target) * 100.0;
        return format!(
            "Your {} goal is at {:.1}% (${:.2}/${:.2}). At ${:.2}/month, you're making good progress. Want me to project when you'll hit your target?",
            name, pct, current, target, monthly
        );
    }

    if msg_lower.contains("health score") || msg_lower.contains("score") {
        return "The Financial Health Score synthesizes your budget discipline, portfolio performance, and goal progress into one number. I've analyzed your data — want me to show you the full breakdown?".to_string();
    }

    "That's a great question. Based on what I know from your data, here's my take: focus on building your emergency fund to 3-6 months of expenses, then maximize any employer 401k match, then pay down high-interest debt. What would you like to dig into deeper?".to_string()
}

// ── Financial Health Score ──────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialHealthScore {
    pub score: f64,           // 0-100
    pub grade: String,        // "A" through "F"
    pub budget_score: f64,
    pub portfolio_score: f64,
    pub goals_score: f64,
    pub summary: String,
    pub top_strength: String,
    pub top_opportunity: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn pulse_health_score(member_id: Option<String>) -> Result<FinancialHealthScore, String> {
    let user_id = member_id.unwrap_or_else(get_current_user_id);
    let engine = get_engine();
    let conn = engine.db.conn();

    // Budget score: based on category diversity and spending patterns
    let budget_categories: Vec<(String, f64)> = match conn.prepare("SELECT category, SUM(amount) FROM budget_entries WHERE member_id=?1 GROUP BY category") {
        Ok(mut stmt) => {
            let rows = stmt.query_map(params![&user_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
            });
            match rows {
                Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
                Err(_) => Vec::new(),
            }
        },
        Err(_) => Vec::new(),
    };

    let total_spent: f64 = budget_categories.iter().map(|(_, a)| a).sum();
    let num_categories = budget_categories.len() as f64;
    let budget_score = if num_categories > 0.0 {
        // More categories = better diversity (up to 7), each under 40% = good balance
        let diversity_score = (num_categories / 7.0).min(1.0) * 40.0;
        let balance_score = budget_categories
            .iter()
            .filter(|(_, amt)| total_spent > 0.0 && (amt / total_spent) < 0.40)
            .count() as f64;
        let balance_norm = if num_categories > 0.0 { (balance_score / num_categories) } else { 0.0 };
        let balance_points = balance_norm * 60.0;
        diversity_score + balance_points
    } else {
        0.0
    };

    // Portfolio score: based on gain/loss % and diversification
    let holdings: Vec<(f64, f64)> = match conn.prepare("SELECT current_value, cost_basis FROM pulse_holdings WHERE user_id=?1") {
        Ok(mut stmt) => {
            let rows = stmt.query_map(params![&user_id], |row| {
                Ok((row.get::<_, f64>(0)?, row.get::<_, f64>(1)?))
            });
            match rows {
                Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
                Err(_) => Vec::new(),
            }
        },
        Err(_) => Vec::new(),
    };

    let portfolio_score = if holdings.is_empty() {
        30.0 // Empty portfolio gets a baseline
    } else {
        let total_value: f64 = holdings.iter().map(|h| h.0).sum();
        let total_cost: f64 = holdings.iter().map(|h| h.1).sum();
        let gl_pct = if total_cost > 0.0 { ((total_value - total_cost) / total_cost) * 100.0 } else { 0.0 };
        // Score: positive returns up to +30%, diversification bonus up to 20, no holdings penalty
        let return_score = (gl_pct.clamp(-20.0, 30.0) + 20.0) / 50.0 * 70.0;
        let div_bonus = (holdings.len() as f64 / 5.0).min(1.0) * 30.0;
        return_score + div_bonus
    };

    // Goals score: based on progress toward all goals
    let goals: Vec<(f64, f64)> = match conn.prepare("SELECT target_amount, current_amount FROM pulse_investment_goals WHERE user_id=?1") {
        Ok(mut stmt) => {
            let rows = stmt.query_map(params![&user_id], |row| {
                Ok((row.get::<_, f64>(0)?, row.get::<_, f64>(1)?))
            });
            match rows {
                Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
                Err(_) => Vec::new(),
            }
        },
        Err(_) => Vec::new(),
    };

    let goals_score = if goals.is_empty() {
        20.0 // No goals set
    } else {
        let avg_progress: f64 = goals.iter().map(|(t, c)| if *t > 0.0 { (c / t).min(1.0) } else { 0.0 }).sum::<f64>() / goals.len() as f64;
        avg_progress * 100.0
    };

    // Weighted overall score
    let score = (budget_score * 0.35) + (portfolio_score * 0.35) + (goals_score * 0.30);

    let grade = match score as i32 {
        80..=100 => "A",
        70..=79  => "B",
        60..=69  => "C",
        40..=59  => "D",
        _        => "F",
    }.to_string();

    let summary = format!(
        "Your financial health score is {:.0}/100 (Grade {}). \
         Budget: {:.0}/100, Portfolio: {:.0}/100, Goals: {:.0}/100.",
        score, grade,
        budget_score.round(), portfolio_score.round(), goals_score.round()
    );

    let top_strength = if budget_score >= portfolio_score && budget_score >= goals_score {
        "Strong budget discipline and spending diversity".to_string()
    } else if portfolio_score >= goals_score {
        "Portfolio is growing with positive returns".to_string()
    } else {
        "Solid progress on your investment goals".to_string()
    };

    let top_opportunity = if budget_score < portfolio_score && budget_score < goals_score {
        "Diversify your spending across more categories to improve budget score".to_string()
    } else if portfolio_score < goals_score {
        "Add more holdings to diversify your portfolio".to_string()
    } else {
        "Set or update investment goals to track your financial milestones".to_string()
    };

    Ok(FinancialHealthScore {
        score,
        grade,
        budget_score,
        portfolio_score,
        goals_score,
        summary,
        top_strength,
        top_opportunity,
    })
}
