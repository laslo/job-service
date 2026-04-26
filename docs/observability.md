# Observability

How services emit signals and what to measure first.

---

## Stack

- **OpenTelemetry** for unified instrumentation in NestJS, workers, and optionally Next.js API routes.
- **Cost / velocity note:** for **local development** and **low-traffic** environments, a **trimmed** stack (e.g. metrics + logs only) is acceptable if production still has a clear OTLP export path; rationale in [ADR-0005](./adr/0005-standardize-on-opentelemetry-and-grafana-stack.md).
- **Prometheus** for metrics scraping and alerting rules.
- **Jaeger** (or another OTLP-compatible backend) for distributed traces.
- **Loki** for log aggregation correlated with traces via trace IDs.
- **Grafana** as the primary UI for dashboards and cross-signal drill-down.

```
Services
   │
OpenTelemetry
   │
├── Prometheus (metrics)
├── Jaeger (traces)
└── Loki (logs)
      │
      ▼
   Grafana
```

---

## Metrics to prioritize

- End-to-end job latency (enqueue → terminal state)
- **Kafka consumer lag** and per-partition backlog (primary queue signal)
- Error rate and failure classification (transient vs permanent)
- Worker CPU, memory, and saturation
- Retry count and time-to-dead-letter
- Throughput (jobs per minute per worker type)
