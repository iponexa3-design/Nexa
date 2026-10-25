#!/usr/bin/env bash
# Puts the previously deployed version back live (runs on the server).
#
#   bash deploy/rollback.sh            # the version deployed before the current one
#   bash deploy/rollback.sh <commit>   # a specific version (see .data/deploy-history)
#
# Rebuilds that version and restarts with no downtime. Database migrations
# are NOT undone; restore a backup for that (docs/PROJECT.md).
set -euo pipefail

# Older versions may not contain this script, so run from a temporary copy:
# resetting the code below must not delete the file bash is reading.
if [ -z "${IPONEXA_ROLLBACK_APP_DIR:-}" ]; then
  export IPONEXA_ROLLBACK_APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  copy="$(mktemp)"
  cp "$0" "$copy"
  exec bash "$copy" "$@"
fi
cd "$IPONEXA_ROLLBACK_APP_DIR"

HISTORY=.data/deploy-history
TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  [ -f "$HISTORY" ] || { echo "No deployment history yet ($HISTORY)." >&2; exit 1; }
  TARGET="$(grep ' deploy$' "$HISTORY" | tail -n 2 | head -n 1 | awk '{print $2}')"
  CURRENT="$(git rev-parse --short HEAD)"
  [ -n "$TARGET" ] && [ "$TARGET" != "$CURRENT" ] || { echo "No earlier deployment recorded." >&2; exit 1; }
fi
git cat-file -e "$TARGET^{commit}" 2>/dev/null || { echo "Unknown version: $TARGET" >&2; exit 1; }

echo "==> Rolling back from $(git rev-parse --short HEAD) to $TARGET"
git reset --hard "$TARGET"
npm ci
npx prisma generate
npm run build
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
mkdir -p .data
echo "$(date -u +%FT%TZ) $(git rev-parse --short HEAD) rollback" >> "$HISTORY"
echo "==> Live on $(git log -1 --format='%h %s')"
echo "    Fix the problem, then deploy again (deploy/deploy.sh from the project computer)."
