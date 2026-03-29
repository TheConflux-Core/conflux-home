// Stripe Integration — Tauri Commands
// Manages subscriptions, checkout sessions, and pricing via Stripe API.

use serde::{Deserialize, Serialize};

fn get_stripe_key() -> Result<String, String> {
    std::env::var("STRIPE_SECRET_KEY")
        .map_err(|_| "STRIPE_SECRET_KEY not set. Add it to .env".to_string())
}

// ── Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeSubscription {
    pub id: String,
    pub status: String,
    pub plan: String,
    pub price_id: String,
    pub current_period_end: i64,
    pub cancel_at_period_end: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripePrice {
    pub id: String,
    pub plan: String,
    pub amount: f64,
    pub interval: String,
    pub currency: String,
    pub display_price: String,
}

// ── Helper: Stripe API client ──

fn stripe_client() -> reqwest::Client {
    reqwest::Client::new()
}

fn stripe_auth_header() -> Result<String, String> {
    let key = get_stripe_key()?;
    Ok(format!("Bearer {}", key))
}

fn map_price_to_plan(price_id: &str) -> String {
    match price_id {
        "price_1TFq8LHV6B3tDjUwOkouQQ5G" => "power".to_string(),
        "price_1TFqQDHV6B3tDjUwJiLW1faL" => "power".to_string(),
        "price_1TFqBmHV6B3tDjUw4ChQHlFI" => "pro".to_string(),
        "price_1TFqPOHV6B3tDjUw7vKzGgnw" => "pro".to_string(),
        _ => "unknown".to_string(),
    }
}

/// Parse Stripe error response JSON and extract message
async fn parse_stripe_error(resp: reqwest::Response) -> String {
    let status = resp.status();
    match resp.json::<serde_json::Value>().await {
        Ok(json) => {
            json["error"]["message"]
                .as_str()
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("Stripe API error (status {})", status))
        }
        Err(_) => format!("Stripe API error (status {})", status),
    }
}

// ── Commands ──

#[tauri::command]
pub async fn stripe_create_checkout_session(
    user_id: String,
    price_id: String,
) -> Result<String, String> {
    let client = stripe_client();

    let params = [
        ("mode", "subscription"),
        ("line_items[0][price]", price_id.as_str()),
        ("line_items[0][quantity]", "1"),
        ("success_url", "conflux://billing/success"),
        ("cancel_url", "conflux://billing/cancel"),
        ("metadata[userId]", user_id.as_str()),
    ];

    let resp = client
        .post("https://api.stripe.com/v1/checkout/sessions")
        .header("Authorization", stripe_auth_header()?)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(parse_stripe_error(resp).await);
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    json["url"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No URL in checkout session response".to_string())
}

/// Create a one-time Stripe Checkout Session for credit pack purchase.
#[tauri::command]
pub async fn stripe_create_credit_pack_session(
    user_id: String,
    pack: String,
) -> Result<String, String> {
    let (price_id, credits, pack_name) = match pack.as_str() {
        "s"  => ("price_1TGDSvHV6B3tDjUwePZZOUdh", "1500",  "Credit Pack S"),
        "m"  => ("price_1TGDTiHV6B3tDjUwAQ9FhblY", "3200",  "Credit Pack M"),
        "l"  => ("price_1TGDU7HV6B3tDjUwIZnvWgwF", "7000",  "Credit Pack L"),
        "xl" => ("price_1TGDUbHV6B3tDjUwDxdIz914", "18000", "Credit Pack XL"),
        _ => return Err(format!("Unknown credit pack: '{}'. Valid: s, m, l, xl", pack)),
    };

    let client = stripe_client();

    let params = [
        ("mode", "payment"),
        ("line_items[0][price]", price_id),
        ("line_items[0][quantity]", "1"),
        ("success_url", "conflux://billing/success"),
        ("cancel_url", "conflux://billing/cancel"),
        ("metadata[userId]", user_id.as_str()),
        ("metadata[type]", "credit_pack"),
        ("metadata[credits]", credits),
        ("metadata[pack_name]", pack_name),
    ];

    let resp = client
        .post("https://api.stripe.com/v1/checkout/sessions")
        .header("Authorization", stripe_auth_header()?)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(parse_stripe_error(resp).await);
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    json["url"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No URL in checkout session response".to_string())
}

#[tauri::command]
pub async fn stripe_create_portal_session(
    stripe_customer_id: String,
) -> Result<String, String> {
    let client = stripe_client();

    let params = [
        ("customer", stripe_customer_id.as_str()),
        ("return_url", "conflux://billing/manage"),
    ];

    let resp = client
        .post("https://api.stripe.com/v1/billing_portal/sessions")
        .header("Authorization", stripe_auth_header()?)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(parse_stripe_error(resp).await);
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    json["url"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No URL in portal session response".to_string())
}

#[tauri::command]
pub async fn stripe_get_subscription(
    stripe_subscription_id: String,
) -> Result<StripeSubscription, String> {
    let client = stripe_client();

    let url = format!(
        "https://api.stripe.com/v1/subscriptions/{}",
        stripe_subscription_id
    );

    let resp = client
        .get(&url)
        .header("Authorization", stripe_auth_header()?)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(parse_stripe_error(resp).await);
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let price_id = json["items"]["data"]
        .as_array()
        .and_then(|items| items.first())
        .and_then(|item| item["price"]["id"].as_str())
        .unwrap_or("")
        .to_string();

    let plan = map_price_to_plan(&price_id);

    Ok(StripeSubscription {
        id: json["id"].as_str().unwrap_or("").to_string(),
        status: json["status"].as_str().unwrap_or("").to_string(),
        plan,
        price_id,
        current_period_end: json["current_period_end"].as_i64().unwrap_or(0),
        cancel_at_period_end: json["cancel_at_period_end"].as_bool().unwrap_or(false),
    })
}

#[tauri::command]
pub async fn stripe_get_prices() -> Result<Vec<StripePrice>, String> {
    Ok(vec![
        StripePrice {
            id: "price_1TFq8LHV6B3tDjUwOkouQQ5G".to_string(),
            plan: "power".to_string(),
            amount: 24.99,
            interval: "month".to_string(),
            currency: "usd".to_string(),
            display_price: "$24.99/mo".to_string(),
        },
        StripePrice {
            id: "price_1TFqQDHV6B3tDjUwJiLW1faL".to_string(),
            plan: "power".to_string(),
            amount: 249.99,
            interval: "year".to_string(),
            currency: "usd".to_string(),
            display_price: "$249.99/yr".to_string(),
        },
        StripePrice {
            id: "price_1TFqBmHV6B3tDjUw4ChQHlFI".to_string(),
            plan: "pro".to_string(),
            amount: 49.99,
            interval: "month".to_string(),
            currency: "usd".to_string(),
            display_price: "$49.99/mo".to_string(),
        },
        StripePrice {
            id: "price_1TFqPOHV6B3tDjUw7vKzGgnw".to_string(),
            plan: "pro".to_string(),
            amount: 499.99,
            interval: "year".to_string(),
            currency: "usd".to_string(),
            display_price: "$499.99/yr".to_string(),
        },
    ])
}
