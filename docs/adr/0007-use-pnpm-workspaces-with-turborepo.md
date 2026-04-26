# ADR-0007: Use pnpm workspaces with Turborepo

## Status

Accepted

## Date

2026-04-11

## Context

The codebase is a **monorepo** with multiple apps (`apps/*`) and shared packages (`packages/*`). We need reproducible installs, strict workspace boundaries, and efficient CI through **caching** and **task orchestration**.

Package managers (npm, Yarn, pnpm, Bun) and task runners (pnpm-only, Turborepo, Nx) differ in disk layout, workspace maturity, and incremental build caching.

## Decision

- Use **pnpm** as the **only** package manager for this repository (`pnpm-workspace.yaml`, `pnpm-lock.yaml`).
- Use **Turborepo** on top of pnpm for **pipeline definitions**, **task dependencies**, and optional **remote cache** in CI.

**pnpm** resolves and links dependencies; **Turborepo** runs tasks after `pnpm install`. They are not interchangeable.

## Consequences

### Positive

- Predictable installs in CI and Docker; fewer phantom-dependency issues than classic hoisted trees.
- Faster incremental builds across apps and packages when pipelines are well scoped (`--filter`).

### Negative

- Contributors must use pnpm (documented in root README when scaffolded).
- Turborepo adds a thin config layer to maintain (`turbo.json`).

## Alternatives considered

- **npm / Yarn:** acceptable for smaller repos; weaker disk and workspace ergonomics at scale (see ecosystem norms).
- **Nx:** stronger codegen and boundaries enforcement; heavier setup than needed for the initial app count.
- **pnpm scripts only:** simplest; no cross-package incremental task cache without adding another tool later.
