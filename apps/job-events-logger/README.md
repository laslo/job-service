# `@job-service/job-events-logger`

Standalone Kafka consumer that subscribes to `jobs.created` and logs every message it receives. Stage-4 stub — see [the roadmap](../../docs/roadmap.md). When real worker types land in Stage 5 onwards this app stays around as a low-noise tap on the topic for debugging and demos.

## Run locally

Prerequisites: the dev stack from `infra/docker-compose.dev.yml` is up and topics are provisioned.

```bash
pnpm kafka:up           # start broker (single-node KRaft)
pnpm kafka:topics       # converge topic state from packages/kafka/src/topics.ts
pnpm worker:logger      # this app
```

In another terminal, create a job through the API:

```bash
curl -s -X POST http://localhost:4000/v1/jobs \
  -H 'content-type: application/json' \
  -d '{ "type": "pdf.render" }' | jq .
```

Within a second the logger prints a structured line like:

```
job-events-logger: topic=jobs.created partition=2 offset=4 key=8f00b0d4-… jobId=8f00b0d4-… type=pdf.render createdAt=2026-04-26T20:31:11.000Z
```

## Offset commit semantics

The consumer uses kafkajs's `eachMessage` mode, which commits the offset **after** the handler returns successfully. The handler additionally calls `consumer.commitOffsets(...)` to make the boundary explicit. A crash mid-handler causes the next start to redeliver the in-flight message rather than silently skipping it.

## Turning Kafka off

If `KAFKA_ENABLED=false` is set in `.env`, the logger prints a notice and exits 0 without contacting the broker. The same flag short-circuits the Kafka producer in the API. Use this to keep the Stage-1–3 dev loop usable when you do not need the broker running.
