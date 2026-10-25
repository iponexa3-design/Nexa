#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server for IPONexa.
#
# Run from inside the cloned project folder:
#   sudo bash deploy/setup-server.sh yourdomain.com
# or, before a domain exists, with the server's IP address:
#   sudo bash deploy/setup-server.sh 203.0.113.10
#
# Installs Node.js, PostgreSQL, Nginx and PM2, creates the database,
# writes .env.local with production settings, opens the firewall and puts
# Nginx in front of the app. Safe to run again: existing pieces are kept.
set -euo pipefail

DOMAIN="${1:?Usage: sudo bash deploy/setup-server.sh yourdomain.com}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_USER="${SUDO_USER:-ubuntu}"
ENV_FILE="$APP_DIR/.env.local"

# An IP address (no domain yet) is served over plain HTTP to any host name.
if [[ "$DOMAIN" =~ ^[0-9]+(\.[0-9]+){3}$ ]]; then
  SERVER_NAMES="_"
  SITE_URL="http://$DOMAIN"
else
  SERVER_NAMES="$DOMAIN www.$DOMAIN"
  SITE_URL="https://$DOMAIN"
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo: sudo bash deploy/setup-server.sh $DOMAIN" >&2
  exit 1
fi

echo "==> Setting up IPONexa in $APP_DIR for $DOMAIN (app user: $APP_USER)"

# --- Swap: lets a 1-2 GB server build the app without running out of memory.
if ! swapon --show | grep -q .; then
  echo "==> Adding 2 GB swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- System packages.
echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx postgresql ufw openssl

# --- Node.js 24 LTS (same major version used in development) and PM2.
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v24" ]; then
  echo "==> Installing Node.js 24"
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

# --- Database: local PostgreSQL, reachable only from this server.
DB_NAME=iponexa
DB_USER=iponexa
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  echo "==> Creating database user and database"
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" >/dev/null
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  NEW_DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
else
  echo "==> Database user already exists; keeping the existing DATABASE_URL"
  NEW_DATABASE_URL=""
fi

# --- .env.local with production settings (created once, never overwritten).
set_env() {
  local key="$1" value="$2"
  if grep -q "^$key=" "$ENV_FILE"; then
    sed -i "s|^$key=.*|$key=$value|" "$ENV_FILE"
  else
    echo "$key=$value" >> "$ENV_FILE"
  fi
}
if [ ! -f "$ENV_FILE" ]; then
  echo "==> Writing $ENV_FILE"
  cp "$APP_DIR/.env.example" "$ENV_FILE"
  set_env DATABASE_URL "$NEW_DATABASE_URL"
  set_env IPO_DATA_PROVIDER "http"
  set_env IPO_API_BASE_URL "https://api.ipoalerts.in"
  set_env IPO_API_STATUSES "open,upcoming,closed,listed,announced"
  set_env IPO_API_PAGE_LIMIT "3"
  set_env IPO_REFRESH_SCHEDULER "on"
  set_env CRON_SECRET "$(openssl rand -hex 32)"
  set_env NEXT_PUBLIC_SITE_URL "$SITE_URL"
elif [ -n "$NEW_DATABASE_URL" ]; then
  set_env DATABASE_URL "$NEW_DATABASE_URL"
fi
# Prisma's command-line tool reads .env; point it at the same settings.
ln -sf .env.local "$APP_DIR/.env"
chown -h "$APP_USER":"$APP_USER" "$ENV_FILE" "$APP_DIR/.env"
chmod 600 "$ENV_FILE"

# --- Firewall: SSH and web only. The database port stays closed.
echo "==> Configuring firewall"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

# --- Nginx: plain HTTP for now; deploy/enable-https.sh switches to HTTPS.
echo "==> Configuring Nginx"
sed "s/__SERVER_NAMES__/$SERVER_NAMES/g" "$APP_DIR/deploy/nginx-http.conf" > /etc/nginx/sites-available/iponexa
ln -sf /etc/nginx/sites-available/iponexa /etc/nginx/sites-enabled/iponexa
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# --- PM2 starts the app again automatically after a server reboot.
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

cat <<DONE

==> Server setup finished.

Next steps (as $APP_USER, not root):
  1. Add your IPO Alert API key:   nano $ENV_FILE      (set IPO_API_KEY=...)
  2. Build and start the site:     bash deploy/update.sh
  3. Load the last 45 days once:   npm run backfill

DONE
