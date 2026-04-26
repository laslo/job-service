# Tech stack (locked choices)

Canonical **what we use**. Diagrams and boundaries: [`architecture.md`](../architecture.md). Kubernetes, cloud, and repository layout: [`platform.md`](../platform.md). **Why** (ADRs): [`adr/README.md`](../adr/README.md).

---

## Data & messaging

| Area | Choice | Notes |
|------|--------|-------|
| Primary database | **PostgreSQL** | Only supported store — [`db.md`](./db.md); default ORM — [ADR-0003](../adr/0003-adopt-drizzle-as-default-postgresql-orm.md). |
| Event queue | **Apache Kafka** | Durable log and worker scaling — [ADR-0001](../adr/0001-use-kafka-for-job-events-and-worker-scaling.md). |

---

## Backend & integration

| Area | Choice | Notes |
|------|--------|-------|
| API / gateway | **NestJS** | Auth hooks, routing, validation — [`architecture.md`](../architecture.md), [ADR-0002](../adr/0002-use-dedicated-nestjs-api-gateway.md). |
| Worker runtime | **Node.js + TypeScript** | Kafka consumers in Kubernetes; same patterns as services. |
| Public HTTP contract | **OpenAPI + Orval** | Nest emits spec → generated clients — [`api-sdk.md`](./api-sdk.md), [ADR-0004](../adr/0004-use-openapi-and-orval-for-typed-http-clients.md). |

---

## Frontend

| Area | Choice | Notes |
|------|--------|-------|
| Web framework | **Next.js** | App Router, **RSC-first**; MVP job status via **HTTP polling** — [ADR-0006](../adr/0006-prioritize-vertical-slices-over-full-mvp-polish.md). |
| UI components | **shadcn/ui** | No alternate UI kits in scope. |
| Localization | **i18n** (**en**, **es**, optional third locale) | RSC-oriented patterns in [`i18n.md`](./i18n.md). |

---

## Quality, tooling & CI

| Area | Choice | Notes |
|------|--------|-------|
| Language | **TypeScript** | Shared packages across apps from the first commit. |
| Package manager | **pnpm** | Workspaces + `pnpm-lock.yaml` — [ADR-0007](../adr/0007-use-pnpm-workspaces-with-turborepo.md). |
| Monorepo tasks | **Turborepo** | Pipeline cache and task graph across `apps/*` and `packages/*` — [ADR-0007](../adr/0007-use-pnpm-workspaces-with-turborepo.md). |
| CI/CD | **GitHub Actions** | Prefer Turborepo `--filter` for scoped pipelines. |
| Tests | **Vitest** | Unit and integration baseline for TS packages and apps. |

---

## Observability

| Area | Choice | Notes |
|------|--------|-------|
| Signals | **OpenTelemetry** → **Prometheus**, **Jaeger**, **Loki**; **Grafana** | [`observability.md`](../observability.md), [ADR-0005](../adr/0005-standardize-on-opentelemetry-and-grafana-stack.md). |

---

## Access control (MVP)

| Area | Choice | Notes |
|------|--------|-------|
| Identity | **Opaque API tokens** + quotas + rate limits | [`auth.md`](./auth.md), [ADR-0008](../adr/0008-mvp-authentication-with-opaque-api-tokens.md). |

---

## Frontend implementation notes

- **State:** Prefer server state and the URL; add client state libraries only when a screen proves the need.
- **Polling:** TanStack Query pairs cleanly with Orval-generated hooks; SWR or raw `fetch` are documented in [`api-sdk.md`](./api-sdk.md).

---

## Documentation index

| Read first | Document |
|------------|----------|
| System design | [`architecture.md`](../architecture.md) |
| Platform & delivery | [`platform.md`](../platform.md) |
| Delivery checklist | [`roadmap.md`](../roadmap.md) |
| Telemetry | [`observability.md`](../observability.md) |
| Architecture Decision Records | [`adr/README.md`](../adr/README.md) |
| Non-baseline stacks | [`decisions/alternatives.md`](../decisions/alternatives.md) |
| Database layer | [`db.md`](./db.md) |
| API contract & clients | [`api-sdk.md`](./api-sdk.md) |
| Authentication | [`auth.md`](./auth.md) |
| Internationalization | [`i18n.md`](./i18n.md) |
