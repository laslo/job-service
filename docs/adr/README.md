# Architecture Decision Records

This folder holds **ADRs**: short, durable records of significant architecture choices. **Locked stack tables** and how-to detail live in [`../reference/tech-stack.md`](../reference/tech-stack.md) and the linked reference docs.

| ADR | Title | Status |
|-----|--------|--------|
| [0001](./0001-use-kafka-for-job-events-and-worker-scaling.md) | Use Kafka for job events and worker scaling | Accepted |
| [0002](./0002-use-dedicated-nestjs-api-gateway.md) | Use a dedicated NestJS API gateway | Accepted |
| [0003](./0003-adopt-drizzle-as-default-postgresql-orm.md) | Adopt Drizzle as the default PostgreSQL ORM | Accepted |
| [0004](./0004-use-openapi-and-orval-for-typed-http-clients.md) | Use OpenAPI and Orval for typed HTTP clients | Accepted |
| [0005](./0005-standardize-on-opentelemetry-and-grafana-stack.md) | Standardize on OpenTelemetry and the Grafana metrics/logs/traces stack | Accepted |
| [0006](./0006-prioritize-vertical-slices-over-full-mvp-polish.md) | Prioritize vertical slices (polling, staged workers) over full MVP polish | Accepted |
| [0007](./0007-use-pnpm-workspaces-with-turborepo.md) | Use pnpm workspaces with Turborepo for the monorepo | Accepted |
| [0008](./0008-mvp-authentication-with-opaque-api-tokens.md) | MVP authentication with opaque API tokens and server-side quotas | Accepted |

**Profiles we did not adopt** for this codebase (serverless-first, JVM-centric, etc.) remain documented in [`../decisions/alternatives.md`](../decisions/alternatives.md).

When superseding a decision, add a new ADR, mark the old one **Superseded** with a link to the replacement, and update this index.
