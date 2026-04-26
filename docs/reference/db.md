# Database layer (PostgreSQL)

This project targets **PostgreSQL end-to-end**. Portability across database vendors is **not** a priority; optimize for **Postgres types**, constraints, and migrations that match how NestJS services and workers access data.

---

## Two different “SDKs”

| Surface | What it is | Typical generation |
|--------|------------|----------------------|
| **HTTP API client** | Types + functions the **browser or Next.js server** uses to call NestJS | OpenAPI → **Orval** / `openapi-typescript` / openapi-generator; or **tRPC** (no OpenAPI) — see [`api-sdk.md`](./api-sdk.md) |
| **DB access in Node** | Types + query API used **inside** API services and workers | ORM / query builder “client” (Prisma Client, Drizzle types, etc.) |

ORM generators improve **server-side** correctness and migrations; they do **not** replace a typed **HTTP** client unless you expose the database directly (this architecture does not).

---

## ORM and schema-as-code approaches

### 1. Prisma

- **Schema:** `schema.prisma` (DSL), not TypeScript—strong codegen and migrations via **Prisma Migrate**.
- **Pros:** Mature tooling, great DX for many teams, introspection, relation modeling, `prisma generate` for a type-safe client.
- **Cons:** Schema lives outside TS (many teams still accept this); advanced SQL sometimes fights the query API; generated client is a **Node** artifact, not the FE SDK.

**SDK angle:** Prisma does not generate the REST client for Next.js. You still pair it with **OpenAPI + Orval** (or similar) for FE types, so you maintain **two** sources of truth (DB schema vs HTTP DTOs) unless you derive DTOs with extra tooling (e.g. Zod pipelines).

### 2. Drizzle ORM

- **Schema:** **TypeScript** tables and columns (`pgTable`, etc.); migrations via **drizzle-kit** (`push` / generate SQL).
- **Pros:** Postgres-first, lightweight runtime, schema “reads like code,” good fit if you want **TS as the source of truth** for the data model.
- **Cons:** Smaller ecosystem than Prisma; you own a bit more SQL-shaped thinking for complex reports.

**SDK angle:** Same as Prisma for the browser: HTTP client still comes from **OpenAPI** (recommended path here) or tRPC.

### 3. TypeORM

- **Schema:** Decorated entity classes (TS) or `.entity.ts` patterns; migrations supported.
- **Pros:** Familiar for class-oriented Nest code; flexible query builder.
- **Cons:** Heavier abstraction; decorator metadata and versioning stories can be noisier than Drizzle/Prisma for greenfield APIs.

**SDK angle:** Again, separate HTTP contract generation.

### 4. Kysely (SQL query builder)

- **Schema:** TS types often generated or hand-maintained from migrations.
- **Pros:** Near-SQL control, small runtime.
- **Cons:** More manual modeling than Drizzle/Prisma for a full product schema.

**SDK angle:** Same split: HTTP types are still from the API layer.

---

## Migrations

Regardless of ORM:

- **Single database** shared (with clear service boundaries) or **schema per service** is an architecture choice—Postgres supports both.
- Prefer **checked-in migration SQL** (or drizzle-kit / Prisma Migrate outputs) so CI and Kubernetes bootstraps stay reproducible.

---

## Recommendation (this repo)

| Layer | Recommendation | Rationale |
|-------|----------------|-----------|
| Database | **PostgreSQL** only | Matches priorities and docs. |
| ORM / access | **Drizzle** as the default pick | **TypeScript-first schema**, Postgres-aligned, pairs cleanly with Nest services that already think in modules. |
| Runner-up | **Prisma** | Choose if the team prefers Prisma’s migrate + Studio workflow and accepts a non-TS schema DSL. |
| FE typed HTTP client | **OpenAPI from Nest + Orval** | Keeps a **contract** you can publish to third parties or mobile **after MVP** without rewriting the web app; see [`api-sdk.md`](./api-sdk.md). |

If you adopt Drizzle, treat **Zod** (or similar) DTOs at the controller boundary as the bridge between “DB row shape” and “API response shape,” and keep OpenAPI generated from those DTOs or from Nest decorators so Orval stays authoritative for the **web** SDK.

---

## Related docs

- [`api-sdk.md`](./api-sdk.md) — how API types and clients are produced.
- [`tech-stack.md`](./tech-stack.md) — stack index.
- [ADR-0003](../adr/0003-adopt-drizzle-as-default-postgresql-orm.md) — default ORM choice.
