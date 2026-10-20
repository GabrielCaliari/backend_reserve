#!/usr/bin/env bash
# Backup diario do Postgres do bot (n8n + banco do bot). Guarda 14 dias.
# Agendar no cron da VPS (ver deploy/README.md):
#   30 3 * * * /home/deploy/backend_reserve/deploy/scripts/backup-bot-db.sh >> /home/deploy/backups/backup.log 2>&1
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/bot-db}"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE=(docker compose -f "$REPO_DIR/deploy/docker-compose.prod.yml")

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/bot-db-$STAMP.sql.gz"
TMP="$OUT.partial"

# -T: sem terminal (necessario no cron). --no-role-passwords: o dump nao carrega hash de senha.
"${COMPOSE[@]}" exec -T bot-postgres pg_dumpall -U postgres --no-role-passwords | gzip -9 > "$TMP"

# Dump vazio/minusculo = algo deu errado: nao deixa um backup falso.
if [ "$(stat -c %s "$TMP")" -lt 1024 ]; then
  echo "[$(date -Is)] ERRO: dump suspeito (menos de 1 KB), descartado" >&2
  rm -f "$TMP"
  exit 1
fi

mv "$TMP" "$OUT"
find "$BACKUP_DIR" -name 'bot-db-*.sql.gz' -type f -mtime +"$KEEP_DAYS" -delete
echo "[$(date -Is)] OK: $OUT ($(du -h "$OUT" | cut -f1))"
