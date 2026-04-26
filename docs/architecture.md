# Architecture

Formal **architecture decisions** (Kafka, gateway, delivery, etc.) live in [Architecture Decision Records](./adr/README.md).

## High-level diagram

```
Next.js UI
     │
     ▼
API Gateway (NestJS)
     │
     ├── Auth Service
     ├── Job Service
     └── Notification Service
           │
           ▼
        Kafka
           │
           ▼
      Worker Pods
    (Kubernetes)
           │
           ▼
       PostgreSQL
```

---

## Job flow

1. User submits a job through the UI.
2. The API gateway validates the request (auth, schema, rate limits).
3. The job service persists the job record.
4. A record is produced to the appropriate **Kafka** topic (partitioning and idempotency aligned with job semantics).
5. A worker pod consumes messages and runs the handler.
6. The worker updates job status (and optionally emits notifications).
7. The UI reflects progress via **HTTP polling** on MVP (SSE or WebSockets only if a later slice needs them).

---

## MVP access (controlled rollout)

During the initial release window, access is **invite-only** with a small, fixed number of principals (on the order of **~5** distinct grants, issued manually—not a hard platform limit unless implemented that way).

- Each granted principal may run **10 jobs** by default (configurable if product needs it).
- Enforcement lives in auth / job service (quotas per principal or API token), not only in the UI.

This is intentionally narrow scope: full multi-tenant product isolation is out of MVP; see [roadmap.md](./roadmap.md). Token posture: [reference/auth.md](./reference/auth.md).

---

## Worker rollout order

Workers are introduced in this **sequence** so complexity ramps from CPU-bound to I/O-bound to batch-style work:

1. **CPU-bound** — e.g. PDF generation (timeouts, resource limits, and metrics tuned for compute).
2. **I/O-bound** — e.g. email or external API calls (retries, idempotency, outbound rate limits).
3. **Batch / analytics** — larger or slower jobs (throughput, backpressure, consumer group strategy).

Each stage should be shippable and testable on its own (browser and/or CLI against the same API).

---

## Services

### API gateway

- Authentication and coarse authorization
- Routing to backing services
- Rate limiting and request validation

### Job service

- Create and list jobs
- Status transitions and idempotency where needed
- Retry policy coordination with **Kafka** consumer semantics (offsets, dead-letter handling in later slices)

### Workers

- Consume from Kafka topics
- Execute domain-specific processing (PDF, then email/API, then analytics)
- Report completion, failure, and retry signals through the job service and/or consumer commits

### Notification service (optional in MVP)

- Outbound email or push based on job events
- Keeps workers thin and centralizes delivery concerns; may be omitted early to reduce moving parts (see priorities in [Overview.md](./Overview.md))
