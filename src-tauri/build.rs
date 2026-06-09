use std::path::Path;
use std::fs;

/// Sync Android launcher icons from source (icons/android/) to generated
/// project (gen/android/). Without this, icon updates in the source directory
/// are silently ignored — the build uses gen/ as the source of truth.
fn sync_android_icons() {
    let src_base = Path::new("icons/android");
    let dst_base = Path::new("gen/android/app/src/main/res");
    if !src_base.exists() || !dst_base.exists() {
        return; // Not an Android build, or gen dir not yet created
    }
    let densities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
    let files = ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"];
    for density in &densities {
        let src_dir = src_base.join(format!("mipmap-{}", density));
        let dst_dir = dst_base.join(format!("mipmap-{}", density));
        if !src_dir.exists() || !dst_dir.exists() {
            continue;
        }
        for file in &files {
            let src = src_dir.join(file);
            let dst = dst_dir.join(file);
            if src.exists() {
                let _ = fs::copy(&src, &dst);
            }
        }
    }
    // Also sync adaptive icon XML and background color
    let xml_src = src_base.join("mipmap-anydpi-v26/ic_launcher.xml");
    let xml_dst = dst_base.join("mipmap-anydpi-v26/ic_launcher.xml");
    if xml_src.exists() && xml_dst.exists() {
        let _ = fs::copy(&xml_src, &xml_dst);
    }
    let bg_src = src_base.join("values/ic_launcher_background.xml");
    let bg_dst = dst_base.join("values/ic_launcher_background.xml");
    if bg_src.exists() && bg_dst.exists() {
        let _ = fs::copy(&bg_src, &bg_dst);
    }
}

fn main() {
    // Load .env from src-tauri directory (build.rs runs from here).
    // This ensures local dev builds embed keys without shell exports.
    // CI sets these via env vars directly, which take precedence over .env.
    dotenvy::dotenv().ok();

    // Sync Android icons from source to gen directory before build
    sync_android_icons();

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
