#!/usr/bin/env bash
# Download bundled GGUF models before Tauri build.
# Models are fetched from a configurable base URL (GitHub secret or env var).
# Skips download if files already exist (idempotent).
#
# Usage:
#   MODEL_BASE_URL=https://your-cdn.com/models ./scripts/download-models.sh
#
# Expected files at MODEL_BASE_URL:
#   - gemma-3n-e2b-q4km.gguf          (Gemma 3n E2B — primary chat model, 2.9 GB)
#   - conflux-toolrouter-q4-v2.gguf    (Conflux fine-tuned tool router v2)

set -euo pipefail

MODEL_DIR="${MODEL_DIR:-src-tauri/models}"
BASE_URL="${MODEL_BASE_URL:-}"

if [ -z "$BASE_URL" ]; then
  echo "[download-models] MODEL_BASE_URL not set — skipping model download."
  echo "  Set it to a URL prefix where your .gguf files are hosted."
  echo "  Models expected at that host:"
  echo "    - gemma-3n-e2b-q4km.gguf (2.9 GB, primary chat model)"
  echo "    - conflux-toolrouter-q4-v2.gguf (249 MB, tool router)"
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

# Models are NOT bundled in the installer.
# They are downloaded at runtime on first launch from R2:
#   - gemma-3n-e2b-q4km.gguf (2.9 GB) — primary chat model
#   - conflux-toolrouter-q4-v2.gguf (261 MB) — tool router fallback
#
# Runtime download is handled by local_ai.rs: try_download_primary_model()
# which fetches from R2_MODEL_BASE_URL (hardcoded in local_ai.rs).
#
# This script is kept for backwards compatibility but downloads nothing
# to keep the installer artifact small (< 2 GB GitHub limit).

exit 0