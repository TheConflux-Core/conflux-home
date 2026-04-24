#!/usr/bin/env bash
# Download bundled GGUF models before Tauri build.
# Models are fetched from a configurable base URL (GitHub secret or env var).
# Skips download if files already exist (idempotent).
#
# Usage:
#   MODEL_BASE_URL=https://your-cdn.com/models ./scripts/download-models.sh
#
# Expected files at MODEL_BASE_URL:
#   - conflux-toolrouter-q4-v2.gguf  (Conflux fine-tuned tool router v2)
#   - gemma3-1b-q4.gguf              (Gemma 3 1B base — local chat fallback)

set -euo pipefail

MODEL_DIR="${MODEL_DIR:-src-tauri/models}"
BASE_URL="${MODEL_BASE_URL:-}"

if [ -z "$BASE_URL" ]; then
  echo "[download-models] MODEL_BASE_URL not set — skipping model download."
  echo "  Set it to a URL prefix where your .gguf files are hosted."
  echo "  Model must exist on that host with this exact filename:"
  echo "    conflux-toolrouter-q4.gguf"
  exit 0
fi

mkdir -p "$MODEL_DIR"

download() {
  local file="$1"
  local dest="$MODEL_DIR/$file"
  if [ -f "$dest" ]; then
    echo "[download-models] $file already exists, skipping"
    return 0
  fi
  echo "[download-models] Downloading $file ..."
  if command -v curl >/dev/null 2>&1; then
    curl -fL --progress-bar "${BASE_URL%/}/$file" -o "$dest"
  else
    wget --progress=bar:force "${BASE_URL%/}/$file" -O "$dest"
  fi
  echo "[download-models] $file downloaded ($(du -h "$dest" | cut -f1))"
}

# Conflux fine-tuned tool router v2 (primary local model)
download "conflux-toolrouter-q4-v2.gguf" || echo "[download-models] WARNING: failed to download conflux-toolrouter-q4-v2.gguf"

# Gemma 3 1B base (local chat fallback)
download "gemma3-1b-q4.gguf" || echo "[download-models] WARNING: gemma3-1b-q4.gguf not found (optional)"

echo "[download-models] Done. Contents of $MODEL_DIR:"
ls -lh "$MODEL_DIR"
