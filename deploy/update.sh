#!/usr/bin/env bash
# Builds and (re)starts IPONexa. Use it for the first start and after every
# code change:
#   bash deploy/update.sh
#
# Pulls the latest code, installs packages, applies database migrations,
# builds, then restarts the app (a few seconds of downtime while it starts).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this as the normal user (e.g. ubuntu), not with sudo." >&2
  exit 1
fi
if ! grep -q "^IPO_API_KEY=." .env.local 2>/dev/null; then
  echo "IPO_API_KEY is empty in .env.local; add it first (nano .env.local)." >&2
  exit 1
fi

# Pull first, then restart as the freshly pulled version of this script, so
# changes to the deployment steps take effect in the same deploy.
if [ "${1:-}" != "--pulled" ]; then
  echo "==> Getting latest code"
  git pull --ff-only
  exec bash deploy/update.sh --pulled
fi

echo "==> Installing packages"
npm ci

echo "==> Backing up the database before any migration"
bash deploy/backup-db.sh

echo "==> Preparing database"
npx prisma generate
npx prisma migrate deploy

echo "==> Building"
npm run build

echo "==> Starting"
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save

# deploy/rollback.sh reads this to find the previous version.
mkdir -p .data
echo "$(date -u +%FT%TZ) $(git rev-parse --short HEAD) deploy" >> .data/deploy-history

echo "==> Done. Check status with: pm2 status   |   logs: pm2 logs iponexa"
