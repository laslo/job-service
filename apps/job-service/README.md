# `@job-service/api`

NestJS HTTP service that creates and reads jobs against the `@job-service/db` package and emits a `jobs.created` event to Kafka after each successful create. Stages 3–5 of [the roadmap](../../docs/roadmap.md); the controller surface is unchanged from Stage 3 — Kafka was added behind a feature flag (`KAFKA_ENABLED`) and Stage 5 hands the rest of the lifecycle (`running` → `completed` / `failed`, `error` field) off to [`apps/cpu-job-worker`](../cpu-job-worker/README.md).

---

## Endpoints

| Method | Path                 | Purpose                                                 |
| ------ | -------------------- | ------------------------------------------------------- |
| `POST` | `/v1/jobs`           | Create a job row in `pending` state.                    |
| `GET`  | `/v1/jobs/:id`       | Fetch the persisted job (id is a UUID v4).              |
| `GET`  | `/health`            | Liveness probe (always 200 if the process is up).       |
| `GET`  | `/ready`             | Readiness probe (200 once Postgres answers `SELECT 1`). |
| `GET`  | `/docs`              | Swagger UI (browser-testable surface).                  |
| `GET`  | `/docs/openapi.json` | Raw OpenAPI document.                                   |

All errors share the envelope documented in [`docs/reference/errors.md`](../../docs/reference/errors.md).

---

## Run locally

Prerequisites: `pnpm install` at the repo root and a `.env` with `DATABASE_URL` set (`cp .env.example .env`).

```bash
pnpm db:up          # one-time per session: Postgres on localhost
pnpm db:migrate     # ensure jobs table exists
pnpm api:dev        # start with --watch on port 4000
```

The service binds to `JOB_SERVICE_HOST` / `JOB_SERVICE_PORT` (defaults `0.0.0.0:4000`).

### Browser

Open `http://localhost:4000/docs`. Swagger UI ships with the same DTOs the controller validates against, so "Try it out" exercises the real API.

### curl

Create a job:

```bash
curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "pdf.render", "payload": { "templateId": "invoice-v3" } }' | jq .
```

Fetch the job by id:

```bash
JOB_ID=$(curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "pdf.render" }' | jq -r .id)
curl -s http://localhost:4000/v1/jobs/$JOB_ID | jq .
```

Trigger a documented validation error:

```bash
curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{}' | jq .
```

---

## OpenAPI artifact

The generated spec is checked in at [`openapi.json`](./openapi.json). Regenerate after controller / DTO changes:

```bash
pnpm api:openapi
```

Per [ADR-0004](../../docs/adr/0004-use-openapi-and-orval-for-typed-http-clients.md), this artifact is the input for Orval-generated clients in later stages; a CI drift check can be added when the first generated client lands.

---

## Layout

```
src/
├── app.module.ts          # composition root
├── main.ts                # bootstrap (validation, filter, swagger, listen)
├── env.ts                 # JOB_SERVICE_HOST / JOB_SERVICE_PORT parsing
├── common/                # validation pipe, error filter, error codes
├── db/                    # Drizzle client wrapper (Nest-managed lifecycle)
├── health/                # /health + /ready
├── kafka/                 # Producer wrapper + JobEventsPublisher (Stage 4)
└── jobs/
    ├── jobs.controller.ts # HTTP surface
    ├── jobs.service.ts    # business rules + jobs.created publish-after-commit
    ├── jobs.repository.ts # Drizzle queries against the `jobs` table
    └── dto/               # CreateJobDto, JobDto, ApiErrorDto (OpenAPI source-of-truth)
```

Tests live next to the file they cover (`*.test.ts`) and run via the workspace-wide `pnpm test` (Vitest).

---

## Kafka integration (Stage 4)

`JobsService.create` publishes a `jobs.created` event to Kafka **after** the Postgres row is committed. The publish is synchronous from the caller's perspective — broker errors propagate as 500s so an outage cannot silently drop events. A future stage will move this to a transactional outbox.

When `KAFKA_ENABLED=false`, the publisher is a no-op and the API works against Postgres alone (useful for Stage 1–3 dev loops). The topic name and event schema are owned by [`@job-service/kafka`](../../packages/kafka).
