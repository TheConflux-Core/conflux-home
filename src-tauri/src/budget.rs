// Budget Matrix — Tauri Commands for Zero-Based Budgeting
// Integration with Supabase REST API (cloud-side tables)

use serde::{Deserialize, Serialize};
use anyhow::Result;
use super::engine;

// ── Budget Settings ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetSettings {
    pub id: String,
    pub user_id: String,
    pub pay_frequency: String,  // 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
    pub pay_dates: serde_json::Value,  // JSON array (e.g., [1, 15] or ["2026-04-04", "2026-04-18"])
    pub income_amount: f64,
    pub currency: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSettingsRequest {
    pub pay_frequency: String,
    pub pay_dates: serde_json::Value,
    pub income_amount: f64,
    pub currency: Option<String>,
}

#[tauri::command]
pub async fn budget_get_settings(member_id: Option<String>) -> Result<Option<BudgetSettings>, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    
    let resp = supabase_get("budget_settings", &format!("user_id=eq.{}", user_id))
        .map_err(|e| format!("Failed to build request: {}", e))?
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if resp.status() == 404 {
        return Ok(None);
    }

    let settings: Vec<BudgetSettings> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(settings.into_iter().next())
}

#[tauri::command]
pub async fn budget_update_settings(req: UpdateSettingsRequest, member_id: Option<String>) -> Result<BudgetSettings, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    let currency = req.currency.unwrap_or_else(|| "USD".to_string());

    let body = serde_json::json!({
        "user_id": user_id,
        "pay_frequency": req.pay_frequency,
        "pay_dates": req.pay_dates,
        "income_amount": req.income_amount,
        "currency": currency,
        "updated_at": chrono::Utc::now().to_rfc3339()
    });

    // Try PATCH first (update), fall back to POST (insert)
    let resp = supabase_patch(
        "budget_settings",
        &format!("user_id=eq.{}", user_id)
    )
    .map_err(|e| format!("Failed to build request: {}", e))?
    .json(&body)
    .send()
    .await
    .map_err(|e| format!("Network error: {}", e))?;

    if resp.status() == 404 || resp.status() == 409 {
        // Insert new settings
        let insert_resp = supabase_post("budget_settings")
            .map_err(|e| format!("Failed to build insert request: {}", e))?
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        let settings: Vec<BudgetSettings> = insert_resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse insert response: {}", e))?;

        return settings.into_iter().next()
            .ok_or_else(|| "Failed to create budget settings".to_string());
    }

    let settings: Vec<BudgetSettings> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse update response: {}", e))?;

    settings.into_iter().next()
        .ok_or_else(|| "Failed to update budget settings".to_string())
}

// ── Budget Buckets ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetBucket {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub icon: Option<String>,
    pub monthly_goal: f64,
    pub color: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBucketRequest {
    pub name: String,
    pub icon: Option<String>,
    pub monthly_goal: f64,
    pub color: Option<String>,
    pub is_active: Option<bool>,
}

#[tauri::command]
pub async fn budget_get_buckets(member_id: Option<String>) -> Result<Vec<BudgetBucket>, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    
    let resp = supabase_get("budget_buckets", &format!("user_id=eq.{}&order=created_at.desc", user_id))
        .map_err(|e| format!("Failed to build request: {}", e))?
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let buckets: Vec<BudgetBucket> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(buckets)
}

#[tauri::command]
pub async fn budget_create_bucket(req: UpdateBucketRequest, member_id: Option<String>) -> Result<BudgetBucket, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    
    let body = serde_json::json!({
        "user_id": user_id,
        "name": req.name,
        "icon": req.icon,
        "monthly_goal": req.monthly_goal,
        "color": req.color,
        "is_active": req.is_active.unwrap_or(true),
        "created_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339()
    });

    let resp = supabase_post("budget_buckets")
        .map_err(|e| format!("Failed to build request: {}", e))?
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let buckets: Vec<BudgetBucket> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    buckets.into_iter().next()
        .ok_or_else(|| "Failed to create bucket".to_string())
}

