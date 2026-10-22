#!/usr/bin/env bash
set -euo pipefail

APP="dist/Right-Stuff Editor Desktop.app"
VERSION="$(node -p "require('./package.json').version")"
OUT_ZIP="dist/right-stuff-editor-desktop-${VERSION}-macos-universal.zip"
OUT_DMG="dist/right-stuff-editor-desktop-${VERSION}-macos-universal.dmg"

if [[ ! -d "$APP" ]]; then
  echo "artifacts: missing $APP (run 'npm run package:universal' first)" >&2
  exit 1
fi

if ! codesign --verify --deep --strict "$APP" >/dev/null 2>&1; then
  echo "artifacts: signature is broken, run scripts/postbuild-macos.sh first" >&2
  exit 1
fi

rm -f "$OUT_ZIP" "$OUT_DMG"

# .app はディレクトリなので、ditto でシンボリックリンクと権限を保って zip する
ditto -c -k --keepParent "$APP" "$OUT_ZIP"

# installer 代わりとなる簡易 DMG（署名済みアプリをそのまま格納）
hdiutil create \
  -volname "Right-Stuff Editor Desktop" \
  -srcfolder "$APP" \
  -ov -format UDZO \
  "$OUT_DMG" >/dev/null

echo "artifacts: created"
ls -lh "$OUT_ZIP" "$OUT_DMG"
