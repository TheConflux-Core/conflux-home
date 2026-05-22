fn main() {
    // Embed API keys at compile time so they're available via option_env! at runtime.
    // CI passes these via env vars to `tauri build`, which sets them in the shell env.
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
