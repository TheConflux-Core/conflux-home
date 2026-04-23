# Bundled Models

GGUF model files placed here are automatically bundled into release builds via
`tauri.conf.json` → `bundle.resources`.

## How models get here

**CI builds:** The GitHub Actions workflow downloads models automatically from
`MODEL_BASE_URL` (set as a repository secret) before building. You do NOT need
to copy files manually.

**Local dev:** If you have models locally, place them here and they will be
used. The code also falls back to legacy dev paths (`~/.openclaw/...`).

## Expected filenames

- `conflux-toolrouter-q4.gguf` — custom tool-router model
- `functiongemma-270m-q4.gguf` — FunctionGemma 270M (tool calling)
- `gemma3n-e4b-q4.gguf` — Gemma 3n E4B

Any `.gguf` file in this directory will be discovered at runtime.
