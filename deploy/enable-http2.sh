#!/usr/bin/env bash
# Turns on HTTP/2 for the HTTPS sites on the server (Certbot writes
# "listen 443 ssl;" without it). Faster page loads: the browser fetches
# scripts, styles and fonts in parallel over one connection.
#
#   bash deploy/enable-http2.sh        (on the server, as ubuntu)
#
# Backs up each file, adds "http2" to its 443 listen lines, checks the Nginx
# configuration and reloads. If the check fails, the backups are restored and
# nothing changes.
set -euo pipefail

files=(/etc/nginx/sites-available/iponexa-com /etc/nginx/sites-available/redirect-iponexa.in)
stamp=$(date +%Y%m%d-%H%M%S)

for file in "${files[@]}"; do
  [ -f "$file" ] || { echo "skip (missing): $file"; continue; }
  sudo cp "$file" "$file.bak-$stamp"
  # "listen 443 ssl;" / "listen [::]:443 ssl ipv6only=on;" -> add http2 once.
  sudo sed -i -E '/listen .*443 ssl/{/http2/!s/443 ssl/443 ssl http2/}' "$file"
  echo "updated: $file"
done

if sudo nginx -t; then
  sudo systemctl reload nginx
  echo "HTTP/2 enabled."
else
  echo "Nginx configuration check failed; restoring backups." >&2
  for file in "${files[@]}"; do
    [ -f "$file.bak-$stamp" ] && sudo cp "$file.bak-$stamp" "$file"
  done
  sudo nginx -t && sudo systemctl reload nginx
  exit 1
fi
