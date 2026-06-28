#!/usr/bin/env bash
set -euo pipefail

# Nightly Postgres backup script.
# Requires: pg_dump, gzip, and either BACKUP_REMOTE_TARGET (scp target) or BACKUP_LOCAL_DIR.

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
db_name="${POSTGRES_DB:-aippt}"
db_host="${POSTGRES_HOST:-postgres}"
db_port="${POSTGRES_PORT:-5432}"
db_user="${POSTGRES_USER:-postgres}"
backup_local_dir="${BACKUP_LOCAL_DIR:-/var/backups/aippt}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "${backup_local_dir}"
backup_file="${backup_local_dir}/${db_name}_${timestamp}.sql.gz"

echo "[backup] creating dump ${backup_file}"
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
  --host="${db_host}" \
  --port="${db_port}" \
  --username="${db_user}" \
  --dbname="${db_name}" \
  --no-owner \
  --no-privileges \
  | gzip -c > "${backup_file}"

if [[ -n "${BACKUP_REMOTE_TARGET:-}" ]]; then
  echo "[backup] uploading to ${BACKUP_REMOTE_TARGET}"
  scp -P "${BACKUP_REMOTE_PORT:-22}" "${backup_file}" "${BACKUP_REMOTE_TARGET}/"
fi

echo "[backup] pruning files older than ${retention_days} days"
find "${backup_local_dir}" -type f -name "${db_name}_*.sql.gz" -mtime +"${retention_days}" -delete

echo "[backup] done"
