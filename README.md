# job-service

Monorepo for the job-execution platform: Next.js UI, NestJS API gateway, services, and Kafka workers.

The full design lives in [`docs/`](./docs):

- [`docs/Overview.md`](./docs/Overview.md) — product scope and priorities.
- [`docs/architecture.md`](./docs/architecture.md) — system diagram and job flow.
- [`docs/platform.md`](./docs/platform.md) — Kubernetes, repo layout, cloud posture.
- [`docs/roadmap.md`](./docs/roadmap.md) — staged delivery checklist.
- [`docs/reference/tech-stack.md`](./docs/reference/tech-stack.md) — locked tech choices.
- [`docs/adr/README.md`](./docs/adr/README.md) — architecture decision records.

---

## Toolchain (locked)

| Tool            | Version            | Source                                       |
| --------------- | ------------------ | -------------------------------------------- |
| Node.js         | `22` (active LTS)  | [`.nvmrc`](./.nvmrc), `engines`              |
| Package manager | `pnpm@10`          | `packageManager` (Corepack)                  |
| Task runner     | Turborepo `2`      | [`turbo.json`](./turbo.json)                 |
| Language        | TypeScript `6`     | [`tsconfig.base.json`](./tsconfig.base.json) |
| Lint            | ESLint `10` (flat) | [`eslint.config.mjs`](./eslint.config.mjs)   |
| Format          | Prettier `3`       | [`.prettierrc.json`](./.prettierrc.json)     |
| Tests           | Vitest `4`         | [`vitest.config.ts`](./vitest.config.ts)     |

Choices are pinned by [ADR-0007](./docs/adr/0007-use-pnpm-workspaces-with-turborepo.md) and the locked stack in [`docs/reference/tech-stack.md`](./docs/reference/tech-stack.md).

---

## Repository layout

```
.
├── apps/         # deployable apps (frontend, api-gateway, services, workers) — added per roadmap stage
├── packages/     # shared TypeScript packages (types, config, clients) — added as cross-cutting needs emerge
├── infra/
│   ├── kubernetes/
│   ├── helm/
│   └── observability/
├── docs/
└── scripts/
```

`apps/` and `packages/` are wired as pnpm workspaces ([`pnpm-workspace.yaml`](./pnpm-workspace.yaml)). Subprojects appear in later roadmap stages.

---

## Install

Prerequisites: Node 22 (use `nvm use` if you have nvm) and Corepack enabled.

```bash
corepack enable
pnpm install
```

Corepack pins pnpm to the `packageManager` version declared in [`package.json`](./package.json), so all contributors and CI use the same release.

---

## Smoke command

A single command confirms the dev loop is wired correctly:

```bash
pnpm smoke
```

It prints the active toolchain identity and verifies that the target folder layout is in place. Use it as the first signal when onboarding or after a major branch switch.

---

## Common scripts

| Command           | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `pnpm smoke`      | Print toolchain identity + verify layout.             |
| `pnpm lint`       | Run ESLint across the workspace.                      |
| `pnpm format`     | Check Prettier formatting.                            |
| `pnpm format:fix` | Apply Prettier formatting.                            |
| `pnpm test`       | Run Vitest (passes with no tests).                    |
| `pnpm typecheck`  | Run TypeScript in build mode.                         |
| `pnpm build`      | Turborepo `build` task graph (no-op until apps land). |
| `pnpm dev`        | Turborepo `dev` task graph (no-op until apps land).   |

---

## Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs lint, format, and test on push and pull request against `main`. It is intentionally minimal at this stage and will grow alongside the roadmap.

---

## Roadmap progress

Stage progress is tracked in [`docs/roadmap.md`](./docs/roadmap.md). This commit completes **Stage 1 — Repository and the tightest dev loop**.
