# `@job-service/cpu-job-worker`

Stage-5 worker. Consumes `jobs.created`, runs a CPU-bound stub processor, and transitions jobs through `running` → `completed` (or `failed` with a persisted error message) in Postgres. See [the roadmap](../../docs/roadmap.md) for the wider context and the [architecture diagram](../../docs/architecture.md).

The "stub" is a deterministic chain of SHA-256 hashes — enough load to behave like a real CPU job (the event loop is occupied for the duration) without dragging a PDF or imaging toolchain into the dev loop. The first real worker (PDF, image transcode, etc.) replaces `cpu-stub.ts` without changing the topology.

---

## Run locally

Prerequisites: the dev stack from `infra/docker-compose.dev.yml` is up, migrations are applied, and topics are provisioned.

```bash
pnpm stack:up           # Postgres + Kafka
pnpm db:migrate         # ensure jobs.error column exists
pnpm kafka:topics       # converge topic state from packages/kafka/src/topics.ts
pnpm api:dev            # producer (terminal 1)
pnpm worker:cpu         # this app   (terminal 2)
```

Create a job and poll its status:

```bash
JOB_ID=$(curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "pdf.render", "payload": { "templateId": "invoice-v3" } }' | jq -r .id)
curl -s http://localhost:4000/v1/jobs/$JOB_ID | jq '{status, error, updatedAt}'
```

Within a second the worker prints a structured line and the `GET` flips from `pending` to `running` to `completed`.

---

## Configuration

| Variable                     | Default   | Effect                                                                                                          |
| ---------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `JOB_CPU_TIMEOUT_MS`         | `30000`   | Per-job wall-clock budget. Exceeding it transitions the row to `failed` with a `JOB_CPU_TIMEOUT_MS=…` message.  |
| `JOB_CPU_DEFAULT_ITERATIONS` | `200000`  | SHA-256 iterations when the request payload omits `iterations`. Tune up for slower hosts or down for fast CI.   |
| `JOB_CPU_MAX_ITERATIONS`     | `5000000` | Hard ceiling on `payload.iterations`; values above this are rejected so a poison message cannot stall a worker. |
| `KAFKA_ENABLED`              | `true`    | Set to `false` to skip the broker entirely; the worker exits 0. The same flag short-circuits the API producer.  |

Per-job override (sent through the API):

```bash
curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "pdf.render", "payload": { "iterations": 50000 } }' | jq .
```

---

## Status transitions and idempotency

| From                   | Trigger                        | To          | Notes                                                                   |
| ---------------------- | ------------------------------ | ----------- | ----------------------------------------------------------------------- |
| `pending`              | `markRunning`                  | `running`   | `error` cleared in case a previous attempt failed and is being retried. |
| `running`              | stub returned                  | `completed` | `updated_at` bumped; `error` left null.                                 |
| `pending` / `running`  | stub threw / deadline exceeded | `failed`    | `error` carries a serialised message (max 2000 chars).                  |
| `completed` / `failed` | redelivery                     | _no change_ | Handler skips on terminal status — Kafka redelivery is a no-op.         |

The handler is idempotent: a kafkajs redelivery on a `completed` row is a no-op, and a redelivery on a `running` row safely re-runs the work and re-completes it. Database errors propagate so the offset is **not** committed; the message is redelivered.

---

## Offset commit semantics

Identical to [`apps/job-events-logger`](../job-events-logger/README.md): `eachMessage` mode commits offsets **after** the handler returns, so a crash mid-handler causes redelivery instead of data loss. Partitions are processed sequentially (`partitionsConsumedConcurrently: 1`) so two CPU jobs cannot saturate the event loop in parallel.

## Turning Kafka off

Setting `KAFKA_ENABLED=false` makes the worker exit 0 with a notice. The API publisher and the events-logger respect the same flag, keeping the Stage-1–3 dev loop usable when the broker is intentionally absent.
