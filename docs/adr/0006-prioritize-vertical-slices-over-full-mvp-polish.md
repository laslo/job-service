# ADR-0006: Prioritize vertical slices over full MVP polish

## Status

Accepted

## Date

2026-04-11

## Context

The product roadmap includes rich UX (streaming updates) and multiple worker types (PDF, email/API, analytics). Building everything before shipping risks **late feedback** and **unvalidated integration** across UI, API, Kafka, and workers.

## Decision

Optimize for **vertical slices** that are demonstrable end-to-end (browser and/or CLI) with **minimal but real** infrastructure:

1. **Job status in the UI:** use **HTTP polling** on the MVP path; defer SSE/WebSockets until a slice explicitly needs them.
2. **Workers:** introduce **one worker class** at a time in the agreed order (CPU-bound → I/O-bound → batch/analytics), each shippable on its own.
3. **Definition of done for a slice:** observable behavior **and** basic **metrics** (or logs), not presence of every optional service.

## Consequences

### Positive

- Faster validation of the core path (create job → consume → terminal state).
- Forces instrumentation and operability habits early.

### Negative

- Less “polished” real-time UX until streaming is prioritized.
- Requires discipline to resist expanding scope mid-slice.

## Alternatives considered

- **SSE/WebSockets first:** better live UX; more moving parts before the job pipeline is proven.
- **Big-bang multi-worker release:** higher integration risk before any slice is production-shaped.
