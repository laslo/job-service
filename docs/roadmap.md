# Development roadmap (progress checklist)

Use this file to track day-by-day progress. Locked stack: [reference/tech-stack.md](./reference/tech-stack.md). Architecture decisions: [adr/README.md](./adr/README.md).

---

## Stage 1 — Repository and the tightest dev loop

- [x] Repo layout matches target structure (apps, packages, infra folders as planned).
- [x] Root README documents how to install deps and one “smoke” command (even if it only prints help).
- [x] Single shared toolchain locked (Node version, package manager) and recorded for reproducibility.
- [x] Lint/format/test scripts exist at root and run clean on an empty scaffold.
- [x] Optional: pre-commit or CI stub runs those scripts on push.

## Stage 2 — PostgreSQL and job model

- [x] PostgreSQL runs locally via compose, script, or documented one-liner.
- [x] Migrations (or equivalent) create a `jobs` table with status and timestamps.
- [x] Job row can be inserted and fetched with a minimal script or temporary route.
- [x] Connection config is env-driven with a checked-in `.env.example` (no secrets).

## Stage 3 — Job API (create + read, no Kafka yet if you need an even thinner slice)

- [x] `POST` (or equivalent) creates a job row in `pending` (or similar) state.
- [x] `GET` by id returns job payload including status.
- [x] Validation errors return stable, documented shapes for UI and curl.
- [x] Same API testable from **browser** (Swagger/Playground or minimal UI) and **console** (curl/httpie).

## Stage 4 — Kafka: topics, produce, consume skeleton

- [ ] Kafka runs locally (compose or k8s) with documented bootstrap URL.
- [ ] Topics (and partitions strategy) defined as code or infra-as-code, not only manual UI steps.
- [ ] Job service produces a message when a job is created (payload links to job id).
- [ ] Standalone consumer (or worker stub) logs received messages and commits offsets safely.
- [ ] Document how to **turn Kafka off** for earlier stages if you keep a feature flag (optional but aligned with priorities).

## Stage 5 — First worker: CPU-bound path (e.g. PDF or stub processor)

- [ ] Worker consumes from the correct topic and group id.
- [ ] Worker transitions job status to `running` then `completed` or `failed` in Postgres.
- [ ] Failure path persists error detail without losing the job row.
- [ ] Resource limits / timeouts appropriate for CPU work are set for local runs.
- [ ] End-to-end validation: create job → see terminal states via `GET` (polling-ready).

## Stage 6 — Next.js status UI (polling)

- [ ] Next.js app lists jobs or shows detail for one id from the API.
- [ ] Polling interval is configurable; avoids hammering the API in dev.
- [ ] Empty and error states are usable when API or DB is down.
- [ ] Same flows still reproducible with curl without opening the UI.

## Stage 7 — API gateway, auth, access quotas

- [ ] Gateway routes traffic to job service behind a single public origin in dev.
- [ ] Authentication mechanism chosen (e.g. JWT, session, or opaque API token) is documented.
- [ ] Server-side cap: **10 jobs** per principal (or token) with clear 403/429 response.
- [ ] Rate limits or coarse abuse protection on create-job path (minimal viable).
- [ ] Optional notification service remains **disabled** unless this stage explicitly needs it.

## Stage 8 — Second worker: I/O-bound (e.g. email or external API)

- [ ] New topic and consumer group (or clear partition strategy) for I/O jobs.
- [ ] Retries and idempotency strategy documented and partially implemented.
- [ ] Secrets for outbound calls live in env / secret store, not in repo.
- [ ] UI or API can trigger this job type distinctly from Stage 5.

## Stage 9 — Third worker: batch / analytics

- [ ] Backpressure or batch sizing prevents one job from starving others locally.
- [ ] Metrics or logs show throughput and duration for this worker type.
- [ ] Job type routing from API → correct topic is explicit and tested.

## Stage 10 — Observability (minimal viable)

- [ ] Structured logs include `job_id` (and trace id if traces exist).
- [ ] Prometheus metrics or equivalent: job latency, error count, **Kafka consumer lag** (or proxy).
- [ ] One dashboard or Grafana JSON checked in or documented import path.
- [ ] Optional: trim local stack (metrics + logs only) if traces are deferred.

## Stage 11 — Containers and local Kubernetes

- [ ] Dockerfile(s) for API, worker(s), and UI build and run with documented env vars.
- [ ] `docker compose` or Helm/kustomize brings up core stack on kind/k3d.
- [ ] Document which services can be **scaled to zero** or omitted for cheap dev.
- [ ] Smoke test: same create → complete path works inside the cluster.

## Stage 12 — Cloud (portable, low-cost posture)

- [ ] Target cloud and smallest cluster shape documented (node size, autoscaling intent).
- [ ] Managed Kafka or Strimzi choice recorded; topics reproducible from Stage 4 artifacts.
- [ ] Secrets and config via cloud-native mechanism (not committed).
- [ ] One end-to-end run in cloud documented (URLs, pilot credentials, quota check).

---

## After MVP (optional follow-ups)

- [ ] SSE or WebSockets instead of polling only.
- [ ] Scheduled jobs (CronJob or scheduler service).
- [ ] Dead-letter topic and replay tooling.
- [ ] Broader multi-tenant isolation and quotas.
- [ ] Blue/green or canary for workers; chaos or failure drills.
