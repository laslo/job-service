# ADR-0001: Use Kafka for job events and worker scaling

## Status

Accepted

## Date

2026-04-11

## Context

Background work is modeled as **jobs** that move through states and are processed by **workers**. We need a backbone that supports:

- Durable messaging so work is not lost on process restarts
- Ordered consumption where job semantics require it
- **Replay** and inspection of the stream for debugging and recovery
- **Consumer groups** so multiple worker replicas can share load safely

Simpler brokers (e.g. Redis streams or lists) are easier to operate at very small scale but offer weaker first-class support for the durable log and replay patterns we expect as workers grow (PDF → I/O → analytics).

## Decision

Use **Apache Kafka** as the primary message broker and integration log **from day one** for job-related events and worker consumption.

Operational mitigation: prefer **managed Kafka** where practical, or a **minimal** self-hosted topology for development; keep topic names and client configuration **portable** across vendors and Strimzi.

## Consequences

### Positive

- Durable log, replay semantics, and horizontal scaling of workers via consumer groups align with the worker roadmap.
- Kafka client APIs and topic layout transfer across managed providers and self-hosted clusters.

### Negative

- Higher operational baseline than Redis-only queues (broker count, retention, replication, monitoring).
- Teams must invest in topic design, consumer group strategy, and lag-based scaling (see [`../platform.md`](../platform.md)).

## Alternatives considered

- **Redis (streams / lists):** lower ops overhead at tiny scale; weaker fit for durable replay and long-retention event log as the system grows.
