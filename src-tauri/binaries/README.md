# Bundled Binaries

Native binaries placed here are automatically bundled into release builds via
`tauri.conf.json` → `bundle.resources`.

## How binaries get here

**CI builds:** The GitHub Actions workflow downloads the correct `llama-server`
binary automatically for each platform (Linux, Windows, macOS x64/arm64) before
building. You do NOT need to copy files manually.

**Local dev:** If you have `llama-server` installed in your PATH, it will be
used instead.

## Expected filenames

- `llama-server` — Linux / macOS
- `llama-server.exe` — Windows
