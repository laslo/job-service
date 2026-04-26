# Alternative stacks and architectures

Documents **profiles that differ from this repository’s baseline** (Next.js + NestJS + Kubernetes + Kafka + PostgreSQL + Grafana stack). The **chosen baseline** is summarized in [`reference/tech-stack.md`](../reference/tech-stack.md). **Why** those choices were made is recorded as [Architecture Decision Records](../adr/README.md) (see ADR-0001 for Kafka, ADR-0002 for the gateway, and the rest of the index).

---

## Planned applications (this monorepo)

The baseline ships the **first** item first; additional apps share **shadcn/ui** and typed HTTP clients ([`reference/api-sdk.md`](../reference/api-sdk.md)).

1. **Main product app** — job UI behind **restricted MVP access** ([`reference/auth.md`](../reference/auth.md)).
2. **Marketing / landing** site — shared UI kit; can be public.
3. **Role- or tenant-specific** web apps — admin, operator, etc., as the domain splits.

Shared **i18n** conventions across apps: [`reference/i18n.md`](../reference/i18n.md).

---

## 1. Serverless-first job platform

**Idea:** Minimize always-on compute; use managed queues and functions for workers.

| Layer | Suggested tech |
|-------|----------------|
| UI | Next.js (Vercel or static + CDN) |
| API | AWS API Gateway + Lambda, or Cloudflare Workers + D1/R2 |
| Queue | SQS, Google Cloud Tasks, or Azure Queue Storage |
| Workers | Lambda / Cloud Functions with concurrency limits per job type |
| Data | DynamoDB, Aurora Serverless, or Neon (Postgres) |
| Observability | Cloud vendor APM + structured logs; optional OpenTelemetry export |

**Architecture sketch:** API writes job row → enqueue → Lambda triggered by queue → updates DB → optional EventBridge for schedules.

**When it fits:** Spiky workloads, small team, willingness to accept vendor coupling and cold-start tuning.

---

## 2. JVM / Spring “enterprise job” profile

**Idea:** Strong typing, mature batch abstractions, common in regulated environments.

| Layer | Suggested tech |
|-------|----------------|
| UI | Next.js or a thin React SPA |
| API | Spring Boot (WebFlux or MVC) + Spring Security |
| Queue | RabbitMQ or Kafka |
| Workers | Spring Boot apps with `@KafkaListener` or Rabbit listeners; optional Spring Batch for heavy ETL |
| Orchestration | Kubernetes or VM + systemd |
| Data | PostgreSQL |
| Observability | Micrometer + Prometheus; OpenTelemetry bridge to Jaeger |

**Architecture sketch:** Similar logical boundaries as the baseline; different runtime and dependency injection style.

**When it fits:** Teams standardized on JVM; need mature integration libraries and long-running batch steps.

---

## 3. Go microservices + minimal orchestration

**Idea:** Small static binaries, fast startup, fewer framework layers.

| Layer | Suggested tech |
|-------|----------------|
| UI | Next.js or HTMX + Go templates |
| API | chi or Echo; separate binaries per bounded context |
| Queue | NATS JetStream, Redis Streams, or Kafka |
| Workers | Go consumers in separate deployments |
| Orchestration | Nomad, lightweight K8s (k3s), or even Docker Compose for dev |
| Data | PostgreSQL or CockroachDB |
| Observability | `otel-go` + Grafana stack |

**Architecture sketch:** Thin gateway service; job service owns DB; workers are stateless pull-based consumers.

**When it fits:** Performance-sensitive workers; preference for explicit control and small container images.

---

## 4. Event-sourced / workflow engine center

**Idea:** Job state is a projection of events; long-running flows use a durable execution engine.

| Layer | Suggested tech |
|-------|----------------|
| UI | Next.js |
| API | NestJS or Temporal / Cadence client services |
| Orchestration | **Temporal** (or Cadence, Conductor) for workflows; activities call workers |
| Queue | Often internal to the engine; Kafka for cross-system events |
| Data | Postgres for workflow visibility + business tables |
| Observability | Temporal Web UI + OTel + Prometheus |

**Architecture sketch:** API starts a workflow; activities enqueue side effects or call microservices; retries and timers are engine-managed.

**When it fits:** Complex multi-step jobs, human-in-the-loop, long delays, strong durability requirements.

---

## Comparison snapshot

| Profile | Best for | Main cost |
|---------|----------|-----------|
| Baseline (Nest + K8s + Kafka) | Classic microservices, durable job log | Cluster, Kafka, and chart maintenance |
| Serverless | Intermittent load, fast MVP | Vendor lock-in, observability stitching |
| JVM / Spring | Enterprise integrations | Heavier runtime, slower cold starts on JVM |
| Go + light orchestration | Efficient workers, ops simplicity | More hand-rolled framework glue |
| Temporal-centric | Durable long-running workflows | New operational component to learn |

None of these invalidates the baseline; they trade operational surface area for different strengths.
