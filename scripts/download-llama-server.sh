#!/usr/bin/env bash
# Download prebuilt llama-server binary before Tauri build.
# Uses official llama.cpp releases from GitHub.
# Skips download if binary already exists (idempotent).
#
# Usage:
#   LLAMA_SERVER_VERSION=b4634 ./scripts/download-llama-server.sh

set -euo pipefail

BIN_DIR="${BIN_DIR:-src-tauri/binaries}"
VERSION="${LLAMA_SERVER_VERSION:-b4634}"
PLATFORM="${LLAMA_SERVER_PLATFORM:-}"

mkdir -p "$BIN_DIR"

# Auto-detect platform if not set
if [ -z "$PLATFORM" ]; then
  case "$(uname -s)" in
    Linux*)     PLATFORM="ubuntu-x64" ;;
    Darwin*)    PLATFORM="macos-arm64" ;; # CI builds both archs separately
    MINGW*|CYGWIN*|MSYS*) PLATFORM="win-cuda-cu12.4.1-x64" ;;
    *)          echo "[download-llama-server] Unknown platform: $(uname -s)"; exit 1 ;;
  esac
fi

# Map platform to release asset name
ASSET=""
EXE_NAME="llama-server"
case "$PLATFORM" in
  ubuntu-x64)
    ASSET="llama-${VERSION}-bin-ubuntu-x64.zip"
    ;;
  macos-arm64)
    ASSET="llama-${VERSION}-bin-macos-arm64.zip"
    ;;
  macos-x64)
    ASSET="llama-${VERSION}-bin-macos-x64.zip"
    ;;
  win-avx2-x64)
    ASSET="llama-${VERSION}-bin-win-avx2-x64.zip"
    EXE_NAME="llama-server.exe"
    ;;
  win-cuda-cu12.4.1-x64)
    ASSET="llama-${VERSION}-bin-win-cuda-cu12.4.1-x64.zip"
    EXE_NAME="llama-server.exe"
    ;;
  *)
    echo "[download-llama-server] Unsupported platform: $PLATFORM"
    echo "  Supported: ubuntu-x64, macos-arm64, macos-x64, win-avx2-x64, win-cuda-cu12.4.1-x64"
    exit 1
    ;;
esac

DEST="$BIN_DIR/$EXE_NAME"
if [ -f "$DEST" ]; then
  echo "[download-llama-server] $EXE_NAME already exists, skipping"
  exit 0
fi

URL="https://github.com/ggerganov/llama.cpp/releases/download/${VERSION}/${ASSET}"
TMP_ZIP="/tmp/${ASSET}"

echo "[download-llama-server] Downloading llama-server ${VERSION} for ${PLATFORM}..."
if command -v curl >/dev/null 2>&1; then
  curl -fL --progress-bar "$URL" -o "$TMP_ZIP"
else
  wget --progress=bar:force "$URL" -O "$TMP_ZIP"
fi

echo "[download-llama-server] Extracting..."
TMP_DIR="/tmp/llama-extract-$$"
mkdir -p "$TMP_DIR"
unzip -q "$TMP_ZIP" -d "$TMP_DIR"

# Extract llama-server AND all supporting DLLs (ggml.dll, etc.)
FOUND_EXE=$(find "$TMP_DIR" -name "$EXE_NAME" -type f | head -1)
if [ -z "$FOUND_EXE" ]; then
  echo "[download-llama-server] ERROR: $EXE_NAME not found in archive"
  exit 1
fi

cp "$FOUND_EXE" "$DEST"
chmod +x "$DEST"
echo "[download-llama-server] Installed $DEST ($(du -h "$DEST" | cut -f1))"

# Copy all DLLs that ship with the binary (ggml.dll, ggml-base.dll, etc.)
for DLL in $(find "$TMP_DIR" -name "*.dll" -type f 2>/dev/null); do
  DLL_NAME=$(basename "$DLL")
  cp "$DLL" "$BIN_DIR/$DLL_NAME"
  echo "[download-llama-server] Bundled DLL: $DLL_NAME"
done

rm -rf "$TMP_DIR" "$TMP_ZIP"

echo "[download-llama-server] Done. Contents of $BIN_DIR:"
ls -lh "$BIN_DIR/"
