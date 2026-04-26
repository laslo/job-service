# ADR-0004: Use OpenAPI and Orval for typed HTTP clients

## Status

Accepted

## Date

2026-04-11

## Context

Next.js (and other clients) must call the NestJS HTTP API with **generated or strongly inferred types** and minimal hand-copied DTOs. Post-MVP, the same surface should support **external integrators** and mobile without a contract rewrite.

Alternatives include tRPC (excellent internal DX, weak as a standalone public REST contract), hand-maintained shared TS packages (drift risk), and GraphQL (extra complexity for a polling-heavy MVP).

## Decision

Use **OpenAPI** emitted from Nest (e.g. `@nestjs/swagger`) and **Orval** to generate TypeScript clients (optional TanStack Query hooks). Treat controller DTOs / validation outputs as the **source of truth** for the public HTTP shape, not raw database entities.

Operational habit: CI fails if the checked-in OpenAPI artifact is stale relative to controllers.

Details and option comparison: [`../reference/api-sdk.md`](../reference/api-sdk.md).

## Consequences

### Positive

- Contract-first HTTP semantics; one artifact can feed public SDKs and documentation later.
- Clear separation between **ORM types** (server-only) and **API types** (clients).

### Negative

- Must keep runtime behavior, decorators, and OpenAPI schema in sync (automation + discipline).

## Alternatives considered

- **tRPC:** best when the API stays 100% internal; awkward as the sole public integration surface.
- **Hand-maintained `packages/contracts`:** simple at first; high drift risk.
