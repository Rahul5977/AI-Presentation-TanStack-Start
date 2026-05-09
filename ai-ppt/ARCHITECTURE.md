# Architecture Decision: TanStack Orchestrator + Worker Processes

## Why this topology

The project keeps the existing TanStack Start app as the single web and API orchestrator, and adds separate Node worker processes for generation jobs.

This is chosen because:

- It minimizes rewrites while keeping your current auth/session model unchanged.
- It isolates slow or failure-prone AI/image tasks from request/response latency.
- It scales horizontally by worker count without scaling the web tier equally.
- It keeps deployment simple on VPS (one app image + one worker image + infra services).

## Runtime components

- `web` (TanStack Start): auth, home/outline/presentation pages, API orchestration, SSE.
- `worker` (Node process): consumes RabbitMQ queues and updates Postgres.
- `rabbitmq`: durable job queue transport.
- `redis`: pub/sub for real-time progress events.
- `postgres`: source of truth for presentations, drafts, slides, jobs, assets.

## Queue design

Queues are separated by responsibility:

- `slide.content.generate`
- `slide.image.generate`
- `slide.image.upload`
- `presentation.finalize`

Each queue has a dead-letter queue (`*.dlq`) bound through a shared dead-letter exchange.

## Job and idempotency strategy

- Every logical task creates a `GenerationJob` record with a unique `idempotencyKey`.
- Consumers update job status (`PENDING` → `RUNNING` → `SUCCEEDED` / `DEAD_LETTER`).
- Retries use exponential backoff (`JOB_RETRY_BASE_MS * 2^attempt`) until `JOB_MAX_ATTEMPTS`.
- On max attempts, the message is rejected and moved to DLQ.

## Data flow

1. User submits prompt/options on `/home`.
2. Web app generates and persists editable outline draft.
3. User reviews `/outline/:draftId` and clicks Generate.
4. Web app copies draft slides into final `Slide` rows, marks presentation `QUEUED`, enqueues jobs.
5. Workers process content/image/upload in parallel and publish progress events to Redis.
6. SSE endpoint streams progress to `/presentation/:id`.
7. Finalize worker derives overall presentation status from slide statuses.

## Reliability and observability

- Structured JSON logs via `pino` in web and workers.
- Health endpoint `/api/health/system` checks DB, RabbitMQ, and Redis.
- Graceful shutdown support in worker (`SIGTERM`/`SIGINT`).
- Durable queues and persisted job state enable crash recovery and diagnostics.
