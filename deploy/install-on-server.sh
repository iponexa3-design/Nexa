#!/usr/bin/env bash
# Installs IPONexa on a fresh server from this computer, over SSH.
#
#   bash deploy/install-on-server.sh <server-ip> [domain]
#   BRANCH=some-branch bash deploy/install-on-server.sh ...   (default: main)
#
# Uses ~/.ssh/iponexa_server to log in as "ubuntu", downloads the code from
# GitHub, runs setup-server.sh, copies the IPO Alert key from the local
# .env.local (through SSH, never on a command line), builds, starts the site
# and loads the last 45 days of IPO data.
set -euo pipefail

IP="${1:?Usage: bash deploy/install-on-server.sh <server-ip> [domain]}"
DOMAIN="${2:-$IP}"
KEY="$HOME/.ssh/iponexa_server"
REPO="https://github.com/iponexa3-design/Nexa.git"
BRANCH="${BRANCH:-main}"
SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)
SSH=(ssh "${SSH_OPTS[@]}" "ubuntu@$IP")

cd "$(dirname "$0")/.."
IPO_KEY="$(grep '^IPO_API_KEY=' .env.local | cut -d= -f2- | tr -d '\r')"
[ -n "$IPO_KEY" ] || { echo "IPO_API_KEY missing in local .env.local" >&2; exit 1; }

echo "==> Waiting for the server to accept logins"
for _ in $(seq 1 30); do
  ssh "${SSH_OPTS[@]}" -o ConnectTimeout=10 "ubuntu@$IP" true 2>/dev/null && break
  sleep 10
done
"${SSH[@]}" "cloud-init status --wait >/dev/null 2>&1 || true"

echo "==> Downloading the code"
"${SSH[@]}" "[ -d ~/iponexa/.git ] || git clone --depth 50 -b $BRANCH $REPO ~/iponexa"

echo "==> Setting up the server (5-10 minutes)"
"${SSH[@]}" "cd ~/iponexa && sudo bash deploy/setup-server.sh $DOMAIN"

echo "==> Adding the IPO Alert key"
printf '%s' "$IPO_KEY" | "${SSH[@]}" "cd ~/iponexa && key=\$(cat) && sed -i \"s|^IPO_API_KEY=.*|IPO_API_KEY=\$key|\" .env.local"

echo "==> Building and starting the site"
"${SSH[@]}" "cd ~/iponexa && bash deploy/update.sh"

echo "==> Loading the last 45 days of IPO data"
"${SSH[@]}" "cd ~/iponexa && npm run backfill"

echo "==> Live at http://$IP"
