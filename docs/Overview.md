# Distributed Job Processing Platform

Central index for architecture and delivery notes.

## Purpose

A distributed platform for running background jobs (PDF generation, data processing, email, analytics, scheduled tasks) with a clear separation between API, queue, workers, persistence, and observability.

## Product and engineering priorities

1. **Ship iteratively:** deliver small increments often; prefer vertical slices over big-bang releases.
2. **Easy local and partial runs:** exercise new behavior in a browser, terminal, or other local clients; turn optional components off so the core path stays fast to iterate on.
3. **Low cloud spend:** default to the smallest viable footprint, scale with demand, and favor patterns that survive a cloud move without rewrite.

More detail: [roadmap.md](./roadmap.md), [platform.md](./platform.md).

---

## Documentation map

### Core

| Document | Contents |
|----------|----------|
| [architecture.md](./architecture.md) | Diagram, job lifecycle, service boundaries, MVP access |
| [platform.md](./platform.md) | Kubernetes layout, autoscaling, deployment, cloud/cost, repository layout, monorepo vs polyrepo |
| [observability.md](./observability.md) | OpenTelemetry → Prometheus / Jaeger / Loki / Grafana, metrics to track |
| [roadmap.md](./roadmap.md) | Staged build checklist (`[ ]` / `[x]`) |

### Reference

| Document | Contents |
|----------|----------|
| [reference/tech-stack.md](./reference/tech-stack.md) | Locked stack by area (data, backend, frontend, tooling, observability, auth) |
| [reference/db.md](./reference/db.md) | PostgreSQL, ORM options, migrations, HTTP vs DB clients |
| [reference/api-sdk.md](./reference/api-sdk.md) | OpenAPI, Orval, tRPC, and typed client strategy |
| [reference/i18n.md](./reference/i18n.md) | Locales, RSC-first i18n, library options |
| [reference/auth.md](./reference/auth.md) | MVP token-based access; post-MVP OIDC / social login |

### Decisions

| Document | Contents |
|----------|----------|
| [adr/README.md](./adr/README.md) | Architecture Decision Records (Kafka, gateway, Drizzle, OpenAPI, observability, delivery, tooling, MVP auth) |
| [decisions/README.md](./decisions/README.md) | Index of decision docs (ADRs + alternatives) |
| [decisions/alternatives.md](./decisions/alternatives.md) | Planned monorepo apps; non-baseline stacks (serverless, JVM, Go, Temporal) |

For the **fastest path into the repo**, read [reference/tech-stack.md](./reference/tech-stack.md) then [architecture.md](./architecture.md).
