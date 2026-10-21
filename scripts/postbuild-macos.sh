#!/usr/bin/env bash
set -euo pipefail

APP="${1:-dist/Right-Stuff Editor Desktop.app}"
PLIST="$APP/Contents/Info.plist"

if [[ ! -f "$PLIST" ]]; then
  echo "postbuild: missing $PLIST" >&2
  exit 1
fi

REASON="Right-Stuff Editor reads and edits notes you choose in Apple Notes."

if /usr/libexec/PlistBuddy -c "Print :NSAppleEventsUsageDescription" "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Set :NSAppleEventsUsageDescription $REASON" "$PLIST"
else
  /usr/libexec/PlistBuddy -c "Add :NSAppleEventsUsageDescription string $REASON" "$PLIST"
fi

codesign --force --deep --sign - "$APP"

echo "postbuild: Apple Events usage description added; app re-signed (ad-hoc)"
