# job-service

Monorepo for the job-execution platform: Next.js UI, NestJS API gateway, services, and Kafka workers.

The full design lives in [`docs/`](./docs):

- [`docs/Overview.md`](./docs/Overview.md) — product scope and priorities.
- [`docs/architecture.md`](./docs/architecture.md) — system diagram and job flow.
- [`docs/platform.md`](./docs/platform.md) — Kubernetes, repo layout, cloud posture.
- [`docs/roadmap.md`](./docs/roadmap.md) — staged delivery checklist.
- [`docs/reference/tech-stack.md`](./docs/reference/tech-stack.md) — locked tech choices.
- [`docs/adr/README.md`](./docs/adr/README.md) — architecture decision records.

---

## Toolchain (locked)

| Tool            | Version            | Source                                       |
| --------------- | ------------------ | -------------------------------------------- |
| Node.js         | `22` (active LTS)  | [`.nvmrc`](./.nvmrc), `engines`              |
| Package manager | `pnpm@10`          | `packageManager` (Corepack)                  |
| Task runner     | Turborepo `2`      | [`turbo.json`](./turbo.json)                 |
| Language        | TypeScript `6`     | [`tsconfig.base.json`](./tsconfig.base.json) |
| Lint            | ESLint `10` (flat) | [`eslint.config.mjs`](./eslint.config.mjs)   |
| Format          | Prettier `3`       | [`.prettierrc.json`](./.prettierrc.json)     |
| Tests           | Vitest `4`         | [`vitest.config.ts`](./vitest.config.ts)     |

Choices are pinned by [ADR-0007](./docs/adr/0007-use-pnpm-workspaces-with-turborepo.md) and the locked stack in [`docs/reference/tech-stack.md`](./docs/reference/tech-stack.md).

---

## Repository layout

```
.
├── apps/
│   ├── job-service/               # NestJS HTTP API: create + read jobs (Stage 3)
│   ├── job-events-logger/         # Kafka consumer stub: logs jobs.* events (Stage 4)
│   └── cpu-job-worker/            # First worker: CPU-bound stub processor (Stage 5)
├── packages/
│   ├── db/                        # PostgreSQL schema, Drizzle client, migrations (Stage 2)
│   └── kafka/                     # kafkajs client, topic registry, event schemas (Stage 4)
├── infra/
│   ├── docker-compose.dev.yml     # local dev stack (Postgres + Kafka)
│   ├── kafka/                     # broker README, topic operator helpers
│   ├── kubernetes/
│   ├── helm/
│   └── observability/
├── docs/
└── scripts/
```

`apps/` and `packages/` are wired as pnpm workspaces ([`pnpm-workspace.yaml`](./pnpm-workspace.yaml)). Subprojects appear in later roadmap stages.

---

## Install

Prerequisites: Node 22 (use `nvm use` if you have nvm) and Corepack enabled.

```bash
corepack enable
pnpm install
```

Corepack pins pnpm to the `packageManager` version declared in [`package.json`](./package.json), so all contributors and CI use the same release.

---

## Smoke command

A single command confirms the dev loop is wired correctly:

```bash
pnpm smoke
```

It prints the active toolchain identity and verifies that the target folder layout is in place. Use it as the first signal when onboarding or after a major branch switch.

---

## Common scripts

| Command                  | Purpose                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| `pnpm smoke`             | Print toolchain identity + verify layout.                              |
| `pnpm lint`              | Run ESLint across the workspace.                                       |
| `pnpm format`            | Check Prettier formatting.                                             |
| `pnpm format:fix`        | Apply Prettier formatting.                                             |
| `pnpm test`              | Run Vitest (passes with no tests).                                     |
| `pnpm typecheck`         | Run TypeScript in build mode.                                          |
| `pnpm build`             | Turborepo `build` task graph (no-op until apps land).                  |
| `pnpm dev`               | Turborepo `dev` task graph (no-op until apps land).                    |
| `pnpm db:up`             | Start Postgres via `infra/docker-compose.dev.yml` and wait on health.  |
| `pnpm db:down`           | Stop the local Postgres container (volume is preserved).               |
| `pnpm db:generate`       | Regenerate Drizzle migration SQL from `packages/db/src/schema`.        |
| `pnpm db:migrate`        | Apply pending migrations to the database in `DATABASE_URL`.            |
| `pnpm db:check`          | Insert a job row and read it back (Stage 2 sanity check).              |
| `pnpm db:studio`         | Open Drizzle Studio against the configured database.                   |
| `pnpm kafka:up`          | Start the Kafka broker (KRaft) and wait on its healthcheck.            |
| `pnpm kafka:down`        | Stop the Kafka container (volume is preserved).                        |
| `pnpm kafka:topics`      | Converge broker topics from `packages/kafka/src/topics.ts`.            |
| `pnpm stack:up`          | Start Postgres **and** Kafka together (compose `up --wait`).           |
| `pnpm stack:down`        | Tear the full local stack down.                                        |
| `pnpm api:start`         | Start the job service HTTP API (`apps/job-service`).                   |
| `pnpm api:dev`           | Start the API with `--watch` for the inner dev loop.                   |
| `pnpm api:openapi`       | Regenerate `apps/job-service/openapi.json` from controller decorators. |
| `pnpm worker:logger`     | Run the standalone Kafka consumer stub (Stage 4).                      |
| `pnpm worker:logger:dev` | Same, with `tsx watch` for the inner dev loop.                         |
| `pnpm worker:cpu`        | Run the CPU-bound worker that completes jobs (Stage 5).                |
| `pnpm worker:cpu:dev`    | Same, with `tsx watch` for the inner dev loop.                         |

