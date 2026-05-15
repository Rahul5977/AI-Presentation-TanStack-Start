<!-- # AI-Presentation-TanStack-Start

1. Pull your changes
cd ~/AI-Presentation-TanStack-Start/ai-ppt
git pull

2. Database (only when Prisma changed)
If you changed prisma/schema.prisma or added migrations under prisma/migrations/:

docker compose -f docker-compose.prod.yml --env-file .env.production --profile ops run --rm migrate

If you only changed frontend/backend code with no DB changes, skip this.

3. Rebuild and restart the app
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --force-recreate web worker-content worker-image worker-finalize caddy

4. Quick check
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs web --tail 50 -->