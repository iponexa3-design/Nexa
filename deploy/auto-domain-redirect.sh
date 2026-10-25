#!/usr/bin/env bash
# Waits for an extra domain to point at this server, then redirects it.
#
#   bash deploy/auto-domain-redirect.sh <domain> <main-domain> <server-ip>
#   e.g. bash deploy/auto-domain-redirect.sh iponexa.in iponexa.com 159.89.167.205
#
# Meant to run from cron every 30 minutes. While <domain> does not resolve to
# <server-ip> it does nothing. Once it does, it serves a permanent redirect to
# https://<main-domain>, obtains a Let's Encrypt certificate (adding www when
# that resolves too), and removes its own cron entry.
set -euo pipefail

DOMAIN="${1:?domain}"
MAIN="${2:?main domain}"
IP="${3:?server ip}"
SITE="/etc/nginx/sites-available/redirect-$DOMAIN"

resolves_here() {
  [ "$(dig +short A "$1" @8.8.8.8 | tail -n 1)" = "$IP" ]
}

if ! resolves_here "$DOMAIN"; then
  exit 0
fi

NAMES=("$DOMAIN")
resolves_here "www.$DOMAIN" && NAMES+=("www.$DOMAIN")
echo "$(date -u +%FT%TZ) $DOMAIN now points here; setting up redirect for ${NAMES[*]}"

if [ ! -f "$SITE" ]; then
  sudo tee "$SITE" >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${NAMES[*]};
    return 301 https://$MAIN\$request_uri;
}
EOF
  sudo ln -sf "$SITE" "/etc/nginx/sites-enabled/redirect-$DOMAIN"
  sudo nginx -t
  sudo systemctl reload nginx
fi

CERT_ARGS=()
for name in "${NAMES[@]}"; do CERT_ARGS+=(-d "$name"); done
sudo certbot --nginx "${CERT_ARGS[@]}" --non-interactive --agree-tos \
  --register-unsafely-without-email --redirect

# certbot's https block keeps the "return 301 https://MAIN" line, so both
# http:// and https:// on $DOMAIN end up on https://$MAIN.
crontab -l 2>/dev/null | grep -v "auto-domain-redirect.sh $DOMAIN " | crontab - || true
echo "$(date -u +%FT%TZ) done: https://$DOMAIN now redirects to https://$MAIN"
