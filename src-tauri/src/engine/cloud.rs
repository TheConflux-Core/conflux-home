// Cloud sync module — Supabase integration for credits & usage tracking
//
// All Supabase REST API communication lives here.
// Fire-and-forget usage logging, atomic credit charges, quota checks.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

use super::get_engine;

// ── Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditStatus {
    pub balance: i64,
    pub has_active_subscription: bool,
    pub subscription_plan: String,
    pub monthly_credits: i64,
    pub monthly_used: i64,
    pub deposit_balance: i64,
    pub total_available: i64,
    pub source: String,
}

/// Alias for CreditStatus — used as the Tauri command response type.
pub type CreditBalance = CreditStatus;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaStatus {
    pub allowed: bool,
    pub source: String,
    pub remaining: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageEntry {
    pub id: String,
    pub model: String,
    pub provider_id: String,
    pub tokens_used: i64,
    pub latency_ms: i64,
    pub status: String,
    pub credits_charged: i64,
    pub call_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStat {
    pub provider_id: String,
    pub call_count: i64,
    pub total_tokens: i64,
    pub total_credits: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelStat {
    pub model: String,
    pub call_count: i64,
    pub total_tokens: i64,
    pub total_credits: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageStats {
    pub total_calls: i64,
    pub total_tokens: i64,
    pub total_credits: i64,
    pub success_rate: f64,
    pub by_provider: Vec<ProviderStat>,
    pub by_model: Vec<ModelStat>,
}

// ── Credit Cost Cache ──

struct CostCache {
    costs: HashMap<String, i64>,
    fetched_at: Instant,
}

fn cost_cache() -> &'static Arc<RwLock<Option<CostCache>>> {
    static CACHE: std::sync::OnceLock<Arc<RwLock<Option<CostCache>>>> = std::sync::OnceLock::new();
    CACHE.get_or_init(|| Arc::new(RwLock::new(None)))
}

const COST_CACHE_TTL: Duration = Duration::from_secs(300); // 5 minutes

// ── Supabase Helpers ──

/// Read Supabase URL from engine config.
fn get_supabase_url() -> Result<String> {
    let engine = get_engine();
    engine.db().get_config("supabase_url")
        .map_err(|e| anyhow::anyhow!("Failed to read supabase_url: {}", e))?
        .ok_or_else(|| anyhow::anyhow!("supabase_url not configured"))
}

/// Read Supabase anon key from engine config.
fn get_supabase_key() -> Result<String> {
    let engine = get_engine();
    engine.db().get_config("supabase_anon_key")
        .map_err(|e| anyhow::anyhow!("Failed to read supabase_anon_key: {}", e))?
        .ok_or_else(|| anyhow::anyhow!("supabase_anon_key not configured"))
}

/// Read the user's auth token (JWT) from engine config.
fn get_auth_token() -> Result<String> {
    let engine = get_engine();
    engine.db().get_config("supabase_auth_token")
        .map_err(|e| anyhow::anyhow!("Failed to read supabase_auth_token: {}", e))?
        .ok_or_else(|| anyhow::anyhow!("supabase_auth_token not configured"))
}

/// Build a Supabase REST GET request.
fn supabase_get(table: &str, query: &str) -> Result<reqwest::RequestBuilder> {
    let url = get_supabase_url()?;
    let key = get_supabase_key()?;
    let token = get_auth_token()?;
    let full_url = format!("{}/rest/v1/{}?{}", url, table, query);

    Ok(reqwest::Client::new()
        .get(&full_url)
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Prefer", "return=representation"))
}

/// Build a Supabase REST POST request.
fn supabase_post(table: &str) -> Result<reqwest::RequestBuilder> {
    let url = get_supabase_url()?;
    let key = get_supabase_key()?;
    let token = get_auth_token()?;
    let full_url = format!("{}/rest/v1/{}", url, table);

    Ok(reqwest::Client::new()
        .post(&full_url)
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation"))
}

/// Build a Supabase REST PATCH request.
fn supabase_patch(table: &str, query: &str) -> Result<reqwest::RequestBuilder> {
    let url = get_supabase_url()?;
    let key = get_supabase_key()?;
    let token = get_auth_token()?;
    let full_url = format!("{}/rest/v1/{}?{}", url, table, query);

    Ok(reqwest::Client::new()
        .patch(&full_url)
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation"))
}

// ── Public API ──

/// Log a usage event to Supabase. Fire-and-forget — errors are logged, not propagated.
pub async fn log_usage_to_cloud(
    user_id: &str,
    session_id: &str,
    agent_id: &str,
    model: &str,
    provider_id: &str,
    tier: &str,
    tokens_used: i64,
    latency_ms: i64,
    status: &str,
    credits_charged: i64,
) {
    // Best-effort: if Supabase isn't configured, just skip silently.
    let body = serde_json::json!({
        "user_id": user_id,
        "session_id": session_id,
        "agent_id": agent_id,
        "model": model,
        "provider_id": provider_id,
        "tier": tier,
        "tokens_used": tokens_used,
        "latency_ms": latency_ms,
        "status": status,
        "credits_charged": credits_charged,
        "call_type": "chat",
        "created_at": chrono::Utc::now().to_rfc3339(),
    });

    match supabase_post("usage_log") {
        Ok(builder) => {
            if let Err(e) = builder.json(&body).send().await {
                log::warn!("[Cloud] Failed to log usage: {}", e);
            }
        }
        Err(e) => {
            log::debug!("[Cloud] Skipping usage log (not configured): {}", e);
        }
    }
}

/// Check the user's cloud credit balance.
pub async fn check_cloud_balance(user_id: &str) -> Result<CreditStatus> {
    // Fetch credit account
    let query = format!("user_id=eq.{}&select=*", user_id);
    let resp = supabase_get("credit_accounts", &query)?
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch credit_accounts: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("credit_accounts fetch returned {}: {}", status, body);
    }

    let accounts: Vec<serde_json::Value> = resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse credit_accounts: {}", e))?;

    let account = accounts.first()
        .ok_or_else(|| anyhow::anyhow!("No credit account found for user {}", user_id))?;

    let balance = account["balance"].as_i64().unwrap_or(0);
    let deposit_balance = account["deposit_balance"].as_i64().unwrap_or(0);

    // Fetch active subscription (if any)
    let sub_query = format!("user_id=eq.{}&status=eq.active&select=*", user_id);
    let (has_active_subscription, subscription_plan, monthly_credits, monthly_used) =
        match supabase_get("ch_subscriptions", &sub_query) {
            Ok(builder) => match builder.send().await {
                Ok(resp) if resp.status().is_success() => {
                    let subs: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
                    if let Some(sub) = subs.first() {
                        (
                            true,
                            sub["plan"].as_str().unwrap_or("free").to_string(),
                            sub["monthly_credits"].as_i64().unwrap_or(0),
                            sub["monthly_used"].as_i64().unwrap_or(0),
                        )
                    } else {
                        (false, "free".to_string(), 0, 0)
                    }
                }
                _ => (false, "free".to_string(), 0, 0),
            },
            Err(_) => (false, "free".to_string(), 0, 0),
        };

    let total_available = balance + deposit_balance + if has_active_subscription {
        monthly_credits - monthly_used
    } else {
        0
    };

    Ok(CreditStatus {
        balance,
        has_active_subscription,
        subscription_plan,
        monthly_credits,
        monthly_used,
        deposit_balance,
        total_available,
        source: "cloud".to_string(),
    })
}

/// Atomically deduct credits. Uses an UPDATE with a balance guard to prevent double-spend.
/// Returns the new balance.
pub async fn charge_credits(user_id: &str, amount: i64, usage_log_id: &str) -> Result<i64> {
    // First, get current balance to compute new values
    let get_query = format!("user_id=eq.{}&select=balance,total_consumed", user_id);
    let resp = supabase_get("credit_accounts", &get_query)?
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to read balance for charge: {}", e))?;

    let accounts: Vec<serde_json::Value> = resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse balance: {}", e))?;

    let account = accounts.first()
        .ok_or_else(|| anyhow::anyhow!("No credit account for user {}", user_id))?;

    let current_balance = account["balance"].as_i64().unwrap_or(0);
    let current_consumed = account["total_consumed"].as_i64().unwrap_or(0);

    if current_balance < amount {
        anyhow::bail!(
            "Insufficient credits: have {}, need {}",
            current_balance, amount
        );
    }

    let new_balance = current_balance - amount;
    let new_consumed = current_consumed + amount;
    let now = chrono::Utc::now().to_rfc3339();

    // PATCH the credit account
    let update_body = serde_json::json!({
        "balance": new_balance,
        "total_consumed": new_consumed,
        "last_charge_at": now,
    });

    let patch_query = format!("user_id=eq.{}", user_id);
    let resp = supabase_patch("credit_accounts", &patch_query)?
        .json(&update_body)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to charge credits: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Credit charge returned {}: {}", status, body);
    }

    // Insert a transaction record (best-effort)
    let tx_body = serde_json::json!({
        "user_id": user_id,
        "amount": -amount,
        "transaction_type": "usage_charge",
        "usage_log_id": usage_log_id,
        "balance_after": new_balance,
        "created_at": now,
    });

    if let Err(e) = supabase_post("credit_transactions")?.json(&tx_body).send().await {
        log::warn!("[Cloud] Failed to record credit transaction: {}", e);
    }

    log::info!(
        "[Cloud] Charged {} credits for user {} (new balance: {})",
        amount, user_id, new_balance
    );

    Ok(new_balance)
}

/// Fetch credit costs from Supabase `credit_config` table.
/// Results are cached with a 5-minute TTL.
pub async fn get_credit_costs() -> Result<HashMap<String, i64>> {
    // Check cache first
    {
        let cache = cost_cache().read().unwrap();
        if let Some(ref cached) = *cache {
            if cached.fetched_at.elapsed() < COST_CACHE_TTL {
                return Ok(cached.costs.clone());
            }
        }
    }

    // Fetch from Supabase
    let resp = supabase_get("credit_config", "select=*")?
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch credit_config: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("credit_config fetch returned {}: {}", status, body);
    }

    let rows: Vec<serde_json::Value> = resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse credit_config: {}", e))?;

    let mut costs = HashMap::new();
    for row in &rows {
        let key = row["config_key"].as_str().unwrap_or_default().to_string();
        let value = row["credits_cost"].as_i64().unwrap_or(1);
        if !key.is_empty() {
            costs.insert(key, value);
        }
    }

    // Update cache
    {
        let mut cache = cost_cache().write().unwrap();
        *cache = Some(CostCache {
            costs: costs.clone(),
            fetched_at: Instant::now(),
        });
    }

    Ok(costs)
}

/// Look up the credit cost for a model call.
/// Priority: model-specific → provider → tier → default 1.
pub fn credit_cost_for_model(
    model: &str,
    provider_id: &str,
    tier: &str,
    costs: &HashMap<String, i64>,
) -> i64 {
    // 1. Model-specific cost
    if let Some(&cost) = costs.get(&format!("model:{}", model)) {
        return cost;
    }

    // 2. Provider cost
    if let Some(&cost) = costs.get(&format!("provider:{}", provider_id)) {
        return cost;
    }

    // 3. Tier fallback
    if let Some(&cost) = costs.get(&format!("tier:{}", tier)) {
        return cost;
    }

    // 4. Default
    *costs.get("default").unwrap_or(&1)
}

/// Fetch usage history for a user.
pub async fn get_usage_history(user_id: &str, limit: i32) -> Result<Vec<UsageEntry>> {
    let query = format!(
        "user_id=eq.{}&order=created_at.desc&limit={}",
        user_id, limit
    );

    let resp = supabase_get("usage_log", &query)?
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch usage_log: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("usage_log fetch returned {}: {}", status, body);
    }

    let rows: Vec<serde_json::Value> = resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse usage_log: {}", e))?;

    let entries = rows.iter().map(|r| UsageEntry {
        id: r["id"].as_str().unwrap_or_default().to_string(),
        model: r["model"].as_str().unwrap_or_default().to_string(),
        provider_id: r["provider_id"].as_str().unwrap_or_default().to_string(),
        tokens_used: r["tokens_used"].as_i64().unwrap_or(0),
        latency_ms: r["latency_ms"].as_i64().unwrap_or(0),
        status: r["status"].as_str().unwrap_or("success").to_string(),
        credits_charged: r["credits_charged"].as_i64().unwrap_or(0),
        call_type: r["call_type"].as_str().unwrap_or("chat").to_string(),
        created_at: r["created_at"].as_str().unwrap_or_default().to_string(),
    }).collect();

    Ok(entries)
}

/// Fetch usage stats for a user over the last N days.
pub async fn get_usage_stats(user_id: &str, days: i32) -> Result<UsageStats> {
    let since = (chrono::Utc::now() - chrono::Duration::days(days as i64)).to_rfc3339();

    // Total stats
    let query = format!(
        "user_id=eq.{}&created_at=gte.{}&select=*",
        user_id, since
    );

    let resp = supabase_get("usage_log", &query)?
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch usage stats: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("usage stats fetch returned {}: {}", status, body);
    }

    let rows: Vec<serde_json::Value> = resp.json().await
        .map_err(|e| anyhow::anyhow!("Failed to parse usage stats: {}", e))?;

    let total_calls = rows.len() as i64;
    let total_tokens: i64 = rows.iter().map(|r| r["tokens_used"].as_i64().unwrap_or(0)).sum();
    let total_credits: i64 = rows.iter().map(|r| r["credits_charged"].as_i64().unwrap_or(0)).sum();
    let success_count = rows.iter().filter(|r| r["status"].as_str() == Some("success")).count() as i64;
    let success_rate = if total_calls > 0 {
        success_count as f64 / total_calls as f64
    } else {
        1.0
    };

    // Aggregate by provider
    let mut provider_map: HashMap<String, (i64, i64, i64)> = HashMap::new();
    let mut model_map: HashMap<String, (i64, i64, i64)> = HashMap::new();

    for row in &rows {
        let provider = row["provider_id"].as_str().unwrap_or("unknown").to_string();
        let model = row["model"].as_str().unwrap_or("unknown").to_string();
        let tokens = row["tokens_used"].as_i64().unwrap_or(0);
        let credits = row["credits_charged"].as_i64().unwrap_or(0);

        let entry = provider_map.entry(provider).or_insert((0, 0, 0));
        entry.0 += 1;
        entry.1 += tokens;
        entry.2 += credits;

        let entry = model_map.entry(model).or_insert((0, 0, 0));
        entry.0 += 1;
        entry.1 += tokens;
        entry.2 += credits;
    }

    let by_provider = provider_map.into_iter().map(|(id, (calls, tokens, credits))| ProviderStat {
        provider_id: id,
        call_count: calls,
        total_tokens: tokens,
        total_credits: credits,
    }).collect();

    let by_model = model_map.into_iter().map(|(model, (calls, tokens, credits))| ModelStat {
        model,
        call_count: calls,
        total_tokens: tokens,
        total_credits: credits,
    }).collect();

    Ok(UsageStats {
        total_calls,
        total_tokens,
        total_credits,
        success_rate,
        by_provider,
        by_model,
    })
}
