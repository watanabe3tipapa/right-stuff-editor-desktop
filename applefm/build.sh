#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

OUT_DIR="build"
OUT_BIN="$OUT_DIR/apple-fm-server"
SDK_PATH="$(xcrun --show-sdk-path 2>/dev/null || true)"

if [ -z "$SDK_PATH" ] || [ ! -d "$SDK_PATH/System/Library/Frameworks/FoundationModels.framework" ]; then
  echo "error: FoundationModels.framework not found in the current SDK." >&2
  echo "       macOS 26+ SDK (Xcode 26 or Command Line Tools) is required." >&2
  exit 1
fi

case "$(uname -m)" in
  arm64) ARCH_TARGET="arm64-apple-macosx26.0" ;;
  *)     ARCH_TARGET="x86_64-apple-macosx26.0" ;;
esac

mkdir -p "$OUT_DIR"

echo "building apple-fm-server ($ARCH_TARGET)"
swiftc -O \
  -target "$ARCH_TARGET" \
  -framework Foundation \
  -framework Network \
  main.swift \
  -o "$OUT_BIN"

echo "built: $PWD/$OUT_BIN"
