#!/usr/bin/env bash
# Switches Nginx to HTTPS using the Cloudflare origin certificate.
#
# Before running, save the certificate and key from Cloudflare
# (SSL/TLS > Origin Server > Create Certificate) as:
#   /etc/ssl/cloudflare/origin.pem   (certificate)
#   /etc/ssl/cloudflare/origin.key   (private key)
# then run:
#   sudo bash deploy/enable-https.sh yourdomain.com
set -euo pipefail

DOMAIN="${1:?Usage: sudo bash deploy/enable-https.sh yourdomain.com}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo." >&2
  exit 1
fi
for file in /etc/ssl/cloudflare/origin.pem /etc/ssl/cloudflare/origin.key; do
  if [ ! -s "$file" ]; then
    echo "Missing $file - save the Cloudflare origin certificate first (see docs/DEPLOYMENT.md)." >&2
    exit 1
  fi
done
chmod 600 /etc/ssl/cloudflare/origin.key

sed "s/__DOMAIN__/$DOMAIN/g" "$APP_DIR/deploy/nginx-https.conf" > /etc/nginx/sites-available/iponexa
nginx -t
systemctl reload nginx
echo "==> HTTPS enabled. In Cloudflare set SSL/TLS mode to 'Full (strict)'."
