# Bundled Models

This directory is populated at build time by `scripts/download-models.sh`.

## Required Model

| Model | Filename | Description |
|-------|----------|-------------|
| Conflux Tool Router | `conflux-toolrouter-q4.gguf` | Fine-tuned local tool router for offline fallback |

## Build Setup

Set the `MODEL_BASE_URL` GitHub secret (or env var) to a URL prefix where
`conflux-toolrouter-q4.gguf` is hosted. The CI workflow calls
`scripts/download-models.sh` before building, which fetches the model into
this directory so Tauri bundles it into the app binary.

If `MODEL_BASE_URL` is not set, the script skips the download and local AI
offline mode will not be available.

## Local Development

For local builds, place `conflux-toolrouter-q4.gguf` directly in this directory
and the app will pick it up at runtime via resource-dir discovery.
