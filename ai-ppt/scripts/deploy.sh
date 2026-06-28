#!/usr/bin/env bash
# Build-on-VPS rolling deploy. Run from the repo root on the server.
# Recreates web replicas one at a time so the other keeps serving (Caddy
# load-balances + retries), giving a near-zero-downtime deploy on plain Compose.
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"
PROJECT="${COMPOSE_PROJECT_NAME:-$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')}"

echo "[deploy] pulling latest code"
git pull --ff-only

echo "[deploy] building images"
$COMPOSE build web worker-content worker-image worker-finalize migrate

echo "[deploy] running database migrations (expand/contract, backward-compatible)"
$COMPOSE --profile ops run --rm migrate

echo "[deploy] rolling web replicas"
for n in 1 2; do
  container="${PROJECT}-web-${n}"
  echo "  - recreating ${container}"
  docker rm -f "${container}" >/dev/null 2>&1 || true
  # Recreate only the missing replica with the freshly built image.
  $COMPOSE up -d --no-deps --no-recreate web
  for _ in $(seq 1 40); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "${container}" 2>/dev/null || echo starting)"
    [ "${status}" = "healthy" ] && break
    sleep 3
  done
  echo "    ${container} -> ${status:-unknown}"
done

echo "[deploy] recreating workers (graceful SIGTERM drain is built in)"
$COMPOSE up -d --no-deps worker-content worker-image worker-finalize

echo "[deploy] reconciling remaining services (no-op if config unchanged)"
$COMPOSE up -d

echo "[deploy] done"
