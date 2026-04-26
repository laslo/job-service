# ADR-0005: Standardize on OpenTelemetry and the Grafana metrics / logs / traces stack

## Status

Accepted

## Date

2026-04-11

## Context

Running jobs on Kubernetes with Kafka-backed workers requires **metrics** (latency, errors, consumer lag), **logs** (structured, correlatable), and **traces** (cross-service latency). Teams can adopt vendor APM only, a minimal self-hosted set, or a portable open stack.

Local development must stay **affordable in time and machine cost** while production remains **observable** for incidents and capacity planning.

## Decision

Standardize on **OpenTelemetry** instrumentation in NestJS services and workers (and optionally Next.js server surfaces), exporting to:

- **Prometheus** (metrics)
- **Jaeger** or another OTLP-compatible backend (traces)
- **Loki** (logs correlated with trace IDs)
- **Grafana** as the primary visualization and drill-down UI

For **local** and **low-traffic** environments, a **trimmed** stack (e.g. metrics + logs first, traces when debugging) is acceptable **if production** retains a clear **OTLP export path**.

Concrete metrics and diagrams: [`../observability.md`](../observability.md).

## Consequences

### Positive

- Aligns with common Kubernetes operations practice; portable across clouds and self-hosted.
- Unified correlation (trace IDs in logs) improves incident response.

### Negative

- Non-trivial footprint when running everything locally; requires discipline to keep prod telemetry complete while dev stays lean.

## Alternatives considered

- **Vendor-only APM:** lower self-hosted footprint; higher coupling and cost modeling per provider.