---

## Database (Stage 2)

The platform targets **PostgreSQL** end-to-end (see [ADR-0003](./docs/adr/0003-adopt-drizzle-as-default-postgresql-orm.md)). The schema, client, and migrations live in [`packages/db`](./packages/db); local Postgres is provided by [`infra/docker-compose.dev.yml`](./infra/docker-compose.dev.yml).

```bash
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:check
```

`db:check` inserts a `jobs` row and reads it back — confirming connectivity, the schema, and default columns (id, status, timestamps). Connection config is taken from `DATABASE_URL`; `.env` is gitignored and only `.env.example` is committed.

To regenerate migrations after schema changes in `packages/db/src/schema`, run `pnpm db:generate` and commit the new files in `packages/db/drizzle/`. Tear the database down with `pnpm db:down` (the named volume keeps your data; remove it manually with `docker volume rm job-service-dev_postgres-data` if you need a clean slate).

---

## Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs lint, format, and test on push and pull request against `main`. It is intentionally minimal at this stage and will grow alongside the roadmap.

---

## Job service API (Stage 3)

The HTTP API lives in [`apps/job-service`](./apps/job-service); see its [README](./apps/job-service/README.md) for the full surface, curl examples, and the OpenAPI artifact. Quick start:

```bash
cp .env.example .env        # if you haven't already
pnpm db:up && pnpm db:migrate
pnpm api:dev                # http://localhost:4000  (Swagger UI at /docs)
```

Create and fetch a job from the console:

```bash
JOB_ID=$(curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "pdf.render", "payload": { "templateId": "invoice-v3" } }' | jq -r .id)
curl -s http://localhost:4000/v1/jobs/$JOB_ID | jq .
```

Validation and not-found errors share the envelope documented in [`docs/reference/errors.md`](./docs/reference/errors.md).

---

## Kafka (Stage 4)

A single-broker [Apache Kafka 3.9](https://kafka.apache.org/) in **KRaft** mode (no ZooKeeper) ships in [`infra/docker-compose.dev.yml`](./infra/docker-compose.dev.yml). The full operator runbook is in [`infra/kafka/README.md`](./infra/kafka/README.md); broker rationale is [ADR-0001](./docs/adr/0001-use-kafka-for-job-events-and-worker-scaling.md).

```bash
cp .env.example .env        # if you haven't already
pnpm db:up && pnpm db:migrate
pnpm kafka:up               # start the broker
pnpm kafka:topics           # converge topics from packages/kafka/src/topics.ts

pnpm api:dev                # producer (terminal 1)
pnpm worker:logger          # consumer stub (terminal 2)
```

Then create a job and watch the logger pick it up:

```bash
curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "pdf.render", "payload": { "templateId": "invoice-v3" } }' | jq .
```

Topics are defined as code in [`packages/kafka/src/topics.ts`](./packages/kafka/src/topics.ts) and converged by `pnpm kafka:topics` (idempotent). Auto-creation is disabled on the broker so typos surface as connection errors. The shared client, env, and event schemas live in [`packages/kafka`](./packages/kafka).

### Turning Kafka off

Set `KAFKA_ENABLED=false` in `.env` to keep the Stage 1–3 dev loop usable without a broker:

- The API logs a warning at startup and skips the producer; `POST /v1/jobs` still persists rows.
- `pnpm worker:logger`, `pnpm worker:cpu`, and `pnpm kafka:topics` exit 0 with a notice.

---

## CPU worker (Stage 5)

The first worker lives in [`apps/cpu-job-worker`](./apps/cpu-job-worker); see its [README](./apps/cpu-job-worker/README.md) for tunables, status semantics, and operational notes. End-to-end loop:

```bash
pnpm stack:up && pnpm db:migrate && pnpm kafka:topics
pnpm api:dev                # producer (terminal 1)
pnpm worker:cpu             # CPU worker (terminal 2)

JOB_ID=$(curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "pdf.render", "payload": { "templateId": "invoice-v3" } }' | jq -r .id)
curl -s http://localhost:4000/v1/jobs/$JOB_ID | jq '{status, error, updatedAt}'
```

The job transitions `pending → running → completed` (or `failed` with a persisted `error` message) — polling-ready for the Stage-6 UI. Per-job CPU budget is governed by `JOB_CPU_TIMEOUT_MS`; see `.env.example` for the full set of knobs.

---

## Roadmap progress

Stage progress is tracked in [`docs/roadmap.md`](./docs/roadmap.md). The current commit completes **Stage 5 — first worker (CPU-bound stub processor)**.
