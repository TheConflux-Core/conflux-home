fn main() {
    // Load .env from src-tauri directory (build.rs runs from here).
    // This ensures local dev builds embed keys without shell exports.
    // CI sets these via env vars directly, which take precedence over .env.
    dotenvy::dotenv().ok();

    // Embed API keys at compile time so they're available via option_env! at runtime.
    println!(
        "cargo:rustc-env=STRIPE_SECRET_KEY={}",
        std::env::var("STRIPE_SECRET_KEY").unwrap_or_default()
    );
    println!(
        "cargo:rustc-env=FINNHUB_API_KEY={}",
        std::env::var("FINNHUB_API_KEY").unwrap_or_default()
    );
    println!(
        "cargo:rustc-env=ALPHA_VANTAGE_KEY={}",
        std::env::var("ALPHA_VANTAGE_KEY").unwrap_or_default()
    );
    println!(
        "cargo:rustc-env=MINIMAX_API_KEY={}",
        std::env::var("MINIMAX_API_KEY").unwrap_or_default()
    );
    tauri_build::build()
}
