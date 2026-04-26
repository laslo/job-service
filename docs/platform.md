# Platform and delivery

Runtime layout, scaling signals, cloud posture, and how the repository is organized.

---

## Kubernetes layout

```
k8s/
├── frontend
├── api-gateway
├── services
│   ├── job-service
│   ├── auth-service
│   └── notification-service
├── workers
│   ├── worker-pdf
│   ├── worker-email
│   └── worker-analytics
├── infrastructure
│   ├── kafka
│   └── postgres
└── observability
```

---

## Autoscaling

```
Consumer lag / backlog ↑
     │
Kubernetes HPA
     │
Scale workers
```

Worker scale is driven by **Kafka consumer lag**, queue depth, or equivalent metrics exported to Prometheus and referenced by the Horizontal Pod Autoscaler.

---

## Cloud, portability, and cost

**Target:** run in **cloud** while staying **easy to move** between providers and keeping **cost low**.

| Concern | Posture |
|---------|---------|
| **Where it runs** | **Cloud** Kubernetes for production-shaped environments. |
| **Lock-in** | Prefer **portable** building blocks (Kubernetes, containers, Helm or GitOps, Kafka clients, Postgres); swap managed Kafka or cluster vendor without rewriting job semantics. |
| **Spend** | **Low** fixed cost: small clusters, autoscale workers on **lag**, optional services off when not needed, spot only for safe **stateless workers**. |

Details:

- **Portability:** application code talks to **Kafka** and **PostgreSQL** via standard clients—avoid locking job execution to a single vendor’s proprietary “serverless job” API for the core path.
- **Kafka:** prefer a **managed** offering where practical (MSK, Aiven, Confluent Cloud, etc.) or a **self-operated** Strimzi stack on the same cluster if that is cheaper at your scale—either way, keep topic names and client config portable.
- **Low cost:** smallest viable node pools (or autoscaling floor at zero for non-critical envs where allowed), single non-HA Kafka for dev/staging if acceptable, scale workers with lag, turn off optional services locally or in cloud when not needed.
- **Local and partial runs:** kind or k3d for “full stack” checks; support **turning services off** (e.g. notification, extra workers) so features can be developed and tested against a thinner graph—browser, `curl`, or small local clients. Compose or task runners are optional helpers as long as prod parity stays Kubernetes-oriented.

---

## Deployment

- **Production-shaped:** managed Kubernetes (any major cloud) with Helm charts.
- **Local:** kind or k3d; same charts where possible so drift stays small.

---

## Repository structure

```
platform/
├── frontend/
├── api-gateway/
├── services/
│   ├── job-service/
│   └── auth-service/
├── workers/
│   ├── worker-pdf/
│   └── worker-email/
├── infra/
│   ├── kubernetes/
│   └── helm/
└── observability/
```

---

## Monorepo vs polyrepo

| Aspect | Monorepo | Polyrepo |
|--------|----------|----------|
| Shared contracts | Trivial path imports or internal packages | Versioned packages or schema registry |
| CI blast radius | Large pipelines unless well scoped | Per-service pipelines are natural |
| Access control | Single ACL surface | Repo-level permissions per service |

**This repository** uses a **monorepo** so cross-cutting changes (shared types, OpenAPI, internal packages) stay coordinated. **Polyrepo** is viable once service boundaries and published contracts are stable enough to own independently.
