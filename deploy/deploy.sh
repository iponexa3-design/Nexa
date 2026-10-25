#!/usr/bin/env bash
# Deploys the current commit from the project computer to the live server.
#
#   bash deploy/deploy.sh                 # server from IPONEXA_SERVER, default 159.89.167.205
#   bash deploy/deploy.sh <server-ip>
#
# 1. refuses uncommitted changes, 2. runs type-check, lint and tests,
# 3. sends the commit to the server's git repository over SSH,
# 4. rebuilds and restarts there (deploy/update.sh), 5. checks the live site.
set -euo pipefail
cd "$(dirname "$0")/.."

SERVER="${1:-${IPONEXA_SERVER:-159.89.167.205}}"
KEY="$HOME/.ssh/iponexa_server"
SITE="${IPONEXA_SITE:-https://iponexa.com}"

if [ -n "$(git status --porcelain)" ]; then
  echo "There are uncommitted changes. Commit them first, then deploy." >&2
  exit 1
fi
VERSION="$(git rev-parse --short HEAD)"

echo "==> Checks (type-check, lint, tests) for $VERSION"
npx tsc --noEmit
npm run lint
npx vitest run

echo "==> Sending $VERSION to the server"
GIT_SSH_COMMAND="ssh -i $KEY" git push "ubuntu@$SERVER:iponexa.git" HEAD:main

echo "==> Rebuilding on the server"
ssh -i "$KEY" "ubuntu@$SERVER" "cd ~/iponexa && bash deploy/update.sh"

echo "==> Checking the live site"
host="${SITE#https://}"
# The app restarts during the update; give it up to a minute to come back.
for path in / /gmp-tracker /compare; do
  code=000
  for _ in $(seq 1 12); do
    code="$(curl -s -m 30 -o /dev/null --resolve "$host:443:$SERVER" -w '%{http_code}' "$SITE$path" || true)"
    [ "$code" = "200" ] && break
    sleep 5
  done
  echo "    $path -> $code"
  [ "$code" = "200" ] || { echo "Live check failed for $path. Roll back: ssh in and run bash deploy/rollback.sh" >&2; exit 1; }
done
echo "==> Deployed $VERSION to $SITE"
