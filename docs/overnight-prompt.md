## Overnight agent prompt (stages 6–10)

Read `docs/roadmap.md`. Execute stages 6, 7 (if possible without my answers or actions based on answers below), 8, 9, 10 (skip 11, 12).

Pre-flight:
- Work only on the current branch. Do not switch branches. Do not merge to `main`.
- After each successful stage commit, run `git push`. If `git push` hangs or fails (auth/network), continue without retry loops.
- After each stage attempt, append a one-line entry to `docs/overnight-log.md` with timestamp, stage number, status (ok/reverted/skipped), and short commit SHA (or `n/a`), plus a brief note. Commit and push that log update alongside the stage (or after the attempt if reverted/skipped).

For each stage:
1. Implement the minimum to tick every checkbox.
2. Run `pnpm test && pnpm lint`.
3. If green, `git commit -m "stage N: <summary>"`. If red, revert with `git reset --hard` and continue to the next stage.

Decisions:
- Stage 7: Auth = JWT signed with HS256, secret in env, no refresh tokens for MVP.
- Stage 7: quota = exactly 10 active jobs per token, 429 on excess.
- Stage 8: I/O worker = email via Mailhog (docker compose service named `mailhog`, port 1025).
- Stage 9: batch = `job_stats` aggregation every 30s.
- Stage 10: Prometheus + Grafana via docker compose, dashboard JSON committed under `infra/grafana/`.

Rules:
- If you need a decision not listed, pick the simplest reversible option, add `TODO(human):`, continue.
- Do not ask questions. Do not stop until all stages are committed or attempted.
- Do not touch cloud or Kubernetes.

