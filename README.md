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
│   └── job-service/               # NestJS HTTP API: create + read jobs (Stage 3)
├── packages/
│   └── db/                        # PostgreSQL schema, Drizzle client, migrations (Stage 2)
├── infra/
│   ├── docker-compose.dev.yml     # local dev stack (Postgres now; Kafka in Stage 4)
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

| Command            | Purpose                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| `pnpm smoke`       | Print toolchain identity + verify layout.                              |
| `pnpm lint`        | Run ESLint across the workspace.                                       |
| `pnpm format`      | Check Prettier formatting.                                             |
| `pnpm format:fix`  | Apply Prettier formatting.                                             |
| `pnpm test`        | Run Vitest (passes with no tests).                                     |
| `pnpm typecheck`   | Run TypeScript in build mode.                                          |
| `pnpm build`       | Turborepo `build` task graph (no-op until apps land).                  |
| `pnpm dev`         | Turborepo `dev` task graph (no-op until apps land).                    |
| `pnpm db:up`       | Start Postgres via `infra/docker-compose.dev.yml` and wait on health.  |
| `pnpm db:down`     | Stop the local Postgres container (volume is preserved).               |
| `pnpm db:generate` | Regenerate Drizzle migration SQL from `packages/db/src/schema`.        |
| `pnpm db:migrate`  | Apply pending migrations to the database in `DATABASE_URL`.            |
| `pnpm db:check`    | Insert a job row and read it back (Stage 2 sanity check).              |
| `pnpm db:studio`   | Open Drizzle Studio against the configured database.                   |
| `pnpm api:start`   | Start the job service HTTP API (`apps/job-service`).                   |
| `pnpm api:dev`     | Start the API with `--watch` for the inner dev loop.                   |
| `pnpm api:openapi` | Regenerate `apps/job-service/openapi.json` from controller decorators. |

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

## Roadmap progress

Stage progress is tracked in [`docs/roadmap.md`](./docs/roadmap.md). The current commit completes **Stage 3 — Job API (create + read)**.
