# ADR-0002: Use a dedicated NestJS API gateway

## Status

Accepted

## Date

2026-04-11

## Context

The web UI (Next.js) must call backend capabilities: authentication, validation, routing to domain services (job, auth, notifications), and rate limiting. Two common patterns are:

1. A **dedicated API gateway** service (here NestJS) in front of domain services
2. **Next.js alone** as the only backend (API routes / server actions as the public API surface)

The second pattern reduces deployables and can reduce network hops; the first centralizes cross-cutting API concerns and keeps the browser contract clearly separated from UI rendering.

## Decision

Use a **dedicated NestJS** service as the **API gateway**: authentication hooks, routing to backing services, request validation, and coarse rate limits. High-level topology is in [`../architecture.md`](../architecture.md).

## Consequences

### Positive

- Clear boundary for auth, routing, and abuse protection without coupling those concerns to the Next.js app lifecycle.
- Backend ownership of the gateway can evolve independently from the web app (additional clients, BFF variants).

### Negative

- Extra network hop unless deployment topology (colocation, mesh) is optimized.
- More than one long-running service to build, test, and deploy compared to a single Next.js backend.

## Alternatives considered

- **Next.js as sole backend surface:** fewer deployables and potentially fewer hops; weaker separation if multiple apps or non-Next clients must share the same hardened API edge later.
