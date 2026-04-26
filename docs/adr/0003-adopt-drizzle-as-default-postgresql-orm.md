# ADR-0003: Adopt Drizzle as the default PostgreSQL ORM

## Status

Accepted

## Date

2026-04-11

## Context

Services and workers need **type-safe access** to **PostgreSQL** with migrations and schema evolution. Common options include Drizzle, Prisma, TypeORM, and SQL-first builders (e.g. Kysely).

The project optimizes for **Postgres-native** behavior and **TypeScript-first** schema where possible. The browser still needs a **separate** typed **HTTP** client; the ORM does not replace that contract.

## Decision

Adopt **Drizzle ORM** as the **default** choice for server-side Postgres access (TypeScript schema, drizzle-kit migrations). **Prisma** remains a **documented alternative** if the team prefers Prisma Migrate and Studio and accepts a non-TS schema DSL.

Full comparison and migration practices: [`../reference/db.md`](../reference/db.md).

## Consequences

### Positive

- Schema and migrations stay close to application TypeScript; good fit for Nest modules and shared packages.
- Lightweight runtime compared to some class-metadata ORM stacks.

### Negative

- Smaller ecosystem than Prisma for some ancillary tooling; more SQL-shaped thinking for complex reporting queries.

## Alternatives considered

- **Prisma:** strong migrations and DX; schema in `schema.prisma` rather than TS tables.
- **TypeORM / Kysely:** documented in [`../reference/db.md`](../reference/db.md) with different trade-offs.
