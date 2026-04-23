#!/usr/bin/env bash
# Download bundled GGUF models before Tauri build.
# Models are fetched from a configurable base URL (GitHub secret or env var).
# Skips download if files already exist (idempotent).
#
# Usage:
#   MODEL_BASE_URL=https://your-cdn.com/models ./scripts/download-models.sh
#
# Expected files at the base URL:
#   - conflux-toolrouter-q4.gguf
#   - functiongemma-270m-q4.gguf
#   - gemma3n-e4b-q4.gguf

set -euo pipefail

MODEL_DIR="${MODEL_DIR:-src-tauri/models}"
BASE_URL="${MODEL_BASE_URL:-}"

if [ -z "$BASE_URL" ]; then
  echo "[download-models] MODEL_BASE_URL not set — skipping model download."
  echo "  Set it to a URL prefix where your .gguf files are hosted."
  echo "  Models must exist on that host with these exact filenames:"
  echo "    conflux-toolrouter-q4.gguf"
  echo "    functiongemma-270m-q4.gguf"
  echo "    gemma3n-e4b-q4.gguf"
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

for model in \
  "conflux-toolrouter-q4.gguf" \
  "functiongemma-270m-q4.gguf" \
  "gemma3n-e4b-q4.gguf"; do
  download "$model" || echo "[download-models] WARNING: failed to download $model"
done

echo "[download-models] Done. Contents of $MODEL_DIR:"
ls -lh "$MODEL_DIR"
