# API contract and typed SDK

How **Next.js** apps call **NestJS** services in this monorepo, how **types and methods** are produced, and how that evolves **after MVP** (third parties, mobile) without a rewrite.

---

## Constraints (from product)

| Constraint | Implication |
|------------|-------------|
| **Monorepo** | Several apps may share `packages/ui`, `packages/api-client`, etc. |
| **No third-party API consumers for MVP** | You can optimize for **internal** DX first. |
| **Mobile / public SDK later** | Prefer a path that becomes a **published OpenAPI** document without throwing away MVP work. |
| **Typed client** | Generated (or inferred) **methods + types**; avoid hand-copying DTOs into the web app. |

---

## Options overview

### 1. OpenAPI (Nest `@nestjs/swagger`) + **Orval**

- **Flow:** Controllers/DTOs → OpenAPI JSON/YAML → Orval generates **fetch** (or axios) **functions + TypeScript types**, optionally **TanStack Query** hooks.
- **Pros:** **Contract-first** HTTP semantics; same artifact can feed **public SDKs** and docs post-MVP; matches a prior **openapi-generator**-style workflow with a **modern** Orval DX for React.
- **Cons:** OpenAPI schema and runtime must stay in sync (CI check recommended).

**Orval** is explicitly in scope: it is the preferred **codegen** layer on top of OpenAPI for this stack.

### 2. OpenAPI + `openapi-typescript` (+ thin hand wrapper)

- **Flow:** Types only from schema; you write a small `apiClient` that uses those types.
- **Pros:** Minimal codegen surface.
- **Cons:** More manual work for **methods**, pagination, and React Query integration than Orval.

### 3. tRPC

- **Flow:** Shared router definitions; client infers types end-to-end.
- **Pros:** Excellent **internal** DX; no OpenAPI drift between “types” and “router.”
- **Cons:** **Not** a substitute for a public REST contract—external integrators and many mobile stacks expect **OpenAPI/REST** (or GraphQL), so you would **add** a second surface or migrate later.

### 4. gRPC / Connect-RPC

- **Flow:** Strongly typed binary or Connect JSON over HTTP/2.
- **Pros:** Great for service-to-service.
- **Cons:** Browser and BFF ergonomics are weaker for a **Next.js** MVP than HTTP + OpenAPI unless the team already standardizes on it.

### 5. GraphQL + codegen

- **Flow:** Schema → typed hooks (e.g. Apollo / urql codegen).
- **Pros:** Flexible queries for complex UIs.
- **Cons:** Extra server and caching complexity for a **job polling** MVP; usually unnecessary here.

### 6. Shared TypeScript package (hand-maintained types)

- **Flow:** Export interfaces from `packages/contracts` and import in Nest + Next.
- **Pros:** Zero codegen setup.
- **Cons:** Easy to **drift** from real HTTP behavior; no free **external** SDK story.

---

## How this interacts with the ORM

- The **ORM** (see [`db.md`](./db.md)) types **rows and queries** in Node.
- The **HTTP layer** types **requests and responses** exposed to clients.
- Best practice: treat **DTOs / Zod / class-validator** outputs as the **source for OpenAPI**, not raw DB entities—so generated clients match what callers are allowed to see.

---

## Recommendation (MVP → post-MVP)

| Phase | Choice |
|-------|--------|
| **MVP** | **OpenAPI from Nest + Orval** for the main Next app (optionally with **TanStack Query** hooks for polling and retries). |
| **After MVP** | Publish the same OpenAPI to **external** consumers or regenerate mobile clients; add rate-limited routes without changing the core pattern. |
| **tRPC** | Only consider if you stay **100% internal** forever or are willing to operate **two** API styles (tRPC for web, REST/OpenAPI for public). |

---

## Operational habits

- **CI:** fail if OpenAPI spec is stale relative to controllers (generate + `git diff`).
- **Versioning:** prefix routes (`/v1/...`) when the first external client appears.
- **Error contract:** every endpoint returns the envelope documented in [`errors.md`](./errors.md); error codes are stable and additive.

---

## Related docs

- [`db.md`](./db.md) — ORM vs HTTP client responsibilities.
- [`tech-stack.md`](./tech-stack.md) — stack index.
- [ADR-0004](../adr/0004-use-openapi-and-orval-for-typed-http-clients.md) — OpenAPI + Orval decision.
- [ADR-0006](../adr/0006-prioritize-vertical-slices-over-full-mvp-polish.md) — polling-first MVP delivery.
