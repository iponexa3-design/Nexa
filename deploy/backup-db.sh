#!/usr/bin/env bash
# Daily PostgreSQL backup for IPONexa (runs on the server from cron).
#
#   bash deploy/backup-db.sh
#
# Writes ~/backups/iponexa-YYYYMMDD-HHMM.sql.gz and deletes backups older
# than KEEP_DAYS (default 14). Restore instructions: docs/PROJECT.md.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

URL="$(grep '^DATABASE_URL=' "$APP_DIR/.env.local" | cut -d= -f2- | tr -d '\r')"
[ -n "$URL" ] || { echo "DATABASE_URL missing in $APP_DIR/.env.local" >&2; exit 1; }
# pg_dump does not understand Prisma's ?schema= parameter.
URL="${URL%%\?*}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/iponexa-$(date -u +%Y%m%d-%H%M).sql.gz"
pg_dump --no-owner --no-privileges "$URL" | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find "$BACKUP_DIR" -name 'iponexa-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "$(date -u +%FT%TZ) backup ok: $FILE ($(du -h "$FILE" | cut -f1)), $(ls "$BACKUP_DIR"/iponexa-*.sql.gz | wc -l) kept"
