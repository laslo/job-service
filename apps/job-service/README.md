# `@job-service/api`

NestJS HTTP service that creates and reads jobs against the `@job-service/db` package. Stage 3 of [the roadmap](../../docs/roadmap.md); kept intentionally thin so Stage 4 can layer Kafka producers on top without reshaping the controller surface.

---

## Endpoints

| Method | Path                 | Purpose                                                 |
| ------ | -------------------- | ------------------------------------------------------- |
| `POST` | `/v1/jobs`           | Create a job row in `pending` state.                    |
| `GET`  | `/v1/jobs/:id`       | Fetch the persisted job (id is a UUID v4).              |
| `GET`  | `/healthz`           | Liveness probe (always 200 if the process is up).       |
| `GET`  | `/readyz`            | Readiness probe (200 once Postgres answers `SELECT 1`). |
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
├── health/                # /healthz + /readyz
└── jobs/
    ├── jobs.controller.ts # HTTP surface
    ├── jobs.service.ts    # business rules (NotFound mapping, payload defaults)
    ├── jobs.repository.ts # Drizzle queries against the `jobs` table
    └── dto/               # CreateJobDto, JobDto, ApiErrorDto (OpenAPI source-of-truth)
```

Tests live next to the file they cover (`*.test.ts`) and run via the workspace-wide `pnpm test` (Vitest).

---

## Stage 4 hooks

When Kafka lands, `JobsService.create` is the natural place to publish a domain event after the row is inserted (same transaction boundary, with outbox or transactional-outbox-lite pattern as decided in the Kafka stage). The HTTP surface should stay unchanged.
