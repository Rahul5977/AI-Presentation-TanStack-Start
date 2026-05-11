#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

backup_file="$1"
if [[ ! -f "${backup_file}" ]]; then
  echo "Backup file not found: ${backup_file}"
  exit 1
fi

db_name="${POSTGRES_DB:-aippt}"
db_host="${POSTGRES_HOST:-postgres}"
db_port="${POSTGRES_PORT:-5432}"
db_user="${POSTGRES_USER:-postgres}"

echo "[restore] restoring ${backup_file} into ${db_name} on ${db_host}:${db_port}"
gunzip -c "${backup_file}" | PGPASSWORD="${POSTGRES_PASSWORD:-}" psql \
  --host="${db_host}" \
  --port="${db_port}" \
  --username="${db_user}" \
  --dbname="${db_name}"

echo "[restore] completed"