#[tauri::command]
pub async fn budget_update_bucket(id: String, req: UpdateBucketRequest, member_id: Option<String>) -> Result<BudgetBucket, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    
    let mut body = serde_json::Map::new();
    body.insert("name".to_string(), serde_json::Value::String(req.name));
    
    if let Some(icon) = req.icon {
        body.insert("icon".to_string(), serde_json::Value::String(icon));
    }
    
    body.insert("monthly_goal".to_string(), serde_json::Value::Number(
        serde_json::Number::from_f64(req.monthly_goal).unwrap()
    ));
    
    if let Some(color) = req.color {
        body.insert("color".to_string(), serde_json::Value::String(color));
    }
    
    if let Some(is_active) = req.is_active {
        body.insert("is_active".to_string(), serde_json::Value::Bool(is_active));
    }
    
    body.insert("updated_at".to_string(), serde_json::Value::String(
        chrono::Utc::now().to_rfc3339()
    ));

    let body = serde_json::Value::Object(body);

    let resp = supabase_patch(
        "budget_buckets",
        &format!("id=eq.{}&user_id=eq.{}", id, user_id)
    )
    .map_err(|e| format!("Failed to build request: {}", e))?
    .json(&body)
    .send()
    .await
    .map_err(|e| format!("Network error: {}", e))?;

    let buckets: Vec<BudgetBucket> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    buckets.into_iter().next()
        .ok_or_else(|| "Failed to update bucket".to_string())
}

// ── Budget Transactions ────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetTransaction {
    pub id: String,
    pub user_id: String,
    pub bucket_id: String,
    pub amount: f64,  // Negative for expenses, positive for income
    pub date: String,
    pub status: String,  // 'pending' | 'confirmed' | 'reconciled' | 'disputed'
    pub description: Option<String>,
    pub merchant: Option<String>,
    pub category: Option<String>,
    pub receipt_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogTransactionRequest {
    pub bucket_id: String,
    pub amount: f64,
    pub date: String,
    pub status: Option<String>,
    pub description: Option<String>,
    pub merchant: Option<String>,
    pub category: Option<String>,
    pub receipt_url: Option<String>,
}

#[tauri::command]
pub async fn budget_log_transaction(req: LogTransactionRequest, member_id: Option<String>) -> Result<BudgetTransaction, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    
    let body = serde_json::json!({
        "user_id": user_id,
        "bucket_id": req.bucket_id,
        "amount": req.amount,
        "date": req.date,
        "status": req.status.unwrap_or_else(|| "confirmed".to_string()),
        "description": req.description,
        "merchant": req.merchant,
        "category": req.category,
        "receipt_url": req.receipt_url,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339()
    });

    let resp = supabase_post("budget_transactions")
        .map_err(|e| format!("Failed to build request: {}", e))?
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let transactions: Vec<BudgetTransaction> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    transactions.into_iter().next()
        .ok_or_else(|| "Failed to log transaction".to_string())
}

#[tauri::command]
pub async fn budget_get_transactions(
    bucket_id: Option<String>,
    month: Option<String>,
    member_id: Option<String>,
) -> Result<Vec<BudgetTransaction>, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    let mut filters = vec![format!("user_id=eq.{}", user_id)];
    
    if let Some(bid) = bucket_id {
        filters.push(format!("bucket_id=eq.{}", bid));
    }
    
    if let Some(m) = month {
        filters.push(format!("date=gte.{}-01", m));
        if let Some(end) = next_month(&m) {
            filters.push(format!("date=lt.{}-01", end));
        }
    }

    let query = format!("order=date.desc&{}", filters.join("&"));
    
    let resp = supabase_get("budget_transactions", &query)
        .map_err(|e| format!("Failed to build request: {}", e))?
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let transactions: Vec<BudgetTransaction> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(transactions)
}

// ── Budget Allocations ─────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetAllocation {
    pub id: String,
    pub user_id: String,
    pub bucket_id: String,
    pub pay_period_id: String,
    pub amount: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAllocationRequest {
    pub bucket_id: String,
    pub pay_period_id: String,
    pub amount: f64,
}

