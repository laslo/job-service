# Documentation

Start at **[Overview.md](./Overview.md)** for purpose, priorities, and the full map.

## Core

| Topic | Document |
|--------|----------|
| System design, job flow, MVP access | [architecture.md](./architecture.md) |
| Kubernetes, cloud, repo layout, monorepo | [platform.md](./platform.md) |
| Staged delivery checklist | [roadmap.md](./roadmap.md) |
| Telemetry stack and metrics | [observability.md](./observability.md) |

## Reference (contracts & stack)

| Topic | Document |
|--------|----------|
| **Locked tech choices** (hub) | [reference/tech-stack.md](./reference/tech-stack.md) |
| PostgreSQL, ORM, HTTP vs DB “SDK” | [reference/db.md](./reference/db.md) |
| OpenAPI, Orval, client strategy | [reference/api-sdk.md](./reference/api-sdk.md) |
| Locales, RSC, libraries | [reference/i18n.md](./reference/i18n.md) |
| MVP token auth, post-MVP IdPs | [reference/auth.md](./reference/auth.md) |

## Decisions

| Topic | Document |
|--------|----------|
| **Architecture Decision Records** (indexed) | [adr/README.md](./adr/README.md) |
| Decisions folder (ADR index + link to alternatives) | [decisions/README.md](./decisions/README.md) |
| Alternate whole-stack profiles + planned apps | [decisions/alternatives.md](./decisions/alternatives.md) |

**Direction:** Kafka from day one, HTTP polling for MVP job status, staged workers (PDF → email/API → analytics), server-enforced access quotas for the initial release, cloud deployment with portability and controlled spend—details in the files above.