#[tauri::command]
pub async fn budget_update_allocation(req: UpdateAllocationRequest, member_id: Option<String>) -> Result<BudgetAllocation, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    
    let body = serde_json::json!({
        "user_id": user_id,
        "bucket_id": req.bucket_id,
        "pay_period_id": req.pay_period_id,
        "amount": req.amount,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339()
    });

    // Upsert allocation (try update, then insert)
    let query = format!("bucket_id=eq.{}&pay_period_id=eq.{}&user_id=eq.{}",
        req.bucket_id, req.pay_period_id, user_id);
    
    let resp = supabase_patch("budget_allocations", &query)
        .map_err(|e| format!("Failed to build request: {}", e))?
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if resp.status() == 404 || resp.status() == 409 {
        // Insert new allocation
        let insert_resp = supabase_post("budget_allocations")
            .map_err(|e| format!("Failed to build insert request: {}", e))?
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Network error: {}", e))?;

        let allocations: Vec<BudgetAllocation> = insert_resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse insert response: {}", e))?;

        return allocations.into_iter().next()
            .ok_or_else(|| "Failed to create allocation".to_string());
    }

    let allocations: Vec<BudgetAllocation> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    allocations.into_iter().next()
        .ok_or_else(|| "Failed to update allocation".to_string())
}

#[tauri::command]
pub async fn budget_get_allocations(
    pay_period_id: Option<String>,
    member_id: Option<String>,
) -> Result<Vec<BudgetAllocation>, String> {
    let user_id = member_id.unwrap_or_else(|| get_user_id().unwrap_or_else(|_| "default".to_string()));
    let mut filters = vec![format!("user_id=eq.{}", user_id)];
    
    if let Some(ppid) = pay_period_id {
        filters.push(format!("pay_period_id=eq.{}", ppid));
    }

    let query = format!("order=created_at.desc&{}", filters.join("&"));
    
    let resp = supabase_get("budget_allocations", &query)
        .map_err(|e| format!("Failed to build request: {}", e))?
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let allocations: Vec<BudgetAllocation> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(allocations)
}

// ── Helper Functions ───────────────────────────────────────

fn get_user_id() -> Result<String, String> {
    let engine = engine::get_engine();
    let user_id = engine.db().get_config("supabase_user_id")
        .map_err(|e| format!("Failed to read user config: {}", e))?
        .ok_or_else(|| "User not authenticated".to_string())?;
    
    Ok(user_id)
}

fn supabase_get(table: &str, query: &str) -> Result<reqwest::RequestBuilder, String> {
    let url = get_supabase_url()?;
    let key = get_supabase_key()?;
    let token = get_supabase_token()?;
    let full_url = format!("{}/rest/v1/{}?{}", url, table, query);

    Ok(reqwest::Client::new()
        .get(&full_url)
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Prefer", "return=representation"))
}

fn supabase_post(table: &str) -> Result<reqwest::RequestBuilder, String> {
    let url = get_supabase_url()?;
    let key = get_supabase_key()?;
    let token = get_supabase_token()?;
    let full_url = format!("{}/rest/v1/{}", url, table);

    Ok(reqwest::Client::new()
        .post(&full_url)
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation"))
}

fn supabase_patch(table: &str, query: &str) -> Result<reqwest::RequestBuilder, String> {
    let url = get_supabase_url()?;
    let key = get_supabase_key()?;
    let token = get_supabase_token()?;
    let full_url = format!("{}/rest/v1/{}?{}", url, table, query);

    Ok(reqwest::Client::new()
        .patch(&full_url)
        .header("apikey", &key)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation"))
}

fn get_supabase_url() -> Result<String, String> {
    // Hardcoded for local dev - TODO: Move to secure engine config
    Ok("https://zcvhozqrssotirabdlzr.supabase.co".to_string())
}

fn get_supabase_key() -> Result<String, String> {
    // Hardcoded for local dev - TODO: Move to secure engine config
    Ok("sb_publishable_dUyLMKkEtUyiNWYUgnqxjw_Zs9ylHck".to_string())
}

fn get_supabase_token() -> Result<String, String> {
    // For local dev, we'll use the hardcoded anon key as the bearer token
    // In production, this should pull the user's actual JWT from the session
    Ok("sb_publishable_dUyLMKkEtUyiNWYUgnqxjw_Zs9ylHck".to_string())
}

fn next_month(yyyy_mm: &str) -> Option<String> {
    let parts: Vec<&str> = yyyy_mm.split('-').collect();
    if parts.len() != 2 {
        return None;
    }
    
    let year: i32 = parts[0].parse().ok()?;
    let month: u32 = parts[1].parse().ok()?;
    
    if month == 12 {
        Some(format!("{}-01", year + 1))
    } else {
        Some(format!("{}-{:02}", year, month + 1))
    }
}
